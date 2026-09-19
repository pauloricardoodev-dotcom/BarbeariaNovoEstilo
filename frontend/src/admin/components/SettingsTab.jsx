const SettingsTab = () => {
  return (
    <div className="admin-content">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Configure os parâmetros do sistema</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="table-card">
          <div className="modal-body">
            <div className="edit-form">
              <div className="detail-section">
                <div className="detail-section-title">Informações da Barbearia</div>
                <div className="form-group">
                  <label>Nome da Barbearia</label>
                  <input
                    type="text"
                    defaultValue="Barbearia Novo Estilo"
                    placeholder="Nome da barbearia"
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    defaultValue="(44) 99999-9999"
                    placeholder="(44) 99999-9999"
                  />
                </div>
                <div className="form-group">
                  <label>Endereço</label>
                  <input
                    type="text"
                    defaultValue="Rua Principal, 123 - Centro"
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="form-group">
                  <label>Horário de Funcionamento</label>
                  <input
                    type="text"
                    defaultValue="Seg - Sáb: 09:00 - 18:00"
                    placeholder="Horário de funcionamento"
                  />
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Horários Disponíveis</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Horários da Manhã</label>
                    <input
                      type="text"
                      defaultValue="09:00, 09:30, 10:00, 10:30, 11:00, 11:30"
                      placeholder="Horários separados por vírgula"
                    />
                  </div>
                  <div className="form-group">
                    <label>Horários da Tarde</label>
                    <input
                      type="text"
                      defaultValue="14:00, 14:30, 15:00, 15:30, 16:00, 16:30"
                      placeholder="Horários separados por vírgula"
                    />
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Políticas de Agendamento</div>
                <div className="form-group">
                  <label>Tempo mínimo para agendamento (horas)</label>
                  <input
                    type="number"
                    defaultValue="2"
                    min="0"
                    max="24"
                  />
                </div>
                <div className="form-group">
                  <label>Tempo máximo para agendamento (dias)</label>
                  <input
                    type="number"
                    defaultValue="30"
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Notificações</div>
                <div className="form-group">
                  <label>Email de notificações</label>
                  <input
                    type="email"
                    defaultValue="contato@barbearianovoestilo.com"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label>Enviar lembretes de agendamento</label>
                  <select defaultValue="sim">
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="modal-button secondary-button">
              Cancelar
            </button>
            <button className="modal-button primary-button">
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;