import {
  CONFIG_PADRAO,
  antecedenciaSuficiente,
  dataNaJanela,
  dataSP,
  dataValida,
  horaSP,
  horarioDeAdminValido,
  horarioDeClienteValido,
  horariosLivres,
  horariosPossiveis,
  instante,
  janelaDeAgendamento,
  podeReagendarAgora,
  somarMeses,
  sobrepoe,
} from './horarios.js';

// Quarta-feira, 14/10/2026, 15:00 em São Paulo (18:00 UTC).
const AGORA = instante('2026-10-14', '15:00');

describe('dataValida', () => {
  it('aceita datas reais e recusa inexistentes ou mal formatadas', () => {
    expect(dataValida('2026-10-14')).toBe(true);
    expect(dataValida('2028-02-29')).toBe(true);
    expect(dataValida('2026-02-29')).toBe(false);
    expect(dataValida('2026-02-30')).toBe(false);
    expect(dataValida('2026-13-01')).toBe(false);
    expect(dataValida('14/10/2026')).toBe(false);
    expect(dataValida('2026-10-14T10:00')).toBe(false);
  });
});

describe('fuso America/Sao_Paulo', () => {
  it('converte instantes para o dia e a hora de São Paulo', () => {
    // 01:30 UTC de 15/10 ainda é 22:30 de 14/10 em São Paulo.
    const tarde = new Date('2026-10-15T01:30:00Z');
    expect(dataSP(tarde)).toBe('2026-10-14');
    expect(horaSP(tarde)).toBe('22:30');
    // 03:00 UTC = meia-noite local: já é o dia 15, às 00:00.
    const meiaNoite = new Date('2026-10-15T03:00:00Z');
    expect(dataSP(meiaNoite)).toBe('2026-10-15');
    expect(horaSP(meiaNoite)).toBe('00:00');
  });

  it('instante() usa o relógio de São Paulo', () => {
    expect(instante('2026-10-14', '08:00').toISOString()).toBe('2026-10-14T11:00:00.000Z');
  });
});

describe('janela de agendamento (hoje … +90 dias, dia de calendário de SP)', () => {
  it('hoje e os dias seguintes valem; dias passados não', () => {
    expect(janelaDeAgendamento(AGORA, CONFIG_PADRAO)).toEqual({ min: '2026-10-14', max: '2027-01-12' });
    expect(dataNaJanela('2026-10-13', AGORA, CONFIG_PADRAO)).toBe(false);
    expect(dataNaJanela('2026-10-14', AGORA, CONFIG_PADRAO)).toBe(true);
    expect(dataNaJanela('2026-10-15', AGORA, CONFIG_PADRAO)).toBe(true);
  });

  it('o dia vira à meia-noite de São Paulo, não à de UTC', () => {
    const quaseMeiaNoiteSP = new Date('2026-10-15T02:59:00Z'); // 23:59 de 14/10 em SP
    expect(dataNaJanela('2026-10-14', quaseMeiaNoiteSP, CONFIG_PADRAO)).toBe(true);
    expect(dataNaJanela('2026-10-13', quaseMeiaNoiteSP, CONFIG_PADRAO)).toBe(false);
    const meiaNoiteSP = new Date('2026-10-15T03:00:00Z'); // 00:00 de 15/10 em SP
    expect(dataNaJanela('2026-10-14', meiaNoiteSP, CONFIG_PADRAO)).toBe(false);
    expect(dataNaJanela('2026-10-15', meiaNoiteSP, CONFIG_PADRAO)).toBe(true);
  });

  it('limite de 90 dias: o último dia vale e o seguinte não', () => {
    expect(dataNaJanela('2027-01-12', AGORA, CONFIG_PADRAO)).toBe(true);
    expect(dataNaJanela('2027-01-13', AGORA, CONFIG_PADRAO)).toBe(false);
  });

  it('somarMeses usa o último dia quando o dia de destino não existe', () => {
    expect(somarMeses('2026-11-30', 3)).toBe('2027-02-28');
    expect(somarMeses('2027-11-30', 3)).toBe('2028-02-29');
    expect(somarMeses('2026-05-31', 1)).toBe('2026-06-30');
  });
});

