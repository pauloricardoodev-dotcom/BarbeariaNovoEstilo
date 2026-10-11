// Fluxo HTTP completo de login/sessão do admin, com o banco substituído por um fake em memória.
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { gerarHashSenha } from '../src/auth/senha.js';
import { configurarApp } from '../src/configurar-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

interface UsuarioFake {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  papel: 'ADMIN' | 'SUPPORT';
  ativo: boolean;
}

const SENHA = 'senha-do-dono-123';

function selecionar(
  u: UsuarioFake | undefined,
  select: Record<string, boolean>,
) {
  if (!u) return null;
  return Object.fromEntries(
    Object.keys(select).map((k) => [k, u[k as keyof UsuarioFake]]),
  );
}

describe('Auth do admin (e2e)', () => {
  let app: INestApplication<App>;
  let usuarios: UsuarioFake[];
  let storageAtual = new ThrottlerStorageService();

  beforeAll(async () => {
    usuarios = [
      {
        id: '7d0f9a3e-0000-4000-8000-000000000001',
        nome: 'Dono',
        email: 'dono@novoestilo.com',
        senhaHash: await gerarHashSenha(SENHA),
        papel: 'ADMIN',
        ativo: true,
      },
    ];

    const prismaFake = {
      usuarioAdmin: {
        findUnique: ({ where, select }: any) =>
          Promise.resolve(
            selecionar(
              usuarios.find((u) => u.email === where.email),
              select,
            ),
          ),
        findFirst: ({ where, select }: any) =>
          Promise.resolve(
            selecionar(
              usuarios.find(
                (u) => u.id === where.id && u.ativo === where.ativo,
              ),
              select,
            ),
          ),
      },
      $disconnect: () => Promise.resolve(),
    };

    // Delega para uma instância trocada a cada teste, zerando o contador de tentativas.
    const throttlerStorage: ThrottlerStorage = {
      increment: (...args) => storageAtual.increment(...args),
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
    usuarios[0].ativo = true;
    storageAtual = new ThrottlerStorageService();
  });

  async function logar(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'dono@novoestilo.com', senha: SENHA })
      .expect(200);
    return res.headers['set-cookie'][0].split(';')[0];
  }

  it('login válido retorna o usuário (sem hash) e define cookie httpOnly/SameSite=Strict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: '  DONO@NovoEstilo.com ', senha: SENHA })
      .expect(200);

    expect(res.body).toEqual({
      id: usuarios[0].id,
      nome: 'Dono',
      email: 'dono@novoestilo.com',
      papel: 'ADMIN',
    });
    const cookie: string = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^ne_admin_sessao=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('senha errada e e-mail inexistente dão a mesma resposta genérica (401)', async () => {
    const errada = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'dono@novoestilo.com', senha: 'errada' })
      .expect(401);
    const inexistente = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ninguem@novoestilo.com', senha: SENHA })
      .expect(401);

    expect(errada.body.message).toBe('E-mail ou senha inválidos.');
    expect(inexistente.body).toEqual(errada.body);
    expect(errada.headers['set-cookie']).toBeUndefined();
  });

  it('usuário desativado não consegue logar', async () => {
    usuarios[0].ativo = false;
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'dono@novoestilo.com', senha: SENHA })
      .expect(401);
  });

  it('rejeita payload inválido (400) sem vazar detalhes internos', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nao-e-email', senha: '' })
      .expect(400);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma/i);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'dono@novoestilo.com', senha: SENHA, papel: 'ADMIN' })
      .expect(400);
  });

  it('/api/auth/me exige sessão', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('/api/auth/me rejeita token adulterado', async () => {
    const cookie = await logar();
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie.slice(0, -2) + 'xx')
      .expect(401);
  });

  it('/api/auth/me retorna o admin logado', async () => {
    const cookie = await logar();
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.email).toBe('dono@novoestilo.com');
    expect(res.body).not.toHaveProperty('senhaHash');
  });

  it('desativar o usuário derruba a sessão já emitida', async () => {
    const cookie = await logar();
    usuarios[0].ativo = false;
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('logout apaga o cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .expect(204);
    expect(res.headers['set-cookie'][0]).toMatch(
      /^ne_admin_sessao=;.*Expires=Thu, 01 Jan 1970/,
    );
  });

  it('limita tentativas de login (429)', async () => {
    const tentativas = Array.from({ length: 6 }, () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'dono@novoestilo.com', senha: 'errada' }),
    );
    const status = (await Promise.all(tentativas)).map((r) => r.status);
    expect(status).toContain(429);
  });

  describe('separação entre sessão de admin e de cliente', () => {
    const jwt = new JwtService({
      secret: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    });
    const adminId = '7d0f9a3e-0000-4000-8000-000000000001';

    it('rota de admin recusa token com audiência de cliente', async () => {
      const token = jwt.sign(
        { sub: adminId, papel: 'ADMIN' },
        { audience: 'cliente' },
      );
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `ne_admin_sessao=${token}`)
        .expect(401);
    });

    it('rota de admin recusa token sem audiência (formato antigo)', async () => {
      const token = jwt.sign({ sub: adminId, papel: 'ADMIN' });
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `ne_admin_sessao=${token}`)
        .expect(401);
    });

    it('rota de cliente recusa a sessão de admin, mesmo no cookie de cliente', async () => {
      const cookieAdmin = await logar();
      await request(app.getHttpServer())
        .get('/api/clientes/me')
        .set('Cookie', cookieAdmin)
        .expect(401);

      const tokenAdmin = cookieAdmin.split('=')[1];
      await request(app.getHttpServer())
        .get('/api/clientes/me')
        .set('Cookie', `ne_cliente_sessao=${tokenAdmin}`)
        .expect(401);
    });

    it('rotas de clientes do admin exigem sessão de admin', async () => {
      await request(app.getHttpServer()).get('/api/admin/clientes').expect(401);
      const tokenCliente = jwt.sign(
        { sub: adminId, ver: 0 },
        { audience: 'cliente' },
      );
      await request(app.getHttpServer())
        .get('/api/admin/clientes')
        .set('Cookie', `ne_admin_sessao=${tokenCliente}`)
        .expect(401);
    });
  });
});
