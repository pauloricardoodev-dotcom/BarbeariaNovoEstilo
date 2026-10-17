import { createContext, useContext } from 'react';

/**
 * { status: 'carregando' | 'anonimo' | 'logado' | 'erro', cliente, definirCliente, sair, recarregar }
 * A proteção real é do backend; o contexto só decide o que mostrar.
 */
export const SessaoClienteContext = createContext(null);

export const useSessaoCliente = () => useContext(SessaoClienteContext);

/** Cliente com e-mail e telefone confirmados (exigido para agendar). */
export const contaVerificada = (cliente) =>
  Boolean(cliente?.emailVerificado && cliente?.telefoneVerificado);

/**
 * Destino de volta depois do login (?voltar=/caminho). Só caminhos internos:
 * evita que um link malicioso mande o cliente para outro site.
 */
export const destinoSeguro = (valor, padrao = '/') =>
  typeof valor === 'string' && /^\/(?![/\\])/.test(valor) ? valor : padrao;

/**
 * Telas que nunca são destino de volta do login. "Sair" só existe em Minha conta, então o
 * próximo login voltaria para lá e o cliente acharia que precisa alterar algo no perfil.
 */
const SEM_VOLTA_APOS_LOGIN = ['/minha-conta', '/verificar'];

/** Para onde ir depois de entrar: conta ainda não verificada passa antes pela verificação. */
export const destinoAposLogin = (cliente, voltar) => {
  const caminho = voltar.split(/[?#]/)[0];
  const destino = SEM_VOLTA_APOS_LOGIN.includes(caminho) ? '/' : voltar;
  return contaVerificada(cliente) ? destino : `/verificar?voltar=${encodeURIComponent(destino)}`;
};
