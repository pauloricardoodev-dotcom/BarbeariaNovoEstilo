import { WEEKDAYS } from '../data/constants';

const pad = (n) => String(n).padStart(2, '0');

/** Date local -> 'YYYY-MM-DD'. */
export const paraChave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY'. */
export const formatarDataBR = (chave) => {
  const [a, m, d] = chave.split('-');
  return `${d}/${m}/${a}`;
};

/** 'YYYY-MM-DD' -> 'SEG'. */
export const diaDaSemana = (chave) => {
  const [a, m, d] = chave.split('-').map(Number);
  return WEEKDAYS[new Date(a, m - 1, d).getDay()];
};

/** Instante ISO (ex.: criadoEm) -> 'DD/MM/YYYY às HH:mm' no relógio de São Paulo. */
export const formatarInstante = (iso) => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`;
};

/**
 * Janela de datas para agendar e reagendar: de hoje até 3 meses à frente (inclusive). Hoje só tem horários
 * com 2 h de antecedência, o que a consulta de disponibilidade já respeita. Espelha o servidor, que decide de fato.
 */
export const janelaDeAgendamento = (agora = new Date()) => {
  const min = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const ultimoDiaDoMesAlvo = new Date(agora.getFullYear(), agora.getMonth() + 4, 0).getDate();
  const max = new Date(
    agora.getFullYear(),
    agora.getMonth() + 3,
    Math.min(agora.getDate(), ultimoDiaDoMesAlvo),
  );
  return { min: paraChave(min), max: paraChave(max) };
};

/** Dia válido para agendar: dentro da janela e não domingo. */
export const diaAgendavel = (chave, janela = janelaDeAgendamento()) => {
  if (chave < janela.min || chave > janela.max) return false;
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d).getDay() !== 0;
};

/** Separa horários em manhã (< 12:00) e tarde. */
export const separarPeriodos = (horarios) => ({
  manha: horarios.filter((h) => h < '12:00'),
  tarde: horarios.filter((h) => h >= '12:00'),
});
