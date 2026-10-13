// Estado de cada dia do calendário (função pura): aberto ou fechado, e por quê.
// Padrão: fecha nos feriados e nos dias fora da semana de trabalho (Configurações; antes era só domingo).
// O dono pode desbloquear esses dias ou fechar um dia comum.
import {
  diaDeTrabalho,
  diaDaSemana,
  nomeDoDiaDaSemana,
  somarDias,
  type ConfigHorarios,
} from '../agendamentos/horarios.js';
import { nomeDoFeriado } from './feriados.js';

export type OrigemDia = 'folga' | 'feriado' | 'bloqueio';

/** Dias de trabalho da semana (1 = segunda … 7 = domingo). */
export type Semana = Pick<ConfigHorarios, 'diasTrabalho'>;

export interface EstadoDia {
  data: string;
  fechado: boolean;
  /** Por que está (ou estaria) fechado. Só é null para um dia comum aberto. */
  origem: OrigemDia | null;
  /** Texto para mostrar ("Feriado: Natal", "Folga semanal (domingo)" ou o motivo escrito pelo dono). */
  motivo: string | null;
  /** O dono abriu um dia que fecharia por padrão (folga semanal/feriado). */
  desbloqueado: boolean;
}

/** Exceção gravada pelo dono (tabela dias_especiais). */
export interface ExcecaoDia {
  aberto: boolean;
  motivo: string | null;
}

export const MOTIVO_BLOQUEIO = 'Fechado pelo dono';

/** O que acontece sem nenhuma exceção: feriado e folga semanal fecham. */
export function padraoDoDia(
  data: string,
  semana: Semana,
): { fechado: boolean; origem: OrigemDia | null; motivo: string | null } {
  const feriado = nomeDoFeriado(data);
  if (feriado) {
    return { fechado: true, origem: 'feriado', motivo: `Feriado: ${feriado}` };
  }
  if (!diaDeTrabalho(data, semana)) {
    const dow = diaDaSemana(data);
    return {
      fechado: true,
      origem: 'folga',
      motivo: `Folga semanal (${nomeDoDiaDaSemana(dow === 0 ? 7 : dow)})`,
    };
  }
  return { fechado: false, origem: null, motivo: null };
}

export function estadoDoDia(
  data: string,
  semana: Semana,
  excecao?: ExcecaoDia | null,
): EstadoDia {
  const padrao = padraoDoDia(data, semana);
  if (!excecao) return { data, ...padrao, desbloqueado: false };
  if (excecao.aberto) {
    return { data, fechado: false, origem: padrao.origem, motivo: padrao.motivo, desbloqueado: true };
  }
  return {
    data,
    fechado: true,
    origem: 'bloqueio',
    motivo: excecao.motivo ?? MOTIVO_BLOQUEIO,
    desbloqueado: false,
  };
}

/** Dias de [de, ate] que fogem do "dia comum aberto": fechados, ou desbloqueados pelo dono. */
export function diasEspeciais(
  de: string,
  ate: string,
  excecoes: Map<string, ExcecaoDia>,
  semana: Semana,
): EstadoDia[] {
  const lista: EstadoDia[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
    const estado = estadoDoDia(d, semana, excecoes.get(d));
    if (estado.fechado || estado.desbloqueado) lista.push(estado);
  }
  return lista;
}
