import { Navigate, useLocation } from 'react-router';
import { useSessaoCliente } from '../../sessao/sessaoCliente';

/** Só mostra o conteúdo com sessão de cliente; sem sessão, manda para o login e volta depois. */
const ExigeCliente = ({ children }) => {
  const { status } = useSessaoCliente();
  const { pathname, search, hash } = useLocation();

  if (status === 'carregando') {
    return (
      <section className="conta-page">
        <p className="conta-carregando">Carregando…</p>
      </section>
    );
  }
  // Sem resposta do servidor também cai no login (entrada padronizada); lá o erro aparece ao enviar.
  if (status === 'anonimo' || status === 'erro') {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname + search + hash)}`} replace />;
  }
  return children;
};

export default ExigeCliente;
