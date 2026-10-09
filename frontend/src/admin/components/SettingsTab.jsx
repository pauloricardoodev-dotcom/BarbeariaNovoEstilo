import PageHeader from './PageHeader';

const SettingsTab = () => {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Configure os parâmetros do sistema" />

      <div className="card">
        <div className="card-body p-3 p-md-4">
          <div className="section-label">Informações da Barbearia</div>
          <div className="row g-3 mb-4">
            <div className="col-12">
              <label className="form-label">Nome da Barbearia</label>
              <input type="text" className="form-control" defaultValue="Barbearia Novo Estilo" placeholder="Nome da barbearia" />
            </div>
            <div className="col-12">
              <label className="form-label">Telefone</label>
              <input type="text" className="form-control" defaultValue="(44) 99999-9999" placeholder="(44) 99999-9999" />
            </div>
            <div className="col-12">
              <label className="form-label">Endereço</label>
              <input type="text" className="form-control" defaultValue="Rua Principal, 123 - Centro" placeholder="Endereço completo" />
            </div>
            <div className="col-12">
              <label className="form-label">Horário de Funcionamento</label>
              <input type="text" className="form-control" defaultValue="Seg - Sáb: 09:00 - 18:00" placeholder="Horário de funcionamento" />
            </div>
          </div>

          <div className="section-label">Horários Disponíveis</div>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">Horários da Manhã</label>
              <input
                type="text"
                className="form-control"
                defaultValue="09:00, 09:30, 10:00, 10:30, 11:00, 11:30"
                placeholder="Horários separados por vírgula"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Horários da Tarde</label>
              <input
                type="text"
                className="form-control"
                defaultValue="14:00, 14:30, 15:00, 15:30, 16:00, 16:30"
                placeholder="Horários separados por vírgula"
              />
            </div>
          </div>

          <div className="section-label">Políticas de Agendamento</div>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">Tempo mínimo para agendamento (horas)</label>
              <input type="number" className="form-control" defaultValue="2" min="0" max="24" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Tempo máximo para agendamento (dias)</label>
              <input type="number" className="form-control" defaultValue="30" min="1" max="365" />
            </div>
          </div>

          <div className="section-label">Notificações</div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Email de notificações</label>
              <input
                type="email"
                className="form-control"
                defaultValue="contato@barbearianovoestilo.com"
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Enviar lembretes de agendamento</label>
              <select className="form-select" defaultValue="sim">
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end gap-2 py-3">
          <button className="btn btn-outline-secondary">Cancelar</button>
          <button className="btn btn-primary">Salvar Configurações</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
