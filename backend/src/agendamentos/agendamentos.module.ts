import { Module } from '@nestjs/common';
import { PagamentosModule } from '../pagamentos/pagamentos.module.js';
import { ConfiguracoesModule } from '../configuracoes/configuracoes.module.js';
import { DiasModule } from '../dias/dias.module.js';
import {
  AdminAgendamentosController,
  AdminReagendamentosController,
  AdminSolicitacoesController,
  ClienteAgendamentosController,
  DisponibilidadeController,
} from './agendamentos.controller.js';
import { AgendamentosService } from './agendamentos.service.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [ConfiguracoesModule, DiasModule, PagamentosModule],
  controllers: [
    DashboardController,
    DisponibilidadeController,
    ClienteAgendamentosController,
    AdminAgendamentosController,
    AdminReagendamentosController,
    AdminSolicitacoesController,
  ],
  providers: [AgendamentosService, DashboardService],
})
export class AgendamentosModule {}
