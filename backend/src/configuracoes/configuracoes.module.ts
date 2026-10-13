import { Module } from '@nestjs/common';
import {
  AdminConfiguracoesController,
  ConfiguracoesController,
} from './configuracoes.controller.js';
import { ConfiguracoesService } from './configuracoes.service.js';

@Module({
  controllers: [ConfiguracoesController, AdminConfiguracoesController],
  providers: [ConfiguracoesService],
  exports: [ConfiguracoesService],
})
export class ConfiguracoesModule {}
