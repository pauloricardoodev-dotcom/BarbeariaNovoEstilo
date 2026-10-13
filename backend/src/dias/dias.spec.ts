import { CONFIG_PADRAO, descreverDiasDeTrabalho } from '../agendamentos/horarios.js';
import { diasEspeciais, estadoDoDia, padraoDoDia, type ExcecaoDia } from './dias.js';
import { feriadosDoAno, nomeDoFeriado, pascoa } from './feriados.js';

// Segunda a sábado, como de fábrica.
const SEMANA = { diasTrabalho: CONFIG_PADRAO.diasTrabalho };

describe('feriados', () => {
  it('calcula a Páscoa', () => {
    expect(pascoa(2025)).toBe('2025-04-20');
    expect(pascoa(2026)).toBe('2026-04-05');
    expect(pascoa(2027)).toBe('2027-03-28');
  });

  it('inclui a Sexta-feira Santa móvel e os feriados fixos nacionais, o do Paraná e o de Maringá', () => {
    expect(nomeDoFeriado('2026-04-03')).toBe('Sexta-feira Santa');
    expect(nomeDoFeriado('2027-03-26')).toBe('Sexta-feira Santa');
    expect(nomeDoFeriado('2026-09-07')).toBe('Independência do Brasil');
    expect(nomeDoFeriado('2026-05-10')).toBe('Aniversário de Maringá');
    expect(nomeDoFeriado('2026-09-08')).toBeNull(); // feriado de Curitiba, não de Maringá
    expect(nomeDoFeriado('2026-12-19')).toMatch(/Paraná/);
    expect(nomeDoFeriado('2026-12-25')).toBe('Natal');
    expect(feriadosDoAno(2026).size).toBe(12);
  });

  it('dia comum não é feriado; Carnaval e Corpus Christi (pontos facultativos) ficam de fora', () => {
    expect(nomeDoFeriado('2026-10-15')).toBeNull();
    expect(nomeDoFeriado('2026-02-17')).toBeNull(); // terça de Carnaval
    expect(nomeDoFeriado('2026-06-04')).toBeNull(); // Corpus Christi
  });
});

describe('padraoDoDia', () => {
  it('folga semanal e feriado fecham; dia comum abre', () => {
    expect(padraoDoDia('2026-10-18', SEMANA)).toMatchObject({
      fechado: true,
      origem: 'folga',
      motivo: 'Folga semanal (domingo)',
    });
    expect(padraoDoDia('2026-11-02', SEMANA)).toMatchObject({
      fechado: true,
      origem: 'feriado',
      motivo: 'Feriado: Finados',
    });
    expect(padraoDoDia('2026-10-15', SEMANA)).toEqual({ fechado: false, origem: null, motivo: null });
  });

  it('feriado que cai na folga conta como feriado', () => {
    expect(padraoDoDia('2026-11-15', SEMANA)).toMatchObject({ origem: 'feriado' }); // 15/11/2026 é domingo
  });

  it('os dias de trabalho escolhidos pelo dono mandam: terça, quinta e sábado', () => {
    const semana = { diasTrabalho: [2, 4, 6] };
    // 2026-10-13 terça, 14 quarta, 15 quinta, 16 sexta, 17 sábado, 18 domingo, 19 segunda
    const abertos = ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19']
      .filter((d) => !padraoDoDia(d, semana).fechado);
    expect(abertos).toEqual(['2026-10-13', '2026-10-15', '2026-10-17']);
    expect(padraoDoDia('2026-10-14', semana).motivo).toBe('Folga semanal (quarta)');
    expect(padraoDoDia('2026-10-19', semana).motivo).toBe('Folga semanal (segunda)');
  });

  it('inclui o domingo quando o dono o marca como dia de trabalho', () => {
    expect(padraoDoDia('2026-10-18', { diasTrabalho: [1, 2, 3, 4, 5, 6, 7] }).fechado).toBe(false);
  });
});

describe('descreverDiasDeTrabalho', () => {
  it('junta dias seguidos (3 ou mais) com "a" e lista os demais', () => {
    expect(descreverDiasDeTrabalho({ diasTrabalho: [1, 2, 3, 4, 5, 6] })).toBe('segunda a sábado');
    expect(descreverDiasDeTrabalho({ diasTrabalho: [1, 2, 3, 4, 5] })).toBe('segunda a sexta');
    expect(descreverDiasDeTrabalho({ diasTrabalho: [1, 3, 5] })).toBe('segunda, quarta e sexta');
    expect(descreverDiasDeTrabalho({ diasTrabalho: [2, 4, 6] })).toBe('terça, quinta e sábado');
    expect(descreverDiasDeTrabalho({ diasTrabalho: [1, 2] })).toBe('segunda e terça');
    expect(descreverDiasDeTrabalho({ diasTrabalho: [6] })).toBe('sábado');
    expect(descreverDiasDeTrabalho({ diasTrabalho: [1, 2, 3, 5, 6, 7] })).toBe('segunda a quarta e sexta a domingo');
  });
});

describe('estadoDoDia', () => {
  const aberto: ExcecaoDia = { aberto: true, motivo: null };

  it('sem exceção segue o padrão', () => {
    expect(estadoDoDia('2026-10-18', SEMANA)).toMatchObject({ fechado: true, desbloqueado: false });
    expect(estadoDoDia('2026-10-15', SEMANA)).toMatchObject({ fechado: false, desbloqueado: false });
  });

  it('o dono desbloqueia um feriado ou uma folga semanal', () => {
    expect(estadoDoDia('2026-11-02', SEMANA, aberto)).toMatchObject({
      fechado: false,
      desbloqueado: true,
      origem: 'feriado',
    });
    expect(estadoDoDia('2026-10-18', SEMANA, aberto)).toMatchObject({ fechado: false, desbloqueado: true });
  });

  it('o dono fecha um dia comum, com ou sem motivo', () => {
    expect(estadoDoDia('2026-10-15', SEMANA, { aberto: false, motivo: 'Curso' })).toMatchObject({
      fechado: true,
      origem: 'bloqueio',
      motivo: 'Curso',
    });
    expect(estadoDoDia('2026-10-15', SEMANA, { aberto: false, motivo: null }).motivo).toBe('Fechado pelo dono');
  });
});

describe('diasEspeciais', () => {
  it('lista só folgas, feriados, fechados e desbloqueados do intervalo', () => {
    const excecoes = new Map<string, ExcecaoDia>([
      ['2026-11-04', { aberto: false, motivo: 'Curso' }], // quarta fechada pelo dono
      ['2026-11-02', { aberto: true, motivo: null }], // feriado desbloqueado
    ]);
    const lista = diasEspeciais('2026-11-01', '2026-11-08', excecoes, SEMANA);
    expect(lista.map((d) => [d.data, d.fechado])).toEqual([
      ['2026-11-01', true], // domingo
      ['2026-11-02', false], // Finados desbloqueado
      ['2026-11-04', true], // fechado pelo dono
      ['2026-11-08', true], // domingo
    ]);
  });

  it('com outra semana de trabalho, as folgas mudam', () => {
    const lista = diasEspeciais('2026-10-13', '2026-10-18', new Map(), { diasTrabalho: [1, 2, 3, 4, 5] });
    expect(lista.map((d) => d.data)).toEqual(['2026-10-17', '2026-10-18']); // sábado e domingo
  });
});
