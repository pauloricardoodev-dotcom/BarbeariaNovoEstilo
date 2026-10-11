// Sessão do admin. O token fica num cookie httpOnly definido pelo backend;
// o JavaScript nunca o lê — só pergunta ao servidor quem está logado.
import { request } from '../../api/http';

export { ApiError } from '../../api/http';

export const login = (email, senha) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });

/** Usuário logado, ou null se não houver sessão válida. */
export const getCurrentUser = async () => {
  try {
    return await request('/auth/me');
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
};

export const logout = () => request('/auth/logout', { method: 'POST' });
