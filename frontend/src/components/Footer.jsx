const Footer = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
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
              <div className="brand-text"><b>Barbearia Novo Estilo</b></div>
            </a>
            <p>Barbearia com essência clássica inglesa e cuidado contemporâneo, no coração de Maringá.</p>
          </div>
          <div>
            <h5>Navegação</h5>
            <ul>
              <li><a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); }}>Início</a></li>
              <li><a href="#agendamento" onClick={(e) => { e.preventDefault(); scrollToSection('agendamento'); }}>Agendar</a></li>
            </ul>
          </div>
          <div>
            <h5>Contato</h5>
            <p className="line">Rua das Palmeiras, 482</p>
            <p className="line">Centro — Maringá, PR</p>
            <p className="line">(41) 3025-1187</p>
          </div>
          <div>
            <h5>Funcionamento</h5>
            <p className="line">Terça a sábado</p>
            <p className="line">09h às 19h</p>
            <p className="line">@barbearianovoestilo</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Elegância em cada detalhe.</span>
          <small>© 2026 Barbearia Novo Estilo. Todos os direitos reservados.</small>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
