export const COOKIE_SESSAO = 'ne_admin_sessao';

/** `aud` do JWT do admin. O de cliente usa outra audiência: um token nunca vale no lugar do outro. */
export const AUDIENCIA_ADMIN = 'admin';

/** Rotas marcadas com @Publico() dispensam o JwtAuthGuard global. */
export const CHAVE_PUBLICO = 'rotaPublica';
/** Rotas de cliente (@RotaCliente()) também dispensam o guard do admin: usam o guard de cliente. */
export const CHAVE_ROTA_CLIENTE = 'rotaCliente';
export const CHAVE_PAPEIS = 'papeisPermitidos';
