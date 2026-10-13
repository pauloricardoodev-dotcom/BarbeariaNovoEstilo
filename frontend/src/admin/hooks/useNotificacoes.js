import { useCallback, useEffect, useState } from 'react';
import { listarReagendamentosNovos, listarSolicitacoesPendentes } from '../api/agendamentos';

const INTERVALO_MS = 15_000;

/**
 * Notificações do painel: pedidos de cancelamento aguardando resposta (exigem decisão) e reagendamentos feitos
 * pelos clientes que o barbeiro ainda não viu (só informativos). Reconsulta a cada 15 s (aba visível)
 * e ao voltar para a aba/janela, para o ponto vermelho do menu aparecer sem recarregar a página.
 */
const useNotificacoes = () => {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [reagendamentos, setReagendamentos] = useState([]);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);

  const recarregar = useCallback(() => setVersao((n) => n + 1), []);

  useEffect(() => {
    let cancelado = false;
    // Cada lista é independente: se uma consulta falhar, a outra continua aparecendo
    // (e a lista que falhou mantém o último valor conhecido).
    Promise.allSettled([listarSolicitacoesPendentes(), listarReagendamentosNovos()]).then(
      ([pedidos, reagendados]) => {
        if (cancelado) return;
        if (pedidos.status === 'fulfilled') setSolicitacoes(pedidos.value);
        if (reagendados.status === 'fulfilled') setReagendamentos(reagendados.value);
        const falha = [pedidos, reagendados].find((r) => r.status === 'rejected');
        setErro(falha ? falha.reason.message : '');
      },
    );
    return () => {
      cancelado = true;
    };
  }, [versao]);

  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === 'visible') recarregar();
    };
    const id = setInterval(atualizar, INTERVALO_MS);
    document.addEventListener('visibilitychange', atualizar);
    window.addEventListener('focus', atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener('focus', atualizar);
    };
  }, [recarregar]);

  return {
    solicitacoes,
    reagendamentos,
    // Quantas notificações há no total (o ponto vermelho do menu aparece quando é maior que zero).
    total: solicitacoes.length + reagendamentos.length,
    erro,
    recarregar,
  };
};

export default useNotificacoes;
