import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CHAVE_PUBLICO } from './auth.constants.js';

/** Guard global: toda rota exige sessão de admin, exceto as marcadas com @Publico(). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const publica = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);
    return publica ? true : super.canActivate(context);
  }
}
