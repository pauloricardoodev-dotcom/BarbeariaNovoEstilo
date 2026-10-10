import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString({ message: 'Informe a senha.' })
  @MinLength(1, { message: 'Informe a senha.' })
  // Limite evita gastar CPU/memória do scrypt com payloads enormes.
  @MaxLength(200, { message: 'Senha muito longa.' })
  senha: string;
}
