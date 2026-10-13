// Agenda do painel: agendamentos, reserva manual e pedidos de cancelamento (rotas /api/admin/*).
// Cancelar nunca apaga: o agendamento fica com status "cancelado".
import { request } from '../../api/http';

const corpo = (dados) => JSON.stringify(dados);

const consulta = (params) => {
  const limpos = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return new URLSearchParams(limpos).toString();
};

/** Todos os agendamentos do período (percorre as páginas de 100). `de`/`ate` em 'AAAA-MM-DD', inclusive. */
export const listarAgendamentos = async ({ de, ate, status } = {}) => {
  const itens = [];
  for (let pagina = 1; ; pagina++) {
    const resposta = await request(`/admin/agendamentos?${consulta({ de, ate, status, pagina, porPagina: 100 })}`);
    itens.push(...resposta.itens);
    if (itens.length >= resposta.total || resposta.itens.length === 0) return itens;
  }
};

/** Reserva manual: só nome, serviço, duração, dia e hora (sem telefone/e-mail nem conta). */
export const criarReservaManual = ({ nome, servicoId, duracaoMinutos, data, hora }) =>
  request('/admin/agendamentos', {
    method: 'POST',
    body: corpo({ nome, servicoId, duracaoMinutos, data, hora }),
  });

/** status: 'concluido' | 'cancelado'. */
export const atualizarStatusAgendamento = (id, status) =>
  request(`/admin/agendamentos/${id}`, { method: 'PATCH', body: corpo({ status }) });

export const listarSolicitacoesPendentes = async () =>
  (await request('/admin/solicitacoes-cancelamento?status=pendente&porPagina=100')).itens;

/** Aprovar cancela o agendamento; recusar mantém. `resposta` é opcional e o cliente a vê. */
export const decidirSolicitacao = (id, { aprovar, resposta }) =>
  request(`/admin/solicitacoes-cancelamento/${id}/decidir`, {
    method: 'POST',
    body: corpo({ aprovar, ...(resposta ? { resposta } : {}) }),
  });

/** Nome a mostrar: cliente do site ou nome informado na reserva manual. */
export const nomeDoAgendamento = (a) => a.cliente?.nome ?? a.nomeAvulso;
