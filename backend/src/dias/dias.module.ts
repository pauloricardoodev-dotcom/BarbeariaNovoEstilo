import { Module } from '@nestjs/common';
import { ConfiguracoesModule } from '../configuracoes/configuracoes.module.js';
import { AdminDiasController, DiasController } from './dias.controller.js';
import { DiasService } from './dias.service.js';

@Module({
  imports: [ConfiguracoesModule],
  controllers: [DiasController, AdminDiasController],
  providers: [DiasService],
  exports: [DiasService],
})
export class DiasModule {}
