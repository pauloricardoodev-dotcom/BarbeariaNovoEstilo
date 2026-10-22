import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import { GatewayDesligado, GatewayPagamento } from './gateway.js';
import { GatewayMercadoPago } from './mercadopago.js';
import {
  ClientePagamentosController,
  ConfigPagamentosController,
  WebhookPagamentosController,
} from './pagamentos.controller.js';
import { PagamentosService } from './pagamentos.service.js';

@Module({
  controllers: [
    ClientePagamentosController,
    ConfigPagamentosController,
    WebhookPagamentosController,
  ],
  providers: [
    PagamentosService,
    {
      provide: GatewayPagamento,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): GatewayPagamento =>
        config.get('PAGAMENTO_PROVEDOR', { infer: true }) === 'mercadopago'
          ? new GatewayMercadoPago(config)
          : new GatewayDesligado(),
    },
  ],
  exports: [PagamentosService],
})
export class PagamentosModule {}
