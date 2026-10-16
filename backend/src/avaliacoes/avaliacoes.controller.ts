import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Publico } from '../auth/decorators.js';
import { ClienteAtual, RotaCliente } from '../clientes/cliente-auth.js';
import type { ClienteAutenticado } from '../clientes/clientes.types.js';
import {
  AvaliacoesService,
  type AvaliacaoAdmin,
  type ListaAvaliacoes,
  type ListaAvaliacoesAdmin,
  type MinhaAvaliacao,
} from './avaliacoes.service.js';
import {
  AlterarPublicacaoDto,
  CriarAvaliacaoDto,
  ListarAvaliacoesAdminQuery,
  ListarAvaliacoesQuery,
} from './dto/avaliacoes.dto.js';
import { MAX_FOTOS } from './fotos.js';

/** Limite do que o navegador pode mandar por foto (o servidor ainda reduz e regrava). */
const TAMANHO_MAXIMO_FOTO = 8 * 1024 * 1024;

function enviarImagem(res: Response, dados: Buffer, publica: boolean): StreamableFile {
  res.set({
    'Content-Type': 'image/webp',
    // Pública: o navegador guarda por 1 h. Painel: nunca em cache compartilhado.
    'Cache-Control': publica ? 'public, max-age=3600' : 'private, no-store',
  });
  return new StreamableFile(dados);
}

/** Site público: lista as avaliações visíveis e entrega as fotos delas. Só o primeiro nome do cliente. */
@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly avaliacoes: AvaliacoesService) {}

  @Publico()
  @Get()
  listar(@Query() query: ListarAvaliacoesQuery): Promise<ListaAvaliacoes> {
    return this.avaliacoes.listarPublicas(query);
  }

  @Publico()
  @Get('fotos/:id')
  async foto(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviarImagem(res, await this.avaliacoes.lerFoto(id, { admin: false }), true);
  }
}

/** Avaliação do cliente logado. */
@RotaCliente()
@Controller('clientes/me/avaliacao')
export class ClienteAvaliacaoController {
  constructor(private readonly avaliacoes: AvaliacoesService) {}

  /** A avaliação atual do cliente, ou `null`. */
  @Get()
  async minha(@ClienteAtual() cliente: ClienteAutenticado): Promise<MinhaAvaliacao | null> {
    return this.avaliacoes.minhaAvaliacao(cliente.id);
  }

  /** multipart/form-data: `nota`, `comentario` e até 3 arquivos no campo `fotos`. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @UseInterceptors(
    FilesInterceptor('fotos', MAX_FOTOS, {
      limits: { fileSize: TAMANHO_MAXIMO_FOTO, files: MAX_FOTOS, fields: 5 },
    }),
  )
  criar(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: CriarAvaliacaoDto,
    @UploadedFiles() fotos: Express.Multer.File[] = [],
  ): Promise<MinhaAvaliacao> {
    return this.avaliacoes.criar(cliente, dto, fotos);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async apagar(@ClienteAtual() cliente: ClienteAutenticado): Promise<void> {
    await this.avaliacoes.removerMinha(cliente.id);
  }
}

/** Moderação no painel. Sem @Publico/@RotaCliente: exige sessão de admin (guard global). */
@Controller('admin/avaliacoes')
export class AdminAvaliacoesController {
  constructor(private readonly avaliacoes: AvaliacoesService) {}

  @Get()
  listar(@Query() query: ListarAvaliacoesAdminQuery): Promise<ListaAvaliacoesAdmin> {
    return this.avaliacoes.listarAdmin(query);
  }

  @Patch(':id')
  alterar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AlterarPublicacaoDto,
  ): Promise<Pick<AvaliacaoAdmin, 'id' | 'publicada'>> {
    return this.avaliacoes.definirPublicacao(id, dto.publicada);
  }

  /** Foto também de avaliações ocultas (o público só vê as visíveis). */
  @Get('fotos/:id')
  async foto(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return enviarImagem(res, await this.avaliacoes.lerFoto(id, { admin: true }), false);
  }
}
