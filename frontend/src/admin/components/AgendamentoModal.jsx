import { useState } from 'react';
import { atualizarStatusAgendamento, nomeDoAgendamento } from '../api/agendamentos';
import { diaDaSemana, formatarDataBR, formatarInstante } from '../../utils/datas';
import { exibirTelefone } from '../../utils/telefone';
import AdminModal from './AdminModal';
import StatusBadge from './StatusBadge';

const PAGAMENTOS = { pix: 'Pix', cartao: 'Cartão', presencial: 'No salão' };

const Linha = ({ rotulo, children }) => (
  <div className="d-flex justify-content-between gap-3 py-2 border-bottom">
    <span className="text-secondary">{rotulo}</span>
    <span className="text-end fw-semibold">{children}</span>
  </div>
);

/** Detalhes de um agendamento e o cancelamento (nunca apaga). Concluir é o botão da própria linha na Agenda do dia. */
const AgendamentoModal = ({ agendamento: a, onClose, onChanged }) => {
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const ativo = a.status === 'agendado';
  const digitosWhatsApp = a.cliente?.telefone.replace(/\D/g, '');

  const cancelar = async () => {
    setErro('');
    setSalvando(true);
    try {
      await atualizarStatusAgendamento(a.id, 'cancelado');
      onChanged('Agendamento cancelado.');
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title="Detalhes do agendamento"
      onClose={onClose}
      footer={
        confirmandoCancelamento ? (
          <>
            <span className="me-auto">Cancelar este agendamento? O horário será liberado.</span>
            <button className="btn btn-outline-secondary" disabled={salvando} onClick={() => setConfirmandoCancelamento(false)}>
              Voltar
            </button>
            <button className="btn btn-danger" disabled={salvando} onClick={cancelar}>
              {salvando ? 'Cancelando…' : 'Confirmar cancelamento'}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-outline-secondary" onClick={onClose}>
              Fechar
            </button>
            {ativo && (
              <button className="btn btn-outline-danger" onClick={() => setConfirmandoCancelamento(true)}>
                Cancelar agendamento
              </button>
            )}
          </>
        )
      }
    >
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}
      {a.solicitacaoPendente && (
        <div className="alert alert-warning" role="status">
          <b>O cliente pediu o cancelamento:</b> “{a.solicitacaoPendente.motivo}”. Responda na lista de pedidos da Agenda.
        </div>
      )}
      <Linha rotulo="Cliente">{nomeDoAgendamento(a)}</Linha>
      {a.cliente ? (
        <Linha rotulo="WhatsApp">
          <a href={`https://wa.me/${digitosWhatsApp}`} target="_blank" rel="noreferrer">
            {exibirTelefone(a.cliente.telefone)}
          </a>
        </Linha>
      ) : (
        <Linha rotulo="Origem">Reserva manual</Linha>
      )}
      <Linha rotulo="Serviço">{a.servico.nome}</Linha>
      <Linha rotulo="Dia">
        {diaDaSemana(a.data)} · {formatarDataBR(a.data)} às {a.hora}
      </Linha>
      <Linha rotulo="Duração">{a.duracaoMinutos} min</Linha>
      <Linha rotulo="Valor">R$ {a.preco.toFixed(2)}</Linha>
      <Linha rotulo="Pagamento">{PAGAMENTOS[a.pagamento]}</Linha>
      <Linha rotulo="Status">
        <StatusBadge status={a.status} />
      </Linha>
      <div className="small text-secondary pt-2">Registrado em {formatarInstante(a.criadoEm)}</div>
    </AdminModal>
  );
};

export default AgendamentoModal;
