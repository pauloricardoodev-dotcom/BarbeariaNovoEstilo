import { Controller, Get, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { ResumoDashboard } from './dashboard.js';
import { DashboardService } from './dashboard.service.js';

class ResumoDashboardDto {
  /** 'AAAA-MM'. Formato inválido vira 400 no serviço. */
  @IsString({ message: 'Informe o mês no formato AAAA-MM.' })
  mes!: string;
}

/** Números do painel. Sem @Publico: exige sessão de admin (guard global). */
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  resumo(@Query() { mes }: ResumoDashboardDto): Promise<ResumoDashboard> {
    return this.dashboard.resumo(mes);
  }
}
