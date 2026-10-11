// Metadados "max": necessários para getType() distinguir celular de fixo.
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export class TelefoneInvalidoError extends Error {
  constructor() {
    super('Informe um número de celular válido com DDD.');
  }
}

// Precisa receber o código de verificação por WhatsApp, então só celular.
const TIPOS_ACEITOS = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

/**
 * Converte o telefone digitado para E.164 (ex.: "(44) 99999-9999" → "+5544999999999").
 * Entradas sem código do país são interpretadas como do Brasil.
 */
export function normalizarTelefone(entrada: string): string {
  // Limite evita processar payloads absurdos; nenhum telefone formatado passa disso.
  if (typeof entrada !== 'string' || entrada.length > 30) {
    throw new TelefoneInvalidoError();
  }
  const numero = parsePhoneNumberFromString(entrada, 'BR');
  if (!numero?.isValid() || !TIPOS_ACEITOS.has(numero.getType() ?? '')) {
    throw new TelefoneInvalidoError();
  }
  return numero.number;
}
