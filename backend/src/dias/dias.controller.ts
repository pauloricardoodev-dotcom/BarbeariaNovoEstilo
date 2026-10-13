import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Publico } from '../auth/decorators.js';
import type { EstadoDia } from './dias.js';
import { DiasService } from './dias.service.js';
import { DefinirDiaDto, ListarDiasDto } from './dto/dias.dto.js';

/**
 * Dias que fogem do "dia comum aberto" (domingos, feriados, fechados ou desbloqueados pelo dono) num intervalo.
 * Público: alimenta os calendários do site e do painel. Só datas e motivos, nenhum dado pessoal.
 */
@Controller('dias-especiais')
export class DiasController {
  constructor(private readonly dias: DiasService) {}

  @Publico()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  listar(@Query() { de, ate }: ListarDiasDto): Promise<EstadoDia[]> {
    return this.dias.especiais(de, ate);
  }
}

/** Fechar / desbloquear um dia. Sem @Publico: exige sessão de admin (guard global). */
@Controller('admin/dias-especiais')
export class AdminDiasController {
  constructor(private readonly dias: DiasService) {}

  @Put(':data')
  definir(
    @Param('data') data: string,
    @Body() dto: DefinirDiaDto,
  ): Promise<EstadoDia> {
    return this.dias.definir(data, dto.fechado, dto.motivo);
  }
}
