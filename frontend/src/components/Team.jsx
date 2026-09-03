import { PROS } from '../data/constants';

const Team = ({ onBookPro }) => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="section section-cream" id="profissionais">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker-line"><div className="rule"></div><span>Quem cuida de você</span></div>
          <h2>Nossa equipe</h2>
          <p>Profissionais experientes, cada um com sua especialidade, prontos para o seu novo visual.</p>
        </div>
        <div className="team-grid">
          {PROS.map(pro => (
            <div key={pro.id} className="team-card">
              <div className="avatar"><span>{pro.initials}</span></div>
              <h3>{pro.name}</h3>
              <div className="role">{pro.role}</div>
              <p className="desc">{pro.desc}</p>
              <button 
                className="btn btn-outline"
                onClick={() => {
                  if (onBookPro) {
                    onBookPro(pro.id);
                    scrollToSection('agendamento');
                  }
                }}
              >
                Agendar com este profissional
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
