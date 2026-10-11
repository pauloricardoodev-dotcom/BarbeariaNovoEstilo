export interface EmailMensagem {
  para: string;
  assunto: string;
  texto: string;
}

/** Erro ao falar com o provedor; a mensagem é só para log, nunca para o usuário. */
export class FalhaEnvioError extends Error {}

/** Envio de e-mails transacionais. Implementação escolhida por EMAIL_PROVEDOR. */
export abstract class EmailService {
  abstract enviar(mensagem: EmailMensagem): Promise<void>;
}

/** Envio de mensagens por WhatsApp. Implementação escolhida por WHATSAPP_PROVEDOR. */
export abstract class WhatsAppService {
  /** `telefone` em E.164. */
  abstract enviarCodigoVerificacao(
    telefone: string,
    codigo: string,
  ): Promise<void>;
}
