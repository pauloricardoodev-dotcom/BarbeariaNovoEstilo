import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import { EmailService, WhatsAppService } from './mensagens.types.js';
import {
  EmailResendService,
  WhatsAppCloudApiService,
} from './provedores-http.js';
import { EmailLogService, WhatsAppLogService } from './provedores-log.js';

function emProducao(config: ConfigService<Env, true>): boolean {
  return config.get('NODE_ENV', { infer: true }) === 'production';
}

@Global()
@Module({
  providers: [
    {
      provide: EmailService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): EmailService => {
        if (config.get('EMAIL_PROVEDOR', { infer: true }) === 'resend') {
          return new EmailResendService({
            RESEND_API_KEY: config.get('RESEND_API_KEY', { infer: true }),
            EMAIL_REMETENTE: config.get('EMAIL_REMETENTE', { infer: true }),
          });
        }
        if (emProducao(config)) {
          new Logger('Email').warn(
            'EMAIL_PROVEDOR=log em produção: e-mails não serão enviados.',
          );
        }
        return new EmailLogService(!emProducao(config));
      },
    },
    {
      provide: WhatsAppService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): WhatsAppService => {
        if (config.get('WHATSAPP_PROVEDOR', { infer: true }) === 'cloud_api') {
          return new WhatsAppCloudApiService({
            WHATSAPP_TOKEN: config.get('WHATSAPP_TOKEN', { infer: true }),
            WHATSAPP_PHONE_NUMBER_ID: config.get('WHATSAPP_PHONE_NUMBER_ID', {
              infer: true,
            }),
            WHATSAPP_TEMPLATE_VERIFICACAO: config.get(
              'WHATSAPP_TEMPLATE_VERIFICACAO',
              { infer: true },
            ),
            WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO: config.get(
              'WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO',
              { infer: true },
            ),
            WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO: config.get(
              'WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO',
              { infer: true },
            ),
            WHATSAPP_TEMPLATE_REAGENDAMENTO: config.get(
              'WHATSAPP_TEMPLATE_REAGENDAMENTO',
              { infer: true },
            ),
            WHATSAPP_TEMPLATE_IDIOMA: config.get('WHATSAPP_TEMPLATE_IDIOMA', {
              infer: true,
            }),
            WHATSAPP_API_VERSAO: config.get('WHATSAPP_API_VERSAO', {
              infer: true,
            }),
          });
        }
        if (emProducao(config)) {
          new Logger('WhatsApp').warn(
            'WHATSAPP_PROVEDOR=log em produção: códigos não serão enviados.',
          );
        }
        return new WhatsAppLogService(!emProducao(config));
      },
    },
  ],
  exports: [EmailService, WhatsAppService],
})
export class MensagensModule {}
