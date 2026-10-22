import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env.validation.js';
import type { StatusPagamento } from '../generated/prisma/client.js';
import {
  GatewayPagamento,
  type CobrancaGateway,
  type EntradaWebhook,
  type NovaCobrancaCartao,
  type NovaCobrancaPix,
} from './gateway.js';

const API = 'https://api.mercadopago.com';
const TIMEOUT_MS = 15_000;

/** Status do Mercado Pago -> status do nosso banco. Desconhecido = pendente (não confirma nada sozinho). */
export function traduzirStatus(status: unknown, detalhe?: unknown): StatusPagamento {
  switch (status) {
    case 'approved':
      return 'aprovado';
    case 'rejected':
      return 'recusado';
    case 'cancelled':
      return detalhe === 'expired' ? 'expirado' : 'cancelado';
    case 'refunded':
    case 'charged_back':
      return 'estornado';
    default:
      return 'pendente';
  }
}

/** 'Z' -> '-03:00': o Mercado Pago espera data com offset (Brasil sem horário de verão desde 2019). */
export function dataComOffsetSP(data: Date): string {
  return new Date(data.getTime() - 3 * 3_600_000)
    .toISOString()
    .replace('Z', '-03:00');
}

/**
 * Valida o header x-signature ("ts=...,v1=...") do webhook:
 * HMAC-SHA256(segredo, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"), em hexadecimal.
 */
export function assinaturaMercadoPagoValida(
  segredo: string,
  { assinatura, idRequisicao, idDado }: EntradaWebhook,
): boolean {
  if (!segredo || !assinatura || !idRequisicao || !idDado) return false;
  const partes = Object.fromEntries(
    assinatura.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as Record<string, string | undefined>;
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;
  // O Mercado Pago usa o id em minúsculo quando é alfanumérico.
  const id = /^[a-z0-9]+$/i.test(idDado) ? idDado.toLowerCase() : idDado;
  const esperado = createHmac('sha256', segredo)
    .update(`id:${id};request-id:${idRequisicao};ts:${ts};`)
    .digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface RespostaPagamentoMP {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  external_reference?: string | null;
  payment_method_id?: string;
  card?: { last_four_digits?: string };
  point_of_interaction?: { transaction_data?: { qr_code?: string } };
}

@Injectable()
export class GatewayMercadoPago extends GatewayPagamento {
  readonly nome = 'mercadopago';
  readonly ativo = true;
  private readonly logger = new Logger(GatewayMercadoPago.name);

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  private get token(): string {
    return this.config.get('MERCADOPAGO_ACCESS_TOKEN', { infer: true });
  }

  /** Chamada HTTP ao Mercado Pago. Erros viram 502 genérico; detalhes só no log (sem token nem dados do cartão). */
  private async chamar(
    metodo: 'GET' | 'POST' | 'PUT',
    caminho: string,
    corpo?: unknown,
    chaveIdempotencia?: string,
  ): Promise<RespostaPagamentoMP> {
    let resposta: Response;
    try {
      resposta = await fetch(`${API}${caminho}`, {
        method: metodo,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(metodo !== 'GET'
            ? { 'X-Idempotency-Key': chaveIdempotencia ?? randomUUID() }
            : {}),
        },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (erro) {
      this.logger.error(
        `Mercado Pago ${metodo} ${caminho}: falha de rede (${erro instanceof Error ? erro.name : 'erro'})`,
      );
      throw new BadGatewayException(
        'Não foi possível falar com o serviço de pagamento. Tente novamente.',
      );
    }
    const dados = (await resposta.json().catch(() => ({}))) as
      | RespostaPagamentoMP
      | { message?: string; cause?: unknown };
    if (!resposta.ok) {
      this.logger.error(
        `Mercado Pago ${metodo} ${caminho}: HTTP ${resposta.status} ${'message' in dados ? String(dados.message) : ''}`,
      );
      throw new BadGatewayException(
        'Não foi possível processar o pagamento agora. Tente novamente.',
      );
    }
    return dados as RespostaPagamentoMP;
  }

  private traduzir(r: RespostaPagamentoMP): CobrancaGateway {
    if (r.id === undefined || typeof r.transaction_amount !== 'number') {
      this.logger.error('Mercado Pago: resposta de pagamento sem id ou valor.');
      throw new BadGatewayException(
        'Resposta inesperada do serviço de pagamento.',
      );
    }
    return {
      idExterno: String(r.id),
      status: traduzirStatus(r.status, r.status_detail),
      valorCentavos: Math.round(r.transaction_amount * 100),
      referencia: r.external_reference ?? null,
      pixCopiaCola: r.point_of_interaction?.transaction_data?.qr_code ?? null,
      bandeira: r.payment_method_id ?? null,
      ultimosQuatro: r.card?.last_four_digits ?? null,
    };
  }

  async criarPix(d: NovaCobrancaPix): Promise<CobrancaGateway> {
    const r = await this.chamar(
      'POST',
      '/v1/payments',
      {
        transaction_amount: d.valorCentavos / 100,
        description: d.descricao,
        payment_method_id: 'pix',
        date_of_expiration: dataComOffsetSP(d.expiraEm),
        external_reference: d.referencia,
        payer: { email: d.email, first_name: d.nome },
      },
      `pix-${d.referencia}`,
    );
    return this.traduzir(r);
  }

  async cobrarCartao(d: NovaCobrancaCartao): Promise<CobrancaGateway> {
    const r = await this.chamar(
      'POST',
      '/v1/payments',
      {
        transaction_amount: d.valorCentavos / 100,
        description: d.descricao,
        token: d.token,
        installments: 1,
        payment_method_id: d.metodoId,
        ...(d.emissorId ? { issuer_id: d.emissorId } : {}),
        external_reference: d.referencia,
        payer: { email: d.email },
      },
      `cartao-${d.referencia}`,
    );
    return this.traduzir(r);
  }

  async consultar(idExterno: string): Promise<CobrancaGateway> {
    return this.traduzir(
      await this.chamar('GET', `/v1/payments/${encodeURIComponent(idExterno)}`),
    );
  }

  async estornar(idExterno: string, chave: string): Promise<void> {
    await this.chamar(
      'POST',
      `/v1/payments/${encodeURIComponent(idExterno)}/refunds`,
      {},
      chave,
    );
  }

  async cancelar(idExterno: string): Promise<void> {
    await this.chamar(
      'PUT',
      `/v1/payments/${encodeURIComponent(idExterno)}`,
      { status: 'cancelled' },
    );
  }

  assinaturaValida(entrada: EntradaWebhook): boolean {
    return assinaturaMercadoPagoValida(
      this.config.get('MERCADOPAGO_WEBHOOK_SECRET', { infer: true }),
      entrada,
    );
  }
}
