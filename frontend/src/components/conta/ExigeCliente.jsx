import { Navigate, useLocation } from 'react-router';
import { useSessaoCliente } from '../../sessao/sessaoCliente';
import ContaLayout from './ContaLayout';

/** Só mostra o conteúdo com sessão de cliente; sem sessão, manda para o login e volta depois. */
const ExigeCliente = ({ children }) => {
  const { status, recarregar } = useSessaoCliente();
  const { pathname, search, hash } = useLocation();

  if (status === 'carregando') {
    return (
      <section className="conta-page">
        <p className="conta-carregando">Carregando…</p>
      </section>
    );
  }
  if (status === 'erro') {
    return (
      <ContaLayout titulo="Sem conexão" subtitulo="Não foi possível falar com o servidor.">
        <button type="button" className="btn btn-outline btn-block" onClick={recarregar}>
          Tentar novamente
        </button>
      </ContaLayout>
    );
  }
  if (status === 'anonimo') {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname + search + hash)}`} replace />;
  }
  return children;
};

export default ExigeCliente;
