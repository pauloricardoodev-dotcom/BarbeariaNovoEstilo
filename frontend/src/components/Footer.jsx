const NAV_LINKS = [
  { id: 'inicio', label: 'Início' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'agendamento', label: 'Agendar' },
];

const Icon = ({ children }) => (
  <svg className="f-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Footer = () => {
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer>
      <div className="container">
        <div className="row g-5 footer-main">
          <div className="col-12 col-lg-4 footer-brand">
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
            <span className="footer-rule"></span>
            <p>Barbearia com essência clássica inglesa e atendimento contemporâneo, no coração de Curitiba.</p>
          </div>

          <div className="col-12 col-sm-6 col-lg-2">
            <h5>Navegação</h5>
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} onClick={(e) => scrollToSection(e, link.id)}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <h5>Contato</h5>
            <ul className="info-list">
              <li>
                <Icon><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></Icon>
                <span>Rua das Palmeiras, 482<br />Batel — Curitiba, PR</span>
              </li>
              <li>
                <Icon><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></Icon>
                <a href="tel:+554130251187">(41) 3025-1187</a>
              </li>
            </ul>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <h5>Funcionamento</h5>
            <ul className="info-list">
              <li>
                <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
                <span>Terça a sábado<br />09h às 19h</span>
              </li>
              <li>
                <Icon><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="0.6" fill="currentColor" /></Icon>
                <a href="https://instagram.com/barbearianovoestilo" target="_blank" rel="noopener noreferrer">@barbearianovoestilo</a>
              </li>
            </ul>
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
