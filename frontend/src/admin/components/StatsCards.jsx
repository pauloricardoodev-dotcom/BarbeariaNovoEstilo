const StatsCards = ({ stats }) => {
  const cards = [
    {
      icon: '📅',
      title: 'Hoje',
      value: stats.today,
      subtitle: 'agendamentos'
    },
    {
      icon: '📅',
      title: 'Esta semana',
      value: stats.week,
      subtitle: 'agendamentos'
    },
    {
      icon: '👥',
      title: 'Total de clientes',
      value: stats.totalClients,
      subtitle: 'cadastrados'
    },
    {
      icon: '📈',
      title: 'Taxa de comparecimento',
      value: `${stats.attendanceRate}%`,
      subtitle: 'este mês'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => (
        <div key={index} className="stat-card">
          <div className="stat-icon">
            <span className="icon-emoji">{card.icon}</span>
          </div>
          <div className="stat-content">
            <h3 className="stat-title">{card.title}</h3>
            <div className="stat-value">{card.value}</div>
            <p className="stat-subtitle">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;