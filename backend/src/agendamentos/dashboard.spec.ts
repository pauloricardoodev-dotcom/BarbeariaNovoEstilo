import { limitesDoMes, mesValido, resumirMes, type LinhaDashboard } from './dashboard.js';
import { instante } from './horarios.js';

const linha = (
  data: string,
  hora: string,
  extra: Partial<LinhaDashboard> = {},
): LinhaDashboard => ({
  inicio: instante(data, hora),
  status: 'concluido',
  preco: 40,
  clienteId: 'c1',
  servico: 'Corte',
  ...extra,
});

describe('mesValido', () => {
  it('aceita AAAA-MM e recusa o resto', () => {
    expect(mesValido('2026-10')).toBe(true);
    expect(mesValido('2026-13')).toBe(false);
    expect(mesValido('2026-1')).toBe(false);
    expect(mesValido('10/2026')).toBe(false);
  });
});

describe('limitesDoMes', () => {
  it('vai da meia-noite de São Paulo do dia 1 à meia-noite do mês seguinte', () => {
    const { inicio, fim } = limitesDoMes('2026-12');
    expect(inicio.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});

describe('resumirMes', () => {
  it('sem agendamentos devolve tudo zerado', () => {
    const r = resumirMes('2026-10', []);
    expect(r.totais).toEqual({
      agendamentos: 0,
      agendados: 0,
      concluidos: 0,
      cancelados: 0,
      clientes: 0,
      faturamento: 0,
    });
    expect(r.faturamentoPorDia).toEqual([]);
    expect(r.servicos).toEqual([]);
  });

  it('conta clientes distintos, ignora cancelados e soma só concluídos', () => {
    const r = resumirMes('2026-10', [
      linha('2026-10-05', '09:00', { clienteId: 'c1', preco: 40 }),
      linha('2026-10-06', '10:00', { clienteId: 'c1', preco: 35.5, servico: 'Barba' }),
      linha('2026-10-06', '11:00', { clienteId: 'c2', preco: 40 }),
      linha('2026-10-20', '09:00', { clienteId: 'c3', status: 'agendado' }),
      linha('2026-10-21', '09:00', { clienteId: 'c4', status: 'cancelado' }),
    ]);
    expect(r.totais).toMatchObject({
      agendamentos: 5,
      agendados: 1,
      concluidos: 3,
      cancelados: 1,
      clientes: 3,
      faturamento: 115.5,
    });
    expect(r.faturamentoPorDia).toEqual([
      { dia: '2026-10-05', valor: 40 },
      { dia: '2026-10-06', valor: 75.5 },
    ]);
    expect(r.servicos).toEqual([
      { nome: 'Corte', quantidade: 2 },
      { nome: 'Barba', quantidade: 1 },
    ]);
  });

  it('reserva manual (sem cliente) conta nos agendamentos mas não em clientes', () => {
    const r = resumirMes('2026-10', [linha('2026-10-05', '09:00', { clienteId: null })]);
    expect(r.totais.agendamentos).toBe(1);
    expect(r.totais.clientes).toBe(0);
  });

  it('respeita o fuso: 23h do dia 31 fica no mês, 00h do dia 1 já é o seguinte', () => {
    const linhas = [
      linha('2026-10-31', '23:00'),
      linha('2026-11-01', '00:00', { clienteId: 'c9' }),
    ];
    expect(resumirMes('2026-10', linhas).totais.agendamentos).toBe(1);
    expect(resumirMes('2026-11', linhas).totais.agendamentos).toBe(1);
    expect(resumirMes('2026-10', linhas).faturamentoPorDia[0].dia).toBe('2026-10-31');
  });
});
