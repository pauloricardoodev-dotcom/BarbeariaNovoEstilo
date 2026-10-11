// Fluxos de clientes contra o Postgres real (constraints, trigger, concorrência).
// Rodar com `npm run test:db`. Todos os dados usam o prefixo PREFIXO e são apagados no afterAll.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { randomInt, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { gerarHashSenha } from '../src/auth/senha.js';
import { configurarApp } from '../src/configurar-app.js';
import {
  EmailService,
  WhatsAppService,
  type EmailMensagem,
} from '../src/mensagens/mensagens.types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `teste-${randomUUID().slice(0, 8)}`;
const SENHA = 'senha-do-cliente-123';

class EmailFake extends EmailService {
  enviados: EmailMensagem[] = [];
  enviar(m: EmailMensagem) {
    this.enviados.push(m);
    return Promise.resolve();
  }
}

class WhatsAppFake extends WhatsAppService {
  enviados: { telefone: string; codigo: string }[] = [];
  enviarCodigoVerificacao(telefone: string, codigo: string) {
    this.enviados.push({ telefone, codigo });
    return Promise.resolve();
  }
}

let seq = 0;
function novoEmail(): string {
  return `${PREFIXO}-${++seq}@teste.invalid`;
}
/** Celular de Curitiba aleatório, em formato "humano". */
function novoTelefone(): { digitado: string; e164: string } {
  const resto = randomInt(0, 10_000_000).toString().padStart(7, '0');
  return {
    digitado: `(41) 99${resto.slice(0, 3)}-${resto.slice(3)}`,
    e164: `+554199${resto}`,
  };
}

function cookieDe(res: request.Response, nome: string): string {
  const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
  const cookie = cookies.find((c) => c.startsWith(`${nome}=`));
  if (!cookie) throw new Error(`Resposta sem cookie ${nome}`);
  return cookie.split(';')[0];
}

async function aguardar<T>(obter: () => T | undefined): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const valor = obter();
    if (valor !== undefined) return valor;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Tempo esgotado esperando a mensagem.');
}

