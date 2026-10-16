import { Logger } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

/**
 * Onde ficam os arquivos das fotos. Abstrato como EmailService/WhatsAppService:
 * Supabase Storage em produção, disco local em dev/teste (sem configurar nada externo).
 * Os caminhos são gerados pelo backend (uuid), nunca vêm do cliente.
 */
export abstract class ArmazenamentoFotos {
  abstract salvar(caminho: string, dados: Buffer): Promise<void>;
  /** null se o arquivo não existir. */
  abstract ler(caminho: string): Promise<Buffer | null>;
  abstract remover(caminhos: string[]): Promise<void>;
}

/** Arquivos em `uploads/` (ignorado pelo git). Só para desenvolvimento e testes. */
export class ArmazenamentoLocal extends ArmazenamentoFotos {
  private readonly base: string;

  constructor(base = resolve(process.cwd(), 'uploads')) {
    super();
    this.base = resolve(base);
  }

  private arquivo(caminho: string): string {
    const alvo = resolve(this.base, caminho);
    // Defesa extra: nunca sair da pasta base, mesmo que um caminho estranho chegasse aqui.
    if (!alvo.startsWith(this.base + sep)) throw new Error('Caminho inválido.');
    return alvo;
  }

  async salvar(caminho: string, dados: Buffer): Promise<void> {
    const alvo = this.arquivo(caminho);
    await mkdir(dirname(alvo), { recursive: true });
    await writeFile(alvo, dados, { flag: 'wx' });
  }

  async ler(caminho: string): Promise<Buffer | null> {
    try {
      return await readFile(this.arquivo(caminho));
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw erro;
    }
  }

  async remover(caminhos: string[]): Promise<void> {
    await Promise.all(
      caminhos.map((c) => rm(this.arquivo(c), { force: true })),
    );
  }
}

/**
 * Supabase Storage (API REST). Usa a chave `service_role`, que só existe no backend: o bucket
 * é privado e o navegador nunca fala com o Supabase, só com a nossa API.
 */
export class ArmazenamentoSupabase extends ArmazenamentoFotos {
  private readonly logger = new Logger(ArmazenamentoSupabase.name);
  private readonly base: string;

  constructor(
    url: string,
    private readonly chave: string,
    private readonly bucket: string,
  ) {
    super();
    this.base = `${url.replace(/\/+$/, '')}/storage/v1`;
  }

  private cabecalhos(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `Bearer ${this.chave}`, apikey: this.chave, ...extra };
  }

  private rota(prefixo: string, caminho: string): string {
    const codificado = caminho.split('/').map(encodeURIComponent).join('/');
    return `${this.base}/${prefixo}/${this.bucket}/${codificado}`;
  }

  /** Mensagem sem a chave nem o corpo da resposta do Supabase. */
  private falha(acao: string, status: number): Error {
    this.logger.error(`Supabase Storage: ${acao} falhou (HTTP ${status}).`);
    return new Error(`Armazenamento indisponível (${acao}).`);
  }

  async salvar(caminho: string, dados: Buffer): Promise<void> {
    const res = await fetch(this.rota('object', caminho), {
      method: 'POST',
      headers: this.cabecalhos({
        'Content-Type': 'image/webp',
        'x-upsert': 'false',
      }),
      body: new Uint8Array(dados),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw this.falha('salvar', res.status);
  }

  async ler(caminho: string): Promise<Buffer | null> {
    const res = await fetch(this.rota('object/authenticated', caminho), {
      headers: this.cabecalhos(),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw this.falha('ler', res.status);
    return Buffer.from(await res.arrayBuffer());
  }

  async remover(caminhos: string[]): Promise<void> {
    if (caminhos.length === 0) return;
    const res = await fetch(`${this.base}/object/${this.bucket}`, {
      method: 'DELETE',
      headers: this.cabecalhos({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: caminhos }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw this.falha('remover', res.status);
  }
}
