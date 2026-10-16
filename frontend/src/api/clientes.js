// Conta do cliente (backend: /api/clientes/*). Sessão no cookie httpOnly ne_cliente_sessao.
import { request } from './http';

const post = (path, dados) =>
  request(path, { method: 'POST', body: JSON.stringify(dados ?? {}) });

export const cadastrar = (dados) => post('/clientes/auth/cadastro', dados);

export const entrar = (email, senha) => post('/clientes/auth/login', { email, senha });

/**
 * ID token do Google -> `{ status: 'autenticado', cliente }` ou
 * `{ status: 'cadastro_pendente', nome, email, tokenPendente }` (falta telefone + termos).
 */
export const entrarComGoogle = (credencial) => post('/clientes/auth/google', { credencial });

/** Segunda etapa do primeiro acesso com Google. O aceite dos termos é exigido pelo backend. */
export const completarCadastroGoogle = (tokenPendente, telefone) =>
  post('/clientes/auth/google/completar', { tokenPendente, telefone, aceiteTermos: true });

export const sair = () => post('/clientes/auth/logout');

export const esqueciSenha = (email) => post('/clientes/auth/esqueci-senha', { email });

export const redefinirSenha = (token, novaSenha) =>
  post('/clientes/auth/redefinir-senha', { token, novaSenha });

/** Cliente logado, ou null se não houver sessão válida. */
export const clienteAtual = async () => {
  try {
    return await request('/clientes/me');
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
};

export const atualizarPerfil = (dados) =>
  request('/clientes/me', { method: 'PATCH', body: JSON.stringify(dados) });

export const trocarSenha = (senhaAtual, novaSenha) =>
  post('/clientes/me/senha', { senhaAtual, novaSenha });

/** canal: 'email' | 'telefone' */
export const verificarCodigo = (canal, codigo) =>
  post(canal === 'email' ? '/clientes/me/verificar-email' : '/clientes/me/verificar-telefone', {
    codigo,
  });

export const reenviarCodigo = (canal) => post('/clientes/me/reenviar-codigo', { canal });
