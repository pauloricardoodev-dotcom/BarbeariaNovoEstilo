import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
import { AtualizarServicoDto, CriarServicoDto } from './dto/servicos.dto.js';
import { ServicosService, type ServicoResposta } from './servicos.service.js';

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
 * Não há DELETE de propósito: serviço usado por agendamentos não pode sumir; use ativo = false.
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
}
