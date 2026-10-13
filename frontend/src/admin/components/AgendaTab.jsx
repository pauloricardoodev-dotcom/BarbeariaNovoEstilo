import { useEffect, useState } from 'react';
import {
  atualizarStatusAgendamento,
  listarAgendamentos,
  listarSolicitacoesPendentes,
} from '../api/agendamentos';
import PageHeader from './PageHeader';
import Calendar from './Calendar';
import DailySchedule from './DailySchedule';
import AgendamentoModal from './AgendamentoModal';
import CreateReservationModal from './CreateReservationModal';
import SolicitacoesCancelamento from './SolicitacoesCancelamento';

const pad = (n) => String(n).padStart(2, '0');

/** Primeiro e último dia do mês, 'AAAA-MM-DD', para buscar só o que o calendário mostra. */
const limitesDoMes = ({ y, m }) => ({
  de: `${y}-${pad(m + 1)}-01`,
  ate: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
});

// Agenda ligada à API: agendamentos do mês, pedidos de cancelamento pendentes e reserva manual.
const AgendaTab = () => {
  const [mes, setMes] = useState(() => {
    const hoje = new Date();
    return { y: hoje.getFullYear(), m: hoje.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('calendar'); // 'calendar' ou 'day'
  const [agendamentos, setAgendamentos] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [concluindoId, setConcluindoId] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [reserva, setReserva] = useState(null); // null = fechado | { data }

  // Recarrega ao trocar de mês e depois de qualquer alteração (recarga++).
  useEffect(() => {
    let cancelado = false;
    Promise.all([listarAgendamentos(limitesDoMes(mes)), listarSolicitacoesPendentes()])
      .then(([lista, pendentes]) => {
        if (cancelado) return;
        setAgendamentos(lista);
        setSolicitacoes(pendentes);
        setErro('');
      })
      .catch((err) => !cancelado && setErro(err.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [mes, recarga]);

  const aposMudanca = (mensagem) => {
    setSelecionado(null);
    setReserva(null);
    setSucesso(mensagem);
    setRecarga((n) => n + 1);
  };

  // Botão "Feito" da agenda do dia: conclui o atendimento sem abrir o modal.
  const handleFeito = async (agendamento) => {
    setErro('');
    setConcluindoId(agendamento.id);
    try {
      await atualizarStatusAgendamento(agendamento.id, 'concluido');
      aposMudanca('Atendimento concluído.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setConcluindoId(null);
    }
  };

  const handleDateSelect = (data) => {
    setSelectedDate(data);
    setView('day');
  };

  const handleBackToCalendar = () => {
    setView('calendar');
    setSelectedDate(null);
  };

  return (
    <div>
      {view === 'calendar' ? (
        <PageHeader title="Agenda" subtitle="Gerencie seus agendamentos">
          <button className="btn btn-primary" onClick={() => setReserva({ data: '' })}>
            + Criar Reserva Manual
          </button>
        </PageHeader>
      ) : (
        <PageHeader>
          <button className="btn btn-outline-secondary" onClick={handleBackToCalendar}>
            ← Voltar
          </button>
        </PageHeader>
      )}

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

      <SolicitacoesCancelamento solicitacoes={solicitacoes} onDecidida={aposMudanca} />

      {carregando && <p className="text-secondary">Carregando agenda…</p>}

      {view === 'calendar' ? (
        <Calendar mes={mes} onMonthChange={setMes} onDateSelect={handleDateSelect} appointments={agendamentos} />
      ) : (
        <DailySchedule
          date={selectedDate}
          appointments={agendamentos}
          concluindoId={concluindoId}
          onFeito={handleFeito}
          onAppointmentClick={setSelecionado}
          onCreateReservation={(data) => setReserva({ data })}
        />
      )}

      {selecionado && (
        <AgendamentoModal agendamento={selecionado} onClose={() => setSelecionado(null)} onChanged={aposMudanca} />
      )}

      {reserva && (
        <CreateReservationModal
          dataInicial={reserva.data}
          onClose={() => setReserva(null)}
          onCreated={aposMudanca}
        />
      )}
    </div>
  );
};

export default AgendaTab;
