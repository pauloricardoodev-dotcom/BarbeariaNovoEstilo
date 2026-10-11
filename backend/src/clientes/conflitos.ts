import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === 'P2002'
  );
}

/**
 * Converte violação de UNIQUE (e-mail/telefone) numa mensagem clara.
 * A constraint do banco é a garantia final contra duplicatas — inclusive em
 * requisições simultâneas; aqui só descobrimos qual campo colidiu.
 */
export async function traduzirConflito(
  prisma: PrismaService,
  erro: unknown,
  dados: { email?: string; telefone?: string },
  ignorarId?: string,
): Promise<never> {
  if (!ehViolacaoDeUnicidade(erro)) throw erro;

  const outro = (where: Prisma.ClienteWhereInput) =>
    prisma.cliente.findFirst({
      where: { ...where, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) },
      select: { id: true },
    });

  if (dados.email && (await outro({ email: dados.email }))) {
    throw new ConflictException('Este e-mail já está cadastrado.');
  }
  if (dados.telefone && (await outro({ telefone: dados.telefone }))) {
    throw new ConflictException('Este telefone já está cadastrado.');
  }
  throw new ConflictException('Estes dados já estão cadastrados.');
}
