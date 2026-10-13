import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ClienteAutenticado } from '../clientes/clientes.types.js';
import { Prisma } from '../generated/prisma/client.js';
import { WhatsAppService } from '../mensagens/mensagens.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AtualizarAgendamentoAdminDto,
  CriarAgendamentoDto,
  DecidirSolicitacaoDto,
  DisponibilidadeDto,
  ListarAgendamentosAdminDto,
  ListarSolicitacoesDto,
  ReagendarDto,
  ReservaManualDto,
} from './dto/agendamentos.dto.js';
import {
  antecedenciaSuficiente,
  dataNaJanela,
  dataSP,
  dataValida,
  formatarDataBR,
  horaSP,
  horarioDeAdminValido,
  horarioDeClienteValido,
  horariosLivres,
  instante,
  podeReagendarAgora,
  somarDias,
  sobrepoe,
  type Intervalo,
} from './horarios.js';

type Db = Prisma.TransactionClient;

const MSG_JANELA = 'Escolha uma data a partir de hoje e em até 3 meses.';
const MSG_ANTECEDENCIA =
  'Escolha um horário com pelo menos 2 horas de antecedência.';
const MSG_HORARIO_INDISPONIVEL = 'Este horário não está disponível.';
const MSG_CONFLITO =
  'Este horário acabou de ser ocupado. Escolha outro horário.';

// ---------------------------------------------------------------- respostas

const SELECAO_CLIENTE = {
  id: true,
  inicio: true,
  duracaoMinutos: true,
  preco: true,
  pagamento: true,
  status: true,
  createdAt: true,
  canceladoEm: true,
  servico: { select: { id: true, nome: true } },
  solicitacoes: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      status: true,
      motivo: true,
      resposta: true,
      createdAt: true,
      decididoEm: true,
    },
  },
} satisfies Prisma.AgendamentoSelect;

type LinhaCliente = Prisma.AgendamentoGetPayload<{
  select: typeof SELECAO_CLIENTE;
}>;

const SELECAO_ADMIN = {
  id: true,
  inicio: true,
  duracaoMinutos: true,
  preco: true,
  pagamento: true,
  status: true,
  nomeAvulso: true,
  createdAt: true,
  canceladoEm: true,
  servico: { select: { id: true, nome: true } },
  cliente: { select: { id: true, nome: true, telefone: true } },
  solicitacoes: {
    where: { status: 'pendente' },
    take: 1,
    select: { id: true, motivo: true, createdAt: true },
  },
} satisfies Prisma.AgendamentoSelect;

type LinhaAdmin = Prisma.AgendamentoGetPayload<{
  select: typeof SELECAO_ADMIN;
}>;

