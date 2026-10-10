import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { PapelAdmin } from '../generated/prisma/client.js';
import { CHAVE_PAPEIS } from './auth.constants.js';
import type { UsuarioAutenticado } from './auth.types.js';

/** Aplica @Papeis(...). Sem o decorator, qualquer admin logado passa. */
@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const papeis = this.reflector.getAllAndOverride<PapelAdmin[] | undefined>(
      CHAVE_PAPEIS,
      [context.getHandler(), context.getClass()],
    );
    if (!papeis || papeis.length === 0) return true;

    const usuario = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>().user;
    if (!usuario || !papeis.includes(usuario.papel)) {
      throw new ForbiddenException('Você não tem permissão para esta ação.');
    }
    return true;
  }
}
