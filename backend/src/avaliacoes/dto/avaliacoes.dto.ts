import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const aparar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Corpo do envio (multipart: os campos chegam como texto, por isso o @Type). */
export class CriarAvaliacaoDto {
  @Type(() => Number)
  @IsInt({ message: 'Escolha uma nota de 1 a 5 estrelas.' })
  @Min(1, { message: 'Escolha uma nota de 1 a 5 estrelas.' })
  @Max(5, { message: 'Escolha uma nota de 1 a 5 estrelas.' })
  nota!: number;

  @Transform(aparar)
  @IsString({ message: 'Escreva um comentário.' })
  @MinLength(1, { message: 'Escreva um comentário.' })
  @MaxLength(600, { message: 'O comentário deve ter no máximo 600 caracteres.' })
  comentario!: string;
}

export class ListarAvaliacoesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página inválida.' })
  @Min(1, { message: 'Página inválida.' })
  @Max(10_000, { message: 'Página inválida.' })
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite inválido.' })
  @Min(1, { message: 'Limite inválido.' })
  @Max(24, { message: 'O limite máximo é 24.' })
  limite?: number;
}

export class ListarAvaliacoesAdminQuery extends ListarAvaliacoesQuery {
  @IsOptional()
  @IsIn(['todas', 'visiveis', 'ocultas'], { message: 'Filtro inválido.' })
  situacao?: 'todas' | 'visiveis' | 'ocultas';
}

export class AlterarPublicacaoDto {
  @IsBoolean({ message: 'Valor inválido para "publicada".' })
  publicada!: boolean;
}
