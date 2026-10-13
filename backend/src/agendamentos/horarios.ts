// Regras de data e horário dos agendamentos (funções puras, sem banco). Valem no servidor,
// no fuso America/Sao_Paulo. Fonte das regras: docs/context/decisoes.md.

export const FUSO = 'America/Sao_Paulo';

/** O Brasil não tem horário de verão desde 2019: o fuso de São Paulo é UTC-3 o ano todo. */
const OFFSET_FUSO = '-03:00';

/** Slots de 30 min. Quais dias abrem (folga semanal, feriados, bloqueios do dono) é decidido em `src/dias`. */
export const PASSO_MINUTOS = 30;

/**
 * Regras de horário que o dono edita em Configurações (tabela `configuracoes`). O expediente são dois períodos
 * (manhã e tarde); a folga entre eles é o almoço. As funções abaixo recebem isto como argumento.
 */
export interface ConfigHorarios {
  manhaInicio: string;
  manhaFim: string;
  tardeInicio: string;
  tardeFim: string;
  /** Antecedência mínima para agendar (e para o novo horário de um reagendamento), em horas. */
  antecedenciaHoras: number;
  /** Até quantos dias à frente (a partir de hoje) dá para agendar. */
  janelaDias: number;
  /** Dias de trabalho da semana (1 = segunda … 7 = domingo). Os demais são folga semanal. */
  diasTrabalho: number[];
}

/** Valores de fábrica (iguais ao seed da migration). Também usados se a linha de configuração não existir. */
export const CONFIG_PADRAO: ConfigHorarios = {
  manhaInicio: '08:00',
  manhaFim: '12:00',
  tardeInicio: '14:00',
  tardeFim: '18:00',
  antecedenciaHoras: 2,
  janelaDias: 90,
  diasTrabalho: [1, 2, 3, 4, 5, 6],
};

const NOMES_DIAS = [
  '',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
  'domingo',
];

/** 1 = segunda … 7 = domingo. */
export function nomeDoDiaDaSemana(numero: number): string {
  return NOMES_DIAS[numero] ?? '';
}

/**
 * Dias de trabalho em texto: "segunda a sábado", "segunda, quarta e sexta", "terça".
 * Três ou mais dias seguidos viram "a"; os demais são listados.
 */
export function descreverDiasDeTrabalho(
  config: Pick<ConfigHorarios, 'diasTrabalho'>,
): string {
  const dias = [...new Set(config.diasTrabalho)].sort((a, b) => a - b);
  const partes: string[] = [];
  for (let i = 0; i < dias.length; ) {
    let j = i;
    while (j + 1 < dias.length && dias[j + 1] === dias[j] + 1) j++;
    if (j - i >= 2) {
      partes.push(`${nomeDoDiaDaSemana(dias[i])} a ${nomeDoDiaDaSemana(dias[j])}`);
    } else {
      for (let k = i; k <= j; k++) partes.push(nomeDoDiaDaSemana(dias[k]));
    }
    i = j + 1;
  }
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

/** O dia da semana da data está dentro dos dias de trabalho? (não considera feriado nem bloqueio) */
export function diaDeTrabalho(
  data: string,
  config: Pick<ConfigHorarios, 'diasTrabalho'>,
): boolean {
  const dow = diaDaSemana(data); // 0 = domingo
  return config.diasTrabalho.includes(dow === 0 ? 7 : dow);
}

/** O cliente só reagenda com pelo menos 2 horas de antecedência do início atual (regra fixa, não configurável). */
export const ANTECEDENCIA_REAGENDAR_MS = 2 * 60 * 60 * 1000;

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' existente no calendário (rejeita 2026-02-30). */
export function dataValida(data: string): boolean {
  if (!RE_DATA.test(data)) return false;
  const [a, m, d] = data.split('-').map(Number);
  const ref = new Date(Date.UTC(a, m - 1, d));
  return (
    ref.getUTCFullYear() === a &&
    ref.getUTCMonth() === m - 1 &&
    ref.getUTCDate() === d
  );
}

export function horaValida(hora: string): boolean {
  return RE_HORA.test(hora);
}

export function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function horaDeMinutos(minutos: number): string {
  return `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY'. */
export function formatarDataBR(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Instante (UTC) de uma data+hora no relógio de São Paulo. */
export function instante(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00${OFFSET_FUSO}`);
}

function partesSP(momento: Date): Record<string, string> {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(momento);
  return Object.fromEntries(partes.map((p) => [p.type, p.value]));
}

