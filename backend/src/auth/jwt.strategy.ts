import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { Env } from '../config/env.validation.js';
import { COOKIE_SESSAO } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { PayloadJwt, UsuarioAutenticado } from './auth.types.js';

function extrairTokenDoCookie(req: Request): string | null {
  const token: unknown = req?.cookies?.[COOKIE_SESSAO];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly authService: AuthService,
  ) {
    super({
      // Token só via cookie httpOnly: inacessível a JavaScript (mitiga roubo por XSS).
      jwtFromRequest: extrairTokenDoCookie,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: PayloadJwt): Promise<UsuarioAutenticado> {
    const usuario = await this.authService.buscarUsuarioAtivo(payload.sub);
    if (!usuario) throw new UnauthorizedException();
    return usuario;
  }
}
