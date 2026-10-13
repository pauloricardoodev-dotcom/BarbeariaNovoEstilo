import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const MENSAGEM_DATA = 'Informe a data no formato AAAA-MM-DD.';

export class ListarDiasDto {
  @IsString({ message: MENSAGEM_DATA })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: MENSAGEM_DATA })
  de!: string;

  @IsString({ message: MENSAGEM_DATA })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: MENSAGEM_DATA })
  ate!: string;
}

export class DefinirDiaDto {
  /** true fecha o dia; false abre (desbloqueia). */
  @IsBoolean({ message: 'Informe se o dia fica fechado.' })
  fechado!: boolean;

  /** Só vale ao fechar um dia comum; texto vazio vira "sem motivo". */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const texto = value.trim();
    return texto === '' ? undefined : texto;
  })
  @IsString({ message: 'Motivo inválido.' })
  @MaxLength(120, { message: 'O motivo deve ter no máximo 120 caracteres.' })
  motivo?: string;
}
