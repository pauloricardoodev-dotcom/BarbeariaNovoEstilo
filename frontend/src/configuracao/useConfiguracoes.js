import { useEffect, useState } from 'react';
import { buscarConfiguracoes } from '../api/configuracoes';

// Valores de fábrica (iguais ao seed da migration). Valem enquanto a API responde ou se ela falhar;
// quem decide de fato é o servidor.
export const CONFIGURACOES_PADRAO = {
  nome: 'Barbearia Novo Estilo',
  telefone: '(41) 3025-1187',
  endereco: 'Rua das Palmeiras, 482 — Batel, Curitiba - PR',
  manhaInicio: '08:00',
  manhaFim: '12:00',
  tardeInicio: '14:00',
  tardeFim: '18:00',
  antecedenciaHoras: 2,
  janelaDias: 90,
  diasTrabalho: [1, 2, 3, 4, 5, 6],
};

// Uma consulta só por carregamento da página, compartilhada por Footer, Agendamento etc.
let promessa = null;
const carregar = () => {
  if (!promessa) {
    promessa = buscarConfiguracoes().catch(() => {
      promessa = null; // tenta de novo na próxima vez que alguém pedir
      return null;
    });
  }
  return promessa;
};

/** Configurações da barbearia (nome, contato, expediente, política). Começa com os valores de fábrica. */
export default function useConfiguracoes() {
  const [config, setConfig] = useState(CONFIGURACOES_PADRAO);

  useEffect(() => {
    let cancelado = false;
    carregar().then((dados) => {
      if (!cancelado && dados) setConfig(dados);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return config;
}

const NOMES_DIAS = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

/**
 * Dias de trabalho em texto (1 = segunda … 7 = domingo): "segunda a sábado", "terça, quinta e sábado".
 * Três ou mais dias seguidos viram "a"; os demais são listados. Igual ao backend.
 */
export const descreverDiasDeTrabalho = (dias) => {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  const partes = [];
  for (let i = 0; i < ordenados.length; ) {
    let j = i;
    while (j + 1 < ordenados.length && ordenados[j + 1] === ordenados[j] + 1) j++;
    if (j - i >= 2) partes.push(`${NOMES_DIAS[ordenados[i]]} a ${NOMES_DIAS[ordenados[j]]}`);
    else for (let k = i; k <= j; k++) partes.push(NOMES_DIAS[ordenados[k]]);
    i = j + 1;
  }
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
};

/** '08:00' -> '8h'; '08:30' -> '8h30'. */
export const formatarHoraCurta = (hhmm) => {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
};
