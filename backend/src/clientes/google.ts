import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../config/env.validation.js';

/** O que o backend aceita do Google: só dados de um ID token verificado. */
export interface IdentidadeGoogle {
  /** Id estável da conta Google (claim `sub`). */
  sub: string;
  /** Sempre minúsculo e com `email_verified = true`. */
  email: string;
  nome: string;
}

/** Abstrato para os testes trocarem a validação do ID token (sem rede). */
export abstract class VerificadorGoogle {
  /** Retorna null se o token for inválido, de outro app, expirado ou com e-mail não verificado. */
  abstract verificar(idToken: string): Promise<IdentidadeGoogle | null>;
}

@Injectable()
export class VerificadorGoogleOficial extends VerificadorGoogle {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  async verificar(idToken: string): Promise<IdentidadeGoogle | null> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    if (!clientId) {
      throw new ServiceUnavailableException(
        'O login com Google não está disponível no momento.',
      );
    }

    try {
      // Confere assinatura (chaves públicas do Google), expiração, emissor e `aud`.
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email || p.email_verified !== true) return null;

      const email = p.email.trim().toLowerCase();
      const nome =
        (p.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120) ||
        email.split('@')[0];
      return { sub: p.sub, email, nome: nome.length >= 2 ? nome : email };
    } catch {
      return null;
    }
  }
}
