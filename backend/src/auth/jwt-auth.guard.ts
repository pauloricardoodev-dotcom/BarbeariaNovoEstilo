import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CHAVE_PUBLICO, CHAVE_ROTA_CLIENTE } from './auth.constants.js';

/** Guard global: toda rota exige sessão de admin, exceto as marcadas com @Publico() ou @RotaCliente(). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const alvos = [context.getHandler(), context.getClass()];
    const publica = this.reflector.getAllAndOverride<boolean>(
      CHAVE_PUBLICO,
      alvos,
    );
    const rotaCliente = this.reflector.getAllAndOverride<boolean>(
      CHAVE_ROTA_CLIENTE,
      alvos,
    );
    return publica || rotaCliente ? true : super.canActivate(context);
  }
}
