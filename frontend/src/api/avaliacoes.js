// Avaliações (backend: /api/avaliacoes e /api/clientes/me/avaliacao). Aparecem no site assim que enviadas.
import { request } from './http';

/** Lista pública, mais recentes primeiro: `{ media, total, pagina, limite, itens }`. */
export const listarAvaliacoes = (pagina = 1, limite = 9) =>
  request(`/avaliacoes?pagina=${pagina}&limite=${limite}`);

/** Avaliação do cliente logado, ou null. */
export const minhaAvaliacao = () => request('/clientes/me/avaliacao');

/** `fotos`: lista de File/Blob (até 3). O Content-Type do multipart é definido pelo navegador. */
export const enviarAvaliacao = ({ nota, comentario, fotos }) => {
  const corpo = new FormData();
  corpo.append('nota', String(nota));
  corpo.append('comentario', comentario);
  fotos.forEach((foto, i) => corpo.append('fotos', foto, `foto-${i + 1}.jpg`));
  return request('/clientes/me/avaliacao', { method: 'POST', body: corpo, headers: {} });
};

export const apagarMinhaAvaliacao = () => request('/clientes/me/avaliacao', { method: 'DELETE' });
