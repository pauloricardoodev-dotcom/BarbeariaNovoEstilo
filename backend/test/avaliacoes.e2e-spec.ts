// Avaliações pela API (site público, cliente, painel) com o banco substituído por um fake em memória
// e as fotos guardadas em memória. O índice único parcial e as CHECKs do Postgres são exercitados
// pela migration; aqui se confere a integração HTTP: autenticação, validação, fotos e moderação.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { ArmazenamentoFotos } from '../src/avaliacoes/armazenamento.js';
import { gerarHashSenha } from '../src/auth/senha.js';
import { configurarApp } from '../src/configurar-app.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const SENHA = 'senha-do-cliente-123';
const ID_ADMIN = '7d0f9a3e-0000-4000-8000-000000000001';
const ID_A = '11111111-1111-4111-8111-00000000000a';
const ID_B = '11111111-1111-4111-8111-00000000000b';
const ID_N = '11111111-1111-4111-8111-00000000000c'; // conta não verificada
const ID_INEXISTENTE = '33333333-3333-4333-8333-333333333333';

interface FotoFake {
  id: string;
  posicao: number;
  caminho: string;
}
interface AvFake {
  id: string;
  clienteId: string;
  nota: number;
  comentario: string;
  publicada: boolean;
  removidaEm: Date | null;
  createdAt: Date;
  fotos: FotoFake[];
}

class ArmazenamentoMemoria extends ArmazenamentoFotos {
  arquivos = new Map<string, Buffer>();
  falharAoSalvar = false;
  salvar(caminho: string, dados: Buffer) {
    if (this.falharAoSalvar) return Promise.reject(new Error('indisponível'));
    this.arquivos.set(caminho, dados);
    return Promise.resolve();
  }
  ler(caminho: string) {
    return Promise.resolve(this.arquivos.get(caminho) ?? null);
  }
  remover(caminhos: string[]) {
    caminhos.forEach((c) => this.arquivos.delete(c));
    return Promise.resolve();
  }
}

function erroPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError('falha', {
    code,
    clientVersion: 'teste',
  });
}

const jpeg = (largura = 60, altura = 40) =>
  sharp({ create: { width: largura, height: altura, channels: 3, background: '#aa2233' } })
    .jpeg()
    .toBuffer();
const png = () =>
  sharp({ create: { width: 30, height: 30, channels: 3, background: '#223344' } })
    .png()
    .toBuffer();

