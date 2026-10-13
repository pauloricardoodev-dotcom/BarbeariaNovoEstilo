import { useEffect, useState } from 'react';
import { buscarDiasEspeciais } from '../api/dias';

/**
 * Dias fechados da janela de agendamento (domingos, feriados e bloqueios do dono), vindos da API.
 * Devolve um Map 'AAAA-MM-DD' -> { motivo, ... }, ou null enquanto carrega (ou se a API falhar): nesse caso
 * `diaAgendavel` cai na regra de domingo, e o servidor continua sendo quem decide de verdade.
 */
export default function useDiasFechados(janela) {
  const { min, max } = janela;
  const chave = `${min}|${max}`;
  const [carregado, setCarregado] = useState({ chave: '', mapa: null });

  useEffect(() => {
    let cancelado = false;
    buscarDiasEspeciais(min, max)
      .then((lista) => {
        if (cancelado) return;
        const fechados = lista.filter((d) => d.fechado).map((d) => [d.data, d]);
        setCarregado({ chave: `${min}|${max}`, mapa: new Map(fechados) });
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [min, max]);

  return carregado.chave === chave ? carregado.mapa : null;
}