/** Dia de calendário ('YYYY-MM-DD') de um instante, em São Paulo. */
export function dataSP(momento: Date): string {
  const p = partesSP(momento);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora do relógio ('HH:mm') de um instante, em São Paulo. */
export function horaSP(momento: Date): string {
  const p = partesSP(momento);
  return `${p.hour}:${p.minute}`;
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number);
  const ref = new Date(Date.UTC(a, m - 1, d + dias));
  return `${ref.getUTCFullYear()}-${pad(ref.getUTCMonth() + 1)}-${pad(ref.getUTCDate())}`;
}

/** Soma meses; se o dia não existir no mês de destino, usa o último dia (31/05 + 1 mês = 30/06). */
export function somarMeses(data: string, meses: number): string {
  const [a, m, d] = data.split('-').map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return `${alvo.getUTCFullYear()}-${pad(alvo.getUTCMonth() + 1)}-${pad(Math.min(d, ultimo))}`;
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Janela de datas vista de `agora`: de hoje até `janelaDias` à frente (inclusive), em dias de São Paulo. */
export function janelaDeAgendamento(
  agora: Date,
  config: ConfigHorarios,
): { min: string; max: string } {
  const hoje = dataSP(agora);
  return { min: hoje, max: somarDias(hoje, config.janelaDias) };
}

/** O horário começa com a antecedência mínima configurada? (só importa para o dia de hoje) */
export function antecedenciaSuficiente(
  data: string,
  hora: string,
  agora: Date,
  config: ConfigHorarios,
): boolean {
  return (
    instante(data, hora).getTime() - agora.getTime() >=
    config.antecedenciaHoras * 60 * 60 * 1000
  );
}

export function dataNaJanela(
  data: string,
  agora: Date,
  config: ConfigHorarios,
): boolean {
  const { min, max } = janelaDeAgendamento(agora, config);
  return data >= min && data <= max;
}

/** Horários de início possíveis num dia para uma duração: na grade de 30 min, dentro do expediente e fora do almoço. */
export function horariosPossiveis(
  duracaoMinutos: number,
  config: ConfigHorarios,
): string[] {
  const periodos = [
    [minutosDoDia(config.manhaInicio), minutosDoDia(config.manhaFim)],
    [minutosDoDia(config.tardeInicio), minutosDoDia(config.tardeFim)],
  ];
  const horarios: string[] = [];
  // O atendimento tem que caber inteiro dentro de um período (não atravessa o almoço).
  for (const [abre, fecha] of periodos) {
    for (let ini = abre; ini + duracaoMinutos <= fecha; ini += PASSO_MINUTOS) {
      horarios.push(horaDeMinutos(ini));
    }
  }
  return horarios;
}

export interface Intervalo {
  inicio: Date;
  fim: Date;
}

/** [aIni, aFim) e [bIni, bFim) se sobrepõem? Encostar (fim = início do outro) não é sobrepor. */
export function sobrepoe(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/** Horários possíveis que não colidem com nenhum agendamento ocupado. */
export function horariosLivres(
  data: string,
  duracaoMinutos: number,
  ocupados: Intervalo[],
  agora: Date,
  config: ConfigHorarios,
): string[] {
  return horariosPossiveis(duracaoMinutos, config).filter((hora) => {
    if (!antecedenciaSuficiente(data, hora, agora, config)) return false;
    const inicio = instante(data, hora);
    const candidato = {
      inicio,
      fim: new Date(inicio.getTime() + duracaoMinutos * 60_000),
    };
    return !ocupados.some((o) => sobrepoe(candidato, o));
  });
}

/** O cliente só escolhe horários da grade de 30 min (os mesmos que a disponibilidade devolve). */
export function horarioDeClienteValido(
  hora: string,
  duracaoMinutos: number,
  config: ConfigHorarios,
): boolean {
  return horariosPossiveis(duracaoMinutos, config).includes(hora);
}

/** O admin pode usar qualquer minuto e o intervalo do almoço, mas entre a abertura da manhã e o fechamento da tarde, fora de domingo. */
export function horarioDeAdminValido(
  hora: string,
  duracaoMinutos: number,
  config: ConfigHorarios,
): boolean {
  const ini = minutosDoDia(hora);
  return (
    ini >= minutosDoDia(config.manhaInicio) &&
    ini + duracaoMinutos <= minutosDoDia(config.tardeFim)
  );
}

/** Reagendar é permitido até 2 h antes do início (exatamente 2 h ainda pode). Atendimento que já começou nunca. */
export function podeReagendarAgora(inicioAtual: Date, agora: Date): boolean {
  return inicioAtual.getTime() - agora.getTime() >= ANTECEDENCIA_REAGENDAR_MS;
}
