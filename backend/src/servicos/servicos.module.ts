import { Module } from '@nestjs/common';
import {
  AdminServicosController,
  ServicosController,
} from './servicos.controller.js';
import { ServicosService } from './servicos.service.js';

@Module({
  controllers: [ServicosController, AdminServicosController],
  providers: [ServicosService],
})
export class ServicosModule {}
