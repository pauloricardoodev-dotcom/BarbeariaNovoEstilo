import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Publico, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { ClienteAtual, RotaCliente } from '../clientes/cliente-auth.js';
import type { ClienteAutenticado } from '../clientes/clientes.types.js';
import {
  AgendamentosService,
  type AgendamentoAdmin,
  type AgendamentoCliente,
  type Pagina,
  type ReagendamentoNovo,
  type SolicitacaoAdmin,
} from './agendamentos.service.js';
import {
  AtualizarAgendamentoAdminDto,
  CriarAgendamentoDto,
  DecidirSolicitacaoDto,
  DisponibilidadeDto,
  ListarAgendamentosAdminDto,
  ListarSolicitacoesDto,
  ReagendarDto,
  ReservaManualDto,
  SolicitarCancelamentoDto,
} from './dto/agendamentos.dto.js';

const uuid = () => new ParseUUIDPipe({ version: '4' });

/** Horários livres de um dia. Público (alimenta o calendário), mas só devolve horas — nunca dados de clientes. */
@Controller('disponibilidade')
export class DisponibilidadeController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Publico()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  consultar(
    @Query() query: DisponibilidadeDto,
  ): Promise<{ data: string; horarios: string[] }> {
    return this.agendamentos.disponibilidade(query);
  }
}

/** Agendamentos do cliente logado. */
@RotaCliente()
@Controller('clientes/me/agendamentos')
export class ClienteAgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get()
  listar(@ClienteAtual() cliente: ClienteAutenticado): Promise<AgendamentoCliente[]> {
    return this.agendamentos.listarDoCliente(cliente.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  criar(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: CriarAgendamentoDto,
  ): Promise<AgendamentoCliente> {
    return this.agendamentos.criarDoCliente(cliente, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post(':id/reagendar')
  reagendar(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Param('id', uuid()) id: string,
    @Body() dto: ReagendarDto,
  ): Promise<AgendamentoCliente> {
    return this.agendamentos.reagendar(cliente, id, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/solicitar-cancelamento')
  solicitarCancelamento(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Param('id', uuid()) id: string,
    @Body() dto: SolicitarCancelamentoDto,
  ): Promise<AgendamentoCliente> {
    return this.agendamentos.solicitarCancelamento(cliente, id, dto.motivo);
  }
}

/** Agenda no painel. Sem @Publico/@RotaCliente: exige sessão de admin (guard global). */
@Controller('admin/agendamentos')
export class AdminAgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get()
  listar(
    @Query() filtros: ListarAgendamentosAdminDto,
  ): Promise<Pagina<AgendamentoAdmin>> {
    return this.agendamentos.listarAdmin(filtros);
  }

  /** Reserva manual: só nome, serviço e duração; sem criar conta nem guardar telefone/e-mail. */
  @Post()
  criarReserva(@Body() dto: ReservaManualDto): Promise<AgendamentoAdmin> {
    return this.agendamentos.criarReservaManual(dto);
  }

  /** Trocar o horário (o barbeiro move o atendimento para outro dia/hora livre). */
  @HttpCode(HttpStatus.OK)
  @Post(':id/reagendar')
  reagendar(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', uuid()) id: string,
    @Body() dto: ReagendarDto,
  ): Promise<AgendamentoAdmin> {
    return this.agendamentos.reagendarAdmin(admin.id, id, dto);
  }

  /** Concluir ou cancelar diretamente (cancelado nunca é apagado). */
  @Patch(':id')
  atualizar(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', uuid()) id: string,
    @Body() dto: AtualizarAgendamentoAdminDto,
  ): Promise<AgendamentoAdmin> {
    return this.agendamentos.atualizarStatusAdmin(admin.id, id, dto);
  }
}

/**
 * Reagendamentos feitos pelos clientes. Não precisam de aprovação: aparecem em Notificações até o barbeiro
 * marcar como visto.
 */
@Controller('admin/reagendamentos')
export class AdminReagendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get('novos')
  novos(): Promise<ReagendamentoNovo[]> {
    return this.agendamentos.listarReagendamentosNovos();
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('visto')
  async marcarTodosVistos(@UsuarioAtual() admin: UsuarioAutenticado): Promise<void> {
    await this.agendamentos.marcarTodosReagendamentosVistos(admin.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/visto')
  async marcarVisto(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', uuid()) id: string,
  ): Promise<void> {
    await this.agendamentos.marcarReagendamentoVisto(admin.id, id);
  }
}

@Controller('admin/solicitacoes-cancelamento')
export class AdminSolicitacoesController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get()
  listar(
    @Query() filtros: ListarSolicitacoesDto,
  ): Promise<Pagina<SolicitacaoAdmin>> {
    return this.agendamentos.listarSolicitacoes(filtros);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/decidir')
  decidir(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('id', uuid()) id: string,
    @Body() dto: DecidirSolicitacaoDto,
  ): Promise<SolicitacaoAdmin> {
    return this.agendamentos.decidirSolicitacao(admin.id, id, dto);
  }
}
