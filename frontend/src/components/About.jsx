const About = () => {
  return (
    <section className="section section-navy" id="sobre">
      <div className="wrap about-grid">
        <div className="about-art">
          <div className="fr"></div>
          <svg viewBox="0 0 300 220" width="70%" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#C7CCD0" strokeWidth="1.4">
              <rect x="30" y="30" width="240" height="160" />
              <line x1="30" y1="70" x2="270" y2="70"/>
              <line x1="100" y1="70" x2="100" y2="190"/>
              <line x1="200" y1="70" x2="200" y2="190"/>
            </g>
            <g fill="#F2F2F0" opacity="0.85">
              <circle cx="65" cy="50" r="6"/>
              <circle cx="150" cy="50" r="6"/>
              <circle cx="235" cy="50" r="6"/>
            </g>
          </svg>
        </div>
        <div className="about-copy">
          <div className="kicker-line on-dark"><div className="rule"></div><span>Nossa história</span></div>
          <h2 style={{ color: 'var(--cream)' }}>Tradição que combina com o seu estilo.</h2>
          <p className="sub" style={{ color: 'rgba(242,242,240,0.75)' }}>Há mais de uma década, a Barbearia Novo Estilo une a precisão da barbearia clássica inglesa aos cuidados de um atendimento moderno e unissex. Cada visita é conduzida com atenção aos detalhes, do primeiro café ao último toque de acabamento.</p>
          <div className="marks">
            <div><b>13</b><span>Anos de atuação</span></div>
            <div><b>3</b><span>Especialistas dedicados</span></div>
            <div><b>6</b><span>Serviços especializados</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