describe('antecedência mínima de 2 h para agendar (vale no dia de hoje)', () => {
  it('exatamente 2 h antes ainda pode; um minuto a menos não', () => {
    // AGORA = 15:00
    expect(antecedenciaSuficiente('2026-10-14', '17:00', AGORA, CONFIG_PADRAO)).toBe(true);
    expect(antecedenciaSuficiente('2026-10-14', '16:59', AGORA, CONFIG_PADRAO)).toBe(false);
    expect(antecedenciaSuficiente('2026-10-14', '15:30', AGORA, CONFIG_PADRAO)).toBe(false);
    expect(antecedenciaSuficiente('2026-10-14', '14:00', AGORA, CONFIG_PADRAO)).toBe(false); // passado
  });

  it('dias seguintes não sofrem restrição prática', () => {
    expect(antecedenciaSuficiente('2026-10-15', '08:00', AGORA, CONFIG_PADRAO)).toBe(true);
  });

  it('hoje às 15:00 só sobram os horários a partir das 17:00 que ainda cabem no expediente', () => {
    expect(horariosLivres('2026-10-14', 30, [], AGORA, CONFIG_PADRAO)).toEqual(['17:00', '17:30']);
    expect(horariosLivres('2026-10-14', 60, [], AGORA, CONFIG_PADRAO)).toEqual(['17:00']);
  });

  it('de manhã cedo, hoje ainda tem a tarde inteira e parte da manhã', () => {
    const cedo = instante('2026-10-14', '07:00');
    const h = horariosLivres('2026-10-14', 30, [], cedo, CONFIG_PADRAO);
    expect(h[0]).toBe('09:00');
    expect(h).toContain('11:30');
    expect(h).not.toContain('12:00'); // almoço
    expect(h).toContain('14:00');
  });

  it('à noite não sobra nada hoje, mas amanhã de manhã está livre', () => {
    const noite = instante('2026-10-14', '20:00');
    expect(horariosLivres('2026-10-14', 30, [], noite, CONFIG_PADRAO)).toEqual([]);
    expect(horariosLivres('2026-10-15', 30, [], noite, CONFIG_PADRAO)[0]).toBe('08:00');
  });
});

describe('horariosPossiveis', () => {
  it('serviço de 30 min: grade de 30 min, 08:00–18:00 sem o almoço 12:00–14:00', () => {
    const h = horariosPossiveis(30, CONFIG_PADRAO);
    expect(h[0]).toBe('08:00');
    expect(h).toContain('11:30');
    expect(h).not.toContain('12:00');
    expect(h).not.toContain('13:30');
    expect(h).toContain('14:00');
    expect(h[h.length - 1]).toBe('17:30');
  });

  it('o atendimento não pode invadir o almoço nem passar das 18:00', () => {
    const h = horariosPossiveis(60, CONFIG_PADRAO);
    expect(h).toContain('11:00'); // 11:00–12:00 encosta no almoço, mas não invade
    expect(h).not.toContain('11:30'); // 11:30–12:30 invade
    expect(h).toContain('17:00'); // termina às 18:00
    expect(h).not.toContain('17:30');
    expect(horariosPossiveis(120, CONFIG_PADRAO)).not.toContain('10:30'); // 10:30–12:30
  });
});

describe('horariosLivres', () => {
  it('remove horários que colidem e mantém os que apenas encostam', () => {
    const ocupado = {
      inicio: instante('2026-10-15', '10:00'),
      fim: instante('2026-10-15', '10:45'),
    };
    const livres = horariosLivres('2026-10-15', 30, [ocupado], AGORA, CONFIG_PADRAO);
    expect(livres).not.toContain('10:00');
    expect(livres).not.toContain('10:30');
    expect(livres).toContain('09:30'); // termina às 10:00, encosta
    expect(livres).toContain('11:00');
  });

  it('serviço longo também precisa caber antes do próximo agendamento', () => {
    const ocupado = {
      inicio: instante('2026-10-15', '10:00'),
      fim: instante('2026-10-15', '10:30'),
    };
    const livres = horariosLivres('2026-10-15', 60, [ocupado], AGORA, CONFIG_PADRAO);
    expect(livres).toContain('09:00'); // 09:00–10:00
    expect(livres).not.toContain('09:30'); // 09:30–10:30 colide
    expect(livres).toContain('10:30');
  });
});

describe('horarioDeClienteValido / horarioDeAdminValido', () => {
  it('cliente só usa a grade de 30 min', () => {
    expect(horarioDeClienteValido('10:00', 30, CONFIG_PADRAO)).toBe(true);
    expect(horarioDeClienteValido('10:15', 30, CONFIG_PADRAO)).toBe(false);
    expect(horarioDeClienteValido('12:00', 30, CONFIG_PADRAO)).toBe(false);
  });

  it('admin pode qualquer minuto e o almoço, mas não fora do expediente', () => {
    expect(horarioDeAdminValido('10:15', 30, CONFIG_PADRAO)).toBe(true);
    expect(horarioDeAdminValido('12:30', 30, CONFIG_PADRAO)).toBe(true);
    expect(horarioDeAdminValido('07:30', 30, CONFIG_PADRAO)).toBe(false);
    expect(horarioDeAdminValido('17:45', 30, CONFIG_PADRAO)).toBe(false);
  });
});

