// Agendamentos pela API (disponibilidade, cliente, admin) com o banco substituído por um fake em memória
// e o relógio fixado. As regras de horário em si têm teste próprio (src/agendamentos/horarios.spec.ts);
// aqui se confere a integração HTTP: autenticação, validação, regras de negócio e mapeamento de erros.
// O EXCLUDE e as demais constraints do Postgres são exercitados em test/agendamentos.db-spec.ts.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { instante } from '../src/agendamentos/horarios.js';
import { gerarHashSenha } from '../src/auth/senha.js';
import { configurarApp } from '../src/configurar-app.js';
import { Prisma } from '../src/generated/prisma/client.js';
import {
  WhatsAppService,
  type AvisoCancelamento,
  type AvisoReagendamento,
} from '../src/mensagens/mensagens.types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Quarta-feira, 14/10/2026, 15:00 em São Paulo.
const AGORA = instante('2026-10-14', '15:00');
const SENHA = 'senha-do-cliente-123';
const ID_ADMIN = '7d0f9a3e-0000-4000-8000-000000000001';
const ID_A = '11111111-1111-4111-8111-00000000000a';
const ID_B = '11111111-1111-4111-8111-00000000000b';
const ID_N = '11111111-1111-4111-8111-00000000000c'; // não verificado
const ID_SERVICO = '22222222-2222-4222-8222-000000000001'; // 45 min
const ID_INEXISTENTE = '33333333-3333-4333-8333-333333333333';

interface Ag {
  id: string;
  clienteId: string | null;
  nomeAvulso: string | null;
  servicoId: string;
  inicio: Date;
  fim: Date;
  duracaoMinutos: number;
  preco: number;
  pagamento: string;
  status: string;
  canceladoEm: Date | null;
  canceladoPor: string | null;
  createdAt: Date;
}
interface Sol {
  id: string;
  agendamentoId: string;
  motivo: string;
  status: string;
  resposta: string | null;
  decididoEm: Date | null;
  decididoPor: string | null;
  createdAt: Date;
}

const dec = (n: number) => ({ toNumber: () => n });
const min = (m: number) => m * 60_000;

class WhatsAppFake extends WhatsAppService {
  avisos: { telefone: string; aviso: AvisoCancelamento }[] = [];
  avisosReagendamento: { telefone: string; aviso: AvisoReagendamento }[] = [];
  falhar = false;
  enviarCodigoVerificacao() {
    return Promise.resolve();
  }
  enviarAvisoReagendamento(telefone: string, aviso: AvisoReagendamento) {
    if (this.falhar) return Promise.reject(new Error('Meta fora do ar'));
    this.avisosReagendamento.push({ telefone, aviso });
    return Promise.resolve();
  }
  enviarAvisoCancelamento(telefone: string, aviso: AvisoCancelamento) {
    if (this.falhar) return Promise.reject(new Error('Meta fora do ar'));
    this.avisos.push({ telefone, aviso });
    return Promise.resolve();
  }
}

function erroPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError('falha', {
    code,
    clientVersion: 'teste',
  });
}

