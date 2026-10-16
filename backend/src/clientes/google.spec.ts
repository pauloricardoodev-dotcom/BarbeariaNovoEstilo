import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import { VerificadorGoogleOficial } from './google.js';

function verificador(clientId: string) {
  const config = {
    get: () => clientId,
  } as unknown as ConfigService<Env, true>;
  return new VerificadorGoogleOficial(config);
}

describe('VerificadorGoogleOficial', () => {
  it('sem GOOGLE_CLIENT_ID responde 503 (login com Google desligado)', async () => {
    await expect(verificador('').verificar('qualquer')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('token que não é um JWT do Google vira null (401 no service), sem vazar o motivo', async () => {
    await expect(
      verificador('id.apps.googleusercontent.com').verificar('lixo'),
    ).resolves.toBeNull();
  });
});
