// Moderação das avaliações no painel. "Ocultar" tira do site (dá para mostrar de novo); nada é apagado aqui.
import { request } from '../../api/http';

/** situacao: 'todas' | 'visiveis' | 'ocultas'. Devolve `{ total, pagina, limite, itens }`. */
export const listarAvaliacoes = ({ pagina = 1, limite = 10, situacao = 'todas' } = {}) =>
  request(`/admin/avaliacoes?pagina=${pagina}&limite=${limite}&situacao=${situacao}`);

export const definirPublicacao = (id, publicada) =>
  request(`/admin/avaliacoes/${id}`, { method: 'PATCH', body: JSON.stringify({ publicada }) });
