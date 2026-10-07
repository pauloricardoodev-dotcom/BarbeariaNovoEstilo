import { useState } from 'react';
import { statusLabels } from '../data/mockData';

const AppointmentModal = ({ appointment, onClose, onUpdate, onCancel, onComplete, professionals, services, appointments }) => {
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'confirm-cancel', 'confirm-complete'
  const [editedAppointment, setEditedAppointment] = useState({ ...appointment });
  const [error, setError] = useState('');

  const handleEdit = () => {
    setMode('edit');
    setEditedAppointment({ ...appointment });
  };

  const handleCancelClick = () => {
    setMode('confirm-cancel');
  };

  const handleCompleteClick = () => {
    setMode('confirm-complete');
  };

  const handleBack = () => {
    setMode('view');
    setError('');
  };

  const handleSave = () => {
    // Check if time slot is available
    const conflict = appointments.find(
      apt => apt.date === editedAppointment.date && 
             apt.time === editedAppointment.time && 
             apt.id !== editedAppointment.id &&
             apt.status !== 'cancelado'
    );

    if (conflict) {
      setError('Este horário já está ocupado.');
      return;
    }

    onUpdate(editedAppointment);
  };

  const handleConfirmCancel = () => {
    onCancel(appointment.id);
  };

  const handleConfirmComplete = () => {
    onComplete(appointment.id);
  };

  const handleInputChange = (field, value) => {
    setEditedAppointment({ ...editedAppointment, [field]: value });
    setError('');
  };

  if (mode === 'confirm-cancel') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Cancelar este agendamento?</h3>
          </div>
          <div className="modal-body">
            <p>Esta ação irá liberar o horário na agenda.</p>
          </div>
          <div className="modal-footer">
            <button className="modal-button secondary-button" onClick={handleBack}>
              Voltar
            </button>
            <button className="modal-button primary-button" onClick={handleConfirmCancel}>
              Confirmar Cancelamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'confirm-complete') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Concluir este atendimento?</h3>
          </div>
          <div className="modal-body">
            <p>Este atendimento será marcado como concluído e o valor será contabilizado no faturamento.</p>
          </div>
          <div className="modal-footer">
            <button className="modal-button secondary-button" onClick={handleBack}>
              Voltar
            </button>
            <button className="modal-button primary-button" onClick={handleConfirmComplete}>
              Confirmar Conclusão
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'edit' ? 'Editar Reserva' : appointment.client.name}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {mode === 'view' ? (
            <>
              <div className="detail-section">
                <div className="client-detail-card">
                  <div className="client-detail-avatar">{appointment.client.initials}</div>
                  <div className="client-detail-info">
                    <div className="client-detail-name">{appointment.client.name}</div>
                    <div className="client-detail-phone">{appointment.client.phone}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Serviço</div>
                <div className="service-detail-card">
                  <div className="service-detail-name">{appointment.service.name}</div>
                  <div className="service-detail-price">R$ {appointment.service.price.toFixed(2)}</div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Profissional</div>
                <div className="professional-detail-card">
                  <div className="professional-detail-name">{appointment.professional.name}</div>
                  <div className="professional-detail-role">{appointment.professional.role}</div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Data</div>
                    <div className="detail-value">{appointment.date}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Horário</div>
                    <div className="detail-value">{appointment.time}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Status</div>
                <div className={`status-badge status-${appointment.status}`}>
                  {statusLabels[appointment.status]}
                </div>
              </div>
            </>
          ) : (
            <div className="edit-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label>Nome do Cliente</label>
                <input
                  type="text"
                  value={editedAppointment.client.name}
                  onChange={(e) => handleInputChange('client', { ...editedAppointment.client, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="text"
                  value={editedAppointment.client.phone}
                  onChange={(e) => handleInputChange('client', { ...editedAppointment.client, phone: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Serviço</label>
                  <select
                    value={editedAppointment.service.name}
                    onChange={(e) => {
                      const service = services.find(s => s.name === e.target.value);
                      handleInputChange('service', service);
                    }}
                  >
                    {services.map(service => (
                      <option key={service.id} value={service.name}>
                        {service.name} — R$ {service.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Profissional</label>
                  <select
                    value={editedAppointment.professional.name}
                    onChange={(e) => {
                      const professional = professionals.find(p => p.name === e.target.value);
                      handleInputChange('professional', professional);
                    }}
                  >
                    {professionals.map(pro => (
                      <option key={pro.id} value={pro.name}>
                        {pro.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input
                    type="text"
                    value={editedAppointment.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Horário</label>
                  <input
                    type="text"
                    value={editedAppointment.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {mode === 'view' ? (
            <>
              <button className="modal-button secondary-button" onClick={handleEdit}>
                Editar Reserva
              </button>
              {appointment.status === 'agendado' && (
                <>
                  <button className="modal-button secondary-button" onClick={handleCancelClick}>
                    Cancelar
                  </button>
                  <button className="modal-button primary-button" onClick={handleCompleteClick}>
                    Concluir Corte
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="modal-button secondary-button" onClick={handleBack}>
                ← Voltar
              </button>
              <button className="modal-button primary-button" onClick={handleSave}>
                Salvar Alterações
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
