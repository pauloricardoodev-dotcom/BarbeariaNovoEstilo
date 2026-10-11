// Cliente HTTP da API (/api, proxy do Vite em dev; mesmo domínio em produção).
// As sessões ficam em cookies httpOnly definidos pelo backend; o JavaScript nunca os lê.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const request = async (path, options = {}) => {
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
