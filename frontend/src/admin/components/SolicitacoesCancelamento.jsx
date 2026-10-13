import { useState } from 'react';
import { decidirSolicitacao } from '../api/agendamentos';
import { diaDaSemana, formatarDataBR, formatarInstante } from '../../utils/datas';

const Pedido = ({ solicitacao: s, onDecidida }) => {
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const a = s.agendamento;
  const quem = a.cliente?.nome ?? a.nomeAvulso;

  const decidir = async (aprovar) => {
    setErro('');
    setEnviando(true);
    try {
      await decidirSolicitacao(s.id, { aprovar, resposta: resposta.trim() });
      onDecidida(aprovar ? 'Pedido aprovado: o agendamento foi cancelado.' : 'Pedido recusado: o agendamento foi mantido.');
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  };

  return (
    <li className="list-group-item">
      <div className="d-flex flex-wrap justify-content-between gap-2">
        <div>
          <div className="fw-semibold">{quem}</div>
          <div className="small">
            {a.servicoNome} · {diaDaSemana(a.data)} {formatarDataBR(a.data)} às {a.hora}
          </div>
        </div>
        <div className="small text-secondary">Pedido em {formatarInstante(s.criadaEm)}</div>
      </div>
      <p className="mt-2 mb-2">“{s.motivo}”</p>
      {erro && (
        <div className="alert alert-danger py-2" role="alert">
          {erro}
        </div>
      )}
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <input
          type="text"
          className="form-control form-control-sm flex-grow-1"
          style={{ minWidth: 'min(14rem, 100%)', maxWidth: '24rem' }}
          placeholder="Resposta ao cliente (opcional)"
          maxLength={500}
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          aria-label="Resposta ao cliente"
        />
        <button className="btn btn-sm btn-outline-secondary" disabled={enviando} onClick={() => decidir(false)}>
          Recusar
        </button>
        <button className="btn btn-sm btn-danger" disabled={enviando} onClick={() => decidir(true)}>
          Aprovar cancelamento
        </button>
      </div>
    </li>
  );
};

/** Pedidos de cancelamento pendentes: aprovar cancela o agendamento; recusar mantém. */
const SolicitacoesCancelamento = ({ solicitacoes, onDecidida }) => {
  if (solicitacoes.length === 0) return null;
  return (
    <div className="card border-warning mb-4">
      <div className="card-header text-bg-warning fw-semibold">
        {solicitacoes.length === 1
          ? '1 pedido de cancelamento aguardando resposta'
          : `${solicitacoes.length} pedidos de cancelamento aguardando resposta`}
      </div>
      <ul className="list-group list-group-flush">
        {solicitacoes.map((s) => (
          <Pedido key={s.id} solicitacao={s} onDecidida={onDecidida} />
        ))}
      </ul>
    </div>
  );
};

export default SolicitacoesCancelamento;