describe('podeReagendarAgora (até 2 h antes do início)', () => {
  const inicio = instante('2026-10-15', '10:00');

  it('limite exato: com 2 h ainda pode; 1 ms depois não', () => {
    const duasHorasAntes = new Date(inicio.getTime() - 2 * 60 * 60 * 1000);
    expect(podeReagendarAgora(inicio, duasHorasAntes)).toBe(true);
    expect(podeReagendarAgora(inicio, new Date(duasHorasAntes.getTime() + 1))).toBe(false);
  });

  it('1 h 59 min antes não pode; dias antes pode', () => {
    expect(podeReagendarAgora(inicio, instante('2026-10-15', '08:01'))).toBe(false);
    expect(podeReagendarAgora(inicio, instante('2026-10-13', '08:00'))).toBe(true);
  });

  it('atendimento que já começou ou passou nunca pode (retroativo)', () => {
    expect(podeReagendarAgora(inicio, instante('2026-10-15', '10:00'))).toBe(false);
    expect(podeReagendarAgora(inicio, instante('2026-10-16', '10:00'))).toBe(false);
  });
});

describe('sobrepoe', () => {
  const a = { inicio: instante('2026-10-15', '10:00'), fim: instante('2026-10-15', '11:00') };
  it('sobreposição parcial, contida e idêntica colidem; encostar não', () => {
    expect(sobrepoe(a, { inicio: instante('2026-10-15', '10:30'), fim: instante('2026-10-15', '11:30') })).toBe(true);
    expect(sobrepoe(a, { inicio: instante('2026-10-15', '10:10'), fim: instante('2026-10-15', '10:20') })).toBe(true);
    expect(sobrepoe(a, a)).toBe(true);
    expect(sobrepoe(a, { inicio: instante('2026-10-15', '11:00'), fim: instante('2026-10-15', '12:00') })).toBe(false);
    expect(sobrepoe(a, { inicio: instante('2026-10-15', '09:00'), fim: instante('2026-10-15', '10:00') })).toBe(false);
  });
});

describe('configuração editável pelo dono', () => {
  const config = (extra: Partial<typeof CONFIG_PADRAO>) => ({ ...CONFIG_PADRAO, ...extra });

  it('manhã e tarde definem a grade; a folga entre elas é o almoço', () => {
    const h = horariosPossiveis(
      30,
      config({ manhaInicio: '09:00', manhaFim: '11:00', tardeInicio: '13:00', tardeFim: '15:00' }),
    );
    expect(h).toEqual(['09:00', '09:30', '10:00', '10:30', '13:00', '13:30', '14:00', '14:30']);
  });

  it('o atendimento não atravessa o almoço nem passa do fim do período', () => {
    const c = config({ manhaFim: '11:30' });
    expect(horariosPossiveis(60, c)).toContain('10:30');
    expect(horariosPossiveis(60, c)).not.toContain('11:00');
  });

  it('sem almoço (tarde começa quando a manhã termina) o expediente é contínuo', () => {
    const c = config({ manhaFim: '12:00', tardeInicio: '12:00' });
    expect(horariosPossiveis(30, c)).toContain('12:00');
  });

  it('a grade da tarde parte do início configurado, mesmo fora da hora cheia', () => {
    const c = config({ tardeInicio: '14:15' });
    const h = horariosPossiveis(30, c);
    expect(h).toContain('14:15');
    expect(h).not.toContain('14:00');
  });

  it('a antecedência configurada vale (0 h libera o horário seguinte, 4 h exige mais)', () => {
    // AGORA = 15:00
    expect(antecedenciaSuficiente('2026-10-14', '15:30', AGORA, config({ antecedenciaHoras: 0 }))).toBe(true);
    expect(antecedenciaSuficiente('2026-10-14', '18:59', AGORA, config({ antecedenciaHoras: 4 }))).toBe(false);
    expect(antecedenciaSuficiente('2026-10-14', '19:00', AGORA, config({ antecedenciaHoras: 4 }))).toBe(true);
  });

  it('a janela em dias vale (7 dias: o oitavo dia já não)', () => {
    const c = config({ janelaDias: 7 });
    expect(janelaDeAgendamento(AGORA, c).max).toBe('2026-10-21');
    expect(dataNaJanela('2026-10-21', AGORA, c)).toBe(true);
    expect(dataNaJanela('2026-10-22', AGORA, c)).toBe(false);
  });

  it('o admin pode marcar de manhã_início até tarde_fim, inclusive no almoço', () => {
    const c = config({ manhaInicio: '09:00', tardeFim: '17:00' });
    expect(horarioDeAdminValido('08:30', 30, c)).toBe(false);
    expect(horarioDeAdminValido('12:30', 30, c)).toBe(true);
    expect(horarioDeAdminValido('16:45', 30, c)).toBe(false);
  });
});
