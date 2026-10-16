import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ClienteAutenticado } from '../clientes/clientes.types.js';
import { ehViolacaoDeUnicidade } from '../clientes/conflitos.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ArmazenamentoFotos } from './armazenamento.js';
import type {
  CriarAvaliacaoDto,
  ListarAvaliacoesAdminQuery,
  ListarAvaliacoesQuery,
} from './dto/avaliacoes.dto.js';
import { MAX_FOTOS, prepararFoto } from './fotos.js';

export interface FotoResposta {
  id: string;
  /** Rota da nossa API que entrega a imagem (o bucket é privado). */
  url: string;
}

/** O que o site público vê: só o primeiro nome do cliente, nenhum outro dado pessoal. */
export interface AvaliacaoPublica {
  id: string;
  nome: string;
  nota: number;
  comentario: string;
  criadaEm: string;
  fotos: FotoResposta[];
}

export interface ListaAvaliacoes {
  media: number | null;
  total: number;
  pagina: number;
  limite: number;
  itens: AvaliacaoPublica[];
}

export interface MinhaAvaliacao {
  id: string;
  nota: number;
  comentario: string;
  criadaEm: string;
  /** false = o dono ocultou: o cliente ainda a vê, mas o site não mostra. */
  publicada: boolean;
  fotos: FotoResposta[];
}

export interface AvaliacaoAdmin extends AvaliacaoPublica {
  publicada: boolean;
  clienteNome: string;
  clienteEmail: string;
  fotos: FotoResposta[];
}

export interface ListaAvaliacoesAdmin {
  total: number;
  pagina: number;
  limite: number;
  itens: AvaliacaoAdmin[];
}

const LIMITE_PADRAO = 9;

const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? '';

const SELECAO_FOTOS = {
  select: { id: true },
  orderBy: { posicao: 'asc' },
} as const;

@Injectable()
export class AvaliacoesService {
  private readonly logger = new Logger(AvaliacoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoFotos,
  ) {}

  private fotos(lista: { id: string }[], admin = false): FotoResposta[] {
    const base = admin ? '/api/admin/avaliacoes/fotos' : '/api/avaliacoes/fotos';
    return lista.map((f) => ({ id: f.id, url: `${base}/${f.id}` }));
  }

