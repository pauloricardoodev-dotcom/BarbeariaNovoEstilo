import { useState } from 'react';
import { professionals } from '../data/mockData';

const ProfessionalsTab = () => {
  const [professionalsList, setProfessionalsList] = useState(professionals);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    initials: '',
    status: 'ativo'
  });

  const handleCreate = () => {
    setFormData({
      name: '',
      role: '',
      initials: '',
      status: 'ativo'
    });
    setShowCreateModal(true);
  };

  const handleEdit = (professional) => {
    setSelectedProfessional(professional);
    setFormData({
      name: professional.name,
      role: professional.role,
      initials: professional.initials,
      status: professional.status || 'ativo'
    });
    setShowEditModal(true);
  };

  const handleDelete = (professional) => {
    setSelectedProfessional(professional);
    setShowDeleteModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      name: '',
      role: '',
      initials: '',
      status: 'ativo'
    });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedProfessional(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedProfessional(null);
  };

  const handleCreateSubmit = () => {
    if (!formData.name || !formData.role || !formData.initials) {
      return;
    }

    const newProfessional = {
      id: Date.now(),
      name: formData.name,
      role: formData.role,
      initials: formData.initials,
      status: formData.status
    };

    setProfessionalsList([...professionalsList, newProfessional]);
    handleCloseCreateModal();
  };

  const handleEditSubmit = () => {
    if (!formData.name || !formData.role || !formData.initials) {
      return;
    }

    const updatedProfessional = {
      ...selectedProfessional,
      name: formData.name,
      role: formData.role,
      initials: formData.initials,
      status: formData.status
    };

    setProfessionalsList(
      professionalsList.map(professional =>
        professional.id === selectedProfessional.id ? updatedProfessional : professional
      )
    );
    handleCloseEditModal();
  };

  const handleDeleteConfirm = () => {
    setProfessionalsList(professionalsList.filter(professional => professional.id !== selectedProfessional.id));
    handleCloseDeleteModal();
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const generateInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    handleInputChange('name', name);
    if (name) {
      handleInputChange('initials', generateInitials(name));
    }
  };

  return (
    <div className="admin-content">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Profissionais</h1>
          <p className="page-subtitle">Gerencie os profissionais da equipe</p>
        </div>
        <div className="page-actions">
          <button className="action-btn primary-btn" onClick={handleCreate}>
            <span className="btn-icon">+</span>
            Adicionar Profissional
          </button>
        </div>
      </div>

      <div className="services-table-section">
        <div className="table-card">
          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Cargo</th>
                  <th>Iniciais</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {professionalsList.map(professional => (
                  <tr key={professional.id}>
                    <td className="service-cell">
                      <div className="service-name">{professional.name}</div>
                    </td>
                    <td>
                      <div className="service-description">{professional.role}</div>
                    </td>
                    <td className="service-cell">
                      <div className="professional-initials">{professional.initials}</div>
                    </td>
                    <td>
                      <span className={`status-badge status-${professional.status === 'ativo' ? 'agendado' : 'cancelado'}`}>
                        {professional.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button
                          className="action-button edit-button"
                          onClick={() => handleEdit(professional)}
                        >
                          Editar
                        </button>
                        <button
                          className="action-button view-button"
                          onClick={() => handleDelete(professional)}
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
              <h3 className="modal-title">Adicionar Profissional</h3>
              <button className="modal-close" onClick={handleCloseCreateModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-group">
                  <label>Nome do profissional *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="form-group">
                  <label>Cargo *</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="Ex: Cabeleireiro"
                  />
                </div>
                <div className="form-group">
                  <label>Iniciais *</label>
                  <input
                    type="text"
                    value={formData.initials}
                    onChange={(e) => handleInputChange('initials', e.target.value)}
                    placeholder="Ex: JS"
                    maxLength={2}
                  />
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
                Salvar Profissional
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Profissional</h3>
              <button className="modal-close" onClick={handleCloseEditModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-group">
                  <label>Nome do profissional *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                  />
                </div>
                <div className="form-group">
                  <label>Cargo *</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Iniciais *</label>
                  <input
                    type="text"
                    value={formData.initials}
                    onChange={(e) => handleInputChange('initials', e.target.value)}
                    maxLength={2}
                  />
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
              <h3 className="modal-title">Remover este profissional?</h3>
            </div>
            <div className="modal-body">
              <p>Este profissional não aparecerá mais para novos agendamentos.</p>
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

export default ProfessionalsTab;