import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const aparar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Texto vazio vira null (campo limpo). */
const apararOuNulo = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const texto = value.trim();
  return texto === '' ? null : texto;
};

export class CriarServicoDto {
  @Transform(aparar)
  @IsString({ message: 'Informe o nome do serviço.' })
  @MinLength(1, { message: 'Informe o nome do serviço.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  nome!: string;

  @IsOptional()
  @Transform(apararOuNulo)
  @IsString({ message: 'Descrição inválida.' })
  @MaxLength(300, { message: 'A descrição deve ter no máximo 300 caracteres.' })
  descricao?: string | null;

  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Preço inválido (use até 2 casas decimais).' },
  )
  @Min(0, { message: 'O preço não pode ser negativo.' })
  @Max(99999.99, { message: 'Preço acima do máximo permitido.' })
  preco!: number;

  @IsInt({ message: 'A duração deve ser um número inteiro de minutos.' })
  @Min(5, { message: 'A duração mínima é de 5 minutos.' })
  @Max(480, { message: 'A duração máxima é de 480 minutos.' })
  duracaoMinutos!: number;

  @IsOptional()
  @IsBoolean({ message: 'Valor inválido para "ativo".' })
  ativo?: boolean;
}

export class AtualizarServicoDto {
  @IsOptional()
  @Transform(aparar)
  @IsString({ message: 'Informe o nome do serviço.' })
  @MinLength(1, { message: 'Informe o nome do serviço.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  nome?: string;

  @IsOptional()
  @Transform(apararOuNulo)
  @IsString({ message: 'Descrição inválida.' })
  @MaxLength(300, { message: 'A descrição deve ter no máximo 300 caracteres.' })
  descricao?: string | null;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Preço inválido (use até 2 casas decimais).' },
  )
  @Min(0, { message: 'O preço não pode ser negativo.' })
  @Max(99999.99, { message: 'Preço acima do máximo permitido.' })
  preco?: number;

  @IsOptional()
  @IsInt({ message: 'A duração deve ser um número inteiro de minutos.' })
  @Min(5, { message: 'A duração mínima é de 5 minutos.' })
  @Max(480, { message: 'A duração máxima é de 480 minutos.' })
  duracaoMinutos?: number;

  @IsOptional()
  @IsBoolean({ message: 'Valor inválido para "ativo".' })
  ativo?: boolean;
}