const SELECAO_SOLICITACAO = {
  id: true,
  motivo: true,
  status: true,
  resposta: true,
  createdAt: true,
  decididoEm: true,
  agendamento: {
    select: {
      id: true,
      inicio: true,
      status: true,
      nomeAvulso: true,
      servico: { select: { nome: true } },
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
  },
} satisfies Prisma.SolicitacaoCancelamentoSelect;

type LinhaSolicitacao = Prisma.SolicitacaoCancelamentoGetPayload<{
  select: typeof SELECAO_SOLICITACAO;
}>;

export interface AgendamentoCliente {
  id: string;
  servico: { id: string; nome: string };
  /** Instante do início (ISO 8601, UTC). */
  inicio: string;
  /** Dia e hora no relógio de São Paulo, prontos para exibir. */
  data: string;
  hora: string;
  duracaoMinutos: number;
  preco: number;
  pagamento: string;
  status: string;
  criadoEm: string;
  canceladoEm: string | null;
  /** Última solicitação de cancelamento (pendente, aprovada ou recusada), se houver. */
  solicitacaoCancelamento: {
    id: string;
    status: string;
    motivo: string;
    resposta: string | null;
    criadaEm: string;
    decididaEm: string | null;
  } | null;
  podeReagendar: boolean;
  podeSolicitarCancelamento: boolean;
}

export interface AgendamentoAdmin {
  id: string;
  origem: 'site' | 'manual';
  /** Cliente do site; null em reserva manual. */
  cliente: { id: string; nome: string; telefone: string } | null;
  /** Nome informado na reserva manual; null em agendamento do site. */
  nomeAvulso: string | null;
  servico: { id: string; nome: string };
  inicio: string;
  data: string;
  hora: string;
  duracaoMinutos: number;
  preco: number;
  pagamento: string;
  status: string;
  criadoEm: string;
  canceladoEm: string | null;
  solicitacaoPendente: { id: string; motivo: string; criadaEm: string } | null;
}

export interface SolicitacaoAdmin {
  id: string;
  motivo: string;
  status: string;
  resposta: string | null;
  criadaEm: string;
  decididaEm: string | null;
  agendamento: {
    id: string;
    inicio: string;
    data: string;
    hora: string;
    status: string;
    servicoNome: string;
    cliente: { id: string; nome: string; telefone: string } | null;
    nomeAvulso: string | null;
  };
}

export interface ReagendamentoNovo {
  id: string;
  criadoEm: string;
  /** Dia/hora anteriores e novos, no relógio de São Paulo. */
  de: { data: string; hora: string };
  para: { data: string; hora: string };
  agendamento: {
    id: string;
    servicoNome: string;
    cliente: { id: string; nome: string; telefone: string } | null;
  };
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

function paraCliente(a: LinhaCliente, agora: Date): AgendamentoCliente {
  const s = a.solicitacoes[0] ?? null;
  const ativo = a.status === 'agendado';
  return {
    id: a.id,
    servico: a.servico,
    inicio: a.inicio.toISOString(),
    data: dataSP(a.inicio),
    hora: horaSP(a.inicio),
    duracaoMinutos: a.duracaoMinutos,
    preco: a.preco.toNumber(),
    pagamento: a.pagamento,
    status: a.status,
    criadoEm: a.createdAt.toISOString(),
    canceladoEm: a.canceladoEm?.toISOString() ?? null,
    solicitacaoCancelamento: s && {
      id: s.id,
      status: s.status,
      motivo: s.motivo,
      resposta: s.resposta,
      criadaEm: s.createdAt.toISOString(),
      decididaEm: s.decididoEm?.toISOString() ?? null,
    },
    podeReagendar: ativo && podeReagendarAgora(a.inicio, agora),
    podeSolicitarCancelamento:
      ativo && a.inicio > agora && s?.status !== 'pendente',
  };
}

function paraAdmin(a: LinhaAdmin): AgendamentoAdmin {
  const pendente = a.solicitacoes[0] ?? null;
  return {
    id: a.id,
    origem: a.cliente ? 'site' : 'manual',
    cliente: a.cliente,
    nomeAvulso: a.nomeAvulso,
    servico: a.servico,
    inicio: a.inicio.toISOString(),
    data: dataSP(a.inicio),
    hora: horaSP(a.inicio),
    duracaoMinutos: a.duracaoMinutos,
    preco: a.preco.toNumber(),
    pagamento: a.pagamento,
    status: a.status,
    criadoEm: a.createdAt.toISOString(),
    canceladoEm: a.canceladoEm?.toISOString() ?? null,
    solicitacaoPendente: pendente && {
      id: pendente.id,
      motivo: pendente.motivo,
      criadaEm: pendente.createdAt.toISOString(),
    },
  };
}

function paraSolicitacao(s: LinhaSolicitacao): SolicitacaoAdmin {
  const a = s.agendamento;
  return {
    id: s.id,
    motivo: s.motivo,
    status: s.status,
    resposta: s.resposta,
    criadaEm: s.createdAt.toISOString(),
    decididaEm: s.decididoEm?.toISOString() ?? null,
    agendamento: {
      id: a.id,
      inicio: a.inicio.toISOString(),
      data: dataSP(a.inicio),
      hora: horaSP(a.inicio),
      status: a.status,
      servicoNome: a.servico.nome,
      cliente: a.cliente,
      nomeAvulso: a.nomeAvulso,
    },
  };
}

// ------------------------------------------------------------------ erros

/**
 * Violação do EXCLUDE agendamentos_sem_sobreposicao (23P01): duas requisições simultâneas
 * tentaram o mesmo horário e a segunda perdeu. Procura o nome da constraint em qualquer
 * parte do erro, porque o Prisma o embrulha de formas diferentes conforme o driver.
 */
export function ehConflitoDeHorario(erro: unknown): boolean {
  if (erro === null || typeof erro !== 'object') return false;
  const partes: string[] = [];
  const e = erro as { message?: unknown; meta?: unknown; cause?: unknown };
  if (typeof e.message === 'string') partes.push(e.message);
  try {
    partes.push(JSON.stringify(e.meta ?? ''), JSON.stringify(e.cause ?? ''));
  } catch {
    // estrutura circular: ignora, a mensagem já foi considerada
  }
  return /agendamentos_sem_sobreposicao|23P01/.test(partes.join(' '));
}

function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === 'P2002'
  );
}

