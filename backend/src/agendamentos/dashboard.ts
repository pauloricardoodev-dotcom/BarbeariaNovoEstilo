// Agregação do dashboard do admin (função pura, sem banco). Mês e dias sempre no fuso de São Paulo.
import { dataSP, instante, somarMeses } from './horarios.js';

export interface LinhaDashboard {
  inicio: Date;
  status: 'agendado' | 'concluido' | 'cancelado';
  /** Preço no momento da reserva, em reais. */
  preco: number;
  clienteId: string | null;
  servico: string;
}

export interface ResumoDashboard {
  mes: string;
  totais: {
    agendamentos: number;
    agendados: number;
    concluidos: number;
    cancelados: number;
    /** Clientes distintos (com conta) que têm agendamento não cancelado no mês. */
    clientes: number;
    /** Soma dos preços dos concluídos. */
    faturamento: number;
  };
  faturamentoPorDia: { dia: string; valor: number }[];
  servicos: { nome: string; quantidade: number }[];
}

export const TOP_SERVICOS = 5;

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function mesValido(mes: string): boolean {
  return RE_MES.test(mes);
}

/** Intervalo [inicio, fim) do mês 'AAAA-MM' em São Paulo. */
export function limitesDoMes(mes: string): { inicio: Date; fim: Date } {
  const primeiro = `${mes}-01`;
  return {
    inicio: instante(primeiro, '00:00'),
    fim: instante(somarMeses(primeiro, 1), '00:00'),
  };
}

const emReais = (centavos: number) => centavos / 100;

export function resumirMes(mes: string, linhas: LinhaDashboard[]): ResumoDashboard {
  const { inicio, fim } = limitesDoMes(mes);
  const doMes = linhas.filter((l) => l.inicio >= inicio && l.inicio < fim);

  const clientes = new Set<string>();
  const porDia = new Map<string, number>();
  const porServico = new Map<string, number>();
  let faturamento = 0;
  let agendados = 0;
  let concluidos = 0;
  let cancelados = 0;

  for (const l of doMes) {
    const centavos = Math.round(l.preco * 100);
    if (l.status === 'cancelado') {
      cancelados++;
      continue;
    }
    if (l.clienteId) clientes.add(l.clienteId);
    if (l.status === 'agendado') {
      agendados++;
      continue;
    }
    concluidos++;
    faturamento += centavos;
    const dia = dataSP(l.inicio);
    porDia.set(dia, (porDia.get(dia) ?? 0) + centavos);
    porServico.set(l.servico, (porServico.get(l.servico) ?? 0) + 1);
  }

  return {
    mes,
    totais: {
      agendamentos: doMes.length,
      agendados,
      concluidos,
      cancelados,
      clientes: clientes.size,
      faturamento: emReais(faturamento),
    },
    faturamentoPorDia: [...porDia]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, centavos]) => ({ dia, valor: emReais(centavos) })),
    servicos: [...porServico]
      .sort(([na, qa], [nb, qb]) => qb - qa || na.localeCompare(nb, 'pt-BR'))
      .slice(0, TOP_SERVICOS)
      .map(([nome, quantidade]) => ({ nome, quantidade })),
  };
}
