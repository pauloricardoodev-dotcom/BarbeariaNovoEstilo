import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import type { Env } from '../config/env.validation.js';
import { Prisma, TipoTokenCliente } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const VALIDADE_MS: Record<TipoTokenCliente, number> = {
  verificar_email: 10 * 60_000,
  verificar_telefone: 10 * 60_000,
  recuperar_senha: 30 * 60_000,
};

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Códigos de verificação (6 dígitos) e tokens de recuperação de senha.
 * Guarda só o HMAC do valor: um vazamento do banco não revela códigos válidos,
 * e — diferente de um SHA-256 puro — não dá para testar o milhão de códigos offline.
 */
@Injectable()
export class TokensClienteService {
  private readonly chave: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    // Chave derivada, para não usar o segredo do JWT diretamente em outro propósito.
    this.chave = createHmac('sha256', config.get('JWT_SECRET', { infer: true }))
      .update('tokens_clientes')
      .digest();
  }

  private hash(valor: string): string {
    return createHmac('sha256', this.chave).update(valor).digest('base64url');
  }

  private iguais(a: string, b: string): boolean {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  }

  /**
   * Gera um novo código/token e invalida os anteriores do mesmo tipo.
   * Sem limite de reenvio nem de tentativas (desativado de propósito; ver PELOAMORDEDEUS.md).
   */
  async emitir(
    clienteId: string,
    tipo: TipoTokenCliente,
    _opcoes: { contatoNovo?: boolean } = {},
  ): Promise<string> {
    const agora = Date.now();

    const valor =
      tipo === 'recuperar_senha'
        ? randomBytes(32).toString('base64url')
        : randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.prisma.$transaction([
      this.prisma.tokenCliente.updateMany({
        where: { clienteId, tipo, usadoEm: null },
        data: { usadoEm: new Date(agora) },
      }),
      this.prisma.tokenCliente.create({
        data: {
          clienteId,
          tipo,
          tokenHash: this.hash(valor),
          expiraEm: new Date(agora + VALIDADE_MS[tipo]),
        },
      }),
    ]);
    return valor;
  }

  /**
   * Confere o código mais recente do cliente. Se correto, marca como usado e roda
   * `aoConfirmar` na mesma transação (ex.: marcar o e-mail como verificado).
   */
  async consumirCodigo(
    clienteId: string,
    tipo: 'verificar_email' | 'verificar_telefone',
    codigo: string,
    aoConfirmar: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> {
    const token = await this.prisma.tokenCliente.findFirst({
      where: { clienteId, tipo, usadoEm: null, expiraEm: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tokenHash: true },
    });
    if (!token) {
      throw new BadRequestException(
        'Código expirado ou inexistente. Solicite um novo.',
      );
    }

    if (!this.iguais(this.hash(codigo), token.tokenHash)) {
      throw new BadRequestException('Código incorreto.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.marcarUsado(tx, token.id);
      await aoConfirmar(tx);
    });
  }

  /** Valida e consome um token de recuperação de senha. Retorna o id do cliente, ou null. */
  async consumirRecuperacao(
    tx: Prisma.TransactionClient,
    valor: string,
  ): Promise<string | null> {
    const token = await tx.tokenCliente.findFirst({
      where: {
        tipo: 'recuperar_senha',
        tokenHash: this.hash(valor),
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
      select: { id: true, clienteId: true },
    });
    if (!token) return null;
    const usado = await tx.tokenCliente.updateMany({
      where: { id: token.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    return usado.count === 1 ? token.clienteId : null;
  }

  /** Invalida códigos pendentes (ex.: depois de trocar o e-mail, o código antigo não pode valer). */
  async invalidar(db: Db, clienteId: string, tipo: TipoTokenCliente) {
    await db.tokenCliente.updateMany({
      where: { clienteId, tipo, usadoEm: null },
      data: { usadoEm: new Date() },
    });
  }

  private async marcarUsado(tx: Prisma.TransactionClient, id: string) {
    // Condicional: se outra requisição usou o mesmo token no meio do caminho, aborta.
    const usado = await tx.tokenCliente.updateMany({
      where: { id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    if (usado.count === 0) {
      throw new BadRequestException(
        'Código expirado ou inexistente. Solicite um novo.',
      );
    }
  }
}