describe('Avaliações (e2e)', () => {
  let app: INestApplication<App>;
  let avaliacoes: AvFake[];
  let seq = 0;
  /** Simula o envio duplo simultâneo: o INSERT bate no índice único parcial. */
  let conflitoNoInsert = false;
  const armazenamento = new ArmazenamentoMemoria();
  let storage = new ThrottlerStorageService();
  let cookieA: string;
  let cookieB: string;
  let cookieN: string;
  let cookieAdmin: string;

  const clientes: Record<string, { id: string; nome: string; email: string; senhaHash: string; ok: boolean }> = {};
  const http = () => request(app.getHttpServer());

  const casa = (a: AvFake, where: any = {}): boolean =>
    Object.entries<any>(where).every(([campo, valor]) => {
      if (campo === 'avaliacao') return true; // tratado em avaliacaoFoto.findFirst
      return (a as any)[campo] === valor;
    });

  const projetar = (a: AvFake) => ({
    ...a,
    cliente: { nome: clientes[a.clienteId].nome, email: clientes[a.clienteId].email },
    fotos: [...a.fotos].sort((x, y) => x.posicao - y.posicao),
  });

  beforeAll(async () => {
    const hash = await gerarHashSenha(SENHA);
    const base = { senhaHash: hash };
    clientes[ID_A] = { id: ID_A, nome: 'Ana Souza Lima', email: 'a@t.invalid', ok: true, ...base };
    clientes[ID_B] = { id: ID_B, nome: 'Bruno Lima', email: 'b@t.invalid', ok: true, ...base };
    clientes[ID_N] = { id: ID_N, nome: 'Nina Costa', email: 'n@t.invalid', ok: false, ...base };

    const sessaoCliente = (c: (typeof clientes)[string]) => ({
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: '+5541999990000',
      emailVerificadoEm: c.ok ? new Date() : null,
      telefoneVerificadoEm: c.ok ? new Date() : null,
      senhaHash: c.senhaHash,
      versaoSessao: 0,
    });

    const fake: any = {
      usuarioAdmin: {
        findUnique: () =>
          Promise.resolve({ id: ID_ADMIN, nome: 'Dono', email: 'dono@novoestilo.com', senhaHash: hash, papel: 'ADMIN', ativo: true }),
        findFirst: () =>
          Promise.resolve({ id: ID_ADMIN, nome: 'Dono', email: 'dono@novoestilo.com', papel: 'ADMIN' }),
      },
      cliente: {
        findUnique: ({ where }: any) => {
          const c = Object.values(clientes).find((x) => x.email === where.email);
          return Promise.resolve(c && { ...sessaoCliente(c), ativo: true });
        },
        findFirst: ({ where }: any) => {
          const c = clientes[where.id];
          return Promise.resolve(c ? sessaoCliente(c) : null);
        },
        update: () => Promise.resolve({ id: 'x' }),
      },
      avaliacao: {
        findFirst: ({ where }: any) => {
          const a = avaliacoes.find((x) => casa(x, where));
          return Promise.resolve(a ? projetar(a) : null);
        },
        findMany: ({ where, skip = 0, take = 100 }: any) =>
          Promise.resolve(
            avaliacoes
              .filter((x) => casa(x, where))
              .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
              .slice(skip, skip + take)
              .map(projetar),
          ),
        count: ({ where }: any) => Promise.resolve(avaliacoes.filter((x) => casa(x, where)).length),
        aggregate: ({ where }: any) => {
          const lista = avaliacoes.filter((x) => casa(x, where));
          const soma = lista.reduce((t, x) => t + x.nota, 0);
          return Promise.resolve({
            _avg: { nota: lista.length ? soma / lista.length : null },
            _count: { _all: lista.length },
          });
        },
        create: ({ data }: any) => {
          const ativa = avaliacoes.some((x) => x.clienteId === data.clienteId && x.removidaEm === null);
          if (conflitoNoInsert || ativa) return Promise.reject(erroPrisma('P2002'));
          const nova: AvFake = {
            id: data.id,
            clienteId: data.clienteId,
            nota: data.nota,
            comentario: data.comentario,
            publicada: true,
            removidaEm: null,
            createdAt: new Date(Date.now() + ++seq), // ordem estável
            fotos: (data.fotos?.create ?? []).map((f: any) => ({ id: randomUUID(), ...f })),
          };
          avaliacoes.push(nova);
          return Promise.resolve({ id: nova.id });
        },
        update: ({ where, data }: any) => {
          const a = avaliacoes.find((x) => x.id === where.id)!;
          Object.assign(a, data);
          return Promise.resolve({ id: a.id });
        },
        updateMany: ({ where, data }: any) => {
          const alvos = avaliacoes.filter((x) => casa(x, where));
          alvos.forEach((a) => Object.assign(a, data));
          return Promise.resolve({ count: alvos.length });
        },
      },
      avaliacaoFoto: {
        findFirst: ({ where }: any) => {
          for (const a of avaliacoes) {
            const foto = a.fotos.find((f) => f.id === where.id);
            if (!foto) continue;
            const cond = where.avaliacao ?? {};
            if (cond.removidaEm === null && a.removidaEm !== null) continue;
            if (cond.publicada === true && !a.publicada) continue;
            return Promise.resolve({ caminho: foto.caminho });
          }
          return Promise.resolve(null);
        },
        deleteMany: ({ where }: any) => {
          const a = avaliacoes.find((x) => x.id === where.avaliacaoId);
          if (a) a.fotos = [];
          return Promise.resolve({ count: 0 });
        },
      },
      $transaction: (arg: any) => (typeof arg === 'function' ? arg(fake) : Promise.all(arg)),
      $disconnect: () => Promise.resolve(),
    };

    const throttler: ThrottlerStorage = { increment: (...a) => storage.increment(...a) };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fake)
      .overrideProvider(ThrottlerStorage)
      .useValue(throttler)
      .overrideProvider(ArmazenamentoFotos)
      .useValue(armazenamento)
      .compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();

    const logarCliente = async (email: string) =>
      (
        await http().post('/api/clientes/auth/login').send({ email, senha: SENHA }).expect(200)
      ).headers['set-cookie'][0].split(';')[0];
    cookieA = await logarCliente('a@t.invalid');
    cookieB = await logarCliente('b@t.invalid');
    cookieN = await logarCliente('n@t.invalid');
    cookieAdmin = (
      await http().post('/api/auth/login').send({ email: 'dono@novoestilo.com', senha: SENHA }).expect(200)
    ).headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    avaliacoes = [];
    seq = 0;
    conflitoNoInsert = false;
    armazenamento.arquivos.clear();
    armazenamento.falharAoSalvar = false;
    storage = new ThrottlerStorageService();
  });

  /** POST multipart com nota/comentário e fotos opcionais. */
  async function enviar(
    cookie: string,
    { nota = '5', comentario = 'Corte impecável!', fotos = [] as { dados: Buffer; nome?: string }[], extra = {} as Record<string, string> } = {},
  ) {
    const req = http().post('/api/clientes/me/avaliacao').set('Cookie', cookie);
    if (nota !== undefined) req.field('nota', nota);
    if (comentario !== undefined) req.field('comentario', comentario);
    for (const [k, v] of Object.entries(extra)) req.field(k, v);
    for (const f of fotos) req.attach('fotos', f.dados, f.nome ?? 'foto.jpg');
    return req;
  }

  describe('GET /api/avaliacoes (público)', () => {
    it('abre sem sessão; sem avaliações: média nula e lista vazia', async () => {
      const res = await http().get('/api/avaliacoes').expect(200);
      expect(res.body).toMatchObject({ media: null, total: 0, itens: [] });
    });

    it('mostra só o primeiro nome, nota, comentário e fotos; nunca e-mail nem ids de cliente', async () => {
      await enviar(cookieA, { nota: '4', comentario: 'Muito bom', fotos: [{ dados: await jpeg() }] }).then((r) => expect(r.status).toBe(201));
      const res = await http().get('/api/avaliacoes').expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.media).toBe(4);
      const item = res.body.itens[0];
      expect(item).toMatchObject({ nome: 'Ana', nota: 4, comentario: 'Muito bom' });
      expect(item.fotos).toHaveLength(1);
      expect(item.fotos[0].url).toMatch(/^\/api\/avaliacoes\/fotos\/[0-9a-f-]{36}$/);
      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain('t.invalid');
      expect(texto).not.toContain(ID_A);
      expect(texto).not.toContain('Souza');
    });

    it('calcula a média com uma casa e ignora ocultas e apagadas', async () => {
      await enviar(cookieA, { nota: '5' }).then((r) => expect(r.status).toBe(201));
      await enviar(cookieB, { nota: '4' }).then((r) => expect(r.status).toBe(201));
      const res = await http().get('/api/avaliacoes').expect(200);
      expect(res.body.media).toBe(4.5);
      // oculta a de Bruno
      const id = avaliacoes.find((a) => a.clienteId === ID_B)!.id;
      await http().patch(`/api/admin/avaliacoes/${id}`).set('Cookie', cookieAdmin).send({ publicada: false }).expect(200);
      const depois = await http().get('/api/avaliacoes').expect(200);
      expect(depois.body).toMatchObject({ media: 5, total: 1 });
    });

    it('valida a paginação', async () => {
      await http().get('/api/avaliacoes?limite=999').expect(400);
      await http().get('/api/avaliacoes?pagina=0').expect(400);
      await http().get('/api/avaliacoes?pagina=1&limite=5').expect(200);
    });
  });

  describe('POST /api/clientes/me/avaliacao', () => {
    it('exige sessão de cliente (sem sessão e com sessão de admin: 401)', async () => {
      await http().post('/api/clientes/me/avaliacao').field('nota', '5').field('comentario', 'x').expect(401);
      await enviar(cookieAdmin).then((r) => expect(r.status).toBe(401));
      await http().get('/api/clientes/me/avaliacao').expect(401);
    });

    it('conta não verificada: 403 e nada é gravado', async () => {
      const res = await enviar(cookieN, { fotos: [{ dados: await jpeg() }] });
      expect(res.status).toBe(403);
      expect(avaliacoes).toHaveLength(0);
      expect(armazenamento.arquivos.size).toBe(0);
    });

    it('publica na hora, só com texto e nota', async () => {
      const res = await enviar(cookieA, { nota: '5', comentario: '  Atendimento ótimo  ' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ nota: 5, comentario: 'Atendimento ótimo', publicada: true, fotos: [] });
      const lista = await http().get('/api/avaliacoes').expect(200);
      expect(lista.body.total).toBe(1);
    });

    it('aceita JPG e PNG, grava como WebP e entrega a foto pelo endereço público', async () => {
      const res = await enviar(cookieA, {
        fotos: [{ dados: await jpeg(), nome: 'a.jpg' }, { dados: await png(), nome: 'b.png' }],
      });
      expect(res.status).toBe(201);
      expect(res.body.fotos).toHaveLength(2);
      expect(armazenamento.arquivos.size).toBe(2);

      const foto = await http().get(res.body.fotos[0].url.replace('/api', '/api')).expect(200);
      expect(foto.headers['content-type']).toBe('image/webp');
      expect(foto.headers['cache-control']).toContain('public');
      const bytes = foto.body as Buffer;
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    });

    it('descarta os metadados da foto (EXIF) e limita o tamanho', async () => {
      const comExif = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#555' } })
        .jpeg()
        .withMetadata({ exif: { IFD0: { ImageDescription: 'localizacao-secreta' } } })
        .toBuffer();
      expect((await sharp(comExif).metadata()).exif).toBeDefined();

      const res = await enviar(cookieA, { fotos: [{ dados: comExif }] });
      expect(res.status).toBe(201);
      const salvo = [...armazenamento.arquivos.values()][0];
      const meta = await sharp(salvo).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.exif).toBeUndefined();
      expect(meta.width).toBeLessThanOrEqual(1600);
      expect(salvo.toString('latin1')).not.toContain('localizacao-secreta');
    });

    it('mais de 3 fotos: 400', async () => {
      const f = { dados: await jpeg() };
      const res = await enviar(cookieA, { fotos: [f, f, f, f] });
      expect(res.status).toBe(400);
      expect(avaliacoes).toHaveLength(0);
      expect(armazenamento.arquivos.size).toBe(0);
    });

    it('arquivo que não é imagem (texto, SVG, nome falso .jpg): 400, nada gravado', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
      for (const dados of [Buffer.from('isto não é uma imagem'), svg]) {
        const res = await enviar(cookieA, { fotos: [{ dados, nome: 'foto.jpg' }] });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/foto inválida/i);
      }
      expect(avaliacoes).toHaveLength(0);
      expect(armazenamento.arquivos.size).toBe(0);
    });

    it('foto acima do limite de envio: 413', async () => {
      const grande = Buffer.alloc(9 * 1024 * 1024, 1);
      const res = await enviar(cookieA, { fotos: [{ dados: grande }] });
      expect(res.status).toBe(413);
      expect(avaliacoes).toHaveLength(0);
    });

    it('valida nota e comentário; campos desconhecidos são recusados', async () => {
      // O limite de envios (5/min) conta também os recusados; zera a cada tentativa para testar só a validação.
      const status = async (opcoes: Parameters<typeof enviar>[1]) => {
        storage = new ThrottlerStorageService();
        return (await enviar(cookieA, opcoes)).status;
      };
      for (const nota of ['0', '6', 'abc', '3.5', '']) {
        expect(await status({ nota })).toBe(400);
      }
      expect(await status({ comentario: '   ' })).toBe(400);
      expect(await status({ comentario: 'x'.repeat(601) })).toBe(400);
      expect(await status({ extra: { publicada: 'false' } })).toBe(400);
      expect(await status({ comentario: 'x'.repeat(600) })).toBe(201);
    });

    it('uma avaliação ativa por cliente: a segunda dá 409 e não deixa fotos órfãs', async () => {
      await enviar(cookieA, { fotos: [{ dados: await jpeg() }] }).then((r) => expect(r.status).toBe(201));
      const antes = armazenamento.arquivos.size;
      const res = await enviar(cookieA, { fotos: [{ dados: await jpeg() }] });
      expect(res.status).toBe(409);
      expect(armazenamento.arquivos.size).toBe(antes);
      expect(avaliacoes).toHaveLength(1);
    });

    it('envio duplo simultâneo (índice único do banco): 409 e as fotos já enviadas são apagadas', async () => {
      conflitoNoInsert = true;
      const res = await enviar(cookieA, { fotos: [{ dados: await jpeg() }] });
      expect(res.status).toBe(409);
      expect(armazenamento.arquivos.size).toBe(0);
    });

    it('armazenamento fora do ar: 503 e nenhuma avaliação criada', async () => {
      armazenamento.falharAoSalvar = true;
      const res = await enviar(cookieA, { fotos: [{ dados: await jpeg() }] });
      expect(res.status).toBe(503);
      expect(avaliacoes).toHaveLength(0);
    });

    it('limita a frequência de envios (429)', async () => {
      const status: number[] = [];
      for (let i = 0; i < 7; i++) status.push((await enviar(cookieN)).status);
      expect(status).toContain(429);
    });
  });

  describe('GET e DELETE /api/clientes/me/avaliacao', () => {
    it('devolve a própria avaliação (ou null) e não a de outro cliente', async () => {
      const vazio = await http().get('/api/clientes/me/avaliacao').set('Cookie', cookieA).expect(200);
      expect(vazio.body).toEqual({});
      await enviar(cookieA, { nota: '3' }).then((r) => expect(r.status).toBe(201));
      const minha = await http().get('/api/clientes/me/avaliacao').set('Cookie', cookieA).expect(200);
      expect(minha.body).toMatchObject({ nota: 3, publicada: true });
      const deB = await http().get('/api/clientes/me/avaliacao').set('Cookie', cookieB).expect(200);
      expect(deB.body).toEqual({});
    });

    it('apagar: some do site, apaga as fotos do armazenamento e permite avaliar de novo', async () => {
      const criada = await enviar(cookieA, { fotos: [{ dados: await jpeg() }, { dados: await png() }] });
      expect(criada.status).toBe(201);
      const urlFoto = criada.body.fotos[0].url as string;
      expect(armazenamento.arquivos.size).toBe(2);

      await http().delete('/api/clientes/me/avaliacao').set('Cookie', cookieA).expect(204);
      expect(armazenamento.arquivos.size).toBe(0);
      expect((await http().get('/api/avaliacoes').expect(200)).body.total).toBe(0);
      await http().get(urlFoto).expect(404);

      await http().delete('/api/clientes/me/avaliacao').set('Cookie', cookieA).expect(404);
      await enviar(cookieA, { nota: '4' }).then((r) => expect(r.status).toBe(201));
    });

    it('apagar exige sessão de cliente', async () => {
      await http().delete('/api/clientes/me/avaliacao').expect(401);
      await http().delete('/api/clientes/me/avaliacao').set('Cookie', cookieAdmin).expect(401);
    });
  });

  describe('moderação no painel (/api/admin/avaliacoes)', () => {
    it('exige sessão de admin (sem sessão e com sessão de cliente: 401)', async () => {
      await http().get('/api/admin/avaliacoes').expect(401);
      await http().get('/api/admin/avaliacoes').set('Cookie', cookieA).expect(401);
      await http().patch(`/api/admin/avaliacoes/${ID_INEXISTENTE}`).set('Cookie', cookieA).send({ publicada: false }).expect(401);
      await http().get(`/api/admin/avaliacoes/fotos/${ID_INEXISTENTE}`).set('Cookie', cookieA).expect(401);
    });

    it('lista inclusive as ocultas, com nome e e-mail do cliente, e filtra por situação', async () => {
      await enviar(cookieA, { nota: '5' }).then((r) => expect(r.status).toBe(201));
      await enviar(cookieB, { nota: '2' }).then((r) => expect(r.status).toBe(201));
      const idB = avaliacoes.find((a) => a.clienteId === ID_B)!.id;
      await http().patch(`/api/admin/avaliacoes/${idB}`).set('Cookie', cookieAdmin).send({ publicada: false }).expect(200);

      const todas = await http().get('/api/admin/avaliacoes').set('Cookie', cookieAdmin).expect(200);
      expect(todas.body.total).toBe(2);
      expect(todas.body.itens.find((i: any) => i.id === idB)).toMatchObject({
        publicada: false,
        clienteNome: 'Bruno Lima',
        clienteEmail: 'b@t.invalid',
      });
      const ocultas = await http().get('/api/admin/avaliacoes?situacao=ocultas').set('Cookie', cookieAdmin).expect(200);
      expect(ocultas.body.itens.map((i: any) => i.id)).toEqual([idB]);
      await http().get('/api/admin/avaliacoes?situacao=qualquer').set('Cookie', cookieAdmin).expect(400);
    });

    it('ocultar tira do site e a foto deixa de ser pública, mas o painel ainda a vê; mostrar de novo volta', async () => {
      const criada = await enviar(cookieA, { fotos: [{ dados: await jpeg() }] });
      const id = criada.body.id as string;
      const urlPublica = criada.body.fotos[0].url as string;
      await http().get(urlPublica).expect(200);

      await http().patch(`/api/admin/avaliacoes/${id}`).set('Cookie', cookieAdmin).send({ publicada: false }).expect(200);
      expect((await http().get('/api/avaliacoes').expect(200)).body.total).toBe(0);
      await http().get(urlPublica).expect(404);
      const urlAdmin = urlPublica.replace('/api/avaliacoes/', '/api/admin/avaliacoes/');
      const doPainel = await http().get(urlAdmin).set('Cookie', cookieAdmin).expect(200);
      expect(doPainel.headers['cache-control']).toContain('no-store');
      // o cliente continua vendo a sua e sabe que está oculta
      const minha = await http().get('/api/clientes/me/avaliacao').set('Cookie', cookieA).expect(200);
      expect(minha.body.publicada).toBe(false);

      await http().patch(`/api/admin/avaliacoes/${id}`).set('Cookie', cookieAdmin).send({ publicada: true }).expect(200);
      expect((await http().get('/api/avaliacoes').expect(200)).body.total).toBe(1);
    });

    it('valida o corpo e o id', async () => {
      await http().patch(`/api/admin/avaliacoes/${ID_INEXISTENTE}`).set('Cookie', cookieAdmin).send({ publicada: false }).expect(404);
      await http().patch('/api/admin/avaliacoes/nao-e-uuid').set('Cookie', cookieAdmin).send({ publicada: false }).expect(400);
      await http().patch(`/api/admin/avaliacoes/${ID_INEXISTENTE}`).set('Cookie', cookieAdmin).send({ publicada: 'sim' }).expect(400);
      await http().patch(`/api/admin/avaliacoes/${ID_INEXISTENTE}`).set('Cookie', cookieAdmin).send({ publicada: false, nota: 1 }).expect(400);
    });
  });

  describe('GET /api/avaliacoes/fotos/:id', () => {
    it('id inválido: 400; inexistente: 404', async () => {
      await http().get('/api/avaliacoes/fotos/lixo').expect(400);
      await http().get(`/api/avaliacoes/fotos/${ID_INEXISTENTE}`).expect(404);
    });
  });
});
