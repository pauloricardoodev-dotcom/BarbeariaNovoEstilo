import { Module } from '@nestjs/common';
import {
  AdminAgendamentosController,
  AdminReagendamentosController,
  AdminSolicitacoesController,
  ClienteAgendamentosController,
  DisponibilidadeController,
} from './agendamentos.controller.js';
import { AgendamentosService } from './agendamentos.service.js';

@Module({
  controllers: [
    DisponibilidadeController,
    ClienteAgendamentosController,
    AdminAgendamentosController,
    AdminReagendamentosController,
    AdminSolicitacoesController,
  ],
  providers: [AgendamentosService],
})
export class AgendamentosModule {}
