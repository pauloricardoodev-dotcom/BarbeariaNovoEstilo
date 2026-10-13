export type ProvedorEmail = 'log' | 'resend';
export type ProvedorWhatsApp = 'log' | 'cloud_api';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SESSAO_DURACAO_SEGUNDOS: number;
  SESSAO_CLIENTE_DURACAO_SEGUNDOS: number;
  NODE_ENV: string;
  /** Base dos links enviados por e-mail (ex.: redefinição de senha). */
  FRONTEND_URL: string;
  EMAIL_PROVEDOR: ProvedorEmail;
  EMAIL_REMETENTE: string;
  RESEND_API_KEY: string;
  WHATSAPP_PROVEDOR: ProvedorWhatsApp;
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_TEMPLATE_VERIFICACAO: string;
  /** Opcionais: sem eles o aviso de cancelamento não é enviado (e só fica no log). */
  WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO: string;
  WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO: string;
  WHATSAPP_TEMPLATE_REAGENDAMENTO: string;
  WHATSAPP_TEMPLATE_IDIOMA: string;
  WHATSAPP_API_VERSAO: string;
}

function texto(valor: unknown, padrao = ''): string {
  return typeof valor === 'string' && valor.trim().length > 0
    ? valor.trim()
    : padrao;
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

  // Padrão: 30 dias.
  const duracaoCliente = Number(
    config.SESSAO_CLIENTE_DURACAO_SEGUNDOS ?? 2_592_000,
  );
  if (!Number.isInteger(duracaoCliente) || duracaoCliente <= 0) {
    erros.push('SESSAO_CLIENTE_DURACAO_SEGUNDOS deve ser um inteiro positivo.');
  }

  const nodeEnv = texto(config.NODE_ENV, 'development');
  const producao = nodeEnv === 'production';

  const frontendUrl = texto(
    config.FRONTEND_URL,
    producao ? '' : 'http://localhost:5173',
  ).replace(/\/+$/, '');
  if (!/^https?:\/\/\S+$/.test(frontendUrl)) {
    erros.push('FRONTEND_URL é obrigatória (ex.: https://novoestilo.com.br).');
  }

  const emailProvedor = texto(config.EMAIL_PROVEDOR, 'log');
  const emailRemetente = texto(config.EMAIL_REMETENTE);
  const resendApiKey = texto(config.RESEND_API_KEY);
  if (emailProvedor !== 'log' && emailProvedor !== 'resend') {
    erros.push('EMAIL_PROVEDOR deve ser "log" ou "resend".');
  } else if (emailProvedor === 'resend' && (!resendApiKey || !emailRemetente)) {
    erros.push('EMAIL_PROVEDOR=resend exige RESEND_API_KEY e EMAIL_REMETENTE.');
  }

  const whatsappProvedor = texto(config.WHATSAPP_PROVEDOR, 'log');
  const whatsappToken = texto(config.WHATSAPP_TOKEN);
  const whatsappPhoneId = texto(config.WHATSAPP_PHONE_NUMBER_ID);
  const whatsappTemplate = texto(config.WHATSAPP_TEMPLATE_VERIFICACAO);
  if (whatsappProvedor !== 'log' && whatsappProvedor !== 'cloud_api') {
    erros.push('WHATSAPP_PROVEDOR deve ser "log" ou "cloud_api".');
  } else if (
    whatsappProvedor === 'cloud_api' &&
    (!whatsappToken || !whatsappPhoneId || !whatsappTemplate)
  ) {
    erros.push(
      'WHATSAPP_PROVEDOR=cloud_api exige WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_TEMPLATE_VERIFICACAO.',
    );
  }

  if (erros.length > 0) {
    throw new Error(`Configuração inválida:\n- ${erros.join('\n- ')}`);
  }

  return {
    DATABASE_URL: databaseUrl as string,
    JWT_SECRET: jwtSecret as string,
    SESSAO_DURACAO_SEGUNDOS: duracao,
    SESSAO_CLIENTE_DURACAO_SEGUNDOS: duracaoCliente,
    NODE_ENV: nodeEnv,
    FRONTEND_URL: frontendUrl,
    EMAIL_PROVEDOR: emailProvedor as ProvedorEmail,
    EMAIL_REMETENTE: emailRemetente,
    RESEND_API_KEY: resendApiKey,
    WHATSAPP_PROVEDOR: whatsappProvedor as ProvedorWhatsApp,
    WHATSAPP_TOKEN: whatsappToken,
    WHATSAPP_PHONE_NUMBER_ID: whatsappPhoneId,
    WHATSAPP_TEMPLATE_VERIFICACAO: whatsappTemplate,
    WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO: texto(
      config.WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO,
    ),
    WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO: texto(
      config.WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO,
    ),
    WHATSAPP_TEMPLATE_REAGENDAMENTO: texto(config.WHATSAPP_TEMPLATE_REAGENDAMENTO),
    WHATSAPP_TEMPLATE_IDIOMA: texto(config.WHATSAPP_TEMPLATE_IDIOMA, 'pt_BR'),
    WHATSAPP_API_VERSAO: texto(config.WHATSAPP_API_VERSAO, 'v23.0'),
  };
}
