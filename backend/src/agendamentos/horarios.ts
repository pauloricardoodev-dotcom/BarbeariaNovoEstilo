// Regras de data e horário dos agendamentos (funções puras, sem banco). Valem no servidor,
// no fuso America/Sao_Paulo. Fonte das regras: docs/context/decisoes.md.

export const FUSO = 'America/Sao_Paulo';

/** O Brasil não tem horário de verão desde 2019: o fuso de São Paulo é UTC-3 o ano todo. */
const OFFSET_FUSO = '-03:00';

/** Expediente: seg–sáb 08:00–18:00; almoço 12:00–14:00 (premissa — dono ainda vai confirmar); slots de 30 min. */
export const EXPEDIENTE = {
  abre: '08:00',
  fecha: '18:00',
  almocoInicio: '12:00',
  almocoFim: '14:00',
  passoMinutos: 30,
} as const;

/** O cliente só reagenda com pelo menos 2 horas de antecedência do início atual. */
export const ANTECEDENCIA_REAGENDAR_MS = 2 * 60 * 60 * 1000;

/**
 * Agendar e reagendar (cliente): a partir de hoje, mas só horários que começam com pelo menos 2 horas de
 * antecedência (mesma folga do reagendamento), até 3 meses à frente. Mude aqui para ajustar a antecedência.
 */
export const ANTECEDENCIA_MINIMA_AGENDAR_MS = 2 * 60 * 60 * 1000;
export const JANELA_MESES = 3;

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

/** Janela de datas vista de `agora`: de hoje a 3 meses à frente (inclusive), em dias de São Paulo. */
export function janelaDeAgendamento(agora: Date): { min: string; max: string } {
  const hoje = dataSP(agora);
  return { min: hoje, max: somarMeses(hoje, JANELA_MESES) };
}

/** O horário começa com a antecedência mínima exigida do cliente? (só importa para o dia de hoje) */
export function antecedenciaSuficiente(
  data: string,
  hora: string,
  agora: Date,
): boolean {
  return (
    instante(data, hora).getTime() - agora.getTime() >=
    ANTECEDENCIA_MINIMA_AGENDAR_MS
  );
}

export function dataNaJanela(data: string, agora: Date): boolean {
  const { min, max } = janelaDeAgendamento(agora);
  return data >= min && data <= max;
}

/** Fechado aos domingos. */
export function diaAberto(data: string): boolean {
  return diaDaSemana(data) !== 0;
}

/** Horários de início possíveis num dia para uma duração: na grade de 30 min, dentro do expediente e fora do almoço. */
export function horariosPossiveis(data: string, duracaoMinutos: number): string[] {
  if (!diaAberto(data)) return [];
  const abre = minutosDoDia(EXPEDIENTE.abre);
  const fecha = minutosDoDia(EXPEDIENTE.fecha);
  const almocoIni = minutosDoDia(EXPEDIENTE.almocoInicio);
  const almocoFim = minutosDoDia(EXPEDIENTE.almocoFim);
  const horarios: string[] = [];
  for (let ini = abre; ini + duracaoMinutos <= fecha; ini += EXPEDIENTE.passoMinutos) {
    const fim = ini + duracaoMinutos;
    const invadeAlmoco = ini < almocoFim && fim > almocoIni;
    if (!invadeAlmoco) horarios.push(horaDeMinutos(ini));
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
): string[] {
  return horariosPossiveis(data, duracaoMinutos).filter((hora) => {
    if (!antecedenciaSuficiente(data, hora, agora)) return false;
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
  data: string,
  hora: string,
  duracaoMinutos: number,
): boolean {
  return horariosPossiveis(data, duracaoMinutos).includes(hora);
}

/** O admin pode usar qualquer minuto e o intervalo do almoço, mas dentro do expediente e fora de domingo. */
export function horarioDeAdminValido(
  data: string,
  hora: string,
  duracaoMinutos: number,
): boolean {
  if (!diaAberto(data)) return false;
  const ini = minutosDoDia(hora);
  return (
    ini >= minutosDoDia(EXPEDIENTE.abre) &&
    ini + duracaoMinutos <= minutosDoDia(EXPEDIENTE.fecha)
  );
}

/** Reagendar é permitido até 2 h antes do início (exatamente 2 h ainda pode). Atendimento que já começou nunca. */
export function podeReagendarAgora(inicioAtual: Date, agora: Date): boolean {
  return inicioAtual.getTime() - agora.getTime() >= ANTECEDENCIA_REAGENDAR_MS;
}
