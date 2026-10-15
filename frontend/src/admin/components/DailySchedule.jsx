import { useState } from 'react';
import { MONTHS, WEEKDAYS } from '../../data/constants';
import { nomeDoAgendamento } from '../api/agendamentos';
import BloqueioDia, { FaixaDiaFechado } from './BloqueioDia';
import PagamentoBadge from './PagamentoBadge';
import PixCobrancaModal from './PixCobrancaModal';
import StatusBadge from './StatusBadge';

const pad = (n) => String(n).padStart(2, '0');

/** Primeiras palavras do nome: "Paulo Ricardo da Silva" -> "Paulo Ricardo" (no celular, só "Paulo"). */
const abreviarNome = (nome, palavras = 2) => nome.trim().split(/\s+/).slice(0, palavras).join(' ');

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
const DailySchedule = ({ date, dia, appointments, concluindoId, onAppointmentClick, onCreateReservation, onFeito, onDiaAlterado }) => {
  // "Agora" fixado ao abrir; o servidor confere de novo (só conclui atendimento que já começou).
  const [agora] = useState(() => Date.now());
  // Agendamento em dinheiro cujo cliente decidiu pagar com Pix no salão.
  const [cobrandoPix, setCobrandoPix] = useState(null);

  const formatDate = (chave) => {
    const [ano, mes, dia] = chave.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    return `${WEEKDAYS[d.getDay()]}, ${pad(dia)} DE ${MONTHS[mes - 1].toUpperCase()}`;
  };

  const doDia = appointments
    .filter((a) => a.data === date)
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const ativos = doDia.filter((a) => a.status === 'agendado').length;

  return (
    <>
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h2 className="h5 mb-0 calendar-title">{formatDate(date)}</h2>
        <button
          className="btn btn-primary btn-sm"
          disabled={!!dia?.fechado}
          title={dia?.fechado ? 'Dia fechado: desbloqueie o dia para criar uma reserva' : undefined}
          onClick={() => onCreateReservation(date)}
        >
          + Criar Reserva Manual
        </button>
      </div>

      {dia?.fechado && <FaixaDiaFechado dia={dia} ativos={ativos} />}

      {doDia.length === 0 ? (
        <div className="card-body text-secondary fst-italic">Nenhum agendamento neste dia.</div>
      ) : (
        <div className="list-group list-group-flush">
          {doDia.map((a) => {
            const jaComecou = new Date(a.inicio).getTime() <= agora;
            const concluido = a.status === 'concluido';
            // Agendado mostra a forma de pagamento; concluído e cancelado seguem mostrando o status.
            const selo = a.status === 'agendado' ? <PagamentoBadge pagamento={a.pagamento} /> : <StatusBadge status={a.status} />;
            return (
              <div
                key={a.id}
                className={`list-group-item d-flex flex-wrap align-items-center gap-2 agenda-linha ${concluido ? 'agenda-feito' : ''} ${a.status === 'cancelado' ? 'agenda-cancelado' : ''}`}
              >
                <button
                  type="button"
                  className="agenda-linha-principal d-flex align-items-start gap-2 gap-md-3"
                  onClick={() => onAppointmentClick(a)}
                >
                  <span className="agenda-lateral">
                    {/* Celular: o selo de pagamento/status fica em cima do horário. */}
                    <span className="d-md-none agenda-lateral-selo">{selo}</span>
                    <span className="time-slot fw-semibold">{a.hora}</span>
                  </span>
                  {/* Grade: texto à esquerda, botão Pix centralizado na altura do card, selo e valor à direita. */}
                  <div className="flex-grow-1 agenda-info">
                    <span className="fw-semibold agenda-texto agenda-nome agenda-info-nome">
                      <span className="d-none d-md-inline">{abreviarNome(nomeDoAgendamento(a))}</span>
                      <span className="d-md-none">{abreviarNome(nomeDoAgendamento(a), 1)}</span>
                      {!a.cliente && <span className="text-secondary fw-normal"> · reserva manual</span>}
                    </span>
                    {a.status === 'agendado' && a.pagamento === 'presencial' && (
                      // span (e não button): já estamos dentro do botão que abre o agendamento.
                      <span
                        role="button"
                        tabIndex={0}
                        className="agenda-pix"
                        title="Cliente quer pagar com Pix? Gerar QR Code"
                        aria-label="Gerar QR Code Pix"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCobrandoPix(a);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setCobrandoPix(a);
                          }
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden='true'>
                          <path d="M2 2h5v5H2V2zm1 1v3h3V3H3zm6-1h5v5H9V2zm1 1v3h3V3h-3zM2 9h5v5H2V9zm1 1v3h3v-3H3zm6 0h2v2H9v-2zm3 0h2v2h-2v-2zm-3 3h2v1H9v-1zm3 0h2v1h-2v-1z" />
                        </svg>
                      </span>
                    )}
                    <span className="d-none d-md-flex flex-wrap gap-2 align-items-center justify-content-end agenda-info-selo">{selo}</span>
                    <span className="agenda-texto small agenda-info-servico">
                      {a.servico.nome}
                      <span className="d-none d-md-inline">
                        {' '}· {a.hora}–{somarMinutos(a.hora, a.duracaoMinutos)} ({a.duracaoMinutos} min)
                      </span>
                    </span>
                    <span className="d-none d-md-inline fw-semibold small agenda-info-preco">R$ {a.preco.toFixed(2)}</span>
                    {a.solicitacaoPendente && (
                      <span className="badge rounded-pill text-bg-warning agenda-info-aviso">Cancelamento solicitado</span>
                    )}
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

    {cobrandoPix && <PixCobrancaModal agendamento={cobrandoPix} onClose={() => setCobrandoPix(null)} />}

    <BloqueioDia key={date} data={date} dia={dia} ativos={ativos} onChanged={onDiaAlterado} />
    </>
  );
};

export default DailySchedule;
