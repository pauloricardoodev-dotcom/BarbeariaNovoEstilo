import { useState } from 'react';
import { services } from '../data/mockData';

const ServicesTab = () => {
  const [servicesList, setServicesList] = useState(services);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    status: 'ativo'
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      status: 'ativo'
    });
    setShowCreateModal(true);
  };

  const handleEdit = (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      status: service.status
    });
    setShowEditModal(true);
  };

  const handleDelete = (service) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      status: 'ativo'
    });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedService(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedService(null);
  };

  const handleCreateSubmit = () => {
    if (!formData.name || !formData.price || !formData.duration) {
      return;
    }

    const newService = {
      id: Date.now(),
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      status: formData.status
    };

    setServicesList([...servicesList, newService]);
    handleCloseCreateModal();
  };

  const handleEditSubmit = () => {
    if (!formData.name || !formData.price || !formData.duration) {
      return;
    }

    const updatedService = {
      ...selectedService,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      status: formData.status
    };

    setServicesList(
      servicesList.map(service =>
        service.id === selectedService.id ? updatedService : service
      )
    );
    handleCloseEditModal();
  };

  const handleDeleteConfirm = () => {
    setServicesList(servicesList.filter(service => service.id !== selectedService.id));
    handleCloseDeleteModal();
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="admin-content">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Serviços</h1>
          <p className="page-subtitle">Gerencie os serviços oferecidos</p>
        </div>
        <div className="page-actions">
          <button className="action-btn primary-btn" onClick={handleCreate}>
            <span className="btn-icon">+</span>
            Adicionar Serviço
          </button>
        </div>
      </div>

      <div className="services-table-section">
        <div className="table-card">
          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Descrição</th>
                  <th>Duração</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {servicesList.map(service => (
                  <tr key={service.id}>
                    <td className="service-cell">
                      <div className="service-name">{service.name}</div>
                    </td>
                    <td>
                      <div className="service-description">{service.description}</div>
                    </td>
                    <td>{service.duration} min</td>
                    <td className="service-cell">
                      <div className="service-price">R$ {service.price.toFixed(2)}</div>
                    </td>
                    <td>
                      <span className={`status-badge status-${service.status === 'ativo' ? 'agendado' : 'cancelado'}`}>
                        {service.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button
                          className="action-button edit-button"
                          onClick={() => handleEdit(service)}
                        >
                          Editar
                        </button>
                        <button
                          className="action-button view-button"
                          onClick={() => handleDelete(service)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adicionar Serviço</h3>
              <button className="modal-close" onClick={handleCloseCreateModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-group">
                  <label>Nome do serviço *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Corte Feminino"
                  />
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descrição do serviço"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Preço *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Duração (min) *</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button secondary-button" onClick={handleCloseCreateModal}>
                ← Voltar
              </button>
              <button className="modal-button primary-button" onClick={handleCreateSubmit}>
                Salvar Serviço
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Serviço</h3>
              <button className="modal-close" onClick={handleCloseEditModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-group">
                  <label>Nome do serviço *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Preço *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Duração (min) *</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button secondary-button" onClick={handleCloseEditModal}>
                ← Voltar
              </button>
              <button className="modal-button primary-button" onClick={handleEditSubmit}>
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleCloseDeleteModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Remover este serviço?</h3>
            </div>
            <div className="modal-body">
              <p>Ele deixará de aparecer para novos agendamentos.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button secondary-button" onClick={handleCloseDeleteModal}>
                Voltar
              </button>
              <button className="modal-button primary-button" onClick={handleDeleteConfirm}>
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesTab;
