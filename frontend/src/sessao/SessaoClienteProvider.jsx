import { useCallback, useEffect, useMemo, useState } from 'react';
import { clienteAtual, sair as sairApi } from '../api/clientes';
import { SessaoClienteContext } from './sessaoCliente';

const SessaoClienteProvider = ({ children }) => {
  const [status, setStatus] = useState('carregando');
  const [cliente, setCliente] = useState(null);

  const definirCliente = useCallback((novo) => {
    setCliente(novo);
    setStatus(novo ? 'logado' : 'anonimo');
  }, []);

  const recarregar = useCallback(
    () => clienteAtual().then(definirCliente, () => setStatus('erro')),
    [definirCliente],
  );

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const sair = useCallback(async () => {
    try {
      await sairApi();
    } finally {
      definirCliente(null);
    }
  }, [definirCliente]);

  const valor = useMemo(
    () => ({ status, cliente, definirCliente, sair, recarregar }),
    [status, cliente, definirCliente, sair, recarregar],
  );

  return <SessaoClienteContext.Provider value={valor}>{children}</SessaoClienteContext.Provider>;
};

export default SessaoClienteProvider;