// ---------------------------------------------------------------- serviço

@Injectable()
export class AgendamentosService {
  private readonly logger = new Logger(AgendamentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Relógio do servidor; isolado para facilitar testes. */
  protected agora(): Date {
    return new Date();
  }

  private exigirDataEHora(data: string, hora?: string): void {
    if (!dataValida(data)) throw new BadRequestException('Data inválida.');
    if (hora !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      throw new BadRequestException('Horário inválido.');
    }
  }

  private exigirContaVerificada(cliente: ClienteAutenticado): void {
    if (!cliente.emailVerificado || !cliente.telefoneVerificado) {
      throw new ForbiddenException(
        'Confirme seu e-mail e seu WhatsApp para poder agendar.',
      );
    }
  }

  /** Agendamentos não cancelados que começam no dia (São Paulo), exceto `ignorarId`. */
  private async ocupadosDoDia(
    db: Db,
    data: string,
    ignorarId?: string,
  ): Promise<Intervalo[]> {
    const linhas = await db.agendamento.findMany({
      where: {
        status: { not: 'cancelado' },
        inicio: {
          gte: instante(data, '00:00'),
          lt: instante(somarDias(data, 1), '00:00'),
        },
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
      select: { inicio: true, fim: true },
    });
    return linhas;
  }

  private async servicoAtivo(servicoId: string) {
    const servico = await this.prisma.servico.findFirst({
      where: { id: servicoId, ativo: true },
      select: { id: true, duracaoMinutos: true, preco: true },
    });
    if (!servico) throw new NotFoundException('Serviço não encontrado.');
    return servico;
  }

  // ------------------------------------------------------------ público

  /** Horários livres de um dia para um serviço. Só devolve horas; nenhum dado de outros clientes. */
  async disponibilidade(dto: DisponibilidadeDto): Promise<{
    data: string;
    horarios: string[];
  }> {
    this.exigirDataEHora(dto.data);
    const agora = this.agora();
    if (!dataNaJanela(dto.data, agora)) {
      throw new BadRequestException(MSG_JANELA);
    }
    const servico = await this.servicoAtivo(dto.servicoId);
    const ocupados = await this.ocupadosDoDia(this.prisma, dto.data);
    return {
      data: dto.data,
      horarios: horariosLivres(dto.data, servico.duracaoMinutos, ocupados, agora),
    };
  }

  // ------------------------------------------------------------ cliente

  async listarDoCliente(clienteId: string): Promise<AgendamentoCliente[]> {
    const agora = this.agora();
    const linhas = await this.prisma.agendamento.findMany({
      where: { clienteId },
      select: SELECAO_CLIENTE,
      orderBy: { inicio: 'desc' },
      take: 200,
    });
    return linhas.map((l) => paraCliente(l, agora));
  }

  async criarDoCliente(
    cliente: ClienteAutenticado,
    dto: CriarAgendamentoDto,
  ): Promise<AgendamentoCliente> {
    this.exigirContaVerificada(cliente);
    this.exigirDataEHora(dto.data, dto.hora);
    const agora = this.agora();
    if (!dataNaJanela(dto.data, agora)) {
      throw new BadRequestException(MSG_JANELA);
    }
    const servico = await this.servicoAtivo(dto.servicoId);
    if (!horarioDeClienteValido(dto.data, dto.hora, servico.duracaoMinutos)) {
      throw new BadRequestException(MSG_HORARIO_INDISPONIVEL);
    }
    if (!antecedenciaSuficiente(dto.data, dto.hora, agora)) {
      throw new BadRequestException(MSG_ANTECEDENCIA);
    }
    const inicio = instante(dto.data, dto.hora);
    const fim = new Date(inicio.getTime() + servico.duracaoMinutos * 60_000);

    try {
      const criado = await this.prisma.$transaction(async (tx) => {
        const ocupados = await this.ocupadosDoDia(tx, dto.data);
        if (ocupados.some((o) => sobrepoe({ inicio, fim }, o))) {
          throw new ConflictException(MSG_CONFLITO);
        }
        return tx.agendamento.create({
          data: {
            clienteId: cliente.id,
            servicoId: servico.id,
            inicio,
            duracaoMinutos: servico.duracaoMinutos,
            preco: servico.preco,
            pagamento: dto.pagamento,
          },
          select: SELECAO_CLIENTE,
        });
      });
      return paraCliente(criado, agora);
    } catch (erro) {
      if (ehConflitoDeHorario(erro)) throw new ConflictException(MSG_CONFLITO);
      throw erro;
    }
  }

  private async agendamentoDoCliente(clienteId: string, id: string) {
    const ag = await this.prisma.agendamento.findFirst({
      where: { id, clienteId },
      select: { id: true, inicio: true, duracaoMinutos: true, status: true },
    });
    if (!ag) throw new NotFoundException('Agendamento não encontrado.');
    return ag;
  }

  async reagendar(
    cliente: ClienteAutenticado,
    id: string,
    dto: ReagendarDto,
  ): Promise<AgendamentoCliente> {
    this.exigirContaVerificada(cliente);
    this.exigirDataEHora(dto.data, dto.hora);
    const agora = this.agora();
    const atual = await this.agendamentoDoCliente(cliente.id, id);

    if (atual.status !== 'agendado') {
      throw new ConflictException(
        'Só agendamentos ativos podem ser reagendados.',
      );
    }
    if (atual.inicio <= agora) {
      throw new ConflictException(
        'Atendimento que já passou não pode ser reagendado.',
      );
    }
    if (!podeReagendarAgora(atual.inicio, agora)) {
      throw new ConflictException(
        'Só é possível reagendar até 2 horas antes do horário.',
      );
    }
    if (!dataNaJanela(dto.data, agora)) {
      throw new BadRequestException(MSG_JANELA);
    }
    if (!horarioDeClienteValido(dto.data, dto.hora, atual.duracaoMinutos)) {
      throw new BadRequestException(MSG_HORARIO_INDISPONIVEL);
    }
    if (!antecedenciaSuficiente(dto.data, dto.hora, agora)) {
      throw new BadRequestException(MSG_ANTECEDENCIA);
    }
    const novoInicio = instante(dto.data, dto.hora);
    if (novoInicio.getTime() === atual.inicio.getTime()) {
      throw new BadRequestException('Escolha um horário diferente do atual.');
    }
    await this.mover(atual, novoInicio, dto.data, { origem: 'cliente' });
    const atualizado = await this.prisma.agendamento.findUniqueOrThrow({
      where: { id: atual.id },
      select: SELECAO_CLIENTE,
    });
    return paraCliente(atualizado, agora);
  }

  /**
   * Move um agendamento para um novo início (cliente e admin usam o mesmo caminho): confere ocupação,
   * só altera se ninguém mexeu nele desde a leitura, grava o histórico e deixa o EXCLUDE do banco
   * como garantia final contra dupla reserva.
   */
  private async mover(
    atual: { id: string; inicio: Date; duracaoMinutos: number },
    novoInicio: Date,
    data: string,
    // Quem reagendou: o cliente gera notificação para o barbeiro; o admin já nasce "visto".
    quem: { origem: 'cliente' } | { origem: 'admin'; adminId: string },
  ): Promise<void> {
    const novoFim = new Date(
      novoInicio.getTime() + atual.duracaoMinutos * 60_000,
    );
    try {
      await this.prisma.$transaction(async (tx) => {
        // O próprio agendamento não conta como ocupante do novo horário.
        const ocupados = await this.ocupadosDoDia(tx, data, atual.id);
        if (
          ocupados.some((o) =>
            sobrepoe({ inicio: novoInicio, fim: novoFim }, o),
          )
        ) {
          throw new ConflictException(MSG_CONFLITO);
        }
        const { count } = await tx.agendamento.updateMany({
          where: { id: atual.id, status: 'agendado', inicio: atual.inicio },
          data: { inicio: novoInicio },
        });
        if (count !== 1) {
          throw new ConflictException(
            'Este agendamento foi alterado. Atualize a página e tente de novo.',
          );
        }
        await tx.reagendamento.create({
          data: {
            agendamentoId: atual.id,
            inicioAnterior: atual.inicio,
            inicioNovo: novoInicio,
            origem: quem.origem,
            ...(quem.origem === 'admin'
              ? { vistoEm: new Date(), vistoPor: quem.adminId }
              : {}),
          },
        });
      });
    } catch (erro) {
      if (ehConflitoDeHorario(erro)) throw new ConflictException(MSG_CONFLITO);
      throw erro;
    }
  }

  async solicitarCancelamento(
    cliente: ClienteAutenticado,
    id: string,
    motivo: string,
  ): Promise<AgendamentoCliente> {
    this.exigirContaVerificada(cliente);
    const agora = this.agora();
    const atual = await this.agendamentoDoCliente(cliente.id, id);
    if (atual.status !== 'agendado') {
      throw new ConflictException(
        'Só agendamentos ativos podem ter o cancelamento solicitado.',
      );
    }
    if (atual.inicio <= agora) {
      throw new ConflictException(
        'Atendimento que já passou não pode ser cancelado.',
      );
    }
    try {
      await this.prisma.solicitacaoCancelamento.create({
        data: { agendamentoId: atual.id, motivo },
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new ConflictException(
          'Já existe uma solicitação de cancelamento pendente para este agendamento.',
        );
      }
      throw erro;
    }
    const atualizado = await this.prisma.agendamento.findUniqueOrThrow({
      where: { id: atual.id },
      select: SELECAO_CLIENTE,
    });
    return paraCliente(atualizado, agora);
  }

  // -------------------------------------------------------------- admin

  async listarAdmin(
    filtros: ListarAgendamentosAdminDto,
  ): Promise<Pagina<AgendamentoAdmin>> {
    if (filtros.de) this.exigirDataEHora(filtros.de);
    if (filtros.ate) this.exigirDataEHora(filtros.ate);
    const where: Prisma.AgendamentoWhereInput = {
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.de || filtros.ate
        ? {
            inicio: {
              ...(filtros.de ? { gte: instante(filtros.de, '00:00') } : {}),
              ...(filtros.ate
                ? { lt: instante(somarDias(filtros.ate, 1), '00:00') }
                : {}),
            },
          }
        : {}),
    };
    const [linhas, total] = await this.prisma.$transaction([
      this.prisma.agendamento.findMany({
        where,
        select: SELECAO_ADMIN,
        orderBy: { inicio: 'asc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.agendamento.count({ where }),
    ]);
    return {
      itens: linhas.map(paraAdmin),
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    };
  }

  async criarReservaManual(dto: ReservaManualDto): Promise<AgendamentoAdmin> {
    this.exigirDataEHora(dto.data, dto.hora);
    const servico = await this.servicoAtivo(dto.servicoId);
    if (!horarioDeAdminValido(dto.data, dto.hora, dto.duracaoMinutos)) {
      throw new BadRequestException(
        'Fora do expediente (segunda a sábado, 08:00–18:00).',
      );
    }
    const inicio = instante(dto.data, dto.hora);
    if (inicio < this.agora()) {
      throw new BadRequestException('Não é possível reservar no passado.');
    }
    const fim = new Date(inicio.getTime() + dto.duracaoMinutos * 60_000);

    try {
      const criado = await this.prisma.$transaction(async (tx) => {
        const ocupados = await this.ocupadosDoDia(tx, dto.data);
        if (ocupados.some((o) => sobrepoe({ inicio, fim }, o))) {
          throw new ConflictException(MSG_CONFLITO);
        }
        return tx.agendamento.create({
          data: {
            nomeAvulso: dto.nome,
            servicoId: servico.id,
            inicio,
            duracaoMinutos: dto.duracaoMinutos,
            preco: servico.preco,
            pagamento: 'presencial',
          },
          select: SELECAO_ADMIN,
        });
      });
      return paraAdmin(criado);
    } catch (erro) {
      if (ehConflitoDeHorario(erro)) throw new ConflictException(MSG_CONFLITO);
      throw erro;
    }
  }

  async atualizarStatusAdmin(
    adminId: string,
    id: string,
    dto: AtualizarAgendamentoAdminDto,
  ): Promise<AgendamentoAdmin> {
    const atual = await this.prisma.agendamento.findUnique({
      where: { id },
      select: { id: true, inicio: true, status: true },
    });
    if (!atual) throw new NotFoundException('Agendamento não encontrado.');
    if (atual.status !== 'agendado') {
      throw new ConflictException(
        'Só agendamentos ativos podem ser alterados.',
      );
    }
    const agora = this.agora();

    if (dto.status === 'concluido') {
      if (atual.inicio > agora) {
        throw new BadRequestException(
          'Só é possível concluir atendimentos que já começaram.',
        );
      }
      const { count } = await this.prisma.agendamento.updateMany({
        where: { id, status: 'agendado' },
        data: { status: 'concluido' },
      });
      if (count !== 1) throw new ConflictException('O agendamento mudou.');
    } else {
      const aprovadas = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.agendamento.updateMany({
          where: { id, status: 'agendado' },
          data: {
            status: 'cancelado',
            canceladoEm: agora,
            canceladoPor: adminId,
          },
        });
        if (count !== 1) throw new ConflictException('O agendamento mudou.');
        // Cancelar direto resolve qualquer pedido de cancelamento pendente do cliente.
        const pendentes = await tx.solicitacaoCancelamento.findMany({
          where: { agendamentoId: id, status: 'pendente' },
          select: { id: true },
        });
        await tx.solicitacaoCancelamento.updateMany({
          where: { agendamentoId: id, status: 'pendente' },
          data: { status: 'aprovada', decididoEm: agora, decididoPor: adminId },
        });
        return pendentes;
      });
      for (const p of aprovadas) void this.avisarDecisao(p.id);
    }
    const atualizado = await this.prisma.agendamento.findUniqueOrThrow({
      where: { id },
      select: SELECAO_ADMIN,
    });
    return paraAdmin(atualizado);
  }

  /**
   * Barbeiro reagenda um agendamento (botão `Reagendamento`). Pode usar qualquer minuto e o
   * horário de almoço, mas dentro do expediente, fora de domingo e nunca no passado. O serviço e a
   * duração não mudam, e o cliente é avisado por WhatsApp (sem precisar de aprovação de ninguém).
   */
  async reagendarAdmin(
    adminId: string,
    id: string,
    dto: ReagendarDto,
  ): Promise<AgendamentoAdmin> {
    this.exigirDataEHora(dto.data, dto.hora);
    const agora = this.agora();
    const atual = await this.prisma.agendamento.findUnique({
      where: { id },
      select: { id: true, inicio: true, duracaoMinutos: true, status: true },
    });
    if (!atual) throw new NotFoundException('Agendamento não encontrado.');
    if (atual.status !== 'agendado') {
      throw new ConflictException(
        'Só agendamentos ativos podem ter o horário trocado.',
      );
    }
    if (atual.inicio <= agora) {
      throw new ConflictException(
        'Atendimento que já começou ou passou não pode ser reagendado.',
      );
    }
    if (!horarioDeAdminValido(dto.data, dto.hora, atual.duracaoMinutos)) {
      throw new BadRequestException(
        'Fora do expediente (segunda a sábado, 08:00–18:00).',
      );
    }
    const novoInicio = instante(dto.data, dto.hora);
    if (novoInicio < agora) {
      throw new BadRequestException('Não é possível marcar no passado.');
    }
    if (novoInicio.getTime() === atual.inicio.getTime()) {
      throw new BadRequestException('Escolha um horário diferente do atual.');
    }
    await this.mover(atual, novoInicio, dto.data, { origem: 'admin', adminId });
    void this.avisarReagendamento(id);
    const atualizado = await this.prisma.agendamento.findUniqueOrThrow({
      where: { id },
      select: SELECAO_ADMIN,
    });
    return paraAdmin(atualizado);
  }

  /** Reagendamentos feitos pelos clientes que o barbeiro ainda não viu (notificações; não precisam de aprovação). */
  async listarReagendamentosNovos(): Promise<ReagendamentoNovo[]> {
    const linhas = await this.prisma.reagendamento.findMany({
      where: { origem: 'cliente', vistoEm: null },
      select: {
        id: true,
        inicioAnterior: true,
        inicioNovo: true,
        createdAt: true,
        agendamento: {
          select: {
            id: true,
            servico: { select: { nome: true } },
            cliente: { select: { id: true, nome: true, telefone: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return linhas.map((r) => ({
      id: r.id,
      criadoEm: r.createdAt.toISOString(),
      de: { data: dataSP(r.inicioAnterior), hora: horaSP(r.inicioAnterior) },
      para: { data: dataSP(r.inicioNovo), hora: horaSP(r.inicioNovo) },
      agendamento: {
        id: r.agendamento.id,
        servicoNome: r.agendamento.servico.nome,
        cliente: r.agendamento.cliente,
      },
    }));
  }

  /** Marca a notificação como vista (idempotente: ver de novo não dá erro). */
  async marcarReagendamentoVisto(adminId: string, id: string): Promise<void> {
    const { count } = await this.prisma.reagendamento.updateMany({
      where: { id, origem: 'cliente', vistoEm: null },
      data: { vistoEm: this.agora(), vistoPor: adminId },
    });
    if (count === 0) {
      const existe = await this.prisma.reagendamento.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existe) throw new NotFoundException('Reagendamento não encontrado.');
    }
  }

  async marcarTodosReagendamentosVistos(adminId: string): Promise<void> {
    await this.prisma.reagendamento.updateMany({
      where: { origem: 'cliente', vistoEm: null },
      data: { vistoEm: this.agora(), vistoPor: adminId },
    });
  }

  async listarSolicitacoes(
    filtros: ListarSolicitacoesDto,
  ): Promise<Pagina<SolicitacaoAdmin>> {
    const where: Prisma.SolicitacaoCancelamentoWhereInput = filtros.status
      ? { status: filtros.status }
      : {};
    const [linhas, total] = await this.prisma.$transaction([
      this.prisma.solicitacaoCancelamento.findMany({
        where,
        select: SELECAO_SOLICITACAO,
        orderBy: { createdAt: 'asc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.solicitacaoCancelamento.count({ where }),
    ]);
    return {
      itens: linhas.map(paraSolicitacao),
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    };
  }

  async decidirSolicitacao(
    adminId: string,
    id: string,
    dto: DecidirSolicitacaoDto,
  ): Promise<SolicitacaoAdmin> {
    const atual = await this.prisma.solicitacaoCancelamento.findUnique({
      where: { id },
      select: { id: true, status: true, agendamentoId: true },
    });
    if (!atual) throw new NotFoundException('Solicitação não encontrada.');
    if (atual.status !== 'pendente') {
      throw new ConflictException('Esta solicitação já foi decidida.');
    }
    const agora = this.agora();

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.solicitacaoCancelamento.updateMany({
        where: { id, status: 'pendente' },
        data: {
          status: dto.aprovar ? 'aprovada' : 'recusada',
          resposta: dto.resposta ?? null,
          decididoEm: agora,
          decididoPor: adminId,
        },
      });
      if (count !== 1) {
        throw new ConflictException('Esta solicitação já foi decidida.');
      }
      if (dto.aprovar) {
        // Aprovar cancela o agendamento (se o admin já não o tiver cancelado/concluído).
        await tx.agendamento.updateMany({
          where: { id: atual.agendamentoId, status: 'agendado' },
          data: {
            status: 'cancelado',
            canceladoEm: agora,
            canceladoPor: adminId,
          },
        });
      }
    });

    void this.avisarDecisao(id);

    const decidida = await this.prisma.solicitacaoCancelamento.findUniqueOrThrow({
      where: { id },
      select: SELECAO_SOLICITACAO,
    });
    return paraSolicitacao(decidida);
  }

  /** Avisa o cliente (WhatsApp) do novo horário depois que o barbeiro reagenda. Mesmas garantias de `avisarDecisao`. */
  private async avisarReagendamento(agendamentoId: string): Promise<void> {
    try {
      const a = await this.prisma.agendamento.findUnique({
        where: { id: agendamentoId },
        select: {
          inicio: true,
          servico: { select: { nome: true } },
          cliente: { select: { telefone: true } },
        },
      });
      if (!a?.cliente) return;
      await this.whatsapp.enviarAvisoReagendamento(a.cliente.telefone, {
        servico: a.servico.nome,
        data: formatarDataBR(dataSP(a.inicio)),
        hora: horaSP(a.inicio),
      });
    } catch (erro) {
      this.logger.warn(
        `Falha ao avisar o cliente do reagendamento (agendamento ${agendamentoId}): ${erro instanceof Error ? erro.message : 'erro desconhecido'}`,
      );
    }
  }

  /**
   * Avisa o cliente (WhatsApp) de que o pedido de cancelamento foi aprovado ou recusado. Roda em segundo
   * plano e nunca falha a operação do barbeiro: se o envio der errado, só registra no log (sem dados pessoais).
   * Reservas manuais não têm cliente nem telefone, então não há a quem avisar.
   */
  private async avisarDecisao(solicitacaoId: string): Promise<void> {
    try {
      const s = await this.prisma.solicitacaoCancelamento.findUnique({
        where: { id: solicitacaoId },
        select: {
          status: true,
          resposta: true,
          agendamento: {
            select: {
              inicio: true,
              servico: { select: { nome: true } },
              cliente: { select: { telefone: true } },
            },
          },
        },
      });
      const cliente = s?.agendamento.cliente;
      if (!s || !cliente || s.status === 'pendente') return;
      await this.whatsapp.enviarAvisoCancelamento(cliente.telefone, {
        aprovado: s.status === 'aprovada',
        servico: s.agendamento.servico.nome,
        data: formatarDataBR(dataSP(s.agendamento.inicio)),
        hora: horaSP(s.agendamento.inicio),
        resposta: s.resposta,
      });
    } catch (erro) {
      this.logger.warn(
        `Falha ao avisar o cliente (solicitação ${solicitacaoId}): ${erro instanceof Error ? erro.message : 'erro desconhecido'}`,
      );
    }
  }
}
