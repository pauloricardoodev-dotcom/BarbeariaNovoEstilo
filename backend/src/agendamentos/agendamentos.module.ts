import { Module } from '@nestjs/common';
import {
  AdminAgendamentosController,
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
    AdminSolicitacoesController,
  ],
  providers: [AgendamentosService],
})
export class AgendamentosModule {}
