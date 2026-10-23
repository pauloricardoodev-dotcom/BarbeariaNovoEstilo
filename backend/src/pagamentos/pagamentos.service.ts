import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClienteAutenticado } from '../clientes/clientes.types.js';
import { ehViolacaoDeUnicidade } from '../clientes/conflitos.js';
import type { Env } from '../config/env.validation.js';
import { Prisma, type StatusPagamento } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PagarComCartaoDto } from './dto/pagamentos.dto.js';
import { GatewayPagamento, type CobrancaGateway } from './gateway.js';

/** O que o cliente vê de um pagamento. Nunca expõe id do gateway, payload nem dados do cartão. */
export interface PagamentoCliente {
  id: string;
  metodo: 'pix' | 'cartao';
  status: StatusPagamento;
  /** Em reais. */
  valor: number;
  /** Só Pix pendente: código "copia e cola" (o site gera o QR a partir dele). */
  pixCopiaCola: string | null;
  expiraEm: string | null;
  agendamento: { id: string; status: string; aguardandoPagamento: boolean };
}

export interface EntradaProcessamentoWebhook {
  assinatura: string | undefined;
  idRequisicao: string | undefined;
  /** `data.id` da query string. */
  idDado: string | undefined;
  /** Tipo do evento (`type` da query ou do corpo). */
  tipo: string | undefined;
  /** Id do evento (`id` do corpo); usado para idempotência. */
  idEvento: string | undefined;
  acao: string | undefined;
}

const INTERVALO_EXPIRACAO_MS = 30_000;
const MSG_RESERVA_EXPIRADA =
  'A reserva deste horário expirou. Faça um novo agendamento.';
const MSG_RECUSADO =
  'Pagamento recusado. Confira os dados do cartão ou escolha outra forma de pagamento.';

const SELECAO_PAGAMENTO = {
  id: true,
  agendamentoId: true,
  gateway: true,
  idExterno: true,
  metodo: true,
  valorCentavos: true,
  status: true,
  pixCopiaCola: true,
  expiraEm: true,
} satisfies Prisma.PagamentoSelect;

type LinhaPagamento = Prisma.PagamentoGetPayload<{
  select: typeof SELECAO_PAGAMENTO;
}>;

