import { useEffect, useState } from 'react';
import { listarServicos } from '../api/servicos';

/** Carrega o catálogo de serviços ativos uma vez. */
const useServicos = () => {
  const [estado, setEstado] = useState({ servicos: [], carregando: true, erro: '' });

  useEffect(() => {
    let cancelado = false;
    listarServicos()
      .then((servicos) => !cancelado && setEstado({ servicos, carregando: false, erro: '' }))
      .catch((err) => !cancelado && setEstado({ servicos: [], carregando: false, erro: err.message }));
    return () => {
      cancelado = true;
    };
  }, []);

  return estado;
};

export default useServicos;
