// Pagamento online (backend: /api/pagamentos e /api/clientes/me/agendamentos/:id/pagamento).
// O backend decide o valor e confirma o pagamento (webhook); o site só mostra o andamento.
import { request } from './http';

const rota = (id) => `/clientes/me/agendamentos/${id}/pagamento`;

/** `{ online, chavePublica }`: online = cobrança pelo Mercado Pago ligada. Público. */
export const buscarConfigPagamento = () => request('/pagamentos/config');

/** Gera (ou repete) a cobrança Pix: `{ status, valor, pixCopiaCola, expiraEm, agendamento }`. */
export const iniciarPix = (agendamentoId) =>
  request(`${rota(agendamentoId)}/pix`, { method: 'POST', body: '{}' });

/** `dados`: `{ token, metodoId, emissorId? }`. O token vem do SDK do gateway; o cartão nunca passa por nós. */
export const pagarComCartao = (agendamentoId, dados) =>
  request(`${rota(agendamentoId)}/cartao`, { method: 'POST', body: JSON.stringify(dados) });

/** Andamento do pagamento (o servidor reconfere no gateway se ainda estiver pendente). */
export const consultarPagamento = (agendamentoId) => request(rota(agendamentoId));
