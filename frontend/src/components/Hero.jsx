const Hero = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="hero" id="inicio">
      <div className="wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <div style={{ width: '36px', height: '2px', background: 'var(--gold)' }}></div>
            <span>Desde 2005 — Maringá</span>
          </div>
          <h1>Seu estilo.<br/><em>Seu momento.</em></h1>
          <p className="sub">Cuidados, cortes e experiências pensadas para você.</p>
          <div className="hero-actions">
            <a 
              href="#agendamento" 
              className="btn btn-primary"
              onClick={(e) => { e.preventDefault(); scrollToSection('agendamento'); }}
            >
              Agendar horário
            </a>
          </div>
          <div className="hero-stats">
            <div><b>20</b><span>Anos de tradição</span></div>
            <div><b>4.9</b><span>Avaliação média</span></div>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-frame">
            <div className="pole-thread barberpole hero-corner left"></div>
            <div className="pole-thread barberpole hero-corner right"></div>
            <div className="inner-border">
              <img 
                src="/assets/LogoNE.jpeg" 
                alt="Logo Barbearia Novo Estilo" 
                style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--navy)' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `
                    <svg viewBox="0 0 520 620" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;background:var(--navy)">
                      <rect width="520" height="620" fill="#121214"/>
                      <circle cx="260" cy="320" r="190" fill="none" stroke="#C7CCD0" strokeWidth="1.2"/>
                      <circle cx="260" cy="320" r="176" fill="none" stroke="#C7CCD0" strokeWidth="0.6" opacity="0.5"/>
                      <text x="260" y="300" textAnchor="middle" fontFamily="Playfair Display, serif" fontWeight="600" fontSize="50" fill="#F2F2F0" letterSpacing="6">BARBEARIA</text>
                      <line x1="150" y1="330" x2="196" y2="330" stroke="#C7CCD0" strokeWidth="1"/>
                      <text x="260" y="337" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="19" fill="#C7CCD0" letterSpacing="6">NOVO ESTILO</text>
                      <line x1="324" y1="330" x2="370" y2="330" stroke="#C7CCD0" strokeWidth="1"/>
                      <text x="260" y="560" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill="#C7CCD0" letterSpacing="4">EST. 2011 · MARINGÁ</text>
                    </svg>
                  `;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
