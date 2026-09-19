import { statusLabels } from '../data/mockData';

const AppointmentsTable = ({ appointments, onViewDetails, onEdit }) => {
  const getStatusBadge = (status) => {
    const statusStyles = {
      confirmed: { bg: '#10B981', color: '#FFFFFF', label: statusLabels.confirmed },
      pending: { bg: '#F59E0B', color: '#FFFFFF', label: statusLabels.pending },
      in_progress: { bg: '#3B82F6', color: '#FFFFFF', label: statusLabels.in_progress },
      completed: { bg: '#6B7280', color: '#FFFFFF', label: statusLabels.completed }
    };

    const style = statusStyles[status] || statusStyles.pending;

    return (
      <span className="status-badge" style={{ backgroundColor: style.bg, color: style.color }}>
        <span className="status-dot"></span>
        {style.label}
      </span>
    );
  };

  const formatPrice = (price) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="table-container">
      <table className="appointments-table">
        <thead>
          <tr>
            <th>DATA E HORA</th>
            <th>CLIENTE</th>
            <th>SERVIÇO</th>
            <th>PROFISSIONAL</th>
            <th>STATUS</th>
            <th>AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td className="date-cell">
                <div className="date-text">{appointment.date}</div>
                <div className="time-text">{appointment.time}</div>
              </td>
              <td className="client-cell">
                <div className="client-info">
                  <div className="client-avatar">{appointment.client.initials}</div>
                  <div className="client-details">
                    <div className="client-name">{appointment.client.name}</div>
                    <div className="client-phone">{appointment.client.phone}</div>
                  </div>
                </div>
              </td>
              <td className="service-cell">
                <div className="service-name">{appointment.service.name}</div>
                <div className="service-price">{formatPrice(appointment.service.price)}</div>
              </td>
              <td className="professional-cell">
                <div className="professional-name">{appointment.professional.name}</div>
                <div className="professional-role">{appointment.professional.role}</div>
              </td>
              <td className="status-cell">
                {getStatusBadge(appointment.status)}
              </td>
              <td className="actions-cell">
                <div className="action-buttons">
                  <button 
                    className="action-button view-button"
                    onClick={() => onViewDetails(appointment)}
                  >
                    <span className="action-icon">👁️</span>
                    Ver detalhes
                  </button>
                  <button 
                    className="action-button edit-button"
                    onClick={() => onEdit(appointment)}
                  >
                    <span className="action-icon">✏️</span>
                    Editar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AppointmentsTable;