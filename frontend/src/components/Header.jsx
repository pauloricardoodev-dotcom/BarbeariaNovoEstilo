import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { useSessaoCliente } from '../sessao/sessaoCliente';
import useIrParaSecao from '../utils/useIrParaSecao';
import useConfiguracoes from '../configuracao/useConfiguracoes';

const NAV_LINKS = [
  { id: 'inicio', label: 'Início' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'agendamento', label: 'Agendar' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'mapa', label: 'Localização' },
];

const Header = () => {
  const { nome } = useConfiguracoes();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const irParaSecao = useIrParaSecao();
  const { status, cliente } = useSessaoCliente();
  const { pathname } = useLocation();

  // Menu lateral (celular): Esc fecha, a página atrás não rola e ele fecha sozinho ao passar para a tela larga.
  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && setMobileNavOpen(false);
    const larga = window.matchMedia('(min-width: 1200px)');
    const aoMudarLargura = () => larga.matches && setMobileNavOpen(false);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', aoTeclar);
    larga.addEventListener('change', aoMudarLargura);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', aoTeclar);
      larga.removeEventListener('change', aoMudarLargura);
    };
  }, [mobileNavOpen]);

  const scrollToSection = (e, sectionId) => {
    irParaSecao(e, sectionId);
    setMobileNavOpen(false);
  };

  // Login obrigatório: sem sessão, links de seção e "Agendar" só levariam de volta ao login.
  const logado = status === 'logado';

  // Link "Entrar" só para quem não está logado. Enquanto a sessão carrega, não mostra nada
  // (evita piscar "Entrar" para quem está logado); na própria tela de login também é desnecessário.
  const mostrarEntrar = !logado && status !== 'carregando' && pathname !== '/entrar';

  return (
    <>
    <header>
      <div className="container header-inner">
        <a href="/#inicio" className="brand" onClick={(e) => scrollToSection(e, 'inicio')}>
          <div className="mini-emblem">
            <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.3"/>
              <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round">
                <line x1="13" y1="27" x2="27" y2="13"/>
                <line x1="13" y1="13" x2="27" y2="27"/>
                <circle cx="13" cy="27" r="2.6"/>
                <circle cx="13" cy="13" r="2.6"/>
              </g>
            </svg>
          </div>
          <div className="brand-text">
            <b>{nome}</b>
            <small>BARBEARIA CLÁSSICA</small>
          </div>
        </a>

        {logado && (
          <nav className="main-nav d-none d-xl-flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`/#${link.id}`}
                onClick={(e) => scrollToSection(e, link.id)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="header-cta">
          {mostrarEntrar && (
            <Link to="/entrar" className="header-conta">
              Entrar
            </Link>
          )}
          {logado && (
            <>
              <a
                href="/#agendamento"
                className="btn btn-primary header-btn d-none d-xl-inline-flex"
                onClick={(e) => scrollToSection(e, 'agendamento')}
              >
                Agendar horário
              </a>
              <Link to="/meus-agendamentos" className="btn btn-outline-cream header-btn d-none d-xl-inline-flex">
                Meus agendamentos
              </Link>
              <Link to="/minha-conta" className="header-perfil d-none d-xl-flex" aria-label="Minha conta">
                <span className="header-perfil-avatar">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="9" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M5 20c0-3.8 3.1-6 7-6s7 2.2 7 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="header-perfil-nome">Olá, {cliente.nome.split(' ')[0]}</span>
              </Link>
              <button
                className="menu-toggle d-xl-none"
                aria-label="Abrir menu"
                aria-haspopup="dialog"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </>
          )}
        </div>
      </div>

    </header>

    {/* Portal no body: o header tem backdrop-filter e prenderia o menu fixo dentro dele. */}
    {logado &&
      createPortal(
        <div className="d-xl-none">
          <div className={`drawer-backdrop ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />
          <aside
            className={`mobile-drawer ${mobileNavOpen ? 'open' : ''}`}
            aria-hidden={!mobileNavOpen}
            aria-label="Menu"
          >
            <div className="drawer-head">
              <span className="drawer-title">Menu</span>
              <button type="button" className="drawer-close" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)}>
                ×
              </button>
            </div>
            <nav className="drawer-links">
              {NAV_LINKS.map((link) => (
                <a key={link.id} href={`/#${link.id}`} onClick={(e) => scrollToSection(e, link.id)}>
                  {link.label}
                </a>
              ))}
              <Link to="/meus-agendamentos" onClick={() => setMobileNavOpen(false)}>
                Meus agendamentos
              </Link>
              <Link to="/minha-conta" onClick={() => setMobileNavOpen(false)}>
                Minha conta
              </Link>
            </nav>
            <a href="/#agendamento" className="btn btn-primary drawer-cta" onClick={(e) => scrollToSection(e, 'agendamento')}>
              Agendar horário
            </a>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
};

export default Header;
