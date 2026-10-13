// Configurações públicas da barbearia (GET /api/configuracoes): contato, expediente e política de agendamento.
import { request } from './http';

export const buscarConfiguracoes = () => request('/configuracoes');
