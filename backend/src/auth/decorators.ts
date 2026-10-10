import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PapelAdmin } from '../generated/prisma/client.js';
import { CHAVE_PAPEIS, CHAVE_PUBLICO } from './auth.constants.js';
import type { UsuarioAutenticado } from './auth.types.js';

/** Libera a rota sem sessão de admin. Por padrão, toda rota exige login. */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

/** Restringe a rota aos papéis informados (além de exigir login). */
export const Papeis = (...papeis: PapelAdmin[]) =>
  SetMetadata(CHAVE_PAPEIS, papeis);

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<Request & { user: UsuarioAutenticado }>()
      .user,
);
