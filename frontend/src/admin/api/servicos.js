// Gestão de serviços no painel. Excluir apaga de vez; se o serviço já teve agendamentos, o servidor só o inativa.
import { request } from '../../api/http';

const doApi = (s) => ({
  id: s.id,
  name: s.nome,
  description: s.descricao ?? '',
  price: s.preco,
  duration: s.duracaoMinutos,
  status: s.ativo ? 'ativo' : 'inativo',
});

const paraApi = (v) => ({
  ...(v.name !== undefined ? { nome: v.name } : {}),
  ...(v.description !== undefined ? { descricao: v.description } : {}),
  ...(v.price !== undefined ? { preco: v.price } : {}),
  ...(v.duration !== undefined ? { duracaoMinutos: v.duration } : {}),
  ...(v.status !== undefined ? { ativo: v.status === 'ativo' } : {}),
});

export const listarServicos = async () => (await request('/admin/servicos')).map(doApi);

export const criarServico = async (valores) =>
  doApi(await request('/admin/servicos', { method: 'POST', body: JSON.stringify(paraApi(valores)) }));

export const atualizarServico = async (id, valores) =>
  doApi(await request(`/admin/servicos/${id}`, { method: 'PATCH', body: JSON.stringify(paraApi(valores)) }));

/** Retorna `{ excluido }`: false quando tinha agendamentos e apenas foi inativado. */
export const excluirServico = (id) => request(`/admin/servicos/${id}`, { method: 'DELETE' });
