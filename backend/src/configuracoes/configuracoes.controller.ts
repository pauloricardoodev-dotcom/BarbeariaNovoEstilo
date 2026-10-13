import { Body, Controller, Get, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Publico } from '../auth/decorators.js';
import {
  ConfiguracoesService,
  type Configuracoes,
} from './configuracoes.service.js';
import { AtualizarConfiguracoesDto } from './dto/configuracoes.dto.js';

/** Dados que o site mostra (rodapé, horário) e que guiam o calendário. Público e sem dado pessoal. */
@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(private readonly configuracoes: ConfiguracoesService) {}

  @Publico()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  obter(): Promise<Configuracoes> {
    return this.configuracoes.obter();
  }
}

/** Edição no painel. Sem @Publico: exige sessão de admin (guard global). */
@Controller('admin/configuracoes')
export class AdminConfiguracoesController {
  constructor(private readonly configuracoes: ConfiguracoesService) {}

  @Get()
  obter(): Promise<Configuracoes> {
    return this.configuracoes.obter();
  }

  @Put()
  atualizar(@Body() dto: AtualizarConfiguracoesDto): Promise<Configuracoes> {
    return this.configuracoes.atualizar(dto);
  }
}
