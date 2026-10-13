import type { Env } from '../config/env.validation.js';
import {
  EmailService,
  FalhaEnvioError,
  WhatsAppService,
  type AvisoCancelamento,
  type AvisoReagendamento,
  type EmailMensagem,
} from './mensagens.types.js';

const TIMEOUT_MS = 10_000;

async function postarJson(
  url: string,
  token: string,
  corpo: unknown,
): Promise<void> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (erro) {
    throw new FalhaEnvioError(`Falha de rede: ${(erro as Error).message}`);
  }
  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new FalhaEnvioError(
      `HTTP ${resposta.status}: ${detalhe.slice(0, 500)}`,
    );
  }
}

/** https://resend.com/docs/api-reference/emails/send-email */
export class EmailResendService extends EmailService {
  constructor(
    private readonly env: Pick<Env, 'RESEND_API_KEY' | 'EMAIL_REMETENTE'>,
  ) {
    super();
  }

  enviar({ para, assunto, texto }: EmailMensagem): Promise<void> {
    return postarJson(
      'https://api.resend.com/emails',
      this.env.RESEND_API_KEY,
      {
        from: this.env.EMAIL_REMETENTE,
        to: [para],
        subject: assunto,
        text: texto,
      },
    );
  }
}

/**
 * WhatsApp Cloud API (Meta). Mensagens iniciadas pela empresa exigem um template
 * aprovado; para códigos, um template da categoria "Autenticação" com botão
 * "copiar código" — o código vai no corpo e no parâmetro do botão.
 */
export class WhatsAppCloudApiService extends WhatsAppService {
  constructor(
    private readonly env: Pick<
      Env,
      | 'WHATSAPP_TOKEN'
      | 'WHATSAPP_PHONE_NUMBER_ID'
      | 'WHATSAPP_TEMPLATE_VERIFICACAO'
      | 'WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO'
      | 'WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO'
      | 'WHATSAPP_TEMPLATE_REAGENDAMENTO'
      | 'WHATSAPP_TEMPLATE_IDIOMA'
      | 'WHATSAPP_API_VERSAO'
    >,
  ) {
    super();
  }

  private get url(): string {
    return `https://graph.facebook.com/${this.env.WHATSAPP_API_VERSAO}/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  /**
   * Template (categoria "Utilidade") com 3 variáveis no corpo, nesta ordem:
   * {{1}} serviço · {{2}} nova data · {{3}} nova hora.
   */
  enviarAvisoReagendamento(
    telefone: string,
    aviso: AvisoReagendamento,
  ): Promise<void> {
    const template = this.env.WHATSAPP_TEMPLATE_REAGENDAMENTO;
    if (!template) {
      return Promise.reject(
        new FalhaEnvioError(
          'Template de aviso de reagendamento não configurado (WHATSAPP_TEMPLATE_REAGENDAMENTO).',
        ),
      );
    }
    const texto = (valor: string) => ({ type: 'text', text: valor });
    return postarJson(this.url, this.env.WHATSAPP_TOKEN, {
      messaging_product: 'whatsapp',
      to: telefone.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: this.env.WHATSAPP_TEMPLATE_IDIOMA },
        components: [
          {
            type: 'body',
            parameters: [
              texto(aviso.servico),
              texto(aviso.data),
              texto(aviso.hora),
            ],
          },
        ],
      },
    });
  }

  /**
   * Template (categoria "Utilidade") com 4 variáveis no corpo, nesta ordem:
   * {{1}} serviço · {{2}} data · {{3}} hora · {{4}} mensagem da barbearia ("—" quando não há).
   * Há um template para aprovado e outro para recusado.
   */
  enviarAvisoCancelamento(
    telefone: string,
    aviso: AvisoCancelamento,
  ): Promise<void> {
    const template = aviso.aprovado
      ? this.env.WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO
      : this.env.WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO;
    if (!template) {
      return Promise.reject(
        new FalhaEnvioError(
          'Template de aviso de cancelamento não configurado (WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO/RECUSADO).',
        ),
      );
    }
    const texto = (valor: string) => ({ type: 'text', text: valor });
    return postarJson(this.url, this.env.WHATSAPP_TOKEN, {
      messaging_product: 'whatsapp',
      to: telefone.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: this.env.WHATSAPP_TEMPLATE_IDIOMA },
        components: [
          {
            type: 'body',
            parameters: [
              texto(aviso.servico),
              texto(aviso.data),
              texto(aviso.hora),
              texto(aviso.resposta?.trim() || '—'),
            ],
          },
        ],
      },
    });
  }

  enviarCodigoVerificacao(telefone: string, codigo: string): Promise<void> {
    const url = this.url;
    return postarJson(url, this.env.WHATSAPP_TOKEN, {
      messaging_product: 'whatsapp',
      to: telefone.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: this.env.WHATSAPP_TEMPLATE_VERIFICACAO,
        language: { code: this.env.WHATSAPP_TEMPLATE_IDIOMA },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: codigo }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: codigo }],
          },
        ],
      },
    });
  }
}
