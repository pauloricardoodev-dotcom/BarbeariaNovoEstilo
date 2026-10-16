const About = () => {
  return (
    <section className="section section-cream" id="sobre">
      <div className="wrap about-grid">
        <div className="about-art">
          <img
            src="/assets/hero-atendimento.jpg"
            alt="Barbeiros atendendo clientes na Barbearia Novo Estilo"
            loading="lazy"
          />
          <div className="fr"></div>
        </div>
        <div className="about-copy">
          <div className="kicker-line"><div className="rule"></div><span>Nossa história</span></div>
          <h2>Tradição que combina com o seu estilo.</h2>
          <p className="sub">Há mais de duas décadas, a Barbearia Novo Estilo une a precisão da barbearia clássica inglesa aos cuidados de um atendimento moderno e unissex. Cada visita é conduzida com atenção aos detalhes, do primeiro café ao último toque de acabamento.</p>
          <div className="marks">
            <div><b>24</b><span>Anos de atuação</span></div>
            <div><b>3</b><span>Especialistas dedicados</span></div>
            <div><b>6</b><span>Serviços especializados</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
