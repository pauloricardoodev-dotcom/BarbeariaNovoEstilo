import { useEffect, useState } from 'react';
import { listarServicos } from '../api/servicos';

/**
 * Carrega o catálogo de serviços ativos e atualiza ao voltar para a aba, para que um serviço
 * excluído/inativado no painel suma do site sem precisar recarregar a página.
 */
const useServicos = () => {
  const [estado, setEstado] = useState({ servicos: [], carregando: true, erro: '' });

  useEffect(() => {
    let cancelado = false;
    const carregar = () =>
      listarServicos()
        .then((servicos) => !cancelado && setEstado({ servicos, carregando: false, erro: '' }))
        .catch((err) => !cancelado && setEstado((atual) => ({ ...atual, carregando: false, erro: atual.servicos.length ? '' : err.message })));
    const aoVoltar = () => document.visibilityState === 'visible' && carregar();

    carregar();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, []);

  return estado;
};

export default useServicos;
