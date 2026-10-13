// Agendamentos do cliente logado e consulta pública de horários livres.
// As regras (janela, 2 h, expediente) valem no servidor; o front só espelha para guiar a escolha.
import { request } from './http';

const post = (path, corpo) => request(path, { method: 'POST', body: JSON.stringify(corpo) });

/** Horários livres de um dia para um serviço: { data, horarios: ['08:00', ...] }. */
export const consultarDisponibilidade = ({ data, servicoId }) =>
  request(`/disponibilidade?data=${encodeURIComponent(data)}&servicoId=${encodeURIComponent(servicoId)}`);

export const listarMeusAgendamentos = () => request('/clientes/me/agendamentos');

/** pagamento: 'pix' | 'cartao' | 'presencial'. */
export const criarAgendamento = ({ servicoId, data, hora, pagamento }) =>
  post('/clientes/me/agendamentos', { servicoId, data, hora, pagamento });

export const reagendarAgendamento = (id, { data, hora }) =>
  post(`/clientes/me/agendamentos/${id}/reagendar`, { data, hora });

export const solicitarCancelamento = (id, motivo) =>
  post(`/clientes/me/agendamentos/${id}/solicitar-cancelamento`, { motivo });
