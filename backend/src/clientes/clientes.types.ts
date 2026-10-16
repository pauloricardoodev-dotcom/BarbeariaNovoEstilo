export const COOKIE_SESSAO_CLIENTE = 'ne_cliente_sessao';
export const AUDIENCIA_CLIENTE = 'cliente';
/** Token curto do "cadastro pendente" do Google; nunca vale como sessão (aud diferente). */
export const AUDIENCIA_GOOGLE_PENDENTE = 'cliente-google-pendente';
export const DURACAO_GOOGLE_PENDENTE_SEGUNDOS = 600;

/** Versão do texto de termos/privacidade aceito no cadastro. Trocar quando o texto definitivo entrar. */
export const TERMOS_VERSAO_ATUAL = '2026-10-11-provisorio';

/** Dados do cliente logado expostos à API e ao frontend (sem credenciais). */
export interface ClienteAutenticado {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  emailVerificado: boolean;
  telefoneVerificado: boolean;
  /** false em conta só-Google: o front não pede "senha atual" e oferece criar uma senha. */
  temSenha: boolean;
}

export interface PayloadJwtCliente {
  sub: string;
  /** `versao_sessao` do cliente na emissão; se mudar no banco, o token deixa de valer. */
  ver: number;
}

export interface PayloadGooglePendente {
  sub: string;
  email: string;
  nome: string;
}

export type ResultadoGoogle =
  | { status: 'autenticado'; sessao: { cliente: ClienteAutenticado; token: string } }
  | {
      status: 'cadastro_pendente';
      nome: string;
      email: string;
      tokenPendente: string;
    };

export const SELECAO_SESSAO = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  emailVerificadoEm: true,
  telefoneVerificadoEm: true,
  versaoSessao: true,
  // Só para virar o booleano `temSenha`; o hash nunca sai de paraClienteAutenticado.
  senhaHash: true,
} as const;

export function paraClienteAutenticado(c: {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  emailVerificadoEm: Date | null;
  telefoneVerificadoEm: Date | null;
  senhaHash: string | null;
}): ClienteAutenticado {
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    emailVerificado: c.emailVerificadoEm !== null,
    telefoneVerificado: c.telefoneVerificadoEm !== null,
    temSenha: c.senhaHash !== null,
  };
}
