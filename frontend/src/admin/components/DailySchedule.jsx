import { useState } from 'react';
import { MONTHS, WEEKDAYS } from '../../data/constants';
import { nomeDoAgendamento } from '../api/agendamentos';
import PagamentoBadge from './PagamentoBadge';
import StatusBadge from './StatusBadge';

const pad = (n) => String(n).padStart(2, '0');

/** 'HH:mm' + minutos -> 'HH:mm' (o expediente nunca passa da meia-noite). */
const somarMinutos = (hora, minutos) => {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

/**
 * Agendamentos de um dia ('AAAA-MM-DD'), em ordem de horário.
 * "Feito" marca o atendimento como concluído e o cliente fica riscado na lista.
 */
const DailySchedule = ({ date, appointments, concluindoId, onAppointmentClick, onCreateReservation, onFeito }) => {
  // "Agora" fixado ao abrir; o servidor confere de novo (só conclui atendimento que já começou).
  const [agora] = useState(() => Date.now());

  const formatDate = (chave) => {
    const [ano, mes, dia] = chave.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    return `${WEEKDAYS[d.getDay()]}, ${pad(dia)} DE ${MONTHS[mes - 1].toUpperCase()}`;
  };

  const doDia = appointments
    .filter((a) => a.data === date)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h2 className="h5 mb-0 calendar-title">{formatDate(date)}</h2>
        <button className="btn btn-primary btn-sm" onClick={() => onCreateReservation(date)}>
          + Criar Reserva Manual
        </button>
      </div>

      {doDia.length === 0 ? (
        <div className="card-body text-secondary fst-italic">Nenhum agendamento neste dia.</div>
      ) : (
        <div className="list-group list-group-flush">
          {doDia.map((a) => {
            const jaComecou = new Date(a.inicio).getTime() <= agora;
            const concluido = a.status === 'concluido';
            return (
              <div
                key={a.id}
                className={`list-group-item d-flex flex-wrap align-items-center gap-2 agenda-linha ${concluido ? 'agenda-feito' : ''} ${a.status === 'cancelado' ? 'agenda-cancelado' : ''}`}
              >
                <button
                  type="button"
                  className="agenda-linha-principal d-flex align-items-start gap-3"
                  onClick={() => onAppointmentClick(a)}
                >
                  <span className="time-slot fw-semibold">{a.hora}</span>
                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <span className="fw-semibold agenda-texto agenda-nome">
                        {nomeDoAgendamento(a)}
                        {!a.cliente && <span className="text-secondary fw-normal"> · reserva manual</span>}
                      </span>
                      <span className="d-flex flex-wrap gap-2 align-items-center">
                        {a.solicitacaoPendente && (
                          <span className="badge rounded-pill text-bg-warning">Cancelamento solicitado</span>
                        )}
                        {/* Agendado mostra a forma de pagamento; concluído e cancelado seguem mostrando o status. */}
                        {a.status === 'agendado' ? (
                          <PagamentoBadge pagamento={a.pagamento} />
                        ) : (
                          <StatusBadge status={a.status} />
                        )}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap justify-content-between column-gap-3 small">
                      <span className="agenda-texto">
                        {a.servico.nome} · {a.hora}–{somarMinutos(a.hora, a.duracaoMinutos)} ({a.duracaoMinutos} min)
                      </span>
                      <span className="fw-semibold">R$ {a.preco.toFixed(2)}</span>
                    </div>
                  </div>
                </button>
                {a.status === 'agendado' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success agenda-concluir"
                    disabled={!jaComecou || concluindoId === a.id}
                    title={jaComecou ? undefined : 'Disponível quando o atendimento começar'}
                    onClick={() => onFeito(a)}
                  >
                    {concluindoId === a.id ? 'Salvando…' : 'Marcar como concluído'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailySchedule;
