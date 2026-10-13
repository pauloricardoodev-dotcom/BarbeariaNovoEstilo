import { useState } from 'react';
import { marcarReagendamentoVisto, marcarTodosReagendamentosVistos } from '../api/agendamentos';
import { diaDaSemana, formatarDataBR, formatarInstante } from '../../utils/datas';

const Quando = ({ dia }) => (
  <b>
    {diaDaSemana(dia.data)} {formatarDataBR(dia.data)} às {dia.hora}
  </b>
);

const Aviso = ({ reagendamento: r, onVisto }) => {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const ver = async () => {
    setErro('');
    setEnviando(true);
    try {
      await marcarReagendamentoVisto(r.id);
      onVisto();
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  };

  return (
    <li className="list-group-item">
      <div className="d-flex flex-wrap justify-content-between gap-2">
        <div className="fw-semibold">{r.agendamento.cliente?.nome ?? 'Cliente'} reagendou</div>
        <div className="small text-secondary">Em {formatarInstante(r.criadoEm)}</div>
      </div>
      <div className="small">{r.agendamento.servicoNome}</div>
      <p className="my-2">
        De <Quando dia={r.de} /> para <Quando dia={r.para} />
      </p>
      {erro && (
        <div className="alert alert-danger py-2" role="alert">
          {erro}
        </div>
      )}
      <button className="btn btn-sm btn-outline-secondary" disabled={enviando} onClick={ver}>
        {enviando ? 'Salvando…' : 'Ok, vi'}
      </button>
    </li>
  );
};

/** Reagendamentos feitos pelos clientes. Não precisam de aprovação: só avisam o barbeiro até ele marcar como visto. */
const ReagendamentosNovos = ({ reagendamentos, onMudou }) => {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  if (reagendamentos.length === 0) return null;

  const verTodos = async () => {
    setErro('');
    setEnviando(true);
    try {
      await marcarTodosReagendamentosVistos();
      onMudou();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="card border-info mb-4">
      <div className="card-header text-bg-info fw-semibold d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>
          {reagendamentos.length === 1
            ? '1 cliente reagendou o horário'
            : `${reagendamentos.length} clientes reagendaram o horário`}
        </span>
        {reagendamentos.length > 1 && (
          <button className="btn btn-sm btn-light" disabled={enviando} onClick={verTodos}>
            Marcar todos como vistos
          </button>
        )}
      </div>
      {erro && (
        <div className="alert alert-danger m-2" role="alert">
          {erro}
        </div>
      )}
      <ul className="list-group list-group-flush">
        {reagendamentos.map((r) => (
          <Aviso key={r.id} reagendamento={r} onVisto={onMudou} />
        ))}
      </ul>
    </div>
  );
};

export default ReagendamentosNovos;
