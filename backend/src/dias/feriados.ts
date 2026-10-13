// Feriados em que a barbearia fecha por padrão (função pura). Nacionais + estadual do PR + municipal de Maringá.
// O aniversário de Maringá (Lei Municipal 5.719/2002) é 10/05; uma lei de 2026 que o moveria para a segunda-feira
// foi suspensa na Justiça, então vale a data fixa. Se isso mudar, o dono ajusta o dia em Bloquear/Desbloquear.
// Carnaval e Corpus Christi são pontos facultativos e não entram: o dono fecha esses dias à mão, se quiser.
import { somarDias } from '../agendamentos/horarios.js';

const pad = (n: number) => String(n).padStart(2, '0');

/** Domingo de Páscoa ('AAAA-MM-DD'), algoritmo de Meeus/Jones/Butcher. */
export function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/** Mapa 'AAAA-MM-DD' -> nome do feriado do ano. */
export function feriadosDoAno(ano: number): Map<string, string> {
  const fixos: [string, string][] = [
    ['01-01', 'Confraternização Universal'],
    ['04-21', 'Tiradentes'],
    ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência do Brasil'],
    ['05-10', 'Aniversário de Maringá'],
    ['10-12', 'Nossa Senhora Aparecida'],
    ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'],
    ['11-20', 'Consciência Negra'],
    ['12-19', 'Emancipação Política do Paraná'],
    ['12-25', 'Natal'],
  ];
  const mapa = new Map<string, string>(
    fixos.map(([md, nome]) => [`${ano}-${md}`, nome]),
  );
  mapa.set(somarDias(pascoa(ano), -2), 'Sexta-feira Santa');
  return mapa;
}

/** Nome do feriado em 'AAAA-MM-DD', ou null se não for feriado. */
export function nomeDoFeriado(data: string): string | null {
  return feriadosDoAno(Number(data.slice(0, 4))).get(data) ?? null;
}
