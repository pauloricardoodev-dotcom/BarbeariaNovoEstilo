import { useState, useMemo } from 'react';
import { appointments } from '../data/mockData';
import { MONTHS } from '../../data/constants';
import PageHeader from './PageHeader';

const DashboardTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });

  const stats = useMemo(() => {
    const [selectedMonthNum, selectedYear] = selectedMonth.split('/');
    const monthAppointments = appointments.filter(apt => {
      const aptMonth = apt.date.split('/')[1];
      const aptYear = apt.date.split('/')[2];
      return aptMonth === selectedMonthNum && aptYear === selectedYear;
    });

    const completedAppointments = monthAppointments.filter(apt => apt.status === 'concluido');
    const cancelledAppointments = monthAppointments.filter(apt => apt.status === 'cancelado');

    const revenue = completedAppointments.reduce((sum, apt) => sum + apt.service.price, 0);

    // Service count
    const serviceCount = {};
    completedAppointments.forEach(apt => {
      const serviceName = apt.service.name;
      serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
    });

    // Daily revenue
    const dailyRevenue = {};
    completedAppointments.forEach(apt => {
      const day = apt.date.split('/')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + apt.service.price;
    });

    return {
      totalClients: monthAppointments.length,
      revenue,
      totalAppointments: monthAppointments.length,
      cancellations: cancelledAppointments.length,
      serviceCount,
      dailyRevenue
    };
  }, [selectedMonth]);

  const sortedServices = Object.entries(stats.serviceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const sortedDailyRevenue = Object.entries(stats.dailyRevenue)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));

  const maxRevenue = Math.max(...Object.values(stats.dailyRevenue), 1);

  const monthOptions = (() => {
    const now = new Date();
    const options = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      options.push(
        <option key={monthStr} value={monthStr}>
          {MONTHS[date.getMonth()]} {date.getFullYear()}
        </option>
      );
    }
    return options;
  })();

  const cards = [
    { icon: '👥', title: 'Clientes no Mês', value: stats.totalClients, subtitle: 'Atendimentos registrados' },
    { icon: '💰', title: 'Faturamento', value: `R$ ${stats.revenue.toFixed(2)}`, subtitle: 'Serviços concluídos' },
    { icon: '📅', title: 'Agendamentos', value: stats.totalAppointments, subtitle: 'Total de reservas' },
    { icon: '❌', title: 'Cancelamentos', value: stats.cancellations, subtitle: 'Reservas canceladas' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio">
        <select
          className="form-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {monthOptions}
        </select>
      </PageHeader>

      <div className="row g-3 mb-4">
        {cards.map(card => (
          <div key={card.title} className="col-12 col-sm-6 col-xl-3">
            <div className="card stat-card h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="stat-icon">{card.icon}</div>
                <div>
                  <div className="text-secondary small text-uppercase fw-semibold">{card.title}</div>
                  <div className="stat-value">{card.value}</div>
                  <div className="text-secondary small">{card.subtitle}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h5 calendar-title mb-3">Faturamento por Dia</h3>
              {sortedDailyRevenue.length > 0 ? (
                <div className="bar-chart">
                  {sortedDailyRevenue.map(([day, revenue]) => (
                    <div key={day} className="bar-item">
                      <div className="bar-fill" style={{ height: `${(revenue / maxRevenue) * 100}%` }}>
                        <div className="bar-value">R$ {revenue}</div>
                      </div>
                      <div className="small text-secondary">{day}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-secondary fst-italic py-5">Sem dados para exibir</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h5 calendar-title mb-3">Serviços Mais Realizados</h3>
              {sortedServices.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {sortedServices.map(([serviceName, count]) => (
                    <li key={serviceName} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <span>{serviceName}</span>
                      <span className="badge text-bg-primary rounded-pill">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-secondary fst-italic py-5">Sem dados para exibir</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
