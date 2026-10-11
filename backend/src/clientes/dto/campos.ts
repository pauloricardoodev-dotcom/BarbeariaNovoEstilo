// Decorators de validação compartilhados pelos DTOs de clientes.
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizarTelefone } from '../telefone.js';

// Valor que nunca passa no @Matches: marca telefone que não pôde ser normalizado.
// (null/undefined seriam ignorados por @IsOptional e o erro passaria despercebido.)
const TELEFONE_INVALIDO = 'telefone-invalido';
const MSG_TELEFONE = 'Informe um número de celular válido com DDD.';

export const CampoNome = () =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    ),
    IsString({ message: 'Informe seu nome.' }),
    MinLength(2, { message: 'Informe seu nome.' }),
    MaxLength(120, { message: 'Nome muito longo (máximo 120 caracteres).' }),
  );

export const CampoEmail = () =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsEmail({}, { message: 'Informe um e-mail válido.' }),
    MaxLength(254, { message: 'Informe um e-mail válido.' }),
  );

/** Normaliza para E.164 já na validação; o service recebe o telefone pronto. */
export const CampoTelefone = () =>
  applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;
      try {
        return normalizarTelefone(value);
      } catch {
        return TELEFONE_INVALIDO;
      }
    }),
    IsString({ message: MSG_TELEFONE }),
    Matches(/^\+[1-9][0-9]{7,14}$/, { message: MSG_TELEFONE }),
  );

export const CampoSenhaNova = () =>
  applyDecorators(
    IsString({ message: 'Informe a senha.' }),
    MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' }),
    // Limite evita gastar CPU/memória do scrypt com payloads enormes.
    MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres.' }),
  );

export const CampoSenhaAtual = () =>
  applyDecorators(
    IsString({ message: 'Informe a senha atual.' }),
    MinLength(1, { message: 'Informe a senha atual.' }),
    MaxLength(200, { message: 'Senha muito longa.' }),
  );