  /** Avaliações visíveis no site, mais recentes primeiro, com a média e o total. */
  async listarPublicas(q: ListarAvaliacoesQuery): Promise<ListaAvaliacoes> {
    const pagina = q.pagina ?? 1;
    const limite = q.limite ?? LIMITE_PADRAO;
    const where = { publicada: true, removidaEm: null };

    const [agregado, linhas] = await Promise.all([
      this.prisma.avaliacao.aggregate({
        where,
        _avg: { nota: true },
        _count: { _all: true },
      }),
      this.prisma.avaliacao.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        select: {
          id: true,
          nota: true,
          comentario: true,
          createdAt: true,
          cliente: { select: { nome: true } },
          fotos: SELECAO_FOTOS,
        },
      }),
    ]);

    const media = agregado._avg.nota;
    return {
      media: media === null ? null : Math.round(media * 10) / 10,
      total: agregado._count._all,
      pagina,
      limite,
      itens: linhas.map((a) => ({
        id: a.id,
        nome: primeiroNome(a.cliente.nome),
        nota: a.nota,
        comentario: a.comentario,
        criadaEm: a.createdAt.toISOString(),
        fotos: this.fotos(a.fotos),
      })),
    };
  }

  async minhaAvaliacao(clienteId: string): Promise<MinhaAvaliacao | null> {
    const a = await this.prisma.avaliacao.findFirst({
      where: { clienteId, removidaEm: null },
      select: {
        id: true,
        nota: true,
        comentario: true,
        publicada: true,
        createdAt: true,
        fotos: SELECAO_FOTOS,
      },
    });
    if (!a) return null;
    return {
      id: a.id,
      nota: a.nota,
      comentario: a.comentario,
      criadaEm: a.createdAt.toISOString(),
      publicada: a.publicada,
      fotos: this.fotos(a.fotos),
    };
  }

  /** Publica na hora. Uma avaliação ativa por cliente; conta precisa estar verificada (como para agendar). */
  async criar(
    cliente: ClienteAutenticado,
    dto: CriarAvaliacaoDto,
    arquivos: Express.Multer.File[],
  ): Promise<MinhaAvaliacao> {
    if (!cliente.emailVerificado || !cliente.telefoneVerificado) {
      throw new ForbiddenException(
        'Confirme seu e-mail e seu WhatsApp para poder avaliar.',
      );
    }
    if (arquivos.length > MAX_FOTOS) {
      throw new BadRequestException(`Envie no máximo ${MAX_FOTOS} fotos.`);
    }
    const existente = await this.prisma.avaliacao.findFirst({
      where: { clienteId: cliente.id, removidaEm: null },
      select: { id: true },
    });
    if (existente) throw new ConflictException(MSG_JA_AVALIOU);

    // Valida e regrava as fotos antes de gravar qualquer coisa.
    const preparadas: Buffer[] = [];
    for (const arquivo of arquivos) {
      preparadas.push(await prepararFoto(arquivo.buffer));
    }

    const id = randomUUID();
    const caminhos = preparadas.map(() => `avaliacoes/${id}/${randomUUID()}.webp`);
    const enviados: string[] = [];
    try {
      for (let i = 0; i < preparadas.length; i++) {
        await this.armazenamento.salvar(caminhos[i], preparadas[i]);
        enviados.push(caminhos[i]);
      }
    } catch (erro) {
      this.logger.error(`Falha ao guardar fotos da avaliação: ${String(erro)}`);
      await this.limpar(enviados);
      throw new ServiceUnavailableException(
        'Não foi possível salvar as fotos agora. Tente novamente em instantes.',
      );
    }

    try {
      await this.prisma.avaliacao.create({
        data: {
          id,
          clienteId: cliente.id,
          nota: dto.nota,
          comentario: dto.comentario,
          fotos: {
            create: caminhos.map((caminho, i) => ({ caminho, posicao: i + 1 })),
          },
        },
        select: { id: true },
      });
    } catch (erro) {
      await this.limpar(enviados);
      // Envio duplo simultâneo: o índice único parcial do banco é a garantia final.
      if (ehViolacaoDeUnicidade(erro)) throw new ConflictException(MSG_JA_AVALIOU);
      throw erro;
    }

    const criada = await this.minhaAvaliacao(cliente.id);
    if (!criada) throw new ServiceUnavailableException();
    return criada;
  }

  /** O cliente apaga a própria avaliação: o registro fica (removida_em) e as fotos são apagadas de vez. */
  async removerMinha(clienteId: string): Promise<void> {
    const atual = await this.prisma.avaliacao.findFirst({
      where: { clienteId, removidaEm: null },
      select: { id: true, fotos: { select: { caminho: true } } },
    });
    if (!atual) throw new NotFoundException('Você não tem avaliação para apagar.');

    await this.prisma.$transaction(async (tx) => {
      await tx.avaliacaoFoto.deleteMany({ where: { avaliacaoId: atual.id } });
      await tx.avaliacao.update({
        where: { id: atual.id },
        data: { removidaEm: new Date() },
        select: { id: true },
      });
    });
    await this.limpar(atual.fotos.map((f) => f.caminho));
  }

  /** Imagem de uma avaliação. No site público só se a avaliação estiver visível. */
  async lerFoto(id: string, { admin }: { admin: boolean }): Promise<Buffer> {
    const foto = await this.prisma.avaliacaoFoto.findFirst({
      where: {
        id,
        avaliacao: admin
          ? { removidaEm: null }
          : { publicada: true, removidaEm: null },
      },
      select: { caminho: true },
    });
    const dados = foto ? await this.armazenamento.ler(foto.caminho) : null;
    if (!dados) throw new NotFoundException('Foto não encontrada.');
    return dados;
  }

  // ---- Painel ----

  async listarAdmin(q: ListarAvaliacoesAdminQuery): Promise<ListaAvaliacoesAdmin> {
    const pagina = q.pagina ?? 1;
    const limite = q.limite ?? 20;
    const where = {
      removidaEm: null,
      ...(q.situacao === 'visiveis' ? { publicada: true } : {}),
      ...(q.situacao === 'ocultas' ? { publicada: false } : {}),
    };
    const [total, linhas] = await Promise.all([
      this.prisma.avaliacao.count({ where }),
      this.prisma.avaliacao.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        select: {
          id: true,
          nota: true,
          comentario: true,
          publicada: true,
          createdAt: true,
          cliente: { select: { nome: true, email: true } },
          fotos: SELECAO_FOTOS,
        },
      }),
    ]);
    return {
      total,
      pagina,
      limite,
      itens: linhas.map((a) => ({
        id: a.id,
        nome: primeiroNome(a.cliente.nome),
        nota: a.nota,
        comentario: a.comentario,
        criadaEm: a.createdAt.toISOString(),
        publicada: a.publicada,
        clienteNome: a.cliente.nome,
        clienteEmail: a.cliente.email,
        fotos: this.fotos(a.fotos, true),
      })),
    };
  }

  /** "Excluir" no painel = ocultar do site (dá para mostrar de novo). */
  async definirPublicacao(id: string, publicada: boolean): Promise<{ id: string; publicada: boolean }> {
    const { count } = await this.prisma.avaliacao.updateMany({
      where: { id, removidaEm: null },
      data: { publicada },
    });
    if (count === 0) throw new NotFoundException('Avaliação não encontrada.');
    return { id, publicada };
  }

  private async limpar(caminhos: string[]): Promise<void> {
    if (caminhos.length === 0) return;
    try {
      await this.armazenamento.remover(caminhos);
    } catch (erro) {
      // Arquivo órfão no armazenamento não afeta o cliente; só registra para limpeza manual.
      this.logger.warn(`Não foi possível apagar ${caminhos.length} foto(s): ${String(erro)}`);
    }
  }
}

const MSG_JA_AVALIOU =
  'Você já enviou uma avaliação. Apague a atual para enviar outra.';
