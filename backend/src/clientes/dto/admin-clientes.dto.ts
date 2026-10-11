import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CampoEmail, CampoNome, CampoTelefone } from './campos.js';

export class ListarClientesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página inválida.' })
  @Min(1, { message: 'Página inválida.' })
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tamanho de página inválido.' })
  @Min(1, { message: 'Tamanho de página inválido.' })
  @Max(100, { message: 'Tamanho de página máximo: 100.' })
  porPagina: number = 20;

  /** Busca por nome, e-mail ou telefone. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100, { message: 'Busca muito longa.' })
  busca?: string;
}

export class AtualizarClienteAdminDto {
  @IsOptional()
  @CampoNome()
  nome?: string;

  @IsOptional()
  @CampoEmail()
  email?: string;

  @IsOptional()
  @CampoTelefone()
  telefone?: string;

  @IsOptional()
  @IsBoolean({ message: 'Valor inválido para "ativo".' })
  ativo?: boolean;
}
