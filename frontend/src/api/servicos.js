// Catálogo público de serviços (só os ativos). Mantém o formato que o site já usa.
import { request } from './http';

export const listarServicos = async () => {
  const servicos = await request('/servicos');
  return servicos.map((s) => ({
    id: s.id,
    name: s.nome,
    description: s.descricao,
    price: s.preco,
    duration: s.duracaoMinutos,
  }));
};
