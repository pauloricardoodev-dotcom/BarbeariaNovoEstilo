import { SERVICES } from '../data/constants';

const Services = ({ onBookService }) => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatPrice = (price) => {
    return 'R$ ' + price.toFixed(2).replace('.', ',');
  };

  return (
    <section className="section section-white" id="servicos">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker-line"><div className="rule"></div><span>O que fazemos</span></div>
          <h2>Nossos serviços</h2>
          <p>Cada atendimento é pensado com técnica e cuidado, do primeiro corte à finalização.</p>
        </div>
        <div className="services-grid">
          {SERVICES.map((service, index) => (
            <div key={service.id} className="service-card">
              <span className="num">0{index + 1}</span>
              <h3>{service.name}</h3>
              <div className="service-meta">
                <span className="price">{formatPrice(service.price)}</span>
                <span className="dur">{service.duration} min</span>
              </div>
              <button 
                className="btn btn-outline btn-block"
                onClick={() => {
                  if (onBookService) {
                    onBookService(service.id);
                    scrollToSection('agendamento');
                  }
                }}
              >
                Agendar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