@Injectable()
export class PagamentosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PagamentosService.name);
  private temporizador?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: GatewayPagamento,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Relógio do servidor; isolado para facilitar testes. */
  protected agora(): Date {
    return new Date();
  }

  /** Cobrança online ligada? Desligada = fluxo antigo, sem reserva provisória. */
  get ativo(): boolean {
    return this.gateway.ativo;
  }

  /** Para o site: pagamento online ligado? e a chave pública do gateway (usada para tokenizar o cartão). */
  configPublica(): { online: boolean; chavePublica: string } {
    return {
      online: this.gateway.ativo,
      chavePublica: this.gateway.ativo
        ? this.config.get('MERCADOPAGO_PUBLIC_KEY', { infer: true })
        : '',
    };
  }

  /** Fim da reserva provisória de um agendamento criado agora. */
  fimDaReserva(agora: Date): Date {
    const minutos = this.config.get('RESERVA_PAGAMENTO_MINUTOS', {
      infer: true,
    });
    return new Date(agora.getTime() + minutos * 60_000);
  }

  // ------------------------------------------------------------ expiração

  onModuleInit(): void {
    // Em testes o ciclo é chamado à mão (expirarReservas) para ser determinístico.
    if (!this.gateway.ativo || process.env.NODE_ENV === 'test') return;
    this.temporizador = setInterval(() => {
      this.expirarReservas().catch((erro: unknown) =>
        this.logger.error(
          `Falha ao expirar reservas: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`,
        ),
      );
    }, INTERVALO_EXPIRACAO_MS);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /**
   * Libera os horários cuja reserva venceu sem pagamento: cancela o agendamento e expira a cobrança
   * pendente. Se o gateway mostrar que o pagamento entrou no último instante, confirma em vez de cancelar.
   */
  async expirarReservas(): Promise<number> {
    const agora = this.agora();
    const vencidos = await this.prisma.agendamento.findMany({
      where: { status: 'agendado', expiraEm: { lte: agora } },
      select: { id: true },
      take: 100,
    });
    let liberados = 0;
    for (const { id } of vencidos) {
      const pendentes = await this.prisma.pagamento.findMany({
        where: { agendamentoId: id, status: 'pendente' },
        select: SELECAO_PAGAMENTO,
      });
      let pago = false;
      for (const p of pendentes) {
        if (!p.idExterno) continue;
        try {
          const cobranca = await this.gateway.consultar(p.idExterno);
          if (cobranca.status === 'aprovado') {
            await this.aplicarStatus(p, cobranca);
            pago = true;
          } else {
            await this.gateway.cancelar(p.idExterno);
          }
        } catch (erro) {
          this.logger.warn(
            `Reserva ${id}: não foi possível conferir/cancelar a cobrança no gateway (${erro instanceof Error ? erro.message : 'erro'}).`,
          );
        }
      }
      if (pago) continue;
      const liberou = await this.prisma.$transaction(async (tx) => {
        await tx.pagamento.updateMany({
          where: { agendamentoId: id, status: 'pendente' },
          data: { status: 'expirado' },
        });
        const { count } = await tx.agendamento.updateMany({
          where: { id, status: 'agendado', expiraEm: { lte: agora } },
          data: { status: 'cancelado', canceladoEm: agora, expiraEm: null },
        });
        return count === 1;
      });
      if (liberou) liberados++;
    }
    return liberados;
  }

  // ------------------------------------------------------------ cliente

  private async agendamentoDoCliente(clienteId: string, id: string) {
    const ag = await this.prisma.agendamento.findFirst({
      where: { id, clienteId },
      select: {
        id: true,
        status: true,
        expiraEm: true,
        preco: true,
        pagamento: true,
        servico: { select: { nome: true } },
      },
    });
    if (!ag) throw new NotFoundException('Agendamento não encontrado.');
    return ag;
  }

  /** Só dá para pagar enquanto a reserva provisória está de pé. */
  private exigirReservaAberta(
    ag: { status: string; expiraEm: Date | null },
    agora: Date,
  ): void {
    if (ag.status !== 'agendado' || !ag.expiraEm) {
      throw new ConflictException(
        ag.status === 'cancelado'
          ? MSG_RESERVA_EXPIRADA
          : 'Este agendamento não está aguardando pagamento.',
      );
    }
    if (ag.expiraEm <= agora) throw new ConflictException(MSG_RESERVA_EXPIRADA);
  }

  /** Cria o registro local ANTES de falar com o gateway (nunca existe cobrança sem rastro). */
  private async registrarTentativa(
    agendamentoId: string,
    metodo: 'pix' | 'cartao',
    valorCentavos: number,
    expiraEm: Date | null,
  ): Promise<LinhaPagamento> {
    try {
      return await this.prisma.pagamento.create({
        data: {
          agendamentoId,
          gateway: this.gateway.nome,
          metodo,
          valorCentavos,
          expiraEm,
        },
        select: SELECAO_PAGAMENTO,
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new ConflictException(
          'Já existe um pagamento em andamento para este agendamento.',
        );
      }
      throw erro;
    }
  }

  private async falhaNoGateway(id: string, erro: unknown): Promise<never> {
    await this.prisma.pagamento.updateMany({
      where: { id, status: 'pendente' },
      data: { status: 'cancelado' },
    });
    throw erro;
  }

  /**
   * Antes de uma nova tentativa, resolve a anterior que ficou em aberto: se na verdade foi paga, aplica e
   * recusa a nova tentativa; se não, cancela no gateway e libera o caminho.
   */
  private async resolverPendente(
    pendente: LinhaPagamento,
  ): Promise<'paga' | 'liberada'> {
    if (pendente.idExterno) {
      const cobranca = await this.gateway.consultar(pendente.idExterno);
      await this.aplicarStatus(pendente, cobranca);
      if (cobranca.status === 'aprovado') return 'paga';
      if (cobranca.status === 'pendente') {
        await this.gateway.cancelar(pendente.idExterno);
      }
    }
    await this.prisma.pagamento.updateMany({
      where: { id: pendente.id, status: 'pendente' },
      data: { status: 'cancelado' },
    });
    return 'liberada';
  }

  async iniciarPix(
    cliente: ClienteAutenticado,
    agendamentoId: string,
  ): Promise<PagamentoCliente> {
    this.exigirAtivo();
    const agora = this.agora();
    const ag = await this.agendamentoDoCliente(cliente.id, agendamentoId);
    this.exigirReservaAberta(ag, agora);

    const pendente = await this.prisma.pagamento.findFirst({
      where: { agendamentoId, status: 'pendente' },
      select: SELECAO_PAGAMENTO,
    });
    if (pendente) {
      // Mesmo Pix ainda válido: devolve o mesmo código (não cobra duas vezes).
      if (
        pendente.metodo === 'pix' &&
        pendente.pixCopiaCola &&
        pendente.expiraEm &&
        pendente.expiraEm > agora
      ) {
        return this.paraCliente(pendente, ag);
      }
      if ((await this.resolverPendente(pendente)) === 'paga') {
        throw new ConflictException('Este agendamento já foi pago.');
      }
    }

    const p = await this.registrarTentativa(
      agendamentoId,
      'pix',
      Math.round(ag.preco.toNumber() * 100),
      ag.expiraEm,
    );
    try {
      const cobranca = await this.gateway.criarPix({
        referencia: p.id,
        valorCentavos: p.valorCentavos,
        descricao: ag.servico.nome,
        email: cliente.email,
        nome: cliente.nome,
        expiraEm: ag.expiraEm as Date,
      });
      const atualizado = await this.prisma.pagamento.update({
        where: { id: p.id },
        data: {
          idExterno: cobranca.idExterno,
          pixCopiaCola: cobranca.pixCopiaCola,
        },
        select: SELECAO_PAGAMENTO,
      });
      await this.prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { pagamento: 'pix' },
      });
      return this.paraCliente(atualizado, ag);
    } catch (erro) {
      return this.falhaNoGateway(p.id, erro);
    }
  }

  async pagarComCartao(
    cliente: ClienteAutenticado,
    agendamentoId: string,
    dto: PagarComCartaoDto,
  ): Promise<PagamentoCliente> {
    this.exigirAtivo();
    const agora = this.agora();
    const ag = await this.agendamentoDoCliente(cliente.id, agendamentoId);
    this.exigirReservaAberta(ag, agora);

    const pendente = await this.prisma.pagamento.findFirst({
      where: { agendamentoId, status: 'pendente' },
      select: SELECAO_PAGAMENTO,
    });
    if (pendente) {
      if (pendente.metodo === 'cartao') {
        // Cartão em análise: não cobra de novo, só mostra o estado atual.
        return this.paraCliente(await this.sincronizar(pendente), ag);
      }
      if ((await this.resolverPendente(pendente)) === 'paga') {
        throw new ConflictException('Este agendamento já foi pago.');
      }
    }

    const p = await this.registrarTentativa(
      agendamentoId,
      'cartao',
      Math.round(ag.preco.toNumber() * 100),
      null,
    );
    let cobranca: CobrancaGateway;
    try {
      cobranca = await this.gateway.cobrarCartao({
        referencia: p.id,
        valorCentavos: p.valorCentavos,
        descricao: ag.servico.nome,
        email: cliente.email,
        nome: cliente.nome,
        token: dto.token,
        metodoId: dto.metodoId,
        emissorId: dto.emissorId,
      });
    } catch (erro) {
      return this.falhaNoGateway(p.id, erro);
    }

    await this.prisma.pagamento.update({
      where: { id: p.id },
      data: {
        idExterno: cobranca.idExterno,
        cartaoBandeira: cobranca.bandeira,
        cartaoUltimosQuatro: cobranca.ultimosQuatro,
      },
    });
    await this.prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { pagamento: 'cartao' },
    });
    const atual = await this.aplicarStatus(
      { ...p, idExterno: cobranca.idExterno },
      cobranca,
    );
    if (atual.status === 'recusado') {
      throw new HttpException(MSG_RECUSADO, HttpStatus.PAYMENT_REQUIRED);
    }
    return this.paraCliente(atual, ag);
  }

  /** Estado do pagamento mais recente do agendamento; se ainda pendente, confere no gateway. */
  async statusDoAgendamento(
    cliente: ClienteAutenticado,
    agendamentoId: string,
  ): Promise<PagamentoCliente> {
    await this.agendamentoDoCliente(cliente.id, agendamentoId);
    const ultimo = await this.prisma.pagamento.findFirst({
      where: { agendamentoId },
      orderBy: { createdAt: 'desc' },
      select: SELECAO_PAGAMENTO,
    });
    if (!ultimo) throw new NotFoundException('Pagamento não encontrado.');
    const atual =
      ultimo.status === 'pendente' ? await this.sincronizar(ultimo) : ultimo;
    // Reconsulta o agendamento: a confirmação pode ter acabado de zerar a reserva.
    const agAtual = await this.agendamentoDoCliente(cliente.id, agendamentoId);
    return this.paraCliente(atual, agAtual);
  }

  /** Reconsulta o gateway para um pagamento pendente (cobre webhook atrasado). Falha de rede não derruba. */
  private async sincronizar(p: LinhaPagamento): Promise<LinhaPagamento> {
    if (!p.idExterno) return p;
    try {
      return await this.aplicarStatus(
        p,
        await this.gateway.consultar(p.idExterno),
      );
    } catch (erro) {
      this.logger.warn(
        `Pagamento ${p.id}: não foi possível sincronizar com o gateway (${erro instanceof Error ? erro.message : 'erro'}).`,
      );
      return p;
    }
  }

  private paraCliente(
    p: LinhaPagamento,
    ag: { id?: string; status: string; expiraEm: Date | null },
  ): PagamentoCliente {
    return {
      id: p.id,
      metodo: p.metodo as 'pix' | 'cartao',
      status: p.status,
      valor: p.valorCentavos / 100,
      pixCopiaCola: p.status === 'pendente' ? p.pixCopiaCola : null,
      expiraEm: p.expiraEm?.toISOString() ?? null,
      agendamento: {
        id: p.agendamentoId,
        status: ag.status,
        aguardandoPagamento: ag.status === 'agendado' && ag.expiraEm !== null,
      },
    };
  }

  // ------------------------------------------------------------ aplicar estado do gateway

  /**
   * Traduz o estado do gateway para o banco. Todas as escritas são condicionais ao status atual, então
   * webhook, polling e expiração concorrentes não se atropelam (e o banco ainda valida as transições).
   */
  private async aplicarStatus(
    p: LinhaPagamento,
    c: CobrancaGateway,
  ): Promise<LinhaPagamento> {
    const recarregar = () =>
      this.prisma.pagamento.findUniqueOrThrow({
        where: { id: p.id },
        select: SELECAO_PAGAMENTO,
      });

    switch (c.status) {
      case 'aprovado': {
        if (c.valorCentavos !== p.valorCentavos) {
          // Nunca confirma valor diferente do que cobramos.
          this.logger.error(
            `Pagamento ${p.id}: valor no gateway (${c.valorCentavos}) difere do cobrado (${p.valorCentavos}). Não confirmado.`,
          );
          return recarregar();
        }
        await this.confirmar(p, c);
        return recarregar();
      }
      case 'recusado':
      case 'cancelado':
      case 'expirado':
        await this.prisma.pagamento.updateMany({
          where: { id: p.id, status: 'pendente' },
          data: { status: c.status },
        });
        return recarregar();
      case 'estornado':
        await this.prisma.pagamento.updateMany({
          where: { id: p.id, status: 'aprovado' },
          data: { status: 'estornado', estornadoEm: this.agora() },
        });
        return recarregar();
      default:
        return recarregar();
    }
  }

  /** Aprova o pagamento e fecha a reserva. Se o agendamento já foi cancelado, devolve o dinheiro. */
  private async confirmar(p: LinhaPagamento, c: CobrancaGateway): Promise<void> {
    const agora = this.agora();
    const resultado = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.pagamento.updateMany({
        where: { id: p.id, status: 'pendente' },
        data: {
          status: 'aprovado',
          aprovadoEm: agora,
          idExterno: c.idExterno,
          cartaoBandeira: c.bandeira ?? undefined,
          cartaoUltimosQuatro: c.ultimosQuatro ?? undefined,
        },
      });
      if (count !== 1) return 'ja-processado' as const;
      const ag = await tx.agendamento.findUniqueOrThrow({
        where: { id: p.agendamentoId },
        select: { status: true },
      });
      if (ag.status !== 'agendado') return 'agendamento-cancelado' as const;
      await tx.agendamento.update({
        where: { id: p.agendamentoId },
        data: { expiraEm: null },
      });
      return 'confirmado' as const;
    });

    if (resultado === 'ja-processado') {
      // O dinheiro entrou numa cobrança que já demos por morta (expirada, descartada ou recusada) e o banco
      // não deixa reabri-la: devolve direto no gateway. O evento fica registrado em eventos_gateway.
      const atual = await this.prisma.pagamento.findUniqueOrThrow({
        where: { id: p.id },
        select: { status: true },
      });
      if (['expirado', 'cancelado', 'recusado'].includes(atual.status)) {
        this.logger.warn(
          `Pagamento ${p.id} aprovado depois de ${atual.status}; estornando no gateway.`,
        );
        await this.gateway.estornar(c.idExterno, `tardio-${p.id}`);
      }
    }

    if (resultado === 'agendamento-cancelado') {
      // Pagou depois de a reserva ser liberada: o horário pode já ser de outra pessoa. Devolve tudo.
      this.logger.warn(
        `Pagamento ${p.id} aprovado após o cancelamento do agendamento ${p.agendamentoId}; estornando.`,
      );
      await this.estornarAprovado(p.agendamentoId);
    }
  }

  // ------------------------------------------------------------ estorno

  /**
   * Estorna o pagamento aprovado do agendamento (cancelamento aprovado pelo barbeiro). Sem pagamento
   * aprovado não faz nada. Se o gateway falhar, lança 502 e o chamador NÃO cancela o agendamento.
   */
  async estornarAprovado(agendamentoId: string): Promise<boolean> {
    if (!this.gateway.ativo) return false;
    const p = await this.prisma.pagamento.findFirst({
      where: { agendamentoId, status: 'aprovado' },
      select: SELECAO_PAGAMENTO,
    });
    if (!p) return false;
    if (p.idExterno) {
      await this.gateway.estornar(p.idExterno, `estorno-${p.id}`);
    }
    await this.prisma.pagamento.updateMany({
      where: { id: p.id, status: 'aprovado' },
      data: { status: 'estornado', estornadoEm: this.agora() },
    });
    return true;
  }

  // ------------------------------------------------------------ webhook

  /**
   * Webhook do gateway. A assinatura vale só para provar a origem; o estado real é SEMPRE reconsultado na
   * API do gateway. Idempotente: o mesmo evento duas vezes não repete efeitos.
   */
  async processarWebhook(e: EntradaProcessamentoWebhook): Promise<void> {
    if (!this.gateway.assinaturaValida(e)) throw new UnauthorizedException();
    if (e.tipo !== 'payment' || !e.idDado) return; // outros eventos não nos interessam

    const idEvento = e.idEvento || e.idRequisicao;
    let eventoId: string | null = null;
    if (idEvento) {
      try {
        const evento = await this.prisma.eventoGateway.create({
          data: {
            gateway: this.gateway.nome,
            idEvento,
            tipo: e.tipo,
            payload: { acao: e.acao ?? null, idDado: e.idDado },
          },
          select: { id: true },
        });
        eventoId = evento.id;
      } catch (erro) {
        if (!ehViolacaoDeUnicidade(erro)) throw erro;
        const existente = await this.prisma.eventoGateway.findFirst({
          where: { gateway: this.gateway.nome, idEvento },
          select: { id: true, processadoEm: true },
        });
        if (existente?.processadoEm) return; // já tratado
        eventoId = existente?.id ?? null; // entregue antes mas não concluído: tenta de novo
      }
    }

    const cobranca = await this.gateway.consultar(e.idDado);
    const p = await this.prisma.pagamento.findFirst({
      where: { gateway: this.gateway.nome, idExterno: e.idDado },
      select: SELECAO_PAGAMENTO,
    });
    if (p) {
      await this.aplicarStatus(p, cobranca);
    } else if (cobranca.referencia) {
      // Pagamento criado mas a resposta ao gateway não chegou a gravar o id: acha pela referência.
      const porReferencia = await this.prisma.pagamento.findFirst({
        where: { id: cobranca.referencia, gateway: this.gateway.nome },
        select: SELECAO_PAGAMENTO,
      });
      if (porReferencia) {
        await this.prisma.pagamento.updateMany({
          where: { id: porReferencia.id, idExterno: null },
          data: { idExterno: cobranca.idExterno },
        });
        await this.aplicarStatus(
          { ...porReferencia, idExterno: cobranca.idExterno },
          cobranca,
        );
      }
    }
    if (eventoId) {
      await this.prisma.eventoGateway.update({
        where: { id: eventoId },
        data: { processadoEm: this.agora() },
      });
    }
  }

  /** Há pagamento online aprovado para o agendamento? */
  async estaPago(agendamentoId: string): Promise<boolean> {
    return (
      (await this.prisma.pagamento.count({
        where: { agendamentoId, status: 'aprovado' },
      })) > 0
    );
  }

  /** Falha rápida e clara se alguém tentar pagar com o gateway desligado. */
  private exigirAtivo(): void {
    if (!this.gateway.ativo) {
      throw new ServiceUnavailableException(
        'O pagamento online não está disponível no momento.',
      );
    }
  }
}
