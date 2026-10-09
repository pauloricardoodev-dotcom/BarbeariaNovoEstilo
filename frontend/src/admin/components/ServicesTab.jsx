import { useState } from 'react';
import { services } from '../data/mockData';
import AdminModal from './AdminModal';
import PageHeader from './PageHeader';
import StatusBadge from './StatusBadge';

const EMPTY_FORM = { name: '', description: '', price: '', duration: '', status: 'ativo' };

const ServicesTab = () => {
  const [servicesList, setServicesList] = useState(services);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleCreate = () => {
    setFormData(EMPTY_FORM);
    setModal('create');
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
    setModal('edit');
  };

  const handleDelete = (service) => {
    setSelectedService(service);
    setModal('delete');
  };

  const handleCloseModal = () => {
    setModal(null);
    setSelectedService(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.duration) {
      return;
    }

    const values = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      status: formData.status
    };

    if (modal === 'create') {
      setServicesList([...servicesList, { id: Date.now(), ...values }]);
    } else {
      setServicesList(
        servicesList.map(service =>
          service.id === selectedService.id ? { ...selectedService, ...values } : service
        )
      );
    }
    handleCloseModal();
  };

  const handleDeleteConfirm = () => {
    setServicesList(servicesList.filter(service => service.id !== selectedService.id));
    handleCloseModal();
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div>
      <PageHeader title="Serviços" subtitle="Gerencie os serviços oferecidos">
        <button className="btn btn-primary" onClick={handleCreate}>+ Adicionar Serviço</button>
      </PageHeader>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Descrição</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Status</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicesList.map(service => (
                <tr key={service.id}>
                  <td className="fw-semibold">{service.name}</td>
                  <td className="text-secondary small">{service.description}</td>
                  <td>{service.duration} min</td>
                  <td className="fw-semibold">R$ {service.price.toFixed(2)}</td>
                  <td>
                    <StatusBadge
                      status={service.status === 'ativo' ? 'agendado' : 'cancelado'}
                      label={service.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />
                  </td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleEdit(service)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(service)}>
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
          title={modal === 'create' ? 'Adicionar Serviço' : 'Editar Serviço'}
          onClose={handleCloseModal}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={handleCloseModal}>← Voltar</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {modal === 'create' ? 'Salvar Serviço' : 'Salvar Alterações'}
              </button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Nome do serviço *</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Corte Feminino"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Descrição</label>
              <input
                type="text"
                className="form-control"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição do serviço"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Preço *</label>
              <input
                type="number"
                className="form-control"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Duração (min) *</label>
              <input
                type="number"
                className="form-control"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="col-12">
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
          title="Remover este serviço?"
          onClose={handleCloseModal}
          showClose={false}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={handleCloseModal}>Voltar</button>
              <button className="btn btn-primary" onClick={handleDeleteConfirm}>Confirmar Remoção</button>
            </>
          }
        >
          <p className="mb-0">Ele deixará de aparecer para novos agendamentos.</p>
        </AdminModal>
      )}
    </div>
  );
};

export default ServicesTab;
