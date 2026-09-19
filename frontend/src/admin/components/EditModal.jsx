import { useState } from 'react';
import { statusLabels } from '../data/mockData';

const EditModal = ({ appointment, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    date: appointment?.date || '',
    time: appointment?.time || '',
    clientName: appointment?.client.name || '',
    clientPhone: appointment?.client.phone || '',
    serviceName: appointment?.service.name || '',
    servicePrice: appointment?.service.price || '',
    professionalName: appointment?.professional.name || '',
    status: appointment?.status || 'pending'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Agendamento</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Data</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="time">Horário</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientName">Nome do Cliente</label>
            <input
              type="text"
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="clientPhone">Telefone do Cliente</label>
            <input
              type="tel"
              id="clientPhone"
              name="clientPhone"
              value={formData.clientPhone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serviceName">Serviço</label>
              <input
                type="text"
                id="serviceName"
                name="serviceName"
                value={formData.serviceName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="servicePrice">Preço (R$)</label>
              <input
                type="number"
                id="servicePrice"
                name="servicePrice"
                value={formData.servicePrice}
                onChange={handleChange}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="professionalName">Profissional</label>
            <input
              type="text"
              id="professionalName"
              name="professionalName"
              value={formData.professionalName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="confirmed">{statusLabels.confirmed}</option>
              <option value="pending">{statusLabels.pending}</option>
              <option value="in_progress">{statusLabels.in_progress}</option>
              <option value="completed">{statusLabels.completed}</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-button secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-button primary-button">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;