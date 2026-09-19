import { useState } from 'react';

const Header = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileNavOpen(false);
    }
  };

  return (
    <header>
      <div className="top-stripe barberpole"></div>
      <div className="wrap header-inner">
        <a href="#inicio" className="brand" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); }}>
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
        <nav className="main-nav">
          <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); }}>Início</a>
          <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); }}>Sobre</a>
          <a href="#agendamento" onClick={(e) => { e.preventDefault(); scrollToSection('agendamento'); }}>Agendar</a>
        </nav>
        <div className="header-cta">
          <button 
            className="menu-toggle" 
            aria-label="Abrir menu"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <a 
            href="#agendamento" 
            className="btn btn-primary"
            onClick={(e) => { e.preventDefault(); scrollToSection('agendamento'); }}
          >
            Agendar horário
          </a>
        </div>
      </div>
      <div className={`mobile-nav ${mobileNavOpen ? 'open' : ''}`}>
        <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); }}>Início</a>
        <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); }}>Sobre</a>
        <a href="#agendamento" onClick={(e) => { e.preventDefault(); scrollToSection('agendamento'); }}>Agendar</a>
        <a 
          href="#agendamento" 
          className="btn btn-primary"
          onClick={(e) => { e.preventDefault(); scrollToSection('agendamento'); }}
        >
          Agendar horário
        </a>
      </div>
    </header>
  );
};

export default Header;
