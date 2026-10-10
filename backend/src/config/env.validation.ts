export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SESSAO_DURACAO_SEGUNDOS: number;
  NODE_ENV: string;
}

/** Valida as variáveis de ambiente na subida; falha cedo em vez de rodar sem segredo. */
export function validarEnv(config: Record<string, unknown>): Env {
  const erros: string[] = [];

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    erros.push('DATABASE_URL é obrigatória.');
  }

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    erros.push('JWT_SECRET é obrigatória e deve ter pelo menos 32 caracteres.');
  }

  const duracao = Number(config.SESSAO_DURACAO_SEGUNDOS ?? 28800);
  if (!Number.isInteger(duracao) || duracao <= 0) {
    erros.push('SESSAO_DURACAO_SEGUNDOS deve ser um inteiro positivo.');
  }

  if (erros.length > 0) {
    throw new Error(`Configuração inválida:\n- ${erros.join('\n- ')}`);
  }

  return {
    DATABASE_URL: databaseUrl as string,
    JWT_SECRET: jwtSecret as string,
    SESSAO_DURACAO_SEGUNDOS: duracao,
    NODE_ENV:
      typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development',
  };
}
