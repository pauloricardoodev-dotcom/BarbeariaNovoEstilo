import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Env } from '../config/env.validation.js';
import { AdminClientesController } from './admin-clientes.controller.js';
import { ClienteAuthGuard, ClienteJwtStrategy } from './cliente-auth.js';
import { ClientesAdminService } from './clientes-admin.service.js';
import {
  ClientesAuthController,
  ClientesMeController,
  CookieSessaoCliente,
} from './clientes.controller.js';
import { AUDIENCIA_CLIENTE } from './clientes.types.js';
import { ContaClienteService } from './conta-cliente.service.js';
import { TokensClienteService } from './tokens-cliente.service.js';

@Module({
  imports: [
    PassportModule,
    // JwtService próprio: emite tokens com aud "cliente" e duração da sessão de cliente.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          audience: AUDIENCIA_CLIENTE,
          expiresIn: config.get('SESSAO_CLIENTE_DURACAO_SEGUNDOS', {
            infer: true,
          }),
        },
      }),
    }),
  ],
  controllers: [
    ClientesAuthController,
    ClientesMeController,
    AdminClientesController,
  ],
  providers: [
    ContaClienteService,
    ClientesAdminService,
    TokensClienteService,
    CookieSessaoCliente,
    ClienteJwtStrategy,
    ClienteAuthGuard,
  ],
})
export class ClientesModule {}
