import { useState } from 'react';
import AdminModal from './AdminModal';
import StatusBadge from './StatusBadge';

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
      <AdminModal
        title="Cancelar este agendamento?"
        onClose={onClose}
        showClose={false}
        footer={
          <>
            <button className="btn btn-outline-secondary" onClick={handleBack}>Voltar</button>
            <button className="btn btn-primary" onClick={handleConfirmCancel}>Confirmar Cancelamento</button>
          </>
        }
      >
        <p className="mb-0">Esta ação irá liberar o horário na agenda.</p>
      </AdminModal>
    );
  }

  if (mode === 'confirm-complete') {
    return (
      <AdminModal
        title="Concluir este atendimento?"
        onClose={onClose}
        showClose={false}
        footer={
          <>
            <button className="btn btn-outline-secondary" onClick={handleBack}>Voltar</button>
            <button className="btn btn-primary" onClick={handleConfirmComplete}>Confirmar Conclusão</button>
          </>
        }
      >
        <p className="mb-0">Este atendimento será marcado como concluído e o valor será contabilizado no faturamento.</p>
      </AdminModal>
    );
  }

  const footer = mode === 'view' ? (
    <>
      <button className="btn btn-outline-secondary" onClick={handleEdit}>Editar Reserva</button>
      {appointment.status === 'agendado' && (
        <>
          <button className="btn btn-outline-secondary" onClick={handleCancelClick}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCompleteClick}>Concluir Corte</button>
        </>
      )}
    </>
  ) : (
    <>
      <button className="btn btn-outline-secondary" onClick={handleBack}>← Voltar</button>
      <button className="btn btn-primary" onClick={handleSave}>Salvar Alterações</button>
    </>
  );

  return (
    <AdminModal
      title={mode === 'edit' ? 'Editar Reserva' : appointment.client.name}
      onClose={onClose}
      footer={footer}
    >
      {mode === 'view' ? (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="avatar-circle">{appointment.client.initials}</div>
            <div>
              <div className="fw-semibold">{appointment.client.name}</div>
              <div className="text-secondary small">{appointment.client.phone}</div>
            </div>
          </div>

          <div>
            <div className="section-label">Serviço</div>
            <div className="card card-body py-2 flex-row justify-content-between">
              <span>{appointment.service.name}</span>
              <span className="fw-semibold">R$ {appointment.service.price.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <div className="section-label">Profissional</div>
            <div className="card card-body py-2">
              <div className="fw-semibold">{appointment.professional.name}</div>
              <div className="text-secondary small">{appointment.professional.role}</div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-6">
              <div className="section-label">Data</div>
              <div>{appointment.date}</div>
            </div>
            <div className="col-6">
              <div className="section-label">Horário</div>
              <div>{appointment.time}</div>
            </div>
          </div>

          <div>
            <div className="section-label">Status</div>
            <StatusBadge status={appointment.status} />
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {error && (
            <div className="col-12">
              <div className="alert alert-danger py-2 mb-0">{error}</div>
            </div>
          )}

          <div className="col-12">
            <label className="form-label">Nome do Cliente</label>
            <input
              type="text"
              className="form-control"
              value={editedAppointment.client.name}
              onChange={(e) => handleInputChange('client', { ...editedAppointment.client, name: e.target.value })}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Telefone</label>
            <input
              type="text"
              className="form-control"
              value={editedAppointment.client.phone}
              onChange={(e) => handleInputChange('client', { ...editedAppointment.client, phone: e.target.value })}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Serviço</label>
            <select
              className="form-select"
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

          <div className="col-md-6">
            <label className="form-label">Profissional</label>
            <select
              className="form-select"
              value={editedAppointment.professional.name}
              onChange={(e) => {
                const professional = professionals.find(p => p.name === e.target.value);
                handleInputChange('professional', professional);
              }}
            >
              {professionals.map(pro => (
                <option key={pro.id} value={pro.name}>{pro.name}</option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Data</label>
            <input
              type="text"
              className="form-control"
              value={editedAppointment.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Horário</label>
            <input
              type="text"
              className="form-control"
              value={editedAppointment.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
            />
          </div>
        </div>
      )}
    </AdminModal>
  );
};

export default AppointmentModal;