describe('Agendamentos (e2e)', () => {
  let app: INestApplication<App>;
  let agendamentos: Ag[];
  let solicitacoes: Sol[];
  interface Reag {
    id: string;
    agendamentoId: string;
    inicioAnterior: Date;
    inicioNovo: Date;
    origem: string;
    createdAt: Date;
    vistoEm: Date | null;
    vistoPor: string | null;
  }
  let reagendamentos: Reag[];
  let seq: number;
  /** Simula a corrida: a consulta de ocupados não enxerga ninguém, mas o INSERT bate no EXCLUDE. */
  let esconderOcupados = false;
  let storage = new ThrottlerStorageService();
  const whatsapp = new WhatsAppFake();
  let cookieAdmin: string;
  let cookieA: string;
  let cookieB: string;
  let cookieN: string;

  const clientes: Record<string, { id: string; nome: string; email: string; telefone: string; senhaHash: string; ok: boolean }> = {};

  const novoId = () => `44444444-4444-4444-8444-${String(++seq).padStart(12, '0')}`;

  function casa(a: Ag, where: any = {}): boolean {
    const igual = (v: any, alvo: any) =>
      v instanceof Date ? v.getTime() === alvo?.getTime?.() : v === alvo;
    for (const [campo, cond] of Object.entries<any>(where)) {
      const valor: any = (a as any)[campo];
      if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
        if ('not' in cond && igual(valor, cond.not)) return false;
        if ('gte' in cond && !(valor >= cond.gte)) return false;
        if ('lt' in cond && !(valor < cond.lt)) return false;
      } else if (!igual(valor, cond)) {
        return false;
      }
    }
    return true;
  }

  function proj(a: Ag, select: any = {}) {
    const decididas = solicitacoes
      .filter((s) => s.agendamentoId === a.id)
      .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
    const soPendentes = Boolean(select.solicitacoes?.where);
    const cliente = a.clienteId ? clientes[a.clienteId] : null;
    return {
      ...a,
      preco: dec(a.preco),
      servico: { id: a.servicoId, nome: 'Corte Masculino' },
      cliente: cliente && { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone },
      solicitacoes: (soPendentes ? decididas.filter((s) => s.status === 'pendente') : decididas).slice(0, 1),
    };
  }

  function projSol(s: Sol) {
    const a = agendamentos.find((x) => x.id === s.agendamentoId)!;
    return { ...s, agendamento: proj(a) };
  }

  function exclusao(candidato: Pick<Ag, 'id' | 'inicio' | 'fim'>) {
    const bate = agendamentos.some(
      (o) =>
        o.id !== candidato.id &&
        o.status !== 'cancelado' &&
        candidato.inicio < o.fim &&
        o.inicio < candidato.fim,
    );
    if (bate) {
      throw new Error('conflicting key value violates exclusion constraint "agendamentos_sem_sobreposicao"');
    }
  }

  /** Cria um agendamento direto no "banco" (sem passar pela API). */
  function semear(p: Partial<Ag> & { inicio: Date }): Ag {
    const dur = p.duracaoMinutos ?? 45;
    const ag: Ag = {
      id: novoId(),
      clienteId: ID_A,
      nomeAvulso: null,
      servicoId: ID_SERVICO,
      fim: new Date(p.inicio.getTime() + min(dur)),
      duracaoMinutos: dur,
      preco: 50,
      pagamento: 'pix',
      status: 'agendado',
      canceladoEm: null,
      canceladoPor: null,
      createdAt: new Date(AGORA.getTime() - min(60)),
      ...p,
    };
    agendamentos.push(ag);
    return ag;
  }

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);

    const hash = await gerarHashSenha(SENHA);
    const base = { telefone: '+5541999990000', senhaHash: hash };
    clientes[ID_A] = { id: ID_A, nome: 'Ana Souza', email: 'a@t.invalid', ok: true, ...base };
    clientes[ID_B] = { id: ID_B, nome: 'Bruno Lima', email: 'b@t.invalid', ok: true, ...base };
    clientes[ID_N] = { id: ID_N, nome: 'Nina Costa', email: 'n@t.invalid', ok: false, ...base };

    const sessaoCliente = (c: (typeof clientes)[string]) => ({
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      emailVerificadoEm: c.ok ? new Date() : null,
      telefoneVerificadoEm: c.ok ? new Date() : null,
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
          return Promise.resolve(c && { ...sessaoCliente(c), senhaHash: c.senhaHash, ativo: true });
        },
        findFirst: ({ where }: any) => {
          const c = clientes[where.id];
          return Promise.resolve(c ? sessaoCliente(c) : null);
        },
        update: () => Promise.resolve({ id: 'x' }),
      },
      servico: {
        findFirst: ({ where }: any) =>
          Promise.resolve(
            where.id === ID_SERVICO && where.ativo
              ? { id: ID_SERVICO, duracaoMinutos: 45, preco: dec(50) }
              : null,
          ),
      },
      agendamento: {
        findMany: ({ where, select }: any) => {
          if (esconderOcupados && where?.status?.not === 'cancelado') return Promise.resolve([]);
          return Promise.resolve(agendamentos.filter((a) => casa(a, where)).map((a) => proj(a, select)));
        },
        count: ({ where }: any) => Promise.resolve(agendamentos.filter((a) => casa(a, where)).length),
        // Cópia, como o Prisma real: o UPDATE posterior não pode alterar o objeto já lido.
        findFirst: ({ where }: any) => {
          const a = agendamentos.find((x) => casa(x, where));
          return Promise.resolve(a ? { ...a } : null);
        },
        findUnique: ({ where, select }: any) => {
          const a = agendamentos.find((x) => x.id === where.id);
          return Promise.resolve(a ? proj(a, select) : null);
        },
        findUniqueOrThrow: ({ where, select }: any) => {
          const a = agendamentos.find((x) => x.id === where.id);
          return a ? Promise.resolve(proj(a, select)) : Promise.reject(erroPrisma('P2025'));
        },
        create: ({ data, select }: any) => {
          const ag: Ag = {
            id: novoId(),
            clienteId: null,
            nomeAvulso: null,
            canceladoEm: null,
            canceladoPor: null,
            status: 'agendado',
            pagamento: 'presencial',
            createdAt: new Date(),
            ...data,
            preco: data.preco.toNumber(),
            fim: new Date(data.inicio.getTime() + min(data.duracaoMinutos)),
          };
          try {
            exclusao(ag);
          } catch (e) {
            return Promise.reject(e);
          }
          agendamentos.push(ag);
          return Promise.resolve(proj(ag, select));
        },
        updateMany: ({ where, data }: any) => {
          const alvos = agendamentos.filter((a) => casa(a, where));
          for (const a of alvos) {
            const novo = { ...a, ...data };
            if (data.inicio) novo.fim = new Date(data.inicio.getTime() + min(a.duracaoMinutos));
            if (novo.status !== 'cancelado') exclusao(novo);
            Object.assign(a, novo);
          }
          return Promise.resolve({ count: alvos.length });
        },
      },
      reagendamento: {
        create: ({ data }: any) => {
          const r: Reag = { id: novoId(), createdAt: new Date(), vistoEm: null, vistoPor: null, ...data };
          reagendamentos.push(r);
          return Promise.resolve(r);
        },
        findMany: ({ where }: any) =>
          Promise.resolve(
            reagendamentos
              .filter((r) => (where.origem === undefined || r.origem === where.origem) && (where.vistoEm !== null || r.vistoEm === null))
              .map((r) => {
                const a = agendamentos.find((x) => x.id === r.agendamentoId)!;
                return { ...r, agendamento: proj(a) };
              }),
          ),
        findUnique: ({ where }: any) => Promise.resolve(reagendamentos.find((r) => r.id === where.id) ?? null),
        updateMany: ({ where, data }: any) => {
          const alvos = reagendamentos.filter(
            (r) =>
              (where.id === undefined || r.id === where.id) &&
              (where.origem === undefined || r.origem === where.origem) &&
              (where.vistoEm !== null || r.vistoEm === null),
          );
          alvos.forEach((r) => Object.assign(r, data));
          return Promise.resolve({ count: alvos.length });
        },
      },
      solicitacaoCancelamento: {
        create: ({ data }: any) => {
          if (solicitacoes.some((s) => s.agendamentoId === data.agendamentoId && s.status === 'pendente')) {
            return Promise.reject(erroPrisma('P2002'));
          }
          const s: Sol = {
            id: novoId(),
            resposta: null,
            decididoEm: null,
            decididoPor: null,
            status: 'pendente',
            createdAt: new Date(),
            ...data,
          };
          solicitacoes.push(s);
          return Promise.resolve(s);
        },
        updateMany: ({ where, data }: any) => {
          const alvos = solicitacoes.filter(
            (s) =>
              (where.id === undefined || s.id === where.id) &&
              (where.agendamentoId === undefined || s.agendamentoId === where.agendamentoId) &&
              (where.status === undefined || s.status === where.status),
          );
          alvos.forEach((s) => Object.assign(s, data));
          return Promise.resolve({ count: alvos.length });
        },
        findUnique: ({ where }: any) => {
          const s = solicitacoes.find((x) => x.id === where.id);
          return Promise.resolve(s ? projSol(s) : null);
        },
        findUniqueOrThrow: ({ where }: any) => {
          const s = solicitacoes.find((x) => x.id === where.id);
          return s ? Promise.resolve(projSol(s)) : Promise.reject(erroPrisma('P2025'));
        },
        findMany: ({ where }: any) =>
          Promise.resolve(
            solicitacoes
              .filter((s) => (!where?.status || s.status === where.status) && (!where?.agendamentoId || s.agendamentoId === where.agendamentoId))
              .map(projSol),
          ),
        count: ({ where }: any) =>
          Promise.resolve(solicitacoes.filter((s) => !where?.status || s.status === where.status).length),
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
      .overrideProvider(WhatsAppService)
      .useValue(whatsapp)
      .compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();

    const logarCliente = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/clientes/auth/login')
          .send({ email, senha: SENHA })
          .expect(200)
      ).headers['set-cookie'][0].split(';')[0];
    cookieA = await logarCliente('a@t.invalid');
    cookieB = await logarCliente('b@t.invalid');
    cookieN = await logarCliente('n@t.invalid');
    cookieAdmin = (
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'dono@novoestilo.com', senha: SENHA })
        .expect(200)
    ).headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.close();
  });

  beforeEach(() => {
    agendamentos = [];
    solicitacoes = [];
    reagendamentos = [];
    seq = 0;
    esconderOcupados = false;
    whatsapp.avisos = [];
    whatsapp.avisosReagendamento = [];
    whatsapp.falhar = false;
    storage = new ThrottlerStorageService();
  });

  const http = () => request(app.getHttpServer());
  const corpo = (extra: object = {}) => ({
    servicoId: ID_SERVICO,
    data: '2026-10-15',
    hora: '10:00',
    pagamento: 'pix',
    ...extra,
  });

  // ------------------------------------------------------- disponibilidade

  describe('GET /api/disponibilidade (público)', () => {
    const consulta = (data: string, servicoId = ID_SERVICO) =>
      http().get('/api/disponibilidade').query({ data, servicoId });

    it('abre sem sessão e remove horários ocupados, sem expor quem ocupa', async () => {
      semear({ inicio: instante('2026-10-15', '10:00') }); // 10:00–10:45
      const res = await consulta('2026-10-15').expect(200);
      expect(res.body.data).toBe('2026-10-15');
      expect(res.body.horarios).toContain('08:00');
      expect(res.body.horarios).toContain('09:00'); // 09:00–09:45
      expect(res.body.horarios).not.toContain('09:30'); // 09:30–10:15 colide
      expect(res.body.horarios).not.toContain('10:00');
      expect(res.body.horarios).not.toContain('10:30');
      expect(res.body.horarios).toContain('11:00');
      expect(res.body.horarios).not.toContain('12:00'); // almoço
      expect(JSON.stringify(res.body)).not.toMatch(/Ana|clienteId|a@t/);
    });

    it('domingo não tem horários', async () => {
      const res = await consulta('2026-10-18').expect(200);
      expect(res.body.horarios).toEqual([]);
    });

    it.each([
      ['ontem', '2026-10-13'],
      ['passado', '2026-10-01'],
      ['acima de 3 meses', '2027-01-15'],
      ['dia inexistente', '2026-02-30'],
      ['formato errado', '15/10/2026'],
    ])('recusa data %s com 400', async (_n, data) => {
      await consulta(data).expect(400);
    });

    it('hoje, amanhã e o último dia da janela valem', async () => {
      await consulta('2026-10-14').expect(200);
      await consulta('2026-10-15').expect(200);
      await consulta('2027-01-14').expect(200);
    });

    it('hoje só oferece horários com 2 h de antecedência (agora são 15:00; serviço de 45 min cabe até 18:00)', async () => {
      const res = await consulta('2026-10-14').expect(200);
      expect(res.body.horarios).toEqual(['17:00']);
    });

    it('hoje, com a agenda cheia nesse horário, não sobra nada', async () => {
      semear({ inicio: instante('2026-10-14', '17:00') });
      const res = await consulta('2026-10-14').expect(200);
      expect(res.body.horarios).toEqual([]);
    });

    it('serviço inexistente dá 404 e id malformado dá 400', async () => {
      await consulta('2026-10-15', ID_INEXISTENTE).expect(404);
      await consulta('2026-10-15', 'abc').expect(400);
    });
  });

  // --------------------------------------------------------------- cliente

  describe('POST /api/clientes/me/agendamentos', () => {
    const criar = (cookie: string, extra: object = {}) =>
      http().post('/api/clientes/me/agendamentos').set('Cookie', cookie).send(corpo(extra));

    it('exige sessão de cliente (sem sessão e com sessão de admin: 401)', async () => {
      await http().post('/api/clientes/me/agendamentos').send(corpo()).expect(401);
      await criar(cookieAdmin).expect(401);
    });

    it('conta não verificada não agenda (403)', async () => {
      const res = await criar(cookieN).expect(403);
      expect(res.body.message).toMatch(/Confirme seu e-mail e seu WhatsApp/);
      expect(agendamentos).toHaveLength(0);
    });

    it('agenda copiando duração e preço do serviço e devolve data/hora de São Paulo', async () => {
      const res = await criar(cookieA).expect(201);
      expect(res.body).toMatchObject({
        data: '2026-10-15',
        hora: '10:00',
        duracaoMinutos: 45,
        preco: 50,
        pagamento: 'pix',
        status: 'agendado',
        podeReagendar: true,
        podeSolicitarCancelamento: true,
        solicitacaoCancelamento: null,
      });
      expect(agendamentos[0].clienteId).toBe(ID_A);
      expect(agendamentos[0].inicio.toISOString()).toBe('2026-10-15T13:00:00.000Z');
      // e o horário some da disponibilidade
      const disp = await http().get('/api/disponibilidade').query({ data: '2026-10-15', servicoId: ID_SERVICO });
      expect(disp.body.horarios).not.toContain('10:00');
    });

    it('agenda para hoje quando falta pelo menos 2 h (17:00, agora são 15:00)', async () => {
      const res = await criar(cookieA, { data: '2026-10-14', hora: '17:00' }).expect(201);
      expect(res.body).toMatchObject({ data: '2026-10-14', hora: '17:00', status: 'agendado' });
    });

    it('hoje com menos de 2 h dá a mensagem de antecedência', async () => {
      const res = await criar(cookieA, { data: '2026-10-14', hora: '16:00' }).expect(400);
      expect(res.body.message).toMatch(/2 horas de antecedência/);
    });

    it.each([
      ['hoje com menos de 2 h de antecedência', { data: '2026-10-14', hora: '16:00' }],
      ['ontem', { data: '2026-10-13' }],
      ['mais de 3 meses', { data: '2027-01-15' }],
      ['domingo', { data: '2026-10-18' }],
      ['fora da grade de 30 min', { hora: '10:15' }],
      ['almoço', { hora: '12:00' }],
      ['antes do expediente', { hora: '07:30' }],
      ['terminando depois das 18:00', { hora: '17:30' }],
      ['dia inexistente', { data: '2026-02-30' }],
      ['pagamento inválido', { pagamento: 'fiado' }],
      ['campo desconhecido (preco)', { preco: 1 }],
      ['serviço malformado', { servicoId: 'x' }],
    ])('recusa %s com 400', async (_n, extra) => {
      await criar(cookieA, extra).expect(400);
      expect(agendamentos).toHaveLength(0);
    });

    it('serviço inexistente dá 404', async () => {
      await criar(cookieA, { servicoId: ID_INEXISTENTE }).expect(404);
    });

    it('horário já ocupado dá 409, inclusive se sobrepõe parcialmente', async () => {
      semear({ inicio: instante('2026-10-15', '10:00'), clienteId: ID_B });
      await criar(cookieA, { hora: '10:00' }).expect(409);
      await criar(cookieA, { hora: '10:30' }).expect(409);
      await criar(cookieA, { hora: '11:00' }).expect(201); // encosta, pode
    });

    it('corrida: se o EXCLUDE do banco barrar o INSERT, vira 409 (e não 500)', async () => {
      semear({ inicio: instante('2026-10-15', '10:00'), clienteId: ID_B });
      esconderOcupados = true;
      const res = await criar(cookieA, { hora: '10:00' }).expect(409);
      expect(res.body.message).toMatch(/acabou de ser ocupado/);
      expect(agendamentos).toHaveLength(1);
    });
  });

  describe('GET /api/clientes/me/agendamentos', () => {
    it('lista só os do próprio cliente, do mais recente ao mais antigo', async () => {
      semear({ inicio: instante('2026-10-20', '10:00'), clienteId: ID_A });
      semear({ inicio: instante('2026-10-16', '10:00'), clienteId: ID_A });
      semear({ inicio: instante('2026-10-17', '10:00'), clienteId: ID_B });
      const res = await http().get('/api/clientes/me/agendamentos').set('Cookie', cookieA).expect(200);
      expect(res.body.map((a: any) => a.data)).toEqual(['2026-10-20', '2026-10-16']);
      expect(JSON.stringify(res.body)).not.toMatch(/Bruno/);
    });

    it('exige sessão', async () => {
      await http().get('/api/clientes/me/agendamentos').expect(401);
    });
  });

  describe('POST /api/clientes/me/agendamentos/:id/reagendar', () => {
    const reagendar = (cookie: string, id: string, body: object) =>
      http().post(`/api/clientes/me/agendamentos/${id}/reagendar`).set('Cookie', cookie).send(body);
    const novo = { data: '2026-10-16', hora: '14:00' };

    it('muda só o horário, grava o histórico e mantém serviço/duração', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      const res = await reagendar(cookieA, ag.id, novo).expect(200);
      expect(res.body).toMatchObject({ data: '2026-10-16', hora: '14:00', duracaoMinutos: 45, status: 'agendado' });
      expect(reagendamentos).toMatchObject([
        { agendamentoId: ag.id, inicioAnterior: instante('2026-10-15', '10:00'), inicioNovo: instante('2026-10-16', '14:00'), origem: 'cliente', vistoEm: null },
      ]);
    });

    it('pode reagendar quantas vezes quiser', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await reagendar(cookieA, ag.id, novo).expect(200);
      await reagendar(cookieA, ag.id, { data: '2026-10-17', hora: '09:00' }).expect(200);
      await reagendar(cookieA, ag.id, { data: '2026-10-19', hora: '09:00' }).expect(200);
      expect(reagendamentos).toHaveLength(3);
    });

    it('limite de 2 h: exatamente 2 h antes ainda pode; menos não', async () => {
      const exato = semear({ inicio: instante('2026-10-14', '17:00') }); // agora é 15:00
      await reagendar(cookieA, exato.id, novo).expect(200);
      const apertado = semear({ inicio: instante('2026-10-14', '16:30') });
      const res = await reagendar(cookieA, apertado.id, { data: '2026-10-17', hora: '09:00' }).expect(409);
      expect(res.body.message).toMatch(/até 2 horas antes/);
    });

    it('atendimento retroativo (que já passou ou já começou) nunca reagenda', async () => {
      const passado = semear({ inicio: instante('2026-10-10', '10:00') });
      const comecou = semear({ inicio: instante('2026-10-14', '14:30') });
      for (const ag of [passado, comecou]) {
        const res = await reagendar(cookieA, ag.id, novo).expect(409);
        expect(res.body.message).toMatch(/já passou/);
      }
    });

    it.each([
      ['ontem', { data: '2026-10-13', hora: '10:00' }],
      ['hoje com menos de 2 h de antecedência', { data: '2026-10-14', hora: '16:00' }],
      ['hoje terminando depois das 18:00', { data: '2026-10-14', hora: '17:30' }],
      ['passado', { data: '2026-10-10', hora: '10:00' }],
      ['mais de 3 meses', { data: '2027-01-15', hora: '10:00' }],
      ['domingo', { data: '2026-10-18', hora: '10:00' }],
      ['fora da grade', { data: '2026-10-16', hora: '10:10' }],
      ['almoço', { data: '2026-10-16', hora: '12:30' }],
    ])('recusa o novo horário em %s com 400', async (_n, body) => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await reagendar(cookieA, ag.id, body).expect(400);
      expect(reagendamentos).toHaveLength(0);
      expect(agendamentos[0].inicio).toEqual(instante('2026-10-15', '10:00'));
    });

    it('novo horário ocupado dá 409; mover para um horário que só colide com o próprio atual é permitido', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      semear({ inicio: instante('2026-10-16', '14:00'), clienteId: ID_B });
      await reagendar(cookieA, ag.id, novo).expect(409);
      await reagendar(cookieA, ag.id, { data: '2026-10-15', hora: '10:30' }).expect(200); // 10:30–11:15 sobrepõe 10:00–10:45 do próprio
    });

    it('reagenda para hoje quando falta pelo menos 2 h (17:00, agora são 15:00)', async () => {
      const ag = semear({ inicio: instante('2026-10-16', '10:00') });
      const res = await reagendar(cookieA, ag.id, { data: '2026-10-14', hora: '17:00' }).expect(200);
      expect(res.body).toMatchObject({ data: '2026-10-14', hora: '17:00' });
    });

    it('mesmo horário atual dá 400', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await reagendar(cookieA, ag.id, { data: '2026-10-15', hora: '10:00' }).expect(400);
    });

    it('agendamento de outro cliente dá 404; cancelado dá 409; conta não verificada 403', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00'), clienteId: ID_A });
      await reagendar(cookieB, ag.id, novo).expect(404);
      await reagendar(cookieN, ag.id, novo).expect(403);
      const cancelado = semear({ inicio: instante('2026-10-20', '10:00'), status: 'cancelado', canceladoEm: AGORA });
      await reagendar(cookieA, cancelado.id, novo).expect(409);
      await reagendar(cookieA, ID_INEXISTENTE, novo).expect(404);
    });

    it('exige sessão de cliente', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await http().post(`/api/clientes/me/agendamentos/${ag.id}/reagendar`).send(novo).expect(401);
      await reagendar(cookieAdmin, ag.id, novo).expect(401);
    });

    it('corrida no reagendamento: o EXCLUDE barra e vira 409', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      semear({ inicio: instante('2026-10-16', '14:00'), clienteId: ID_B });
      esconderOcupados = true;
      await reagendar(cookieA, ag.id, novo).expect(409);
      expect(agendamentos[0].inicio).toEqual(instante('2026-10-15', '10:00'));
    });
  });

  describe('POST /api/clientes/me/agendamentos/:id/solicitar-cancelamento', () => {
    const pedir = (cookie: string, id: string, motivo: unknown) =>
      http().post(`/api/clientes/me/agendamentos/${id}/solicitar-cancelamento`).set('Cookie', cookie).send({ motivo });

    it('registra o pedido com o motivo; o horário continua reservado', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      const res = await pedir(cookieA, ag.id, '  Surgiu um imprevisto  ').expect(201);
      expect(res.body.status).toBe('agendado');
      expect(res.body.solicitacaoCancelamento).toMatchObject({ status: 'pendente', motivo: 'Surgiu um imprevisto' });
      expect(res.body.podeSolicitarCancelamento).toBe(false);
      const disp = await http().get('/api/disponibilidade').query({ data: '2026-10-15', servicoId: ID_SERVICO });
      expect(disp.body.horarios).not.toContain('10:00');
    });

    it('pode pedir a qualquer momento antes do atendimento, mesmo a menos de 2 h', async () => {
      const ag = semear({ inicio: instante('2026-10-14', '15:30') });
      await pedir(cookieA, ag.id, 'Passei mal').expect(201);
    });

    it('motivo obrigatório (vazio, só espaços, ausente ou grande demais: 400)', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await pedir(cookieA, ag.id, '').expect(400);
      await pedir(cookieA, ag.id, '    ').expect(400);
      await pedir(cookieA, ag.id, undefined).expect(400);
      await pedir(cookieA, ag.id, 'x'.repeat(501)).expect(400);
      expect(solicitacoes).toHaveLength(0);
    });

    it('segunda solicitação pendente dá 409', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await pedir(cookieA, ag.id, 'Primeiro').expect(201);
      const res = await pedir(cookieA, ag.id, 'Segundo').expect(409);
      expect(res.body.message).toMatch(/pendente/);
      expect(solicitacoes).toHaveLength(1);
    });

    it('atendimento que já passou, cancelado, alheio ou inexistente', async () => {
      const passado = semear({ inicio: instante('2026-10-10', '10:00') });
      await pedir(cookieA, passado.id, 'Tarde').expect(409);
      const cancelado = semear({ inicio: instante('2026-10-20', '10:00'), status: 'cancelado', canceladoEm: AGORA });
      await pedir(cookieA, cancelado.id, 'Já cancelado').expect(409);
      const alheio = semear({ inicio: instante('2026-10-21', '10:00'), clienteId: ID_B });
      await pedir(cookieA, alheio.id, 'Não é meu').expect(404);
      await pedir(cookieA, ID_INEXISTENTE, 'Nada').expect(404);
    });

    it('exige sessão de cliente', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await http().post(`/api/clientes/me/agendamentos/${ag.id}/solicitar-cancelamento`).send({ motivo: 'x' }).expect(401);
    });
  });

  // ----------------------------------------------------------------- admin

  describe('/api/admin/agendamentos', () => {
    const admin = (metodo: 'get' | 'post' | 'patch', url: string) =>
      http()[metodo](url).set('Cookie', cookieAdmin);

    it('exige sessão de admin (sem sessão e com sessão de cliente: 401)', async () => {
      await http().get('/api/admin/agendamentos').expect(401);
      await http().get('/api/admin/agendamentos').set('Cookie', cookieA).expect(401);
      await http().post('/api/admin/agendamentos').send({}).expect(401);
      await http().get('/api/admin/solicitacoes-cancelamento').set('Cookie', cookieA).expect(401);
    });

    it('lista com cliente do site e reserva manual, com filtros e paginação', async () => {
      semear({ inicio: instante('2026-10-15', '10:00') });
      semear({ inicio: instante('2026-10-16', '10:00'), clienteId: null, nomeAvulso: 'Seu Zé' });
      semear({ inicio: instante('2026-10-20', '10:00'), status: 'cancelado', canceladoEm: AGORA });

      const todos = await admin('get', '/api/admin/agendamentos').expect(200);
      expect(todos.body.total).toBe(3);
      expect(todos.body.itens[0]).toMatchObject({ origem: 'site', cliente: { nome: 'Ana Souza', telefone: '+5541999990000' } });
      expect(todos.body.itens[1]).toMatchObject({ origem: 'manual', nomeAvulso: 'Seu Zé', cliente: null });

      const ativos = await admin('get', '/api/admin/agendamentos').query({ status: 'agendado' }).expect(200);
      expect(ativos.body.total).toBe(2);
      await admin('get', '/api/admin/agendamentos').query({ status: 'inventado' }).expect(400);
      await admin('get', '/api/admin/agendamentos').query({ porPagina: 1000 }).expect(400);
    });

    it('reserva manual: só nome, serviço, duração, data e hora — sem telefone nem e-mail', async () => {
      const res = await admin('post', '/api/admin/agendamentos')
        .send({ nome: '  Seu Zé  ', servicoId: ID_SERVICO, duracaoMinutos: 30, data: '2026-10-14', hora: '16:15' })
        .expect(201);
      expect(res.body).toMatchObject({ origem: 'manual', nomeAvulso: 'Seu Zé', cliente: null, duracaoMinutos: 30, pagamento: 'presencial', hora: '16:15' });
      expect(agendamentos[0].clienteId).toBeNull();

      await admin('post', '/api/admin/agendamentos')
        .send({ nome: 'Fulano', servicoId: ID_SERVICO, duracaoMinutos: 30, data: '2026-10-15', hora: '10:00', telefone: '41999' })
        .expect(400);
    });

    it('reserva manual recusa conflito (409), passado, domingo, fora do expediente e dados inválidos', async () => {
      semear({ inicio: instante('2026-10-15', '10:00') });
      const base = { nome: 'Fulano', servicoId: ID_SERVICO, duracaoMinutos: 30, data: '2026-10-15', hora: '10:30' };
      await admin('post', '/api/admin/agendamentos').send(base).expect(409);
      await admin('post', '/api/admin/agendamentos').send({ ...base, data: '2026-10-14', hora: '09:00' }).expect(400); // passado
      await admin('post', '/api/admin/agendamentos').send({ ...base, data: '2026-10-18' }).expect(400); // domingo
      await admin('post', '/api/admin/agendamentos').send({ ...base, hora: '17:45' }).expect(400); // passa das 18h
      await admin('post', '/api/admin/agendamentos').send({ ...base, nome: '   ' }).expect(400);
      await admin('post', '/api/admin/agendamentos').send({ ...base, duracaoMinutos: 2 }).expect(400);
      await admin('post', '/api/admin/agendamentos').send({ ...base, servicoId: ID_INEXISTENTE, hora: '15:00' }).expect(404);
    });

    it('cancelar direto: guarda quem e quando, libera o horário e aprova pedido pendente', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      solicitacoes.push({ id: novoId(), agendamentoId: ag.id, motivo: 'Imprevisto', status: 'pendente', resposta: null, decididoEm: null, decididoPor: null, createdAt: AGORA });
      const res = await admin('patch', `/api/admin/agendamentos/${ag.id}`).send({ status: 'cancelado' }).expect(200);
      expect(res.body.status).toBe('cancelado');
      expect(agendamentos[0]).toMatchObject({ status: 'cancelado', canceladoPor: ID_ADMIN });
      expect(agendamentos[0].canceladoEm).toEqual(AGORA);
      expect(solicitacoes[0]).toMatchObject({ status: 'aprovada', decididoPor: ID_ADMIN });
      const disp = await http().get('/api/disponibilidade').query({ data: '2026-10-15', servicoId: ID_SERVICO });
      expect(disp.body.horarios).toContain('10:00');
      // Nunca apaga: o registro continua lá.
      expect(agendamentos).toHaveLength(1);
    });

    it('concluir só atendimento que já começou; status inválido 400; repetir 409', async () => {
      const futuro = semear({ inicio: instante('2026-10-15', '10:00') });
      await admin('patch', `/api/admin/agendamentos/${futuro.id}`).send({ status: 'concluido' }).expect(400);
      const passado = semear({ inicio: instante('2026-10-14', '09:00') });
      await admin('patch', `/api/admin/agendamentos/${passado.id}`).send({ status: 'concluido' }).expect(200);
      await admin('patch', `/api/admin/agendamentos/${passado.id}`).send({ status: 'cancelado' }).expect(409);
      await admin('patch', `/api/admin/agendamentos/${futuro.id}`).send({ status: 'agendado' }).expect(400);
      await admin('patch', `/api/admin/agendamentos/${ID_INEXISTENTE}`).send({ status: 'cancelado' }).expect(404);
    });
  });

  describe('/api/admin/solicitacoes-cancelamento', () => {
    function pedido(inicio = instante('2026-10-15', '10:00')) {
      const ag = semear({ inicio });
      const s: Sol = { id: novoId(), agendamentoId: ag.id, motivo: 'Imprevisto', status: 'pendente', resposta: null, decididoEm: null, decididoPor: null, createdAt: AGORA };
      solicitacoes.push(s);
      return { ag, s };
    }
    const decidir = (id: string, body: object) =>
      http().post(`/api/admin/solicitacoes-cancelamento/${id}/decidir`).set('Cookie', cookieAdmin).send(body);

    it('lista pendentes com quem pediu e o motivo', async () => {
      pedido();
      const res = await http().get('/api/admin/solicitacoes-cancelamento').query({ status: 'pendente' }).set('Cookie', cookieAdmin).expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.itens[0]).toMatchObject({
        motivo: 'Imprevisto',
        status: 'pendente',
        agendamento: { servicoNome: 'Corte Masculino', cliente: { nome: 'Ana Souza' } },
      });
    });

    it('aprovar cancela o agendamento e libera o horário', async () => {
      const { ag, s } = pedido();
      const res = await decidir(s.id, { aprovar: true, resposta: 'Sem problemas' }).expect(200);
      expect(res.body).toMatchObject({ status: 'aprovada', resposta: 'Sem problemas' });
      expect(agendamentos.find((a) => a.id === ag.id)).toMatchObject({ status: 'cancelado', canceladoPor: ID_ADMIN });
    });

    it('recusar mantém o agendamento, guarda a resposta e permite novo pedido', async () => {
      const { ag, s } = pedido();
      await decidir(s.id, { aprovar: false, resposta: 'Já reservei sua vaga' }).expect(200);
      expect(agendamentos.find((a) => a.id === ag.id)!.status).toBe('agendado');
      expect(solicitacoes[0]).toMatchObject({ status: 'recusada', resposta: 'Já reservei sua vaga' });
      await http()
        .post(`/api/clientes/me/agendamentos/${ag.id}/solicitar-cancelamento`)
        .set('Cookie', cookieA)
        .send({ motivo: 'De novo' })
        .expect(201);
    });

    it('decidir duas vezes dá 409; inexistente 404; corpo inválido 400', async () => {
      const { s } = pedido();
      await decidir(s.id, { aprovar: false }).expect(200);
      await decidir(s.id, { aprovar: true }).expect(409);
      await decidir(ID_INEXISTENTE, { aprovar: true }).expect(404);
      const outro = pedido(instante('2026-10-16', '10:00'));
      await decidir(outro.s.id, {}).expect(400);
      await decidir(outro.s.id, { aprovar: 'sim' }).expect(400);
    });
  });

  // ------------------------------------------------- admin: trocar de horário

  describe('POST /api/admin/agendamentos/:id/reagendar (Trocar de horário)', () => {
    const trocar = (id: string, body: object) =>
      http().post(`/api/admin/agendamentos/${id}/reagendar`).set('Cookie', cookieAdmin).send(body);

    it('move para outro dia/hora, mantém serviço e duração e grava o histórico', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      const res = await trocar(ag.id, { data: '2026-10-16', hora: '11:20' }).expect(200);
      expect(res.body).toMatchObject({ data: '2026-10-16', hora: '11:20', duracaoMinutos: 45, status: 'agendado' });
      expect(reagendamentos).toMatchObject([
        { agendamentoId: ag.id, inicioAnterior: instante('2026-10-15', '10:00'), inicioNovo: instante('2026-10-16', '11:20'), origem: 'admin', vistoPor: ID_ADMIN },
      ]);
      expect(reagendamentos[0].vistoEm).not.toBeNull(); // reagendamento do barbeiro nunca vira notificação
    });

    it('o barbeiro pode usar qualquer minuto, o almoço e até hoje (sem a regra das 2 h do cliente)', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await trocar(ag.id, { data: '2026-10-15', hora: '12:30' }).expect(200);
      await trocar(ag.id, { data: '2026-10-14', hora: '15:30' }).expect(200); // agora são 15:00
    });

    it.each([
      ['no passado', { data: '2026-10-14', hora: '14:00' }],
      ['domingo', { data: '2026-10-18', hora: '10:00' }],
      ['depois das 18:00', { data: '2026-10-16', hora: '17:30' }],
      ['antes das 08:00', { data: '2026-10-16', hora: '07:30' }],
      ['data inexistente', { data: '2026-02-30', hora: '10:00' }],
      ['corpo incompleto', { data: '2026-10-16' }],
      ['campo desconhecido', { data: '2026-10-16', hora: '10:00', servicoId: 'x' }],
    ])('recusa %s com 400', async (_n, body) => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await trocar(ag.id, body).expect(400);
      expect(agendamentos[0].inicio).toEqual(instante('2026-10-15', '10:00'));
    });

    it('horário ocupado dá 409; o mesmo horário atual dá 400', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      semear({ inicio: instante('2026-10-16', '14:00'), clienteId: ID_B });
      await trocar(ag.id, { data: '2026-10-16', hora: '14:30' }).expect(409);
      await trocar(ag.id, { data: '2026-10-15', hora: '10:00' }).expect(400);
    });

    it('só agendamentos ativos e que ainda não começaram; inexistente 404', async () => {
      const passado = semear({ inicio: instante('2026-10-14', '14:00') });
      await trocar(passado.id, { data: '2026-10-16', hora: '10:00' }).expect(409);
      const cancelado = semear({ inicio: instante('2026-10-20', '10:00'), status: 'cancelado', canceladoEm: AGORA });
      await trocar(cancelado.id, { data: '2026-10-21', hora: '10:00' }).expect(409);
      await trocar(ID_INEXISTENTE, { data: '2026-10-21', hora: '10:00' }).expect(404);
    });

    it('exige sessão de admin', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await http().post(`/api/admin/agendamentos/${ag.id}/reagendar`).send({ data: '2026-10-16', hora: '10:00' }).expect(401);
      await http()
        .post(`/api/admin/agendamentos/${ag.id}/reagendar`)
        .set('Cookie', cookieA)
        .send({ data: '2026-10-16', hora: '10:00' })
        .expect(401);
    });

    it('corrida: o EXCLUDE do banco barra e vira 409', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      semear({ inicio: instante('2026-10-16', '14:00'), clienteId: ID_B });
      esconderOcupados = true;
      await trocar(ag.id, { data: '2026-10-16', hora: '14:00' }).expect(409);
      expect(agendamentos[0].inicio).toEqual(instante('2026-10-15', '10:00'));
    });
  });

  // -------------------------------------------- WhatsApp: decisão do cancelamento

  describe('aviso por WhatsApp ao cliente quando o cancelamento é decidido', () => {
    function pedido(extra: Partial<Ag> = {}) {
      const ag = semear({ inicio: instante('2026-10-15', '10:00'), ...extra });
      const sol: Sol = { id: novoId(), agendamentoId: ag.id, motivo: 'Imprevisto', status: 'pendente', resposta: null, decididoEm: null, decididoPor: null, createdAt: AGORA };
      solicitacoes.push(sol);
      return { ag, sol };
    }
    const decidir = (id: string, body: object) =>
      http().post(`/api/admin/solicitacoes-cancelamento/${id}/decidir`).set('Cookie', cookieAdmin).send(body);

    it('aprovar avisa o cliente com serviço, dia, hora e a mensagem do barbeiro', async () => {
      const { sol } = pedido();
      await decidir(sol.id, { aprovar: true, resposta: 'Sem problemas' }).expect(200);
      await vi.waitFor(() => expect(whatsapp.avisos).toHaveLength(1));
      expect(whatsapp.avisos[0]).toEqual({
        telefone: '+5541999990000',
        aviso: { aprovado: true, servico: 'Corte Masculino', data: '15/10/2026', hora: '10:00', resposta: 'Sem problemas' },
      });
    });

    it('recusar avisa que o horário foi mantido (e que ficou sem mensagem extra)', async () => {
      const { sol } = pedido();
      await decidir(sol.id, { aprovar: false }).expect(200);
      await vi.waitFor(() => expect(whatsapp.avisos).toHaveLength(1));
      expect(whatsapp.avisos[0].aviso).toMatchObject({ aprovado: false, data: '15/10/2026', hora: '10:00', resposta: null });
    });

    it('cancelar direto um agendamento com pedido pendente também avisa (aprovado)', async () => {
      const { ag } = pedido();
      await http().patch(`/api/admin/agendamentos/${ag.id}`).set('Cookie', cookieAdmin).send({ status: 'cancelado' }).expect(200);
      await vi.waitFor(() => expect(whatsapp.avisos).toHaveLength(1));
      expect(whatsapp.avisos[0].aviso.aprovado).toBe(true);
    });

    it('cancelar direto sem pedido pendente não manda aviso (nada foi decidido)', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await http().patch(`/api/admin/agendamentos/${ag.id}`).set('Cookie', cookieAdmin).send({ status: 'cancelado' }).expect(200);
      await new Promise((r) => setTimeout(r, 50));
      expect(whatsapp.avisos).toHaveLength(0);
    });

    it('se o WhatsApp falhar, a decisão do barbeiro continua valendo (200) e nada quebra', async () => {
      whatsapp.falhar = true;
      const { ag, sol } = pedido();
      const res = await decidir(sol.id, { aprovar: true }).expect(200);
      expect(res.body.status).toBe('aprovada');
      await new Promise((r) => setTimeout(r, 50));
      expect(agendamentos.find((a) => a.id === ag.id)!.status).toBe('cancelado');
      expect(whatsapp.avisos).toHaveLength(0);
    });
  });

  // ----------------------------- notificação de reagendamento (sem aprovação)

  describe('reagendamento do cliente vira notificação para o barbeiro (sem aprovação)', () => {
    const reagendarComoCliente = (cookie: string, id: string, body: object) =>
      http().post(`/api/clientes/me/agendamentos/${id}/reagendar`).set('Cookie', cookie).send(body);
    const novos = () => http().get('/api/admin/reagendamentos/novos').set('Cookie', cookieAdmin);

    it('o cliente reagenda na hora (200, sem aprovação) e o barbeiro recebe a notificação com de/para', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      const res = await reagendarComoCliente(cookieA, ag.id, { data: '2026-10-16', hora: '14:00' }).expect(200);
      expect(res.body).toMatchObject({ data: '2026-10-16', hora: '14:00', status: 'agendado' });

      const lista = await novos().expect(200);
      expect(lista.body).toHaveLength(1);
      expect(lista.body[0]).toMatchObject({
        de: { data: '2026-10-15', hora: '10:00' },
        para: { data: '2026-10-16', hora: '14:00' },
        agendamento: { servicoNome: 'Corte Masculino', cliente: { nome: 'Ana Souza' } },
      });
    });

    it('marcar como visto tira da lista; repetir não dá erro; id inexistente dá 404', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await reagendarComoCliente(cookieA, ag.id, { data: '2026-10-16', hora: '14:00' }).expect(200);
      const id = (await novos().expect(200)).body[0].id;

      await http().post(`/api/admin/reagendamentos/${id}/visto`).set('Cookie', cookieAdmin).expect(204);
      expect((await novos().expect(200)).body).toHaveLength(0);
      expect(reagendamentos[0]).toMatchObject({ vistoPor: ID_ADMIN });
      await http().post(`/api/admin/reagendamentos/${id}/visto`).set('Cookie', cookieAdmin).expect(204);
      await http().post(`/api/admin/reagendamentos/${ID_INEXISTENTE}/visto`).set('Cookie', cookieAdmin).expect(404);
    });

    it('marcar todos como vistos', async () => {
      const a1 = semear({ inicio: instante('2026-10-15', '10:00') });
      const a2 = semear({ inicio: instante('2026-10-16', '10:00') });
      await reagendarComoCliente(cookieA, a1.id, { data: '2026-10-19', hora: '09:00' }).expect(200);
      await reagendarComoCliente(cookieA, a2.id, { data: '2026-10-19', hora: '15:00' }).expect(200);
      expect((await novos().expect(200)).body).toHaveLength(2);
      await http().post('/api/admin/reagendamentos/visto').set('Cookie', cookieAdmin).expect(204);
      expect((await novos().expect(200)).body).toHaveLength(0);
    });

    it('o reagendamento feito pelo próprio barbeiro não gera notificação', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await http()
        .post(`/api/admin/agendamentos/${ag.id}/reagendar`)
        .set('Cookie', cookieAdmin)
        .send({ data: '2026-10-16', hora: '11:00' })
        .expect(200);
      expect((await novos().expect(200)).body).toHaveLength(0);
    });

    it('exige sessão de admin (cliente e anônimo: 401)', async () => {
      await http().get('/api/admin/reagendamentos/novos').expect(401);
      await http().get('/api/admin/reagendamentos/novos').set('Cookie', cookieA).expect(401);
      await http().post('/api/admin/reagendamentos/visto').set('Cookie', cookieA).expect(401);
    });
  });

  // ------------------- aviso por WhatsApp ao cliente quando o barbeiro reagenda

  describe('aviso por WhatsApp ao cliente quando o barbeiro reagenda', () => {
    const reagendarComoAdmin = (id: string, body: object) =>
      http().post(`/api/admin/agendamentos/${id}/reagendar`).set('Cookie', cookieAdmin).send(body);

    it('avisa o cliente com o serviço e o NOVO dia e hora', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      await reagendarComoAdmin(ag.id, { data: '2026-10-16', hora: '14:20' }).expect(200);
      await vi.waitFor(() => expect(whatsapp.avisosReagendamento).toHaveLength(1));
      expect(whatsapp.avisosReagendamento[0]).toEqual({
        telefone: '+5541999990000',
        aviso: { servico: 'Corte Masculino', data: '16/10/2026', hora: '14:20' },
      });
    });

    it('reserva manual (sem telefone) não tem a quem avisar, mas o reagendamento funciona', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00'), clienteId: null, nomeAvulso: 'Seu Zé' });
      await reagendarComoAdmin(ag.id, { data: '2026-10-16', hora: '14:20' }).expect(200);
      await new Promise((r) => setTimeout(r, 50));
      expect(whatsapp.avisosReagendamento).toHaveLength(0);
    });

    it('se o WhatsApp falhar, o reagendamento continua valendo (200)', async () => {
      whatsapp.falhar = true;
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      const res = await reagendarComoAdmin(ag.id, { data: '2026-10-16', hora: '14:20' }).expect(200);
      expect(res.body).toMatchObject({ data: '2026-10-16', hora: '14:20' });
      await new Promise((r) => setTimeout(r, 50));
      expect(whatsapp.avisosReagendamento).toHaveLength(0);
    });

    it('um reagendamento recusado (conflito) não avisa ninguém', async () => {
      const ag = semear({ inicio: instante('2026-10-15', '10:00') });
      semear({ inicio: instante('2026-10-16', '14:00'), clienteId: ID_B });
      await reagendarComoAdmin(ag.id, { data: '2026-10-16', hora: '14:30' }).expect(409);
      await new Promise((r) => setTimeout(r, 50));
      expect(whatsapp.avisosReagendamento).toHaveLength(0);
    });
  });
});
