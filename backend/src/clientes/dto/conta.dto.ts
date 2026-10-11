import { Transform } from 'class-transformer';
import {
  Equals,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  CampoEmail,
  CampoNome,
  CampoSenhaAtual,
  CampoSenhaNova,
  CampoTelefone,
} from './campos.js';

export class CadastroClienteDto {
  @CampoNome()
  nome: string;

  @CampoEmail()
  email: string;

  @CampoTelefone()
  telefone: string;

  @CampoSenhaNova()
  senha: string;

  @Equals(true, {
    message: 'É preciso aceitar os termos de uso e a política de privacidade.',
  })
  aceiteTermos: boolean;
}

export class CodigoVerificacaoDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'Informe o código de 6 dígitos.' })
  @Matches(/^\d{6}$/, { message: 'Informe o código de 6 dígitos.' })
  codigo: string;
}

export class ReenviarCodigoDto {
  @IsIn(['email', 'telefone'], { message: 'Canal inválido.' })
  canal: 'email' | 'telefone';
}

export class EsqueciSenhaDto {
  @CampoEmail()
  email: string;
}

export class RedefinirSenhaDto {
  @IsString({ message: 'Link de redefinição inválido.' })
  @Length(20, 200, { message: 'Link de redefinição inválido.' })
  token: string;

  @CampoSenhaNova()
  novaSenha: string;
}

export class AtualizarPerfilDto {
  @IsOptional()
  @CampoNome()
  nome?: string;

  @IsOptional()
  @CampoEmail()
  email?: string;

  @IsOptional()
  @CampoTelefone()
  telefone?: string;

  /** Exigida para trocar o e-mail quando a conta tem senha (impede sequestro de conta com sessão roubada). */
  @IsOptional()
  @CampoSenhaAtual()
  senhaAtual?: string;
}

export class TrocarSenhaDto {
  /** Opcional só para conta criada pelo Google, que ainda não tem senha. */
  @IsOptional()
  @CampoSenhaAtual()
  senhaAtual?: string;

  @CampoSenhaNova()
  novaSenha: string;
}
