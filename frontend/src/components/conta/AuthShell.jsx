import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import useConfiguracoes from '../../configuracao/useConfiguracoes';
import { IconePessoa } from './icones';

/**
 * Moldura compartilhada de /entrar e /cadastro: cabeçalho, imagem de Londres e cartão marfim.
 * Fica montada entre as duas rotas, então trocar de uma para a outra anima (a imagem e o cartão
 * trocam de lado) em vez de recarregar a tela. Páginas filhas chamam `definirCentral(true)`
 * (via useOutletContext) na etapa "Quase lá": a imagem vira fundo escurecido e o cartão centraliza.
 * A animação é só CSS (styles/entrar.css), dirigida pela classe `auth-<modo>`.
 */
const AuthShell = () => {
  const { nome } = useConfiguracoes();
  const { pathname } = useLocation();
  const [central, setCentral] = useState(false);
  const modo = central ? 'central' : pathname === '/cadastro' ? 'cadastro' : 'entrar';
  const contexto = useMemo(() => ({ definirCentral: setCentral }), []);

  return (
    <div className={`auth auth-${modo}`}>
      <header className="auth-topo">
        <Link to="/" className="brand" aria-label={`${nome} — página inicial`}>
          <div className="mini-emblem">
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round">
                <line x1="13" y1="27" x2="27" y2="13" />
                <line x1="13" y1="13" x2="27" y2="27" />
                <circle cx="13" cy="27" r="2.6" />
                <circle cx="13" cy="13" r="2.6" />
              </g>
            </svg>
          </div>
          <div className="brand-text">
            <b>{nome}</b>
            <small>BARBEARIA CLÁSSICA</small>
          </div>
        </Link>
        <div className="auth-area">
          <IconePessoa />
          <span>Área do cliente</span>
        </div>
      </header>

      <div className="auth-palco">
        <div className="auth-imagem" aria-hidden="true">
          <img src="/assets/big-ben-londres.jpg" alt="" decoding="async" />
          <div className="auth-imagem-texto">
            <h2>Tradição, estilo e personalidade.</h2>
            <span className="auth-traco" />
            <p>Mais do que uma barbearia, um estilo de vida.</p>
          </div>
        </div>

        <div className="auth-painel">
          <div className="auth-cartao">
            {/* key: o conteúdo de cada tela entra com um fade curto enquanto o cartão desliza. */}
            <div className="auth-conteudo" key={pathname}>
              <Outlet context={contexto} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
