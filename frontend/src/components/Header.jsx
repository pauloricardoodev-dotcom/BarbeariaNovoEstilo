import { useState } from 'react';

const NAV_LINKS = [
  { id: 'inicio', label: 'Início' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'agendamento', label: 'Agendar' },
];

const Header = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileNavOpen(false);
  };

  return (
    <header>
      <div className="container header-inner">
        <a href="#inicio" className="brand" onClick={(e) => scrollToSection(e, 'inicio')}>
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
            <b>Barbearia Novo Estilo</b>
            <small>BARBEARIA CLÁSSICA</small>
          </div>
        </a>

        <nav className="main-nav d-none d-lg-flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => scrollToSection(e, link.id)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header-cta">
          <a
            href="#agendamento"
            className="btn btn-primary d-none d-lg-inline-flex"
            onClick={(e) => scrollToSection(e, 'agendamento')}
          >
            Agendar horário
          </a>
          <button
            className="menu-toggle d-lg-none"
            aria-label="Abrir menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <div className={`mobile-nav d-lg-none ${mobileNavOpen ? 'open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={(e) => scrollToSection(e, link.id)}
          >
            {link.label}
          </a>
        ))}
        <a
          href="#agendamento"
          className="btn btn-primary"
          onClick={(e) => scrollToSection(e, 'agendamento')}
        >
          Agendar horário
        </a>
      </div>
    </header>
  );
};

export default Header;
