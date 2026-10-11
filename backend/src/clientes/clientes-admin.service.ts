import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { traduzirConflito } from './conflitos.js';
import type {
  AtualizarClienteAdminDto,
  ListarClientesDto,
} from './dto/admin-clientes.dto.js';
import { TokensClienteService } from './tokens-cliente.service.js';

/** O que o painel vê de um cliente. Credenciais (senha_hash, google_sub) nunca saem daqui. */
const SELECAO_ADMIN = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  emailVerificadoEm: true,
  telefoneVerificadoEm: true,
  ativo: true,
  ultimoLoginEm: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ClienteAdmin = Prisma.ClienteGetPayload<{
  select: typeof SELECAO_ADMIN;
}>;

export interface PaginaClientes {
  itens: ClienteAdmin[];
  total: number;
  pagina: number;
  porPagina: number;
}

@Injectable()
export class ClientesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensClienteService,
  ) {}

  async listar({
    pagina,
    porPagina,
    busca,
  }: ListarClientesDto): Promise<PaginaClientes> {
    let where: Prisma.ClienteWhereInput = {};
    if (busca) {
      const digitos = busca.replace(/\D/g, '');
      where = {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          { email: { contains: busca.toLowerCase() } },
          ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
        ],
      };
    }
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        select: SELECAO_ADMIN,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return { itens, total, pagina, porPagina };
  }

  async buscarPorId(id: string): Promise<ClienteAdmin> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: SELECAO_ADMIN,
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    return cliente;
  }

  async atualizar(
    id: string,
    dto: AtualizarClienteAdminDto,
  ): Promise<ClienteAdmin> {
    const atual = await this.buscarPorId(id);
    const trocaEmail = dto.email !== undefined && dto.email !== atual.email;
    const trocaTelefone =
      dto.telefone !== undefined && dto.telefone !== atual.telefone;
    const desativa = dto.ativo === false && atual.ativo;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const cliente = await tx.cliente.update({
          where: { id },
          data: {
            nome: dto.nome,
            ativo: dto.ativo,
            // Contato trocado pelo admin precisa ser verificado de novo pelo cliente.
            ...(trocaEmail
              ? { email: dto.email, emailVerificadoEm: null }
              : {}),
            ...(trocaTelefone
              ? { telefone: dto.telefone, telefoneVerificadoEm: null }
              : {}),
            // Desativar derruba as sessões abertas.
            ...(desativa ? { versaoSessao: { increment: 1 } } : {}),
          },
          select: SELECAO_ADMIN,
        });
        if (trocaEmail) {
          await this.tokens.invalidar(tx, id, 'verificar_email');
          await this.tokens.invalidar(tx, id, 'recuperar_senha');
        }
        if (trocaTelefone) {
          await this.tokens.invalidar(tx, id, 'verificar_telefone');
        }
        return cliente;
      });
    } catch (erro) {
      return traduzirConflito(this.prisma, erro, dto, id);
    }
  }
}
