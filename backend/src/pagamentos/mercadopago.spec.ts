import { createHmac } from 'node:crypto';
import {
  assinaturaMercadoPagoValida,
  dataComOffsetSP,
  traduzirStatus,
} from './mercadopago.js';

const SEGREDO = 'segredo-de-teste';

function assinar(idDado: string, idRequisicao: string, ts = '1704908010') {
  const id = /^[a-z0-9]+$/i.test(idDado) ? idDado.toLowerCase() : idDado;
  const v1 = createHmac('sha256', SEGREDO)
    .update(`id:${id};request-id:${idRequisicao};ts:${ts};`)
    .digest('hex');
  return `ts=${ts},v1=${v1}`;
}

describe('assinatura do webhook (Mercado Pago)', () => {
  const base = { idRequisicao: 'req-1', idDado: '123456' };

  it('aceita a assinatura correta', () => {
    expect(
      assinaturaMercadoPagoValida(SEGREDO, {
        ...base,
        assinatura: assinar('123456', 'req-1'),
      }),
    ).toBe(true);
  });

  it('o id alfanumérico é comparado em minúsculo', () => {
    expect(
      assinaturaMercadoPagoValida(SEGREDO, {
        assinatura: assinar('ABC123', 'req-1'),
        idRequisicao: 'req-1',
        idDado: 'ABC123',
      }),
    ).toBe(true);
  });

  it.each([
    ['segredo errado', () => assinaturaMercadoPagoValida('outro', { ...base, assinatura: assinar('123456', 'req-1') })],
    ['id do dado adulterado', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, idDado: '999', assinatura: assinar('123456', 'req-1') })],
    ['request-id diferente', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, idRequisicao: 'req-2', assinatura: assinar('123456', 'req-1') })],
    ['sem header de assinatura', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, assinatura: undefined })],
    ['sem request-id', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, idRequisicao: undefined, assinatura: assinar('123456', 'req-1') })],
    ['sem data.id', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, idDado: undefined, assinatura: assinar('123456', 'req-1') })],
    ['header malformado', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, assinatura: 'lixo' })],
    ['hash truncado', () => assinaturaMercadoPagoValida(SEGREDO, { ...base, assinatura: 'ts=1,v1=abc' })],
    ['segredo vazio', () => assinaturaMercadoPagoValida('', { ...base, assinatura: assinar('123456', 'req-1') })],
  ])('recusa: %s', (_nome, chamar) => {
    expect(chamar()).toBe(false);
  });
});

describe('traduzirStatus', () => {
  it.each([
    ['approved', undefined, 'aprovado'],
    ['rejected', undefined, 'recusado'],
    ['cancelled', undefined, 'cancelado'],
    ['cancelled', 'expired', 'expirado'],
    ['refunded', undefined, 'estornado'],
    ['charged_back', undefined, 'estornado'],
    ['pending', undefined, 'pendente'],
    ['in_process', undefined, 'pendente'],
    ['authorized', undefined, 'pendente'],
    ['algo-novo', undefined, 'pendente'],
    [undefined, undefined, 'pendente'],
  ])('%s (%s) -> %s', (status, detalhe, esperado) => {
    expect(traduzirStatus(status, detalhe)).toBe(esperado);
  });
});

describe('dataComOffsetSP', () => {
  it('converte UTC para o horário de Brasília com offset -03:00', () => {
    expect(dataComOffsetSP(new Date('2026-10-22T15:30:00.000Z'))).toBe(
      '2026-10-22T12:30:00.000-03:00',
    );
  });
});
