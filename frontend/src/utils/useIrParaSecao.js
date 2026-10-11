import { useLocation, useNavigate } from 'react-router';

/**
 * Links para seções da home (#servicos, #agendamento…) que funcionam em qualquer página:
 * na home rola suavemente; nas outras, navega para "/#secao" e a home rola ao montar.
 */
const useIrParaSecao = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (e, secaoId) => {
    e.preventDefault();
    if (pathname === '/') {
      document.getElementById(secaoId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/#${secaoId}`);
    }
  };
};

export default useIrParaSecao;
