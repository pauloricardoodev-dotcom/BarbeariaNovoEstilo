import { statusLabels } from '../data/mockData';

const DetailsModal = ({ appointment, isOpen, onClose }) => {
  if (!isOpen || !appointment) return null;

  const formatPrice = (price) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detalhes do Agendamento</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3 className="detail-section-title">Informações do Agendamento</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Data:</span>
                <span className="detail-value">{appointment.date}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Horário:</span>
                <span className="detail-value">{appointment.time}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{getStatusBadge(appointment.status)}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Informações do Cliente</h3>
            <div className="client-detail-card">
              <div className="client-detail-avatar">{appointment.client.initials}</div>
              <div className="client-detail-info">
                <div className="client-detail-name">{appointment.client.name}</div>
                <div className="client-detail-phone">{appointment.client.phone}</div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Serviço</h3>
            <div className="service-detail-card">
              <div className="service-detail-name">{appointment.service.name}</div>
              <div className="service-detail-price">{formatPrice(appointment.service.price)}</div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">Profissional</h3>
            <div className="professional-detail-card">
              <div className="professional-detail-name">{appointment.professional.name}</div>
              <div className="professional-detail-role">{appointment.professional.role}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-button secondary-button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;