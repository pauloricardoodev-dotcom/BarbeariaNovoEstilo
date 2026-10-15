import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
import { AtualizarServicoDto, CriarServicoDto } from './dto/servicos.dto.js';
import {
  ServicosService,
  type ResultadoExclusao,
  type ServicoResposta,
} from './servicos.service.js';

/** Catálogo do site: público, só serviços ativos. Não expõe dado pessoal. */
@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicos: ServicosService) {}

  @Publico()
  @Get()
  listar(): Promise<ServicoResposta[]> {
    return this.servicos.listarAtivos();
  }
}

/**
 * Gestão no painel. Sem @Publico: exige sessão de admin (guard global).
 * DELETE exclui de vez quando nunca foi agendado; com histórico de agendamentos ele só é inativado
 * (o histórico não pode perder o serviço).
 */
@Controller('admin/servicos')
export class AdminServicosController {
  constructor(private readonly servicos: ServicosService) {}

  @Get()
  listar(): Promise<ServicoResposta[]> {
    return this.servicos.listarTodos();
  }

  @Post()
  criar(@Body() dto: CriarServicoDto): Promise<ServicoResposta> {
    return this.servicos.criar(dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AtualizarServicoDto,
  ): Promise<ServicoResposta> {
    return this.servicos.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ResultadoExclusao> {
    return this.servicos.excluir(id);
  }
}
