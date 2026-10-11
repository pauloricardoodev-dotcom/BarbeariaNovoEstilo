import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { CHAVE_ROTA_CLIENTE } from '../auth/auth.constants.js';
import type { Env } from '../config/env.validation.js';
import {
  AUDIENCIA_CLIENTE,
  COOKIE_SESSAO_CLIENTE,
  type ClienteAutenticado,
  type PayloadJwtCliente,
} from './clientes.types.js';
import { ContaClienteService } from './conta-cliente.service.js';

function extrairTokenDoCookie(req: Request): string | null {
  const token: unknown = req?.cookies?.[COOKIE_SESSAO_CLIENTE];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class ClienteJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-cliente',
) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly conta: ContaClienteService,
  ) {
    super({
      // Token só via cookie httpOnly, como no admin.
      jwtFromRequest: extrairTokenDoCookie,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
      // Token de admin (aud "admin") é recusado aqui, e vice-versa.
      audience: AUDIENCIA_CLIENTE,
      ignoreExpiration: false,
    });
  }

  async validate(payload: PayloadJwtCliente): Promise<ClienteAutenticado> {
    const cliente = await this.conta.buscarClienteDaSessao(payload);
    if (!cliente) throw new UnauthorizedException();
    return cliente;
  }
}

@Injectable()
export class ClienteAuthGuard extends AuthGuard('jwt-cliente') {}

/** Exige sessão de cliente (e dispensa a de admin, que é o padrão global). */
export const RotaCliente = () =>
  applyDecorators(
    SetMetadata(CHAVE_ROTA_CLIENTE, true),
    UseGuards(ClienteAuthGuard),
  );

export const ClienteAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClienteAutenticado =>
    ctx.switchToHttp().getRequest<Request & { user: ClienteAutenticado }>()
      .user,
);
