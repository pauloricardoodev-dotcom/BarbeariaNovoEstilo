import { HERO_STATS } from '../data/constants';

const ICONS = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  ),
  scissors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="6" cy="18" r="2.6" />
      <path d="M8 7.5L20 19M8 16.5L20 5" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z" />
    </svg>
  ),
};

const Arrow = () => (
  <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Hero = () => {
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <section className="hero" id="inicio">
        <div
          className="hero-photo"
          style={{ backgroundImage: "url('/assets/hero.jpg')" }}
          role="img"
          aria-label="Barbeiro trabalhando no corte de um cliente"
        ></div>
        <div className="container hero-content">
          <div className="row">
            <div className="col-12 col-lg-7 col-xl-6 hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-rule"></span>
                <span>Desde 2011 · Curitiba</span>
              </div>
              <h1>Seu estilo.<br />Seu momento.</h1>
              <p className="sub">Cortes clássicos.<br />Precisão moderna.</p>
              <div className="hero-actions">
                <a
                  href="#agendamento"
                  className="btn btn-primary"
                  onClick={(e) => scrollToSection(e, 'agendamento')}
                >
                  Agendar horário <Arrow />
                </a>
                <a
                  href="#servicos"
                  className="btn btn-outline-cream"
                  onClick={(e) => scrollToSection(e, 'servicos')}
                >
                  Conhecer serviços <Arrow />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hero-stats-bar" aria-label="Indicadores">
        <div className="container">
          <div className="row g-0">
            {HERO_STATS.map((stat) => (
              <div className="col-12 col-md-4 stat-item" key={stat.label}>
                <span className="stat-icon">{ICONS[stat.icon]}</span>
                <div>
                  <b>{stat.value}</b>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
