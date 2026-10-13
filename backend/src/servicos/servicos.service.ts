import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AtualizarServicoDto,
  CriarServicoDto,
} from './dto/servicos.dto.js';

const SELECAO = {
  id: true,
  nome: true,
  descricao: true,
  preco: true,
  duracaoMinutos: true,
  ativo: true,
} as const;

type LinhaServico = Prisma.ServicoGetPayload<{ select: typeof SELECAO }>;

export interface ServicoResposta {
  id: string;
  nome: string;
  descricao: string | null;
  /** Em reais, como número (a coluna é DECIMAL(10,2)). */
  preco: number;
  duracaoMinutos: number;
  ativo: boolean;
}

function paraResposta(s: LinhaServico): ServicoResposta {
  return { ...s, preco: s.preco.toNumber() };
}

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo público: só serviços ativos. */
  async listarAtivos(): Promise<ServicoResposta[]> {
    const itens = await this.prisma.servico.findMany({
      where: { ativo: true },
      select: SELECAO,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return itens.map(paraResposta);
  }

  /** Painel: todos, inclusive inativos. */
  async listarTodos(): Promise<ServicoResposta[]> {
    const itens = await this.prisma.servico.findMany({
      select: SELECAO,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return itens.map(paraResposta);
  }

  async criar(dto: CriarServicoDto): Promise<ServicoResposta> {
    try {
      const criado = await this.prisma.servico.create({
        data: {
          nome: dto.nome,
          descricao: dto.descricao ?? null,
          preco: dto.preco,
          duracaoMinutos: dto.duracaoMinutos,
          ativo: dto.ativo ?? true,
        },
        select: SELECAO,
      });
      return paraResposta(criado);
    } catch (erro) {
      return this.traduzirErro(erro);
    }
  }

  async atualizar(
    id: string,
    dto: AtualizarServicoDto,
  ): Promise<ServicoResposta> {
    try {
      const atualizado = await this.prisma.servico.update({
        where: { id },
        data: {
          nome: dto.nome,
          descricao: dto.descricao,
          preco: dto.preco,
          duracaoMinutos: dto.duracaoMinutos,
          ativo: dto.ativo,
        },
        select: SELECAO,
      });
      return paraResposta(atualizado);
    } catch (erro) {
      return this.traduzirErro(erro);
    }
  }

  /** O índice único do banco é a garantia final; aqui só viram mensagens claras. */
  private traduzirErro(erro: unknown): never {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2002') {
        throw new ConflictException('Já existe um serviço com este nome.');
      }
      if (erro.code === 'P2025') {
        throw new NotFoundException('Serviço não encontrado.');
      }
    }
    throw erro;
  }
}
