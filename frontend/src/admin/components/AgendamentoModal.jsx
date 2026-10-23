import { useState } from 'react';
import { atualizarStatusAgendamento, nomeDoAgendamento, reagendarAgendamento } from '../api/agendamentos';
import { diaDaSemana, formatarDataBR, formatarInstante, paraChave } from '../../utils/datas';
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

/**
 * Detalhes de um agendamento, reagendamento e cancelamento (nunca apaga).
 * Concluir é o botão da própria linha na Agenda do dia.
 */
const AgendamentoModal = ({ agendamento: a, onClose, onChanged }) => {
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  // "Reagendamento": o barbeiro escolhe o novo dia e hora; o servidor confere expediente e conflito e avisa o cliente.
  const [trocando, setTrocando] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  // "Agora" fixado ao abrir; o servidor confere de novo.
  const [agora] = useState(() => Date.now());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const ativo = a.status === 'agendado';
  const podeTrocar = ativo && new Date(a.inicio).getTime() > agora;
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

  const salvarReagendamento = async () => {
    setErro('');
    setSalvando(true);
    try {
      await reagendarAgendamento(a.id, { data: novaData, hora: novaHora });
      onChanged('Reagendamento feito. O cliente foi avisado pelo WhatsApp.');
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
        trocando ? (
          <>
            <button className="btn btn-outline-secondary" disabled={salvando} onClick={() => setTrocando(false)}>
              Voltar
            </button>
            <button className="btn btn-primary" disabled={salvando || !novaData || !novaHora} onClick={salvarReagendamento}>
              {salvando ? 'Salvando…' : 'Salvar reagendamento'}
            </button>
          </>
        ) : confirmandoCancelamento ? (
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
            {podeTrocar && (
              <button
                className="btn btn-outline-primary"
                onClick={() => {
                  setErro('');
                  setTrocando(true);
                }}
              >
                Reagendamento
              </button>
            )}
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
          <b>O cliente pediu o cancelamento:</b> “{a.solicitacaoPendente.motivo}”. Responda em Notificações.
        </div>
      )}
      {trocando && (
        <div className="mb-3">
          <h6 className="mb-2">Reagendamento: escolha o novo dia e horário</h6>
          <div className="row g-2">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="troca-data">Novo dia</label>
              <input
                id="troca-data"
                type="date"
                className="form-control"
                min={paraChave(new Date())}
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="troca-hora">Novo horário</label>
              <input
                id="troca-hora"
                type="time"
                className="form-control"
                min="08:00"
                max="18:00"
                step={300}
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
              />
            </div>
          </div>
          <p className="small text-secondary mt-2 mb-0">
            O serviço e a duração ({a.duracaoMinutos} min) continuam os mesmos. Segunda a sábado, das 08:00 às 18:00, e
            sem coincidir com outro horário já marcado. O cliente é avisado do novo horário por WhatsApp.
          </p>
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
      <Linha rotulo="Pagamento">
        {PAGAMENTOS[a.pagamento]}
        {a.pago && ' · pago online'}
        {a.aguardandoPagamento && ' · aguardando pagamento (reserva de poucos minutos)'}
      </Linha>
      <Linha rotulo="Status">
        <StatusBadge status={a.status} />
      </Linha>
      <div className="small text-secondary pt-2">Registrado em {formatarInstante(a.criadoEm)}</div>
    </AdminModal>
  );
};

export default AgendamentoModal;
