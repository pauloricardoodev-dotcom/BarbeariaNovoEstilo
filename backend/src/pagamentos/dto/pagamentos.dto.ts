import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PagarComCartaoDto {
  /** Token do cartão gerado no navegador pelo SDK do gateway (nunca o número do cartão). */
  @IsString({ message: 'Dados do cartão inválidos.' })
  @MinLength(8, { message: 'Dados do cartão inválidos.' })
  @MaxLength(200, { message: 'Dados do cartão inválidos.' })
  token!: string;

  /** Bandeira/método de pagamento do gateway (ex.: visa, master). */
  @IsString({ message: 'Bandeira do cartão inválida.' })
  @Matches(/^[a-z0-9_]{2,40}$/, { message: 'Bandeira do cartão inválida.' })
  metodoId!: string;

  @IsOptional()
  @IsString({ message: 'Emissor do cartão inválido.' })
  @Matches(/^\d{1,20}$/, { message: 'Emissor do cartão inválido.' })
  emissorId?: string;
}
