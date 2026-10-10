import type { PapelAdmin } from '../generated/prisma/client.js';

/** Dados do admin logado expostos à API e ao frontend (sem hash de senha). */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: PapelAdmin;
}

export interface PayloadJwt {
  sub: string;
  papel: PapelAdmin;
}
