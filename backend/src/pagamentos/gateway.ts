import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { StatusPagamento } from '../generated/prisma/client.js';

/** Estado de uma cobrança no gateway, já traduzido para os status do nosso banco. */
export interface CobrancaGateway {
  idExterno: string;
  status: StatusPagamento;
  valorCentavos: number;
  /** Nosso id do pagamento enviado ao gateway (external_reference). */
  referencia: string | null;
  /** Só Pix: código "copia e cola". */
  pixCopiaCola: string | null;
  /** Só cartão: bandeira e 4 últimos dígitos (nunca o número completo). */
  bandeira: string | null;
  ultimosQuatro: string | null;
}

export interface DadosPagador {
  email: string;
  nome: string;
}

export interface NovaCobrancaPix extends DadosPagador {
  /** Id do nosso registro de pagamento. */
  referencia: string;
  valorCentavos: number;
  descricao: string;
  expiraEm: Date;
}

export interface NovaCobrancaCartao extends DadosPagador {
  referencia: string;
  valorCentavos: number;
  descricao: string;
  /** Token gerado no navegador pelo SDK do gateway. O número do cartão nunca chega aqui. */
  token: string;
  /** Bandeira/método (ex.: "visa", "master"). */
  metodoId: string;
  emissorId?: string;
}

export interface EntradaWebhook {
  assinatura: string | undefined;
  idRequisicao: string | undefined;
  /** `data.id` da query string. */
  idDado: string | undefined;
}

/**
 * Abstrato para o resto do sistema não depender de um gateway específico e para os testes trocarem
 * a rede por uma versão fake (como o VerificadorGoogle).
 */
export abstract class GatewayPagamento {
  abstract readonly nome: string;
  /** false = cobrança online desligada (fluxo antigo). */
  abstract readonly ativo: boolean;

  abstract criarPix(dados: NovaCobrancaPix): Promise<CobrancaGateway>;
  abstract cobrarCartao(dados: NovaCobrancaCartao): Promise<CobrancaGateway>;
  /** Fonte da verdade: o webhook só avisa que algo mudou; o estado vem daqui. */
  abstract consultar(idExterno: string): Promise<CobrancaGateway>;
  /** Devolve o valor total. `chave` torna a chamada idempotente. */
  abstract estornar(idExterno: string, chave: string): Promise<void>;
  /** Cancela uma cobrança ainda não paga (ex.: Pix que o cliente abandonou). */
  abstract cancelar(idExterno: string): Promise<void>;
  /** Confere a assinatura do webhook. */
  abstract assinaturaValida(entrada: EntradaWebhook): boolean;
}

const MSG_DESLIGADO = 'O pagamento online não está disponível no momento.';

/** Usado enquanto PAGAMENTO_PROVEDOR=desligado: nenhuma operação online é possível. */
@Injectable()
export class GatewayDesligado extends GatewayPagamento {
  readonly nome = 'desligado';
  readonly ativo = false;

  private indisponivel(): never {
    throw new ServiceUnavailableException(MSG_DESLIGADO);
  }
  criarPix(): Promise<CobrancaGateway> {
    return this.indisponivel();
  }
  cobrarCartao(): Promise<CobrancaGateway> {
    return this.indisponivel();
  }
  consultar(): Promise<CobrancaGateway> {
    return this.indisponivel();
  }
  estornar(): Promise<void> {
    return this.indisponivel();
  }
  cancelar(): Promise<void> {
    return this.indisponivel();
  }
  assinaturaValida(): boolean {
    return false;
  }
}
