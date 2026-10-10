// Sessão do admin. O token fica num cookie httpOnly definido pelo backend;
// o JavaScript nunca o lê — só pergunta ao servidor quem está logado.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(response.status, message || 'Erro inesperado. Tente novamente.');
  }
  return body;
};

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
