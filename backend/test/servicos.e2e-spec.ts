// Rotas de serviços (site público + painel admin), com o banco substituído por um fake em memória.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { gerarHashSenha } from '../src/auth/senha.js';
import { configurarApp } from '../src/configurar-app.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Ids que "já têm agendamentos": o banco recusa a exclusão (FK RESTRICT). */
const COM_HISTORICO = new Set<string>();

interface ServicoFake {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMinutos: number;
  ativo: boolean;
}

const SENHA = 'senha-do-dono-123';
const ID_ADMIN = '7d0f9a3e-0000-4000-8000-000000000001';
const ID_INEXISTENTE = '11111111-1111-4111-8111-111111111111';

function erroPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError('falha', {
    code,
    clientVersion: 'teste',
  });
}

describe('Serviços (e2e)', () => {
  let app: INestApplication<App>;
  let servicos: ServicoFake[];
  let seq = 0;
  let hashAdmin: string;

  const comoLinha = (s: ServicoFake) => ({
    ...s,
    preco: { toNumber: () => s.preco },
  });

  beforeAll(async () => {
    hashAdmin = await gerarHashSenha(SENHA);

    const prismaFake = {
      usuarioAdmin: {
        findUnique: () =>
          Promise.resolve({
            id: ID_ADMIN,
            nome: 'Dono',
            email: 'dono@novoestilo.com',
            senhaHash: hashAdmin,
            papel: 'ADMIN',
            ativo: true,
          }),
        findFirst: () =>
          Promise.resolve({
            id: ID_ADMIN,
            nome: 'Dono',
            email: 'dono@novoestilo.com',
            papel: 'ADMIN',
          }),
      },
      servico: {
        findMany: ({ where }: { where?: { ativo?: boolean } }) =>
          Promise.resolve(
            servicos
              .filter((s) => where?.ativo === undefined || s.ativo === where.ativo)
              .map(comoLinha),
          ),
        create: ({ data }: { data: Omit<ServicoFake, 'id'> }) => {
          if (
            servicos.some(
              (s) => s.nome.toLowerCase() === data.nome.toLowerCase(),
            )
          ) {
            return Promise.reject(erroPrisma('P2002'));
          }
          const novo = { id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, ...data };
          servicos.push(novo);
          return Promise.resolve(comoLinha(novo));
        },
        delete: ({ where }: { where: { id: string } }) => {
          const i = servicos.findIndex((s) => s.id === where.id);
          if (i < 0) return Promise.reject(erroPrisma('P2025'));
          if (COM_HISTORICO.has(where.id)) return Promise.reject(erroPrisma('P2003'));
          return Promise.resolve(comoLinha(servicos.splice(i, 1)[0]));
        },
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<ServicoFake>;
        }) => {
          const atual = servicos.find((s) => s.id === where.id);
          if (!atual) return Promise.reject(erroPrisma('P2025'));
          for (const [k, v] of Object.entries(data)) {
            if (v !== undefined) (atual as any)[k] = v;
          }
          return Promise.resolve(comoLinha(atual));
        },
      },
      $disconnect: () => Promise.resolve(),
    };

    const throttlerStorage: ThrottlerStorage = {
      increment: (...args) => new ThrottlerStorageService().increment(...args),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaFake)
      .overrideProvider(ThrottlerStorage)
      .useValue(throttlerStorage)
      .compile();

    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    servicos = [];
    seq = 0;
    COM_HISTORICO.clear();
  });

  async function logar(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'dono@novoestilo.com', senha: SENHA })
      .expect(200);
    return res.headers['set-cookie'][0].split(';')[0];
  }

  const corte = {
    nome: 'Corte Masculino',
    descricao: 'Corte tradicional',
    preco: 50,
    duracaoMinutos: 45,
  };

  describe('GET /api/servicos (público)', () => {
    it('abre sem sessão e lista só os ativos', async () => {
      servicos.push(
        { id: 'a', nome: 'Corte', descricao: null, preco: 50.5, duracaoMinutos: 45, ativo: true },
        { id: 'b', nome: 'Barba', descricao: null, preco: 30, duracaoMinutos: 30, ativo: false },
      );
      const res = await request(app.getHttpServer()).get('/api/servicos').expect(200);
      expect(res.body).toEqual([
        { id: 'a', nome: 'Corte', descricao: null, preco: 50.5, duracaoMinutos: 45, ativo: true },
      ]);
    });
  });

  describe('/api/admin/servicos', () => {
    it('exige sessão de admin', async () => {
      await request(app.getHttpServer()).get('/api/admin/servicos').expect(401);
      await request(app.getHttpServer()).post('/api/admin/servicos').send(corte).expect(401);
      await request(app.getHttpServer())
        .patch(`/api/admin/servicos/${ID_INEXISTENTE}`)
        .send({ ativo: false })
        .expect(401);
    });

    it('cria, lista (inclusive inativos) e edita', async () => {
      const cookie = await logar();
      const criado = await request(app.getHttpServer())
        .post('/api/admin/servicos')
        .set('Cookie', cookie)
        .send({ ...corte, nome: '  Corte Masculino  ', descricao: '   ' })
        .expect(201);
      expect(criado.body).toMatchObject({
        nome: 'Corte Masculino',
        descricao: null,
        preco: 50,
        duracaoMinutos: 45,
        ativo: true,
      });

      const editado = await request(app.getHttpServer())
        .patch(`/api/admin/servicos/${criado.body.id}`)
        .set('Cookie', cookie)
        .send({ preco: 55.9, ativo: false })
        .expect(200);
      expect(editado.body).toMatchObject({ preco: 55.9, ativo: false });

      const lista = await request(app.getHttpServer())
        .get('/api/admin/servicos')
        .set('Cookie', cookie)
        .expect(200);
      expect(lista.body).toHaveLength(1);

      // Inativo some do catálogo público.
      const publico = await request(app.getHttpServer()).get('/api/servicos').expect(200);
      expect(publico.body).toEqual([]);
    });

    it('exclui de vez o serviço sem agendamentos', async () => {
      const cookie = await logar();
      servicos.push({ id: '00000000-0000-4000-8000-0000000000aa', nome: 'Corte', descricao: null, preco: 50, duracaoMinutos: 45, ativo: true });
      const res = await request(app.getHttpServer())
        .delete('/api/admin/servicos/00000000-0000-4000-8000-0000000000aa')
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body).toEqual({ excluido: true });
      expect(servicos).toHaveLength(0);
    });

    it('com agendamentos no histórico não exclui: só inativa', async () => {
      const cookie = await logar();
      const id = '00000000-0000-4000-8000-0000000000bb';
      servicos.push({ id, nome: 'Corte', descricao: null, preco: 50, duracaoMinutos: 45, ativo: true });
      COM_HISTORICO.add(id);
      const res = await request(app.getHttpServer())
        .delete(`/api/admin/servicos/${id}`)
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body).toEqual({ excluido: false });
      expect(servicos).toEqual([expect.objectContaining({ id, ativo: false })]);
    });

    it('excluir serviço inexistente dá 404 e exige sessão', async () => {
      await request(app.getHttpServer()).delete(`/api/admin/servicos/${ID_INEXISTENTE}`).expect(401);
      const cookie = await logar();
      await request(app.getHttpServer())
        .delete(`/api/admin/servicos/${ID_INEXISTENTE}`)
        .set('Cookie', cookie)
        .expect(404);
    });

    it.each([
      ['nome vazio', { ...corte, nome: '   ' }],
      ['nome com mais de 80 caracteres', { ...corte, nome: 'x'.repeat(81) }],
      ['preço negativo', { ...corte, preco: -1 }],
      ['preço com 3 casas decimais', { ...corte, preco: 10.123 }],
      ['preço como texto', { ...corte, preco: '50' }],
      ['duração abaixo de 5 minutos', { ...corte, duracaoMinutos: 4 }],
      ['duração acima de 480 minutos', { ...corte, duracaoMinutos: 481 }],
      ['duração fracionada', { ...corte, duracaoMinutos: 30.5 }],
      ['campo desconhecido', { ...corte, id: 'forjado' }],
    ])('recusa criar com %s', async (_nome, corpo) => {
      const cookie = await logar();
      await request(app.getHttpServer())
        .post('/api/admin/servicos')
        .set('Cookie', cookie)
        .send(corpo)
        .expect(400);
      expect(servicos).toHaveLength(0);
    });

    it('recusa nome repetido (409) na criação e na edição', async () => {
      const cookie = await logar();
      await request(app.getHttpServer()).post('/api/admin/servicos').set('Cookie', cookie).send(corte).expect(201);
      const res = await request(app.getHttpServer())
        .post('/api/admin/servicos')
        .set('Cookie', cookie)
        .send({ ...corte, nome: 'corte masculino' })
        .expect(409);
      expect(res.body.message).toBe('Já existe um serviço com este nome.');
    });

    it('PATCH com id inexistente dá 404 e id malformado dá 400', async () => {
      const cookie = await logar();
      await request(app.getHttpServer())
        .patch(`/api/admin/servicos/${ID_INEXISTENTE}`)
        .set('Cookie', cookie)
        .send({ ativo: false })
        .expect(404);
      await request(app.getHttpServer())
        .patch('/api/admin/servicos/nao-e-uuid')
        .set('Cookie', cookie)
        .send({ ativo: false })
        .expect(400);
    });

    it('não oferece DELETE (serviço nunca é apagado)', async () => {
      const cookie = await logar();
      await request(app.getHttpServer())
        .delete(`/api/admin/servicos/${ID_INEXISTENTE}`)
        .set('Cookie', cookie)
        .expect(404);
    });
  });
});
