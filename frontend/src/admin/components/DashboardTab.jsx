import { useState, useMemo } from 'react';
import { appointments } from '../data/mockData';
import { MONTHS } from '../../data/constants';

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

  return (
    <div className="admin-content">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do seu negócio</p>
        </div>
        <div className="page-actions">
          <select
            className="filter-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {(() => {
              const now = new Date();
              const months = [];
              for (let i = 0; i < 6; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                const monthName = MONTHS[date.getMonth()];
                months.push(
                  <option key={monthStr} value={monthStr}>
                    {monthName} {date.getFullYear()}
                  </option>
                );
              }
              return months;
            })()}
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="icon-emoji">👥</span>
          </div>
          <div className="stat-content">
            <div className="stat-title">Clientes no Mês</div>
            <div className="stat-value">{stats.totalClients}</div>
            <div className="stat-subtitle">Atendimentos registrados</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="icon-emoji">💰</span>
          </div>
          <div className="stat-content">
            <div className="stat-title">Faturamento</div>
            <div className="stat-value">R$ {stats.revenue.toFixed(2)}</div>
            <div className="stat-subtitle">Serviços concluídos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="icon-emoji">📅</span>
          </div>
          <div className="stat-content">
            <div className="stat-title">Agendamentos</div>
            <div className="stat-value">{stats.totalAppointments}</div>
            <div className="stat-subtitle">Total de reservas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="icon-emoji">❌</span>
          </div>
          <div className="stat-content">
            <div className="stat-title">Cancelamentos</div>
            <div className="stat-value">{stats.cancellations}</div>
            <div className="stat-subtitle">Reservas canceladas</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-section">
          <h3 className="section-title">Faturamento por Dia</h3>
          <div className="chart-container">
            {sortedDailyRevenue.length > 0 ? (
              <div className="bar-chart">
                {sortedDailyRevenue.map(([day, revenue]) => (
                  <div key={day} className="bar-item">
                    <div className="bar-label">{day}</div>
                    <div 
                      className="bar-fill"
                      style={{ height: `${(revenue / maxRevenue) * 100}%` }}
                    >
                      <div className="bar-value">R$ {revenue}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Sem dados para exibir</div>
            )}
          </div>
        </div>

        <div className="services-section">
          <h3 className="section-title">Serviços Mais Realizados</h3>
          <div className="services-list">
            {sortedServices.length > 0 ? (
              sortedServices.map(([serviceName, count]) => (
                <div key={serviceName} className="service-stat-item">
                  <div className="service-stat-name">{serviceName}</div>
                  <div className="service-stat-count">{count}</div>
                </div>
              ))
            ) : (
              <div className="empty-state">Sem dados para exibir</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