describe('Clientes (integração com o banco)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = new EmailFake();
  const whatsapp = new WhatsAppFake();
  let storageAtual = new ThrottlerStorageService();
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const throttlerStorage: ThrottlerStorage = {
      increment: (...args) => storageAtual.increment(...args),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue(email)
      .overrideProvider(WhatsAppService)
      .useValue(whatsapp)
      .overrideProvider(ThrottlerStorage)
      .useValue(throttlerStorage)
      .compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      const filtro = { cliente: { email: { startsWith: PREFIXO } } };
      await prisma.tokenCliente.deleteMany({ where: filtro });
      await prisma.cliente.deleteMany({
        where: { email: { startsWith: PREFIXO } },
      });
      await prisma.usuarioAdmin.deleteMany({
        where: { email: { startsWith: PREFIXO } },
      });
    }
    await app?.close();
  });

  beforeEach(() => {
    storageAtual = new ThrottlerStorageService();
  });

  async function cadastrar(dados: Partial<Record<string, unknown>> = {}) {
    const tel = novoTelefone();
    const corpo = {
      nome: 'Cliente Teste',
      email: novoEmail(),
      telefone: tel.digitado,
      senha: SENHA,
      aceiteTermos: true,
      ...dados,
    };
    const res = await http().post('/api/clientes/auth/cadastro').send(corpo);
    return { res, corpo, tel };
  }

  async function cadastrarOk() {
    const r = await cadastrar();
    expect(r.res.status).toBe(201);
    return {
      ...r,
      id: r.res.body.id as string,
      cookie: cookieDe(r.res, 'ne_cliente_sessao'),
    };
  }

  const codigoEmail = (para: string) =>
    aguardar(() => {
      const m = email.enviados.filter((e) => e.para === para).at(-1);
      return m?.texto.match(/código de verificação é: (\d{6})/)?.[1];
    });
  const codigoWhatsApp = (telefone: string) =>
    aguardar(
      () =>
        whatsapp.enviados.filter((w) => w.telefone === telefone).at(-1)?.codigo,
    );

  describe('cadastro', () => {
    it('cria o cliente com telefone em E.164, sessão httpOnly e sem expor credenciais', async () => {
      const { res, corpo, tel } = await cadastrar({
        email: `  ${novoEmail().toUpperCase()} `,
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        nome: 'Cliente Teste',
        email: (corpo.email as string).trim().toLowerCase(),
        telefone: tel.e164,
        emailVerificado: false,
        telefoneVerificado: false,
      });
      const cookie = (
        (res.headers['set-cookie'] ?? []) as unknown as string[]
      ).join();
      expect(cookie).toMatch(/ne_cliente_sessao=.*HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);

      const linha = await prisma.cliente.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(linha.senhaHash).toMatch(/^scrypt\$/);
      expect(linha.termosVersaoAceita).toBeTruthy();
      expect(linha.googleSub).toBeNull();

      // Envia os dois códigos de verificação.
      await codigoEmail(linha.email);
      await codigoWhatsApp(tel.e164);
    });

    it.each([
      ['telefone inválido', { telefone: '(41) 3333-4444' }, /celular válido/],
      ['telefone ausente', { telefone: undefined }, /celular válido/],
      ['e-mail inválido', { email: 'nao-e-email' }, /e-mail válido/],
      ['nome vazio', { nome: '   ' }, /nome/],
      ['senha curta', { senha: '1234567' }, /8 caracteres/],
      ['sem aceite dos termos', { aceiteTermos: false }, /termos/],
      [
        'campo não permitido',
        { emailVerificadoEm: '2026-01-01' },
        /should not exist/,
      ],
    ])('recusa %s (400)', async (_caso, dados, mensagem) => {
      const { res } = await cadastrar(dados);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(mensagem);
    });

    it('formatos diferentes do mesmo telefone colidem (409) sem vazar detalhes do banco', async () => {
      const primeiro = await cadastrarOk();
      const digitos = primeiro.tel.e164.slice(3); // DDD + número
      const { res } = await cadastrar({ telefone: `+55 ${digitos}` });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Este telefone já está cadastrado.');
      expect(JSON.stringify(res.body)).not.toMatch(
        /prisma|constraint|P2002|stack/i,
      );
    });

    it('e-mail duplicado (ignorando maiúsculas) dá 409', async () => {
      const primeiro = await cadastrarOk();
      const { res } = await cadastrar({
        email: (primeiro.corpo.email as string).toUpperCase(),
      });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Este e-mail já está cadastrado.');
    });

    it('cadastros simultâneos com o mesmo telefone criam um único cliente', async () => {
      const tel = novoTelefone();
      const respostas = await Promise.all(
        Array.from({ length: 5 }, () =>
          http().post('/api/clientes/auth/cadastro').send({
            nome: 'Concorrente',
            email: novoEmail(),
            telefone: tel.digitado,
            senha: SENHA,
            aceiteTermos: true,
          }),
        ),
      );
      const status = respostas.map((r) => r.status).sort((a, b) => a - b);
      expect(status).toEqual([201, 409, 409, 409, 409]);
      expect(
        await prisma.cliente.count({ where: { telefone: tel.e164 } }),
      ).toBe(1);
    });
  });

  describe('login e sessão', () => {
    it('login válido abre sessão; senha errada e e-mail inexistente dão a mesma resposta', async () => {
      const c = await cadastrarOk();
      const ok = await http()
        .post('/api/clientes/auth/login')
        .send({ email: c.corpo.email, senha: SENHA })
        .expect(200);
      const cookie = cookieDe(ok, 'ne_cliente_sessao');
      await http().get('/api/clientes/me').set('Cookie', cookie).expect(200);

      const errada = await http()
        .post('/api/clientes/auth/login')
        .send({ email: c.corpo.email, senha: 'errada-123' })
        .expect(401);
      const inexistente = await http()
        .post('/api/clientes/auth/login')
        .send({ email: novoEmail(), senha: SENHA })
        .expect(401);
      expect(inexistente.body).toEqual(errada.body);
    });

    it('/clientes/me exige sessão', async () => {
      await http().get('/api/clientes/me').expect(401);
    });

    it('limita tentativas de login (429)', async () => {
      const status = [];
      for (let i = 0; i < 6; i++) {
        const r = await http()
          .post('/api/clientes/auth/login')
          .send({ email: novoEmail(), senha: 'x' });
        status.push(r.status);
      }
      expect(status).toContain(429);
    });

    it('logout apaga o cookie', async () => {
      const r = await http().post('/api/clientes/auth/logout').expect(204);
      expect(cookieDe(r, 'ne_cliente_sessao')).toBe('ne_cliente_sessao=');
    });
  });

  describe('verificação de e-mail e telefone', () => {
    it('confere o código do e-mail; código usado não vale de novo', async () => {
      const c = await cadastrarOk();
      const codigo = await codigoEmail(c.res.body.email);
      const errado = codigo === '000000' ? '111111' : '000000';

      const r1 = await http()
        .post('/api/clientes/me/verificar-email')
        .set('Cookie', c.cookie)
        .send({ codigo: errado })
        .expect(400);
      expect(r1.body.message).toBe('Código incorreto.');

      const r2 = await http()
        .post('/api/clientes/me/verificar-email')
        .set('Cookie', c.cookie)
        .send({ codigo })
        .expect(200);
      expect(r2.body.emailVerificado).toBe(true);
      expect(r2.body.telefoneVerificado).toBe(false);

      await http()
        .post('/api/clientes/me/verificar-email')
        .set('Cookie', c.cookie)
        .send({ codigo })
        .expect(400);
    });

    it('confere o código do WhatsApp', async () => {
      const c = await cadastrarOk();
      const codigo = await codigoWhatsApp(c.tel.e164);
      const r = await http()
        .post('/api/clientes/me/verificar-telefone')
        .set('Cookie', c.cookie)
        .send({ codigo })
        .expect(200);
      expect(r.body.telefoneVerificado).toBe(true);
    });

    it('bloqueia o código depois de 5 tentativas erradas, mesmo em paralelo', async () => {
      const c = await cadastrarOk();
      const codigo = await codigoEmail(c.res.body.email);
      const errado = codigo === '000000' ? '111111' : '000000';
      await Promise.all(
        Array.from({ length: 6 }, () =>
          http()
            .post('/api/clientes/me/verificar-email')
            .set('Cookie', c.cookie)
            .send({ codigo: errado }),
        ),
      );
      const r = await http()
        .post('/api/clientes/me/verificar-email')
        .set('Cookie', c.cookie)
        .send({ codigo })
        .expect(400);
      expect(r.body.message).toMatch(/Muitas tentativas/);

      const token = await prisma.tokenCliente.findFirstOrThrow({
        where: { clienteId: c.id, tipo: 'verificar_email' },
        orderBy: { createdAt: 'desc' },
      });
      expect(token.tentativas).toBe(5);
    });

    it('recusa código expirado', async () => {
      const c = await cadastrarOk();
      const codigo = await codigoEmail(c.res.body.email);
      await prisma.tokenCliente.updateMany({
        where: { clienteId: c.id, tipo: 'verificar_email' },
        data: { expiraEm: new Date(Date.now() - 1000) },
      });
      const r = await http()
        .post('/api/clientes/me/verificar-email')
        .set('Cookie', c.cookie)
        .send({ codigo })
        .expect(400);
      expect(r.body.message).toMatch(/expirado/);
    });

    it('limita reenvio (espera de 60 s) e recusa reenviar para contato já verificado', async () => {
      const c = await cadastrarOk();
      await codigoEmail(c.res.body.email);
      await http()
        .post('/api/clientes/me/reenviar-codigo')
        .set('Cookie', c.cookie)
        .send({ canal: 'email' })
        .expect(429);

      const codigo = await codigoWhatsApp(c.tel.e164);
      await http()
        .post('/api/clientes/me/verificar-telefone')
        .set('Cookie', c.cookie)
        .send({ codigo })
        .expect(200);
      await http()
        .post('/api/clientes/me/reenviar-codigo')
        .set('Cookie', c.cookie)
        .send({ canal: 'telefone' })
        .expect(400);
    });

    it('guarda só o hash do código, nunca o valor', async () => {
      const c = await cadastrarOk();
      const codigo = await codigoEmail(c.res.body.email);
      const tokens = await prisma.tokenCliente.findMany({
        where: { clienteId: c.id },
      });
      expect(tokens.length).toBeGreaterThan(0);
      for (const t of tokens) expect(t.tokenHash).not.toContain(codigo);
    });
  });

  describe('recuperação e troca de senha', () => {
    it('envia link só para e-mail cadastrado, com a mesma resposta nos dois casos', async () => {
      const c = await cadastrarOk();
      const existente = await http()
        .post('/api/clientes/auth/esqueci-senha')
        .send({ email: c.corpo.email })
        .expect(202);
      const inexistente = await http()
        .post('/api/clientes/auth/esqueci-senha')
        .send({ email: novoEmail() })
        .expect(202);
      expect(inexistente.body).toEqual(existente.body);
      await aguardar(() =>
        email.enviados.find(
          (m) => m.para === c.corpo.email && m.texto.includes('#token='),
        ),
      );
    });

    it('redefinir senha troca a senha, derruba sessões antigas e o link vale uma vez só', async () => {
      const c = await cadastrarOk();
      await http()
        .post('/api/clientes/auth/esqueci-senha')
        .send({ email: c.corpo.email })
        .expect(202);
      const token = await aguardar(() =>
        email.enviados
          .filter((m) => m.para === c.corpo.email)
          .map((m) => m.texto.match(/#token=([\w-]+)/)?.[1])
          .find(Boolean),
      );

      await http()
        .post('/api/clientes/auth/redefinir-senha')
        .send({ token, novaSenha: 'nova-senha-456' })
        .expect(204);

      await http().get('/api/clientes/me').set('Cookie', c.cookie).expect(401);
      await http()
        .post('/api/clientes/auth/login')
        .send({ email: c.corpo.email, senha: SENHA })
        .expect(401);
      const login = await http()
        .post('/api/clientes/auth/login')
        .send({ email: c.corpo.email, senha: 'nova-senha-456' })
        .expect(200);
      // Receber o link no e-mail comprova a posse do e-mail.
      expect(login.body.emailVerificado).toBe(true);

      await http()
        .post('/api/clientes/auth/redefinir-senha')
        .send({ token, novaSenha: 'outra-senha-789' })
        .expect(400);
    });

    it('trocar senha exige a atual e invalida as outras sessões', async () => {
      const c = await cadastrarOk();
      await http()
        .post('/api/clientes/me/senha')
        .set('Cookie', c.cookie)
        .send({ senhaAtual: 'errada-123', novaSenha: 'nova-senha-456' })
        .expect(401);
      const r = await http()
        .post('/api/clientes/me/senha')
        .set('Cookie', c.cookie)
        .send({ senhaAtual: SENHA, novaSenha: 'nova-senha-456' })
        .expect(201);
      const novo = cookieDe(r, 'ne_cliente_sessao');
      await http().get('/api/clientes/me').set('Cookie', c.cookie).expect(401);
      await http().get('/api/clientes/me').set('Cookie', novo).expect(200);
    });
  });

  describe('perfil', () => {
    it('trocar o e-mail exige a senha e zera a verificação', async () => {
      const c = await cadastrarOk();
      const novo = novoEmail();
      await http()
        .patch('/api/clientes/me')
        .set('Cookie', c.cookie)
        .send({ email: novo })
        .expect(401);
      const r = await http()
        .patch('/api/clientes/me')
        .set('Cookie', c.cookie)
        .send({ email: novo, senhaAtual: SENHA })
        .expect(200);
      expect(r.body.email).toBe(novo);
      expect(r.body.emailVerificado).toBe(false);
      await codigoEmail(novo);
    });

    it('não permite usar o telefone de outro cliente', async () => {
      const a = await cadastrarOk();
      const b = await cadastrarOk();
      const r = await http()
        .patch('/api/clientes/me')
        .set('Cookie', b.cookie)
        .send({ telefone: a.tel.digitado })
        .expect(409);
      expect(r.body.message).toBe('Este telefone já está cadastrado.');
    });

    it('trigger atualiza updated_at a cada alteração', async () => {
      const c = await cadastrarOk();
      const antes = await prisma.cliente.findUniqueOrThrow({
        where: { id: c.id },
      });
      await new Promise((r) => setTimeout(r, 20));
      await http()
        .patch('/api/clientes/me')
        .set('Cookie', c.cookie)
        .send({ nome: 'Nome Novo' })
        .expect(200);
      const depois = await prisma.cliente.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(depois.nome).toBe('Nome Novo');
      expect(depois.updatedAt.getTime()).toBeGreaterThan(
        antes.updatedAt.getTime(),
      );
      expect(depois.createdAt).toEqual(antes.createdAt);
    });
  });

  describe('admin', () => {
    let cookieAdmin: string;

    beforeAll(async () => {
      const emailAdmin = `${PREFIXO}-admin@teste.invalid`;
      await prisma.usuarioAdmin.create({
        data: {
          nome: 'Admin Teste',
          email: emailAdmin,
          senhaHash: await gerarHashSenha(SENHA),
        },
      });
      const r = await http()
        .post('/api/auth/login')
        .send({ email: emailAdmin, senha: SENHA })
        .expect(200);
      cookieAdmin = cookieDe(r, 'ne_admin_sessao');
    });

    it('lista com paginação e busca, sem credenciais', async () => {
      const c = await cadastrarOk();
      const r = await http()
        .get('/api/admin/clientes')
        .query({ busca: c.corpo.email, porPagina: 5 })
        .set('Cookie', cookieAdmin)
        .expect(200);
      expect(r.body).toMatchObject({ total: 1, pagina: 1, porPagina: 5 });
      expect(r.body.itens[0].id).toBe(c.id);
      expect(r.body.itens[0]).not.toHaveProperty('senhaHash');
      expect(r.body.itens[0]).not.toHaveProperty('googleSub');

      await http()
        .get('/api/admin/clientes')
        .query({ porPagina: 1000 })
        .set('Cookie', cookieAdmin)
        .expect(400);
    });

    it('busca por id: 404 se não existe, 400 se o id é inválido', async () => {
      const c = await cadastrarOk();
      await http()
        .get(`/api/admin/clientes/${c.id}`)
        .set('Cookie', cookieAdmin)
        .expect(200);
      const r = await http()
        .get(`/api/admin/clientes/${randomUUID()}`)
        .set('Cookie', cookieAdmin)
        .expect(404);
      expect(r.body.message).toBe('Cliente não encontrado.');
      await http()
        .get('/api/admin/clientes/nao-e-uuid')
        .set('Cookie', cookieAdmin)
        .expect(400);
    });

    it('sessão de cliente não acessa as rotas do admin', async () => {
      const c = await cadastrarOk();
      await http()
        .get('/api/admin/clientes')
        .set('Cookie', c.cookie)
        .expect(401);
      await http()
        .get('/api/clientes/me')
        .set('Cookie', cookieAdmin)
        .expect(401);
    });

    it('desativar o cliente derruba a sessão e impede o login', async () => {
      const c = await cadastrarOk();
      const r = await http()
        .patch(`/api/admin/clientes/${c.id}`)
        .set('Cookie', cookieAdmin)
        .send({ ativo: false })
        .expect(200);
      expect(r.body.ativo).toBe(false);
      await http().get('/api/clientes/me').set('Cookie', c.cookie).expect(401);
      await http()
        .post('/api/clientes/auth/login')
        .send({ email: c.corpo.email, senha: SENHA })
        .expect(401);
    });
  });

  describe('constraints do banco (última linha de defesa)', () => {
    const inserir = (telefone: string, email: string) =>
      prisma.$executeRaw`
        INSERT INTO clientes (nome, telefone, email, senha_hash, termos_versao_aceita, termos_aceitos_em)
        VALUES ('Direto', ${telefone}, ${email}, 'x', 'v', now())`;

    it.each([
      ['telefone sem "+"', '5541999990000'],
      ['telefone com máscara', '+55 (41) 99999-0000'],
    ])('recusa %s', async (_caso, telefone) => {
      await expect(inserir(telefone, novoEmail())).rejects.toThrow();
    });

    it('recusa e-mail com maiúsculas e cliente sem nenhuma credencial', async () => {
      await expect(
        inserir(novoTelefone().e164, novoEmail().toUpperCase()),
      ).rejects.toThrow();
      await expect(
        prisma.$executeRaw`
          INSERT INTO clientes (nome, telefone, email, termos_versao_aceita, termos_aceitos_em)
          VALUES ('Direto', ${novoTelefone().e164}, ${novoEmail()}, 'v', now())`,
      ).rejects.toThrow();
    });

    it('aceita E.164 válido', async () => {
      await expect(inserir(novoTelefone().e164, novoEmail())).resolves.toBe(1);
    });

    it('não permite apagar cliente que tem tokens (histórico preservado)', async () => {
      const c = await cadastrarOk();
      await codigoEmail(c.res.body.email);
      await expect(
        prisma.cliente.delete({ where: { id: c.id } }),
      ).rejects.toThrow();
    });
  });
});
