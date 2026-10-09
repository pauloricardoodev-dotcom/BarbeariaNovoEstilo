import { useState } from 'react';
import { TIMES_MANHA, TIMES_TARDE } from '../../data/constants';
import AdminModal from './AdminModal';

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
    <AdminModal
      title="Nova reserva"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose}>← Voltar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Criar Reserva</button>
        </>
      }
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="section-label">Cliente</div>
      <div className="row g-3 mb-4">
        <div className="col-12">
          <label className="form-label">Nome completo *</label>
          <input
            type="text"
            className="form-control"
            value={formData.clientName}
            onChange={(e) => handleInputChange('clientName', e.target.value)}
            placeholder="Nome do cliente"
          />
        </div>
        <div className="col-12">
          <label className="form-label">Telefone *</label>
          <input
            type="text"
            className="form-control"
            value={formData.clientPhone}
            onChange={(e) => handleInputChange('clientPhone', e.target.value)}
            placeholder="(44) 99999-9999"
          />
        </div>
      </div>

      <div className="section-label">Serviço</div>
      <div className="row g-2 mb-4">
        {services.map(service => (
          <div key={service.id} className="col-6">
            <button
              type="button"
              className={`btn w-100 text-start ${formData.service.id === service.id ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => handleInputChange('service', service)}
            >
              <div className="fw-semibold">{service.name}</div>
              <div className="small">R$ {service.price}</div>
            </button>
          </div>
        ))}
      </div>

      <div className="section-label">Profissional</div>
      <select
        className="form-select mb-4"
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

      <div className="section-label">Data</div>
      <input
        type="date"
        className="form-control mb-4"
        value={formData.date}
        onChange={(e) => handleInputChange('date', e.target.value)}
      />

      <div className="section-label">Horário</div>
      {!showExtraTime ? (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {availableSlots.map(time => (
              <button
                type="button"
                key={time}
                className={`btn btn-sm ${formData.time === time ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleInputChange('time', time)}
              >
                {time}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setShowExtraTime(true)}>
            + Adicionar horário extra
          </button>
        </>
      ) : (
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            value={extraTime}
            onChange={(e) => setExtraTime(e.target.value)}
            placeholder="HH:MM (ex: 18:30)"
          />
          <button className="btn btn-primary" onClick={handleAddExtraTime}>Adicionar</button>
          <button className="btn btn-outline-secondary" onClick={() => setShowExtraTime(false)}>Cancelar</button>
        </div>
      )}
    </AdminModal>
  );
};

export default CreateReservationModal;
