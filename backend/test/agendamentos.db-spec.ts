// Agendamentos contra o Postgres real: a garantia final (EXCLUDE anti-dupla-reserva, trigger do fim,
// índice de solicitação pendente única) e o mapeamento desses erros do banco para 409.
// Rodar com `npm run test:db`, DEPOIS de aplicar a migration 20261013140000_agendamentos.
// Todos os dados usam o prefixo PREFIXO e são apagados no afterAll.
import { ConflictException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { randomInt, randomUUID } from 'node:crypto';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  ehConflitoDeHorario,
  AgendamentosService,
} from '../src/agendamentos/agendamentos.service.js';
import { dataSP, instante, somarDias, diaDaSemana } from '../src/agendamentos/horarios.js';
import type { ClienteAutenticado } from '../src/clientes/clientes.types.js';
import { configurarApp } from '../src/configurar-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `teste-${randomUUID().slice(0, 8)}`;

/** Um dia útil (seg–sáb) dentro da janela de agendamento: a partir de ~5 dias, nunca domingo. */
function diaDeTeste(deslocamento = 0): string {
  let dia = somarDias(dataSP(new Date()), 5 + deslocamento);
  while (diaDaSemana(dia) === 0) dia = somarDias(dia, 1);
  return dia;
}

describe('Agendamentos (integração com o banco)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agendamentos: AgendamentosService;
  let servicoId: string;
  let adminId: string;
  let ana: ClienteAutenticado;
  let bruno: ClienteAutenticado;

  async function criarCliente(sufixo: string): Promise<ClienteAutenticado> {
    const c = await prisma.cliente.create({
      data: {
        nome: `Cliente ${sufixo}`,
        email: `${PREFIXO}-${sufixo}@teste.invalid`,
        telefone: `+554199${randomInt(0, 10_000_000).toString().padStart(7, '0')}`,
        senhaHash: 'hash-de-teste',
        emailVerificadoEm: new Date(),
        telefoneVerificadoEm: new Date(),
        termosVersaoAceita: 'teste',
        termosAceitosEm: new Date(),
      },
    });
    return {
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      emailVerificado: true,
      telefoneVerificado: true,
    };
  }

  beforeAll(async () => {
    const throttler: ThrottlerStorage = {
      increment: (...a) => new ThrottlerStorageService().increment(...a),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue(throttler)
      .compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    agendamentos = app.get(AgendamentosService);

    const servico = await prisma.servico.create({
      data: { nome: `${PREFIXO} corte`, preco: 50, duracaoMinutos: 45 },
    });
    servicoId = servico.id;
    adminId = (
      await prisma.usuarioAdmin.create({
        data: { nome: 'Admin Teste', email: `${PREFIXO}-admin@teste.invalid`, senhaHash: 'hash-de-teste' },
      })
    ).id;
    ana = await criarCliente('ana');
    bruno = await criarCliente('bruno');
  });

  afterAll(async () => {
    if (prisma) {
      const ags = { agendamento: { servicoId } };
      await prisma.solicitacaoCancelamento.deleteMany({ where: ags });
      await prisma.reagendamento.deleteMany({ where: ags });
      await prisma.agendamento.deleteMany({ where: { servicoId } });
      await prisma.servico.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
      await prisma.cliente.deleteMany({ where: { email: { startsWith: PREFIXO } } });
      await prisma.usuarioAdmin.deleteMany({ where: { email: { startsWith: PREFIXO } } });
    }
    await app?.close();
  });

  afterEach(async () => {
    const ags = { agendamento: { servicoId } };
    await prisma.solicitacaoCancelamento.deleteMany({ where: ags });
    await prisma.reagendamento.deleteMany({ where: ags });
    await prisma.agendamento.deleteMany({ where: { servicoId } });
  });

  const novo = (cliente: ClienteAutenticado, data: string, hora: string) =>
    agendamentos.criarDoCliente(cliente, { servicoId, data, hora, pagamento: 'pix' });

  it('o trigger calcula o fim e o preço/duração ficam gravados no agendamento', async () => {
    const data = diaDeTeste();
    const criado = await novo(ana, data, '10:00');
    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: criado.id } });
    expect(linha.fim.getTime() - linha.inicio.getTime()).toBe(45 * 60_000);
    expect(linha.duracaoMinutos).toBe(45);
    expect(linha.preco.toNumber()).toBe(50);
    expect(linha.inicio).toEqual(instante(data, '10:00'));
  });

  it('o EXCLUDE do banco barra o INSERT sobreposto e o erro é reconhecido como conflito de horário', async () => {
    const data = diaDeTeste();
    await novo(ana, data, '10:00');
    const inicio = instante(data, '10:30'); // 10:30–11:15 sobrepõe 10:00–10:45
    const erro = await prisma.agendamento
      .create({ data: { clienteId: bruno.id, servicoId, inicio, duracaoMinutos: 45, preco: 50 } })
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(erro).not.toBeNull();
    expect(ehConflitoDeHorario(erro)).toBe(true);
  });

  it('pedidos simultâneos pelo mesmo horário: exatamente um vence, os outros recebem 409', async () => {
    const data = diaDeTeste(1);
    const clientes = [ana, bruno, ana, bruno, ana];
    const resultados = await Promise.allSettled(clientes.map((c) => novo(c, data, '14:00')));
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const falhas = resultados.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(falhas).toHaveLength(4);
    for (const f of falhas) {
      expect((f as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    }
    expect(await prisma.agendamento.count({ where: { servicoId } })).toBe(1);
  });

  it('horários que apenas encostam convivem; cancelar libera o horário', async () => {
    const data = diaDeTeste();
    const a = await novo(ana, data, '09:00'); // 09:00–09:45
    await novo(bruno, data, '10:00'); // não encosta
    await expect(novo(bruno, data, '09:30')).rejects.toBeInstanceOf(ConflictException);
    await agendamentos.atualizarStatusAdmin(adminId, a.id, { status: 'cancelado' });
    const de_novo = await novo(bruno, data, '09:00');
    expect(de_novo.status).toBe('agendado');
    const cancelado = await prisma.agendamento.findUniqueOrThrow({ where: { id: a.id } });
    expect(cancelado).toMatchObject({ status: 'cancelado', canceladoPor: adminId });
  });

  it('reagendar: grava o histórico, recalcula o fim e permite mover para um horário que só colide com o próprio', async () => {
    const data = diaDeTeste();
    const outro = diaDeTeste(1);
    const ag = await novo(ana, data, '10:00');
    const movido = await agendamentos.reagendar(ana, ag.id, { data, hora: '10:30' });
    expect(movido.hora).toBe('10:30');
    const apos = await agendamentos.reagendar(ana, ag.id, { data: outro, hora: '15:00' });
    expect(apos.data).toBe(outro);
    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: ag.id } });
    expect(linha.fim.getTime() - linha.inicio.getTime()).toBe(45 * 60_000);
    const hist = await prisma.reagendamento.findMany({ where: { agendamentoId: ag.id }, orderBy: { createdAt: 'asc' } });
    expect(hist).toHaveLength(2);
    expect(hist[0].inicioAnterior).toEqual(instante(data, '10:00'));
    expect(hist[1].inicioNovo).toEqual(instante(outro, '15:00'));
  });

  it('reagendar para um horário ocupado por outro cliente dá 409', async () => {
    const data = diaDeTeste();
    const ag = await novo(ana, data, '10:00');
    await novo(bruno, data, '15:00');
    await expect(agendamentos.reagendar(ana, ag.id, { data, hora: '15:00' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('solicitação de cancelamento: só uma pendente por agendamento (índice único parcial); decidir libera outra', async () => {
    const data = diaDeTeste();
    const ag = await novo(ana, data, '10:00');
    const pedido = await agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto');
    await expect(agendamentos.solicitarCancelamento(ana, ag.id, 'De novo')).rejects.toBeInstanceOf(ConflictException);

    const solicitacao = pedido.solicitacaoCancelamento!;
    await agendamentos.decidirSolicitacao(adminId, solicitacao.id, { aprovar: false, resposta: 'Mantido' });
    await agendamentos.solicitarCancelamento(ana, ag.id, 'Agora sim');
    expect(await prisma.solicitacaoCancelamento.count({ where: { agendamentoId: ag.id } })).toBe(2);
  });

  it('aprovar a solicitação cancela o agendamento e libera o horário', async () => {
    const data = diaDeTeste();
    const ag = await novo(ana, data, '10:00');
    const pedido = await agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto');
    await agendamentos.decidirSolicitacao(adminId, pedido.solicitacaoCancelamento!.id, { aprovar: true });
    const linha = await prisma.agendamento.findUniqueOrThrow({ where: { id: ag.id } });
    expect(linha.status).toBe('cancelado');
    expect(linha.canceladoPor).toBe(adminId);
    await expect(novo(bruno, data, '10:00')).resolves.toBeDefined();
  });

  it('reserva manual: sem cliente, conflita com agendamento do site', async () => {
    const data = diaDeTeste();
    await novo(ana, data, '10:00');
    await expect(
      agendamentos.criarReservaManual({ nome: 'Seu Zé', servicoId, duracaoMinutos: 30, data, hora: '10:15' }),
    ).rejects.toBeInstanceOf(ConflictException);
    const manual = await agendamentos.criarReservaManual({ nome: 'Seu Zé', servicoId, duracaoMinutos: 30, data, hora: '11:00' });
    expect(manual.origem).toBe('manual');
    expect(manual.cliente).toBeNull();
  });

  it('não é possível apagar serviço ou cliente que têm agendamentos (RESTRICT)', async () => {
    const data = diaDeTeste();
    await novo(ana, data, '10:00');
    await expect(prisma.servico.delete({ where: { id: servicoId } })).rejects.toBeDefined();
    await expect(prisma.cliente.delete({ where: { id: ana.id } })).rejects.toBeDefined();
  });
});
