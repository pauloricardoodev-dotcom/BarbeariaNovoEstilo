import { useState } from 'react';
import PageHeader from './PageHeader';
import ReagendamentosNovos from './ReagendamentosNovos';
import SolicitacoesCancelamento from './SolicitacoesCancelamento';

/**
 * Central de notificações: pedidos de cancelamento (o barbeiro decide) e reagendamentos dos clientes
 * (só avisam, sem aprovação).
 */
const NotificacoesTab = ({ solicitacoes, reagendamentos, erro, onMudou }) => {
  const [sucesso, setSucesso] = useState('');

  const handleDecidida = (mensagem) => {
    setSucesso(`${mensagem} O cliente será avisado pelo WhatsApp.`);
    onMudou();
  };

  return (
    <div>
      <PageHeader title="Notificações" subtitle="Pedidos de cancelamento e reagendamentos dos clientes" />

      {sucesso && (
        <div className="alert alert-success" role="status">
          {sucesso}
        </div>
      )}
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {solicitacoes.length === 0 && reagendamentos.length === 0 && (
        <div className="card">
          <div className="card-body text-secondary fst-italic">Nenhuma notificação por enquanto.</div>
        </div>
      )}

      <SolicitacoesCancelamento solicitacoes={solicitacoes} onDecidida={handleDecidida} />
      <ReagendamentosNovos reagendamentos={reagendamentos} onMudou={onMudou} />
    </div>
  );
};

export default NotificacoesTab;
