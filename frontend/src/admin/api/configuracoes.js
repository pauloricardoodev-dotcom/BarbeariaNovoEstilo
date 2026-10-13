// Configurações da barbearia no painel (GET/PUT /api/admin/configuracoes). O PUT substitui tudo.
import { request } from '../../api/http';

export const buscarConfiguracoes = () => request('/admin/configuracoes');

export const salvarConfiguracoes = (dados) =>
  request('/admin/configuracoes', { method: 'PUT', body: JSON.stringify(dados) });
