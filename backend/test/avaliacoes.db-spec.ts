// Avaliações contra o Postgres real: consultas do Prisma, índice único parcial, CHECKs, FK e concorrência.
// Rodar com `npm run test:db` (precisa da migration 20261016130000_avaliacoes aplicada no banco do .env).
// Todos os dados usam o prefixo PREFIXO e são apagados no afterAll. Fotos ficam em memória (sem Supabase).
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { gerarHashSenha } from '../src/auth/senha.js';
import { ArmazenamentoFotos } from '../src/avaliacoes/armazenamento.js';
import { configurarApp } from '../src/configurar-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `teste-av-${randomUUID().slice(0, 8)}`;
const SENHA = 'senha-do-cliente-123';

class ArmazenamentoMemoria extends ArmazenamentoFotos {
  arquivos = new Map<string, Buffer>();
  salvar(caminho: string, dados: Buffer) {
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

const jpeg = () =>
  sharp({ create: { width: 50, height: 40, channels: 3, background: '#aa2233' } })
    .jpeg()
    .toBuffer();

describe('Avaliações (integração com o banco)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const armazenamento = new ArmazenamentoMemoria();
  let storage = new ThrottlerStorageService();
  let seq = 0;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const throttler: ThrottlerStorage = { increment: (...a) => storage.increment(...a) };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ArmazenamentoFotos)
      .useValue(armazenamento)
      .overrideProvider(ThrottlerStorage)
      .useValue(throttler)
      .compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      const donos = { cliente: { email: { startsWith: PREFIXO } } };
      await prisma.avaliacao.deleteMany({ where: donos }); // fotos saem em cascata
      await prisma.cliente.deleteMany({ where: { email: { startsWith: PREFIXO } } });
      await prisma.usuarioAdmin.deleteMany({ where: { email: { startsWith: PREFIXO } } });
    }
    await app?.close();
  });

  beforeEach(() => {
    storage = new ThrottlerStorageService();
    armazenamento.arquivos.clear();
  });

  /** Cliente já verificado (cria direto no banco e entra pela API). */
  async function novoCliente(nome = 'Cliente Teste', verificado = true) {
    const n = ++seq;
    const email = `${PREFIXO}-${n}@teste.invalid`;
    const agora = new Date();
    const c = await prisma.cliente.create({
      data: {
        nome,
        email,
        telefone: `+55419${String(88000000 + n).padStart(8, '0')}`,
        senhaHash: await gerarHashSenha(SENHA),
        termosVersaoAceita: 'teste',
        termosAceitosEm: agora,
        ...(verificado ? { emailVerificadoEm: agora, telefoneVerificadoEm: agora } : {}),
      },
      select: { id: true },
    });
    const res = await http().post('/api/clientes/auth/login').send({ email, senha: SENHA }).expect(200);
    return { id: c.id, email, cookie: (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0] };
  }

  async function admin() {
    const email = `${PREFIXO}-admin@teste.invalid`;
    await prisma.usuarioAdmin.create({
      data: { nome: 'Dono', email, senhaHash: await gerarHashSenha(SENHA) },
    });
    const res = await http().post('/api/auth/login').send({ email, senha: SENHA }).expect(200);
    return (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  }

  const enviar = async (cookie: string, nota: string, comentario: string, fotos = 0) => {
    const req = http().post('/api/clientes/me/avaliacao').set('Cookie', cookie).field('nota', nota).field('comentario', comentario);
    for (let i = 0; i < fotos; i++) req.attach('fotos', await jpeg(), `f${i}.jpg`);
    return req;
  };

  it('publica, lista com média e entrega a foto; só o primeiro nome aparece', async () => {
    const c = await novoCliente('Marina Alves Rocha');
    const res = await enviar(c.cookie, '5', 'Perfeito!', 2);
    expect(res.status).toBe(201);
    expect(res.body.fotos).toHaveLength(2);

    const linha = await prisma.avaliacao.findFirstOrThrow({
      where: { clienteId: c.id },
      include: { fotos: { orderBy: { posicao: 'asc' } } },
    });
    expect(linha.fotos.map((f) => f.posicao)).toEqual([1, 2]);
    expect(linha.publicada).toBe(true);

    const lista = await http().get('/api/avaliacoes?limite=24').expect(200);
    const minha = lista.body.itens.find((i: { id: string }) => i.id === linha.id);
    expect(minha).toMatchObject({ nome: 'Marina', nota: 5, comentario: 'Perfeito!' });
    expect(JSON.stringify(minha)).not.toContain('Rocha');
    expect(typeof lista.body.media).toBe('number');

    const foto = await http().get(res.body.fotos[0].url).expect(200);
    expect(foto.headers['content-type']).toBe('image/webp');
  });

  it('conta não verificada não avalia (403)', async () => {
    const c = await novoCliente('Sem Verificar', false);
    await enviar(c.cookie, '5', 'x').then((r) => expect(r.status).toBe(403));
    expect(await prisma.avaliacao.count({ where: { clienteId: c.id } })).toBe(0);
  });

  it('dois envios simultâneos do mesmo cliente: um passa, o outro leva 409, e não sobram fotos órfãs', async () => {
    const c = await novoCliente();
    const [a, b] = await Promise.all([enviar(c.cookie, '4', 'Primeira', 1), enviar(c.cookie, '5', 'Segunda', 1)]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
    expect(await prisma.avaliacao.count({ where: { clienteId: c.id, removidaEm: null } })).toBe(1);
    const fotosNoBanco = await prisma.avaliacaoFoto.count({ where: { avaliacao: { clienteId: c.id } } });
    expect(fotosNoBanco).toBe(1);
    expect(armazenamento.arquivos.size).toBe(1);
  });

  it('o cliente apaga: fica o registro (removida_em), somem as fotos, e ele pode avaliar de novo', async () => {
    const c = await novoCliente();
    await enviar(c.cookie, '3', 'Ok', 1).then((r) => expect(r.status).toBe(201));
    await http().delete('/api/clientes/me/avaliacao').set('Cookie', c.cookie).expect(204);

    const linhas = await prisma.avaliacao.findMany({ where: { clienteId: c.id }, include: { fotos: true } });
    expect(linhas).toHaveLength(1);
    expect(linhas[0].removidaEm).not.toBeNull();
    expect(linhas[0].fotos).toHaveLength(0);
    expect(armazenamento.arquivos.size).toBe(0);

    await enviar(c.cookie, '4', 'Voltei').then((r) => expect(r.status).toBe(201));
    expect(await prisma.avaliacao.count({ where: { clienteId: c.id } })).toBe(2);
  });

  it('o painel oculta e mostra; oculta some do site e a foto fica privada', async () => {
    const c = await novoCliente();
    const cookieAdmin = await admin();
    const criada = await enviar(c.cookie, '2', 'Ruim', 1);
    const id = criada.body.id as string;
    const urlFoto = criada.body.fotos[0].url as string;

    await http().patch(`/api/admin/avaliacoes/${id}`).set('Cookie', cookieAdmin).send({ publicada: false }).expect(200);
    const visiveis = await http().get('/api/avaliacoes?limite=24').expect(200);
    expect(visiveis.body.itens.some((i: { id: string }) => i.id === id)).toBe(false);
    await http().get(urlFoto).expect(404);

    const painel = await http().get('/api/admin/avaliacoes?situacao=ocultas&limite=24').set('Cookie', cookieAdmin).expect(200);
    expect(painel.body.itens.find((i: { id: string }) => i.id === id)).toMatchObject({ publicada: false, clienteEmail: c.email });
    await http().get(urlFoto.replace('/api/avaliacoes/', '/api/admin/avaliacoes/')).set('Cookie', cookieAdmin).expect(200);

    await http().patch(`/api/admin/avaliacoes/${id}`).set('Cookie', cookieAdmin).send({ publicada: true }).expect(200);
    await http().get(urlFoto).expect(200);
  });

  describe('constraints do banco (última linha de defesa)', () => {
    it('recusa nota fora de 1–5 e comentário vazio ou longo demais', async () => {
      const c = await novoCliente();
      const inserir = (nota: number, comentario: string) =>
        prisma.$executeRaw`INSERT INTO avaliacoes (cliente_id, nota, comentario) VALUES (${c.id}::uuid, ${nota}, ${comentario})`;
      await expect(inserir(0, 'x')).rejects.toThrow();
      await expect(inserir(6, 'x')).rejects.toThrow();
      await expect(inserir(3, '   ')).rejects.toThrow();
      await expect(inserir(3, 'x'.repeat(601))).rejects.toThrow();
      await expect(inserir(3, 'x'.repeat(600))).resolves.toBe(1);
    });

    it('não permite apagar cliente que tem avaliação (histórico preservado)', async () => {
      const c = await novoCliente();
      await enviar(c.cookie, '5', 'Boa').then((r) => expect(r.status).toBe(201));
      await expect(prisma.cliente.delete({ where: { id: c.id } })).rejects.toThrow();
    });

    it('no máximo 3 fotos por avaliação, sem posição repetida', async () => {
      const c = await novoCliente();
      const r = await enviar(c.cookie, '5', 'Boa', 3);
      expect(r.status).toBe(201);
      const avaliacaoId = r.body.id as string;
      const foto = (posicao: number, caminho: string) =>
        prisma.avaliacaoFoto.create({ data: { avaliacaoId, posicao, caminho } });
      await expect(foto(4, `x/${randomUUID()}`)).rejects.toThrow();
      await expect(foto(1, `x/${randomUUID()}`)).rejects.toThrow();
    });
  });
});
