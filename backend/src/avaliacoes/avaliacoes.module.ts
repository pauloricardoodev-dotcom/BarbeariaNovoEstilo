import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import {
  AdminAvaliacoesController,
  AvaliacoesController,
  ClienteAvaliacaoController,
} from './avaliacoes.controller.js';
import { AvaliacoesService } from './avaliacoes.service.js';
import {
  ArmazenamentoFotos,
  ArmazenamentoLocal,
  ArmazenamentoSupabase,
} from './armazenamento.js';

@Module({
  controllers: [
    AvaliacoesController,
    ClienteAvaliacaoController,
    AdminAvaliacoesController,
  ],
  providers: [
    AvaliacoesService,
    {
      provide: ArmazenamentoFotos,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): ArmazenamentoFotos => {
        if (config.get('ARMAZENAMENTO_PROVEDOR', { infer: true }) === 'supabase') {
          return new ArmazenamentoSupabase(
            config.get('SUPABASE_URL', { infer: true }),
            config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
            config.get('SUPABASE_BUCKET_AVALIACOES', { infer: true }),
          );
        }
        if (config.get('NODE_ENV', { infer: true }) === 'production') {
          new Logger('Armazenamento').warn(
            'ARMAZENAMENTO_PROVEDOR=local em produção: as fotos ficam no disco do servidor (podem se perder no deploy).',
          );
        }
        return new ArmazenamentoLocal();
      },
    },
  ],
})
export class AvaliacoesModule {}
