import { useState } from 'react';
import { TIMES_MANHA, TIMES_TARDE } from '../../data/constants';

const CreateReservationModal = ({ onClose, onSubmit, professionals, services, appointments }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    service: services[0],
    professional: professionals[0],
    date: '',
    time: ''
  });
  const [showExtraTime, setShowExtraTime] = useState(false);
  const [extraTime, setExtraTime] = useState('');
  const [error, setError] = useState('');

  const availableTimes = [...TIMES_MANHA, ...TIMES_TARDE];

  const getAvailableSlots = (date) => {
    if (!date) return availableTimes;
    
    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const formattedDate = date.split('-').reverse().join('/');
    
    const occupiedTimes = appointments
      .filter(apt => apt.date === formattedDate && apt.status !== 'cancelado')
      .map(apt => apt.time);
    
    return availableTimes.filter(time => !occupiedTimes.includes(time));
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const handleSubmit = () => {
    if (!formData.clientName || !formData.clientPhone || !formData.date || !formData.time) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const formattedDate = formData.date.split('-').reverse().join('/');

    const newAppointment = {
      id: Date.now(),
      date: formattedDate,
      time: formData.time,
      client: {
        name: formData.clientName,
        phone: formData.clientPhone,
        initials: formData.clientName.split(' ').map(n => n[0]).join('').toUpperCase()
      },
      service: formData.service,
      professional: formData.professional,
      status: 'agendado'
    };

    onSubmit(newAppointment);
  };

  const handleAddExtraTime = () => {
    if (!extraTime) {
      setError('Informe um horário válido.');
      return;
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(extraTime)) {
      setError('Formato de horário inválido. Use HH:MM');
      return;
    }

    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const formattedDate = formData.date.split('-').reverse().join('/');

    // Check if this time is already occupied
    const conflict = appointments.find(
      apt => apt.date === formattedDate && 
             apt.time === extraTime &&
             apt.status !== 'cancelado'
    );

    if (conflict) {
      setError('Este horário já está ocupado.');
      return;
    }

    setFormData({ ...formData, time: extraTime });
    setShowExtraTime(false);
    setExtraTime('');
    setError('');
  };

  const availableSlots = getAvailableSlots(formData.date);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Nova reserva</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="edit-form">
            <div className="detail-section">
              <div className="detail-section-title">Cliente</div>
              <div className="form-group">
                <label>Nome completo *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  placeholder="(44) 99999-9999"
                />
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Serviço</div>
              <div className="services-grid">
                {services.map(service => (
                  <div
                    key={service.id}
                    className={`service-option ${formData.service.id === service.id ? 'selected' : ''}`}
                    onClick={() => handleInputChange('service', service)}
                  >
                    <div className="service-option-name">{service.name}</div>
                    <div className="service-option-price">R$ {service.price}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Profissional</div>
              <div className="form-group">
                <select
                  value={formData.professional.id}
                  onChange={(e) => {
                    const professional = professionals.find(p => p.id === parseInt(e.target.value));
                    handleInputChange('professional', professional);
                  }}
                >
                  {professionals.map(pro => (
                    <option key={pro.id} value={pro.id}>
                      {pro.name} — {pro.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Data</div>
              <div className="form-group">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Horário</div>
              {!showExtraTime ? (
                <>
                  <div className="time-grid">
                    {availableSlots.map(time => (
                      <div
                        key={time}
                        className={`time-slot-option ${formData.time === time ? 'selected' : ''}`}
                        onClick={() => handleInputChange('time', time)}
                      >
                        {time}
                      </div>
                    ))}
                  </div>
                  <button
                    className="extra-time-btn"
                    onClick={() => setShowExtraTime(true)}
                  >
                    + Adicionar horário extra
                  </button>
                </>
              ) : (
                <div className="extra-time-input">
                  <input
                    type="text"
                    value={extraTime}
                    onChange={(e) => setExtraTime(e.target.value)}
                    placeholder="HH:MM (ex: 18:30)"
                  />
                  <button className="modal-button primary-button" onClick={handleAddExtraTime}>
                    Adicionar
                  </button>
                  <button className="modal-button secondary-button" onClick={() => setShowExtraTime(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-button secondary-button" onClick={onClose}>
            ← Voltar
          </button>
          <button className="modal-button primary-button" onClick={handleSubmit}>
            Criar Reserva
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateReservationModal;
