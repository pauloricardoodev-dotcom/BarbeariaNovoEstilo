import { useEffect, useState } from 'react';
import { atualizarServico, criarServico, excluirServico, listarServicos } from '../api/servicos';
import AdminModal from './AdminModal';
import PageHeader from './PageHeader';
import StatusBadge from './StatusBadge';

const EMPTY_FORM = { name: '', description: '', price: '', duration: '', status: 'ativo' };

const ServicesTab = () => {
  const [servicesList, setServicesList] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelado = false;
    listarServicos()
      .then((lista) => !cancelado && setServicesList(lista))
      .catch((err) => !cancelado && setErro(err.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, []);

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
    setAviso('');
    setModal('delete');
  };

  const handleCloseModal = () => {
    setErro('');
    setModal(null);
    setSelectedService(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.duration) {
      return;
    }

    const values = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration, 10),
      status: formData.status
    };

    setErro('');
    setSalvando(true);
    try {
      if (modal === 'create') {
        const criado = await criarServico(values);
        setServicesList((lista) => [...lista, criado]);
      } else {
        const atualizado = await atualizarServico(selectedService.id, values);
        setServicesList((lista) => lista.map((s) => (s.id === atualizado.id ? atualizado : s)));
      }
      handleCloseModal();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Serviço que nunca foi agendado é apagado; com agendamentos o servidor só o inativa (histórico íntegro).
  const handleDeleteConfirm = async () => {
    setErro('');
    setSalvando(true);
    try {
      const { excluido } = await excluirServico(selectedService.id);
      if (excluido) {
        setServicesList((lista) => lista.filter((s) => s.id !== selectedService.id));
      } else {
        // Já teve agendamentos: o servidor só inativou, para não perder o histórico.
        setServicesList((lista) => lista.map((s) => (s.id === selectedService.id ? { ...s, status: 'inativo' } : s)));
        setAviso(`"${selectedService.name}" tem agendamentos no histórico e não pode ser apagado; ele foi inativado e não aparece mais no site.`);
      }
      handleCloseModal();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div>
      <PageHeader title="Serviços" subtitle="Gerencie os serviços oferecidos">
        <button className="btn btn-primary" onClick={handleCreate}>+ Adicionar Serviço</button>
      </PageHeader>

      {erro && !modal && <div className="alert alert-danger" role="alert">{erro}</div>}
      {aviso && <div className="alert alert-warning" role="alert">{aviso}</div>}
      {carregando && <p className="text-secondary">Carregando serviços…</p>}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Serviço</th>
                <th className="d-none d-md-table-cell">Descrição</th>
                <th className="d-none d-md-table-cell">Duração</th>
                <th>Preço</th>
                <th className="d-none d-md-table-cell">Status</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicesList.map(service => (
                // Clicar na linha abre a edição (por isso o botão Editar some no celular).
                <tr key={service.id} className={`servico-linha ${service.status === 'inativo' ? 'servico-inativo' : ''}`} onClick={() => handleEdit(service)}>
                  <td className="fw-semibold">
                    {service.name}
                    <div className="small fw-normal text-secondary d-md-none">{service.duration} min</div>
                  </td>
                  <td className="text-secondary small d-none d-md-table-cell">{service.description}</td>
                  <td className="d-none d-md-table-cell">{service.duration} min</td>
                  <td className="fw-semibold text-nowrap">R$ {service.price.toFixed(2)}</td>
                  <td className="d-none d-md-table-cell">
                    <StatusBadge
                      status={service.status === 'ativo' ? 'agendado' : 'cancelado'}
                      label={service.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />
                  </td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-secondary me-2 d-none d-md-inline-block" onClick={(e) => { e.stopPropagation(); handleEdit(service); }}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); handleDelete(service); }}>
                      Excluir
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
              <button className="btn btn-primary" onClick={handleSubmit} disabled={salvando}>
                {modal === 'create' ? 'Salvar Serviço' : 'Salvar Alterações'}
              </button>
            </>
          }
        >
          {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
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
          title="Excluir este serviço?"
          onClose={handleCloseModal}
          showClose={false}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={handleCloseModal}>Voltar</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm} disabled={salvando}>Excluir</button>
            </>
          }
        >
          {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
          <p className="mb-0">"{selectedService?.name}" será apagado de vez. Se já tiver agendamentos no histórico, ele não pode ser apagado: nesse caso será apenas inativado (some do site, e você pode reativá-lo em Editar).</p>
        </AdminModal>
      )}
    </div>
  );
};

export default ServicesTab;
