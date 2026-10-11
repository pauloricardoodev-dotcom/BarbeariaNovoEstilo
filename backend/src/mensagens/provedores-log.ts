import { Logger } from '@nestjs/common';
import {
  EmailService,
  WhatsAppService,
  type EmailMensagem,
} from './mensagens.types.js';

// Provedores de desenvolvimento: não enviam nada, só registram no console.
// Em produção o conteúdo (códigos, links) é omitido do log.

export class EmailLogService extends EmailService {
  private readonly logger = new Logger('Email');

  constructor(private readonly mostrarConteudo: boolean) {
    super();
  }

  enviar({ para, assunto, texto }: EmailMensagem): Promise<void> {
    this.logger.warn(
      this.mostrarConteudo
        ? `[não enviado] Para: ${para} | ${assunto}\n${texto}`
        : `[não enviado] EMAIL_PROVEDOR=log — configure um provedor real.`,
    );
    return Promise.resolve();
  }
}

export class WhatsAppLogService extends WhatsAppService {
  private readonly logger = new Logger('WhatsApp');

  constructor(private readonly mostrarConteudo: boolean) {
    super();
  }

  enviarCodigoVerificacao(telefone: string, codigo: string): Promise<void> {
    this.logger.warn(
      this.mostrarConteudo
        ? `[não enviado] Para: ${telefone} | Código de verificação: ${codigo}`
        : `[não enviado] WHATSAPP_PROVEDOR=log — configure a WhatsApp Cloud API.`,
    );
    return Promise.resolve();
  }
}
