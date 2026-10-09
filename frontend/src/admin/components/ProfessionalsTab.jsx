import { useState } from 'react';
import { professionals } from '../data/mockData';
import AdminModal from './AdminModal';
import PageHeader from './PageHeader';
import StatusBadge from './StatusBadge';

const EMPTY_FORM = { name: '', role: '', initials: '', status: 'ativo' };

const generateInitials = (name) =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const ProfessionalsTab = () => {
  const [professionalsList, setProfessionalsList] = useState(professionals);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleCreate = () => {
    setFormData(EMPTY_FORM);
    setModal('create');
  };

  const handleEdit = (professional) => {
    setSelectedProfessional(professional);
    setFormData({
      name: professional.name,
      role: professional.role,
      initials: professional.initials,
      status: professional.status || 'ativo'
    });
    setModal('edit');
  };

  const handleDelete = (professional) => {
    setSelectedProfessional(professional);
    setModal('delete');
  };

  const handleCloseModal = () => {
    setModal(null);
    setSelectedProfessional(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.role || !formData.initials) {
      return;
    }

    if (modal === 'create') {
      setProfessionalsList([...professionalsList, { id: Date.now(), ...formData }]);
    } else {
      setProfessionalsList(
        professionalsList.map(professional =>
          professional.id === selectedProfessional.id
            ? { ...selectedProfessional, ...formData }
            : professional
        )
      );
    }
    handleCloseModal();
  };

  const handleDeleteConfirm = () => {
    setProfessionalsList(professionalsList.filter(professional => professional.id !== selectedProfessional.id));
    handleCloseModal();
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      name,
      initials: name ? generateInitials(name) : formData.initials
    });
  };

  return (
    <div>
      <PageHeader title="Profissionais" subtitle="Gerencie os profissionais da equipe">
        <button className="btn btn-primary" onClick={handleCreate}>+ Adicionar Profissional</button>
      </PageHeader>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Cargo</th>
                <th>Iniciais</th>
                <th>Status</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professionalsList.map(professional => (
                <tr key={professional.id}>
                  <td className="fw-semibold">{professional.name}</td>
                  <td className="text-secondary small">{professional.role}</td>
                  <td><span className="avatar-circle avatar-sm">{professional.initials}</span></td>
                  <td>
                    <StatusBadge
                      status={professional.status === 'ativo' ? 'agendado' : 'cancelado'}
                      label={professional.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />
                  </td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleEdit(professional)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(professional)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <AdminModal
          title={modal === 'create' ? 'Adicionar Profissional' : 'Editar Profissional'}
          onClose={handleCloseModal}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={handleCloseModal}>← Voltar</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {modal === 'create' ? 'Salvar Profissional' : 'Salvar Alterações'}
              </button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Nome do profissional *</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Cargo *</label>
              <input
                type="text"
                className="form-control"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="Ex: Cabeleireiro"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Iniciais *</label>
              <input
                type="text"
                className="form-control"
                value={formData.initials}
                onChange={(e) => handleInputChange('initials', e.target.value)}
                placeholder="Ex: JS"
                maxLength={2}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </AdminModal>
      )}

      {modal === 'delete' && (
        <AdminModal
          title="Remover este profissional?"
          onClose={handleCloseModal}
          showClose={false}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={handleCloseModal}>Voltar</button>
              <button className="btn btn-primary" onClick={handleDeleteConfirm}>Confirmar Remoção</button>
            </>
          }
        >
          <p className="mb-0">Este profissional não aparecerá mais para novos agendamentos.</p>
        </AdminModal>
      )}
    </div>
  );
};

export default ProfessionalsTab;
