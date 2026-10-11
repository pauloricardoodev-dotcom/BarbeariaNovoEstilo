import { normalizarTelefone, TelefoneInvalidoError } from './telefone.js';

describe('normalizarTelefone', () => {
  it.each([
    '(44) 99999-9999',
    '44 99999-9999',
    '44999999999',
    '044 99999 9999',
    '+55 44 99999-9999',
    '+5544999999999',
    '55 (44) 9 9999-9999',
  ])('normaliza "%s" para o mesmo E.164', (entrada) => {
    expect(normalizarTelefone(entrada)).toBe('+5544999999999');
  });

  it('mantém o "+" e o código do país (não é só remover não-dígitos)', () => {
    expect(normalizarTelefone('(41) 98765-4321')).toBe('+5541987654321');
  });

  it('aceita celular estrangeiro quando vem com código do país', () => {
    expect(normalizarTelefone('+351 912 345 678')).toBe('+351912345678');
  });

  it.each([
    ['vazio', ''],
    ['texto', 'abc'],
    ['curto demais', '9999-9999'],
    ['DDD inexistente', '(20) 99999-9999'],
    ['celular sem o 9 (formato antigo)', '(44) 8999-9999'],
    ['fixo (não recebe WhatsApp)', '(41) 3333-4444'],
    ['longo demais', '+55 44 99999-9999 99999999999999999'],
  ])('rejeita %s', (_caso, entrada) => {
    expect(() => normalizarTelefone(entrada)).toThrow(TelefoneInvalidoError);
  });
});
