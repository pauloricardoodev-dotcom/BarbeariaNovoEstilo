// Pagamentos contra o Postgres real, com um gateway FAKE (sem rede): reserva provisória, Pix, cartão, webhook
// (assinatura, idempotência, valor adulterado), expiração, pagamento tardio e estorno ao cancelar.
// Rodar com `npm run test:db`, DEPOIS de aplicar a migration 20261022150000_pagamentos.
// Todos os dados usam o prefixo PREFIXO e são apagados no afterAll.
import {
  BadGatewayException,
  ConflictException,
  HttpException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { randomInt, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AgendamentosService } from '../src/agendamentos/agendamentos.service.js';
import {
  CONFIG_PADRAO,
  dataSP,
  somarDias,
} from '../src/agendamentos/horarios.js';
import type { ClienteAutenticado } from '../src/clientes/clientes.types.js';
import { configurarApp } from '../src/configurar-app.js';
import { padraoDoDia } from '../src/dias/dias.js';
import type { StatusPagamento } from '../src/generated/prisma/client.js';
import {
  GatewayPagamento,
  type CobrancaGateway,
  type EntradaWebhook,
  type NovaCobrancaCartao,
  type NovaCobrancaPix,
} from '../src/pagamentos/gateway.js';
import { PagamentosService } from '../src/pagamentos/pagamentos.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `teste-${randomUUID().slice(0, 8)}`;

function diaDeTeste(deslocamento = 0): string {
  let dia = somarDias(dataSP(new Date()), 5 + deslocamento);
  while (padraoDoDia(dia, CONFIG_PADRAO).fechado) dia = somarDias(dia, 1);
  return dia;
}

/** Gateway em memória: o teste controla quando e como cada cobrança é paga. */
class GatewayFake extends GatewayPagamento {
  readonly nome = `fake-${PREFIXO}`;
  readonly ativo = true;
  cobrancas = new Map<string, CobrancaGateway>();
  estornos: string[] = [];
  cancelamentos: string[] = [];
  pixCriados = 0;
  proximoCartao: StatusPagamento = 'aprovado';
  falharEstorno = false;
  private seq = 0;

  reiniciar(): void {
    this.cobrancas.clear();
    this.estornos = [];
    this.cancelamentos = [];
    this.pixCriados = 0;
    this.proximoCartao = 'aprovado';
    this.falharEstorno = false;
  }

  criarPix(d: NovaCobrancaPix): Promise<CobrancaGateway> {
    this.pixCriados++;
    const c: CobrancaGateway = {
      idExterno: `fx-${PREFIXO}-${++this.seq}`,
      status: 'pendente',
      valorCentavos: d.valorCentavos,
      referencia: d.referencia,
      pixCopiaCola: `00020126fake${this.seq}`,
      bandeira: null,
      ultimosQuatro: null,
    };
    this.cobrancas.set(c.idExterno, c);
    return Promise.resolve({ ...c });
  }

  cobrarCartao(d: NovaCobrancaCartao): Promise<CobrancaGateway> {
    const c: CobrancaGateway = {
      idExterno: `fx-${PREFIXO}-${++this.seq}`,
      status: this.proximoCartao,
      valorCentavos: d.valorCentavos,
      referencia: d.referencia,
      pixCopiaCola: null,
      bandeira: d.metodoId,
      ultimosQuatro: '4242',
    };
    this.cobrancas.set(c.idExterno, c);
    return Promise.resolve({ ...c });
  }

  consultar(id: string): Promise<CobrancaGateway> {
    const c = this.cobrancas.get(id);
    if (!c) return Promise.reject(new BadGatewayException('desconhecido'));
    return Promise.resolve({ ...c });
  }

  estornar(id: string): Promise<void> {
    if (this.falharEstorno) return Promise.reject(new BadGatewayException('falhou'));
    this.estornos.push(id);
    const c = this.cobrancas.get(id);
    if (c) c.status = 'estornado';
    return Promise.resolve();
  }

  cancelar(id: string): Promise<void> {
    this.cancelamentos.push(id);
    const c = this.cobrancas.get(id);
    if (c && c.status === 'pendente') c.status = 'cancelado';
    return Promise.resolve();
  }

  assinaturaValida(e: EntradaWebhook): boolean {
    return e.assinatura === 'valida';
  }

  /** O cliente "pagou" no app do banco. `diferenca` simula valor adulterado. */
  pagar(id: string, diferenca = 0): void {
    const c = this.cobrancas.get(id)!;
    c.status = 'aprovado';
    c.valorCentavos += diferenca;
  }
}

describe('Pagamentos (integração com o banco, gateway fake)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agendamentos: AgendamentosService;
  let pagamentos: PagamentosService;
  const gateway = new GatewayFake();
  let servicoId: string;
  let adminId: string;
  let ana: ClienteAutenticado;
  let bruno: ClienteAutenticado;
  let evento = 0;

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
      temSenha: true,
    };
  }

  const reservar = (c: ClienteAutenticado, hora: string, dia = diaDeTeste()) =>
    agendamentos.criarDoCliente(c, {
      servicoId,
      data: dia,
      hora,
      pagamento: 'pix',
    });

  const webhook = (idDado: string, assinatura = 'valida') =>
    pagamentos.processarWebhook({
      assinatura,
      idRequisicao: `req-${evento}`,
      idDado,
      tipo: 'payment',
      idEvento: `${PREFIXO}-ev-${++evento}`,
      acao: 'payment.updated',
    });

  const doBanco = (agendamentoId: string) =>
    prisma.agendamento.findUniqueOrThrow({ where: { id: agendamentoId } });
  const pagamentoDe = (agendamentoId: string) =>
    prisma.pagamento.findFirstOrThrow({
      where: { agendamentoId },
      orderBy: { createdAt: 'desc' },
    });

  async function limpar() {
    await prisma.eventoGateway.deleteMany({ where: { gateway: gateway.nome } });
    await prisma.pagamento.deleteMany({ where: { agendamento: { servicoId } } });
    await prisma.solicitacaoCancelamento.deleteMany({ where: { agendamento: { servicoId } } });
    await prisma.reagendamento.deleteMany({ where: { agendamento: { servicoId } } });
    await prisma.agendamento.deleteMany({ where: { servicoId } });
  }

  beforeAll(async () => {
    const throttler: ThrottlerStorage = {
      increment: (...a) => new ThrottlerStorageService().increment(...a),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue(throttler)
      .overrideProvider(GatewayPagamento)
      .useValue(gateway)
      .compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    agendamentos = app.get(AgendamentosService);
    pagamentos = app.get(PagamentosService);

    servicoId = (
      await prisma.servico.create({
        data: { nome: `${PREFIXO} corte`, preco: 50, duracaoMinutos: 45 },
      })
    ).id;
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
      await limpar();
      await prisma.servico.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
      await prisma.cliente.deleteMany({ where: { email: { startsWith: PREFIXO } } });
      await prisma.usuarioAdmin.deleteMany({ where: { email: { startsWith: PREFIXO } } });
    }
    await app?.close();
  });

  afterEach(async () => {
    await limpar();
    gateway.reiniciar();
  });

  describe('reserva provisória', () => {
    it('agendamento com Pix/cartão nasce aguardando pagamento e segura o horário', async () => {
      const ag = await reservar(ana, '10:00');
      expect(ag).toMatchObject({ aguardandoPagamento: true, pago: false, status: 'agendado' });
      expect(ag.expiraPagamentoEm).not.toBeNull();
      expect(ag.podeSolicitarCancelamento).toBe(false);
      await expect(reservar(bruno, '10:00')).rejects.toBeInstanceOf(ConflictException);
    });

    it('presencial não tem reserva provisória nem cobrança', async () => {
      const ag = await agendamentos.criarDoCliente(ana, {
        servicoId,
        data: diaDeTeste(),
        hora: '10:00',
        pagamento: 'presencial',
      });
      expect(ag).toMatchObject({ aguardandoPagamento: false, pago: false });
      expect((await doBanco(ag.id)).expiraEm).toBeNull();
    });

    it('serviço grátis não exige pagamento online', async () => {
      const gratis = await prisma.servico.create({
        data: { nome: `${PREFIXO} gratis`, preco: 0, duracaoMinutos: 30 },
      });
      try {
        const ag = await agendamentos.criarDoCliente(ana, {
          servicoId: gratis.id,
          data: diaDeTeste(2),
          hora: '09:00',
          pagamento: 'pix',
        });
        expect(ag.aguardandoPagamento).toBe(false);
        await prisma.agendamento.deleteMany({ where: { servicoId: gratis.id } });
      } finally {
        await prisma.servico.delete({ where: { id: gratis.id } });
      }
    });
  });

  describe('Pix', () => {
    it('gera a cobrança com o valor do banco e repete o mesmo código se pedir de novo', async () => {
      const ag = await reservar(ana, '10:00');
      const a = await pagamentos.iniciarPix(ana, ag.id);
      expect(a).toMatchObject({ metodo: 'pix', status: 'pendente', valor: 50 });
      expect(a.pixCopiaCola).toMatch(/^00020126fake/);
      const b = await pagamentos.iniciarPix(ana, ag.id);
      expect(b.pixCopiaCola).toBe(a.pixCopiaCola);
      expect(gateway.pixCriados).toBe(1);
      expect(await prisma.pagamento.count({ where: { agendamentoId: ag.id } })).toBe(1);
    });

    it('outro cliente não acessa o pagamento (404)', async () => {
      const ag = await reservar(ana, '10:00');
      await expect(pagamentos.iniciarPix(bruno, ag.id)).rejects.toMatchObject({ status: 404 });
      await expect(pagamentos.statusDoAgendamento(bruno, ag.id)).rejects.toMatchObject({ status: 404 });
    });

    it('webhook assinado confirma: pagamento aprovado e reserva vira definitiva', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const p = await pagamentoDe(ag.id);
      gateway.pagar(p.idExterno!);
      await webhook(p.idExterno!);

      expect(await pagamentoDe(ag.id)).toMatchObject({ status: 'aprovado' });
      const depois = await doBanco(ag.id);
      expect(depois.expiraEm).toBeNull();
      expect(depois.status).toBe('agendado');
      const visto = await pagamentos.statusDoAgendamento(ana, ag.id);
      expect(visto).toMatchObject({ status: 'aprovado', pixCopiaCola: null });
      expect(visto.agendamento.aguardandoPagamento).toBe(false);
    });

    it('assinatura inválida é recusada e nada muda', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const p = await pagamentoDe(ag.id);
      gateway.pagar(p.idExterno!);
      await expect(webhook(p.idExterno!, 'forjada')).rejects.toBeInstanceOf(UnauthorizedException);
      expect((await pagamentoDe(ag.id)).status).toBe('pendente');
      expect(await prisma.eventoGateway.count({ where: { gateway: gateway.nome } })).toBe(0);
    });

    it('o mesmo evento entregue duas vezes é processado uma vez só', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const p = await pagamentoDe(ag.id);
      gateway.pagar(p.idExterno!);
      const entrada = {
        assinatura: 'valida',
        idRequisicao: 'req-x',
        idDado: p.idExterno!,
        tipo: 'payment',
        idEvento: `${PREFIXO}-repetido`,
        acao: 'payment.updated',
      };
      await pagamentos.processarWebhook(entrada);
      await pagamentos.processarWebhook(entrada);
      expect(await prisma.eventoGateway.count({ where: { gateway: gateway.nome, idEvento: entrada.idEvento } })).toBe(1);
      expect((await pagamentoDe(ag.id)).status).toBe('aprovado');
    });

    it('valor diferente do cobrado no gateway NÃO confirma', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const p = await pagamentoDe(ag.id);
      gateway.pagar(p.idExterno!, -4000);
      await webhook(p.idExterno!);
      expect((await pagamentoDe(ag.id)).status).toBe('pendente');
      expect((await doBanco(ag.id)).expiraEm).not.toBeNull();
    });

    it('o status consultado pelo cliente sincroniza com o gateway (webhook atrasado)', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      gateway.pagar((await pagamentoDe(ag.id)).idExterno!);
      const visto = await pagamentos.statusDoAgendamento(ana, ag.id);
      expect(visto.status).toBe('aprovado');
      expect(visto.agendamento.aguardandoPagamento).toBe(false);
    });

    it('evento de outro tipo é ignorado; pagamento desconhecido não quebra', async () => {
      await pagamentos.processarWebhook({
        assinatura: 'valida', idRequisicao: 'r', idDado: '1', tipo: 'plan', idEvento: `${PREFIXO}-plan`, acao: undefined,
      });
      gateway.cobrancas.set('fx-orfao', {
        idExterno: 'fx-orfao', status: 'aprovado', valorCentavos: 1, referencia: null,
        pixCopiaCola: null, bandeira: null, ultimosQuatro: null,
      });
      await expect(webhook('fx-orfao')).resolves.toBeUndefined();
    });
  });

  describe('cartão', () => {
    const dto = { token: 'token-de-teste-123', metodoId: 'visa' };

    it('aprovado: confirma na hora e guarda só bandeira e 4 últimos dígitos', async () => {
      const ag = await reservar(ana, '10:00');
      const r = await pagamentos.pagarComCartao(ana, ag.id, dto);
      expect(r).toMatchObject({ metodo: 'cartao', status: 'aprovado', valor: 50 });
      const p = await pagamentoDe(ag.id);
      expect(p).toMatchObject({ cartaoBandeira: 'visa', cartaoUltimosQuatro: '4242' });
      expect(JSON.stringify(p)).not.toContain(dto.token);
      expect((await doBanco(ag.id)).expiraEm).toBeNull();
      expect((await doBanco(ag.id)).pagamento).toBe('cartao');
    });

    it('recusado: 402, pagamento recusado e a reserva continua para tentar de novo', async () => {
      const ag = await reservar(ana, '10:00');
      gateway.proximoCartao = 'recusado';
      await expect(pagamentos.pagarComCartao(ana, ag.id, dto)).rejects.toMatchObject({
        status: 402,
      });
      expect((await pagamentoDe(ag.id)).status).toBe('recusado');
      expect((await doBanco(ag.id)).expiraEm).not.toBeNull();

      gateway.proximoCartao = 'aprovado';
      expect((await pagamentos.pagarComCartao(ana, ag.id, dto)).status).toBe('aprovado');
      expect(await prisma.pagamento.count({ where: { agendamentoId: ag.id } })).toBe(2);
    });

    it('depois de escolher cartão dá para trocar para Pix (a tentativa pendente é descartada)', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const pixAntigo = await pagamentoDe(ag.id);
      gateway.proximoCartao = 'aprovado';
      await pagamentos.pagarComCartao(ana, ag.id, dto);
      expect(gateway.cancelamentos).toContain(pixAntigo.idExterno);
      expect((await prisma.pagamento.findUniqueOrThrow({ where: { id: pixAntigo.id } })).status).toBe('cancelado');
    });

    it('agendamento já pago não aceita nova cobrança', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.pagarComCartao(ana, ag.id, dto);
      await expect(pagamentos.pagarComCartao(ana, ag.id, dto)).rejects.toBeInstanceOf(ConflictException);
      await expect(pagamentos.iniciarPix(ana, ag.id)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('expiração da reserva', () => {
    async function vencer(agendamentoId: string) {
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { expiraEm: new Date(Date.now() - 60_000) },
      });
    }

    it('sem pagamento: cancela o agendamento, expira a cobrança e libera o horário', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      await vencer(ag.id);

      expect(await pagamentos.expirarReservas()).toBe(1);
      const depois = await doBanco(ag.id);
      expect(depois).toMatchObject({ status: 'cancelado', expiraEm: null });
      expect(depois.canceladoEm).not.toBeNull();
      expect((await pagamentoDe(ag.id)).status).toBe('expirado');
      expect(gateway.cancelamentos).toHaveLength(1);

      await expect(reservar(bruno, '10:00')).resolves.toMatchObject({ status: 'agendado' });
    });

    it('reserva ainda dentro do prazo não é tocada', async () => {
      const ag = await reservar(ana, '10:00');
      expect(await pagamentos.expirarReservas()).toBe(0);
      expect((await doBanco(ag.id)).status).toBe('agendado');
    });

    it('se o gateway mostra que foi pago no último instante, confirma em vez de cancelar', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      gateway.pagar((await pagamentoDe(ag.id)).idExterno!);
      await vencer(ag.id);

      expect(await pagamentos.expirarReservas()).toBe(0);
      expect(await doBanco(ag.id)).toMatchObject({ status: 'agendado', expiraEm: null });
      expect((await pagamentoDe(ag.id)).status).toBe('aprovado');
    });

    it('pagamento que chega DEPOIS de a reserva ser liberada é devolvido no gateway', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const p = await pagamentoDe(ag.id);
      await vencer(ag.id);
      await pagamentos.expirarReservas();
      expect((await doBanco(ag.id)).status).toBe('cancelado');

      // O Pix foi pago mesmo assim (o cliente pagou no instante do cancelamento): o webhook chega tarde.
      gateway.cobrancas.get(p.idExterno!)!.status = 'aprovado';
      await webhook(p.idExterno!);

      // 'expirado' é terminal no banco: o horário continua livre, e o dinheiro é devolvido no gateway.
      expect((await doBanco(ag.id)).status).toBe('cancelado');
      expect((await pagamentoDe(ag.id)).status).toBe('expirado');
      expect(gateway.estornos).toEqual([p.idExterno]);
    });
  });

  describe('cancelamento e estorno', () => {
    async function pagoNoCartao(c = ana, hora = '10:00') {
      const ag = await reservar(c, hora);
      await pagamentos.pagarComCartao(c, ag.id, { token: 'token-de-teste-123', metodoId: 'visa' });
      return ag;
    }

    it('barbeiro aprova o cancelamento: devolve o valor total e cancela', async () => {
      const ag = await pagoNoCartao();
      const s = await agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto');
      expect(s.solicitacaoCancelamento).not.toBeNull();
      const sol = await prisma.solicitacaoCancelamento.findFirstOrThrow({ where: { agendamentoId: ag.id } });

      await agendamentos.decidirSolicitacao(adminId, sol.id, { aprovar: true });

      expect(gateway.estornos).toHaveLength(1);
      const p = await pagamentoDe(ag.id);
      expect(p.status).toBe('estornado');
      expect(p.estornadoEm).not.toBeNull();
      expect((await doBanco(ag.id)).status).toBe('cancelado');
    });

    it('barbeiro recusa o cancelamento: nada é estornado', async () => {
      const ag = await pagoNoCartao();
      await agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto');
      const sol = await prisma.solicitacaoCancelamento.findFirstOrThrow({ where: { agendamentoId: ag.id } });
      await agendamentos.decidirSolicitacao(adminId, sol.id, { aprovar: false });
      expect(gateway.estornos).toHaveLength(0);
      expect((await pagamentoDe(ag.id)).status).toBe('aprovado');
      expect((await doBanco(ag.id)).status).toBe('agendado');
    });

    it('se o estorno falhar no gateway, o agendamento NÃO é cancelado (dá para tentar de novo)', async () => {
      const ag = await pagoNoCartao();
      await agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto');
      const sol = await prisma.solicitacaoCancelamento.findFirstOrThrow({ where: { agendamentoId: ag.id } });

      gateway.falharEstorno = true;
      await expect(agendamentos.decidirSolicitacao(adminId, sol.id, { aprovar: true })).rejects.toBeInstanceOf(HttpException);
      expect((await doBanco(ag.id)).status).toBe('agendado');
      expect((await pagamentoDe(ag.id)).status).toBe('aprovado');
      expect((await prisma.solicitacaoCancelamento.findUniqueOrThrow({ where: { id: sol.id } })).status).toBe('pendente');

      gateway.falharEstorno = false;
      await agendamentos.decidirSolicitacao(adminId, sol.id, { aprovar: true });
      expect((await pagamentoDe(ag.id)).status).toBe('estornado');
    });

    it('cancelamento direto do barbeiro também devolve o valor', async () => {
      const ag = await pagoNoCartao();
      await agendamentos.atualizarStatusAdmin(adminId, ag.id, { status: 'cancelado' });
      expect((await pagamentoDe(ag.id)).status).toBe('estornado');
      expect(gateway.estornos).toHaveLength(1);
    });

    it('cancelar agendamento ainda aguardando pagamento funciona (zera a reserva)', async () => {
      const ag = await reservar(ana, '10:00');
      await agendamentos.atualizarStatusAdmin(adminId, ag.id, { status: 'cancelado' });
      expect(await doBanco(ag.id)).toMatchObject({ status: 'cancelado', expiraEm: null });
    });

    it('cliente não pede cancelamento de pago com menos de 24 h; pode com mais', async () => {
      const ag = await pagoNoCartao();
      expect((await agendamentos.listarDoCliente(ana.id))[0]).toMatchObject({ pago: true, podeSolicitarCancelamento: true });

      await prisma.agendamento.update({
        where: { id: ag.id },
        data: { inicio: new Date(Date.now() + 10 * 3_600_000) },
      });
      expect((await agendamentos.listarDoCliente(ana.id))[0].podeSolicitarCancelamento).toBe(false);
      await expect(agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto')).rejects.toBeInstanceOf(ConflictException);
    });

    it('cliente não pede cancelamento de reserva que ainda aguarda pagamento', async () => {
      const ag = await reservar(ana, '10:00');
      await expect(agendamentos.solicitarCancelamento(ana, ag.id, 'Desisti')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('rotas HTTP', () => {
    it('webhook sem assinatura válida responde 401 e sem sessão de cliente as rotas de pagamento respondem 401', async () => {
      await request(app.getHttpServer())
        .post('/api/pagamentos/webhook?type=payment&data.id=123')
        .set('x-signature', 'ts=1,v1=forjado')
        .set('x-request-id', 'r1')
        .send({ id: 1, type: 'payment', data: { id: '123' } })
        .expect(401);
      const idInexistente = randomUUID();
      const base = `/api/clientes/me/agendamentos/${idInexistente}/pagamento`;
      await request(app.getHttpServer()).get(base).expect(401);
      await request(app.getHttpServer()).post(`${base}/pix`).expect(401);
    });

    it('a configuração pública do pagamento é aberta e não expõe segredos', async () => {
      const res = await request(app.getHttpServer()).get('/api/pagamentos/config').expect(200);
      expect(Object.keys(res.body).sort()).toEqual(['chavePublica', 'online']);
      expect(res.body.online).toBe(true);
    });

    it('pedido de cancelamento de agendamento pago avisa o barbeiro do estorno', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.pagarComCartao(ana, ag.id, { token: 'token-de-teste-123', metodoId: 'visa' });
      await agendamentos.solicitarCancelamento(ana, ag.id, 'Imprevisto');
      const lista = await agendamentos.listarSolicitacoes({ pagina: 1, porPagina: 50, status: 'pendente' });
      const minha = lista.itens.find((s) => s.agendamento.id === ag.id);
      expect(minha?.agendamento.pago).toBe(true);
    });

    it('webhook com assinatura válida e pagamento conhecido responde 200 e confirma', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      const p = await pagamentoDe(ag.id);
      gateway.pagar(p.idExterno!);
      await request(app.getHttpServer())
        .post(`/api/pagamentos/webhook?type=payment&data.id=${p.idExterno}`)
        .set('x-signature', 'valida')
        .set('x-request-id', 'r2')
        .send({ id: `${PREFIXO}-http`, type: 'payment', action: 'payment.updated', data: { id: p.idExterno } })
        .expect(200);
      expect((await pagamentoDe(ag.id)).status).toBe('aprovado');
    });
  });

  describe('garantias do banco usadas pelo fluxo', () => {
    it('não permite apagar agendamento com pagamento', async () => {
      const ag = await reservar(ana, '10:00');
      await pagamentos.iniciarPix(ana, ag.id);
      await expect(prisma.agendamento.delete({ where: { id: ag.id } })).rejects.toBeDefined();
    });

    it('o banco recusa valor diferente do preço do agendamento', async () => {
      const ag = await reservar(ana, '10:00');
      await expect(
        prisma.pagamento.create({
          data: { agendamentoId: ag.id, gateway: gateway.nome, metodo: 'cartao', valorCentavos: 100 },
        }),
      ).rejects.toBeDefined();
    });
  });
});
