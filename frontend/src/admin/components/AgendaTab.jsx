import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { atualizarStatusAgendamento, listarAgendamentos } from '../api/agendamentos';
import { listarDiasEspeciais } from '../api/dias';
import PageHeader from './PageHeader';
import Calendar from './Calendar';
import DailySchedule from './DailySchedule';
import AgendamentoModal from './AgendamentoModal';
import CreateReservationModal from './CreateReservationModal';

const pad = (n) => String(n).padStart(2, '0');

// A Agenda se atualiza sozinha: reconsulta a API a cada tanto, e ao voltar para a aba/janela.
const INTERVALO_ATUALIZACAO_MS = 15_000;

/** Primeiro e último dia do mês, 'AAAA-MM-DD', para buscar só o que o calendário mostra. */
const limitesDoMes = ({ y, m }) => ({
  de: `${y}-${pad(m + 1)}-01`,
  ate: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
});

// Agenda ligada à API: agendamentos do mês e reserva manual. Os pedidos de cancelamento ficam em Notificações;
// `notificacoes` só alimenta o aviso com link, e `onNotificacoesMudaram` reconsulta o menu quando algo muda aqui.
const AgendaTab = ({ notificacoes = 0, onNotificacoesMudaram }) => {
  const [mes, setMes] = useState(() => {
    const hoje = new Date();
    return { y: hoje.getFullYear(), m: hoje.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('calendar'); // 'calendar' ou 'day'
  const [agendamentos, setAgendamentos] = useState([]);
  // Dias do mês que fogem do "dia comum aberto" (domingos, feriados, fechados e desbloqueados): 'AAAA-MM-DD' -> estado.
  const [dias, setDias] = useState(() => new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [concluindoId, setConcluindoId] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [reserva, setReserva] = useState(null); // null = fechado | { data }

  // Recarrega ao trocar de mês e depois de qualquer alteração (recarga++).
  useEffect(() => {
    let cancelado = false;
    const { de, ate } = limitesDoMes(mes);
    Promise.all([listarAgendamentos({ de, ate }), listarDiasEspeciais(de, ate)])
      .then(([lista, especiais]) => {
        if (cancelado) return;
        setAgendamentos(lista);
        setDias(new Map(especiais.map((d) => [d.data, d])));
        setAtualizadoEm(new Date());
        setErro('');
      })
      .catch((err) => !cancelado && setErro(err.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [mes, recarga]);

  // Mudanças feitas por clientes (agendar, reagendar, pedir cancelamento) aparecem sem recarregar a página.
  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === 'visible') setRecarga((n) => n + 1);
    };
    const id = setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    document.addEventListener('visibilitychange', atualizar);
    window.addEventListener('focus', atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener('focus', atualizar);
    };
  }, []);

  const aposMudanca = (mensagem) => {
    setSelecionado(null);
    setReserva(null);
    setSucesso(mensagem);
    setRecarga((n) => n + 1);
    onNotificacoesMudaram?.();
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

      {notificacoes > 0 && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2" role="status">
          <span>
            {notificacoes === 1 ? 'Você tem 1 notificação nova.' : `Você tem ${notificacoes} notificações novas.`}
          </span>
          <Link to="/admin/notificacoes" className="btn btn-sm btn-warning">
            Ver notificações
          </Link>
        </div>
      )}

      {carregando && <p className="text-secondary">Carregando agenda…</p>}
      {atualizadoEm && (
        <p className="small text-secondary text-end mb-2">
          Atualiza sozinha · última atualização às{' '}
          {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}

      {view === 'calendar' ? (
        <Calendar mes={mes} onMonthChange={setMes} onDateSelect={handleDateSelect} appointments={agendamentos} dias={dias} />
      ) : (
        <DailySchedule
          date={selectedDate}
          dia={dias.get(selectedDate)}
          onDiaAlterado={aposMudanca}
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
