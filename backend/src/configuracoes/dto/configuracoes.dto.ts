import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const aparar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** 'HH:mm' (24 h). A ordem entre os quatro horários é conferida no serviço. */
const CampoHora = (nome: string) =>
  applyDecorators(
    IsString({ message: `Informe ${nome} no formato HH:mm.` }),
    Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
      message: `Informe ${nome} no formato HH:mm.`,
    }),
  );

/** Substitui a configuração inteira (todos os campos são obrigatórios). */
export class AtualizarConfiguracoesDto {
  @Transform(aparar)
  @IsString({ message: 'Informe o nome da barbearia.' })
  @MinLength(1, { message: 'Informe o nome da barbearia.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  nome!: string;

  @Transform(aparar)
  @IsString({ message: 'Informe o telefone.' })
  @MinLength(1, { message: 'Informe o telefone.' })
  @MaxLength(30, { message: 'O telefone deve ter no máximo 30 caracteres.' })
  telefone!: string;

  @Transform(aparar)
  @IsString({ message: 'Informe o endereço.' })
  @MinLength(1, { message: 'Informe o endereço.' })
  @MaxLength(200, { message: 'O endereço deve ter no máximo 200 caracteres.' })
  endereco!: string;

  @CampoHora('o início da manhã')
  manhaInicio!: string;

  @CampoHora('o fim da manhã')
  manhaFim!: string;

  @CampoHora('o início da tarde')
  tardeInicio!: string;

  @CampoHora('o fim da tarde')
  tardeFim!: string;

  @IsInt({ message: 'O tempo mínimo deve ser um número inteiro de horas.' })
  @Min(0, { message: 'O tempo mínimo não pode ser negativo.' })
  @Max(72, { message: 'O tempo mínimo máximo é de 72 horas.' })
  antecedenciaHoras!: number;

  @IsInt({ message: 'O tempo máximo deve ser um número inteiro de dias.' })
  @Min(1, { message: 'O tempo máximo deve ser de pelo menos 1 dia.' })
  @Max(365, { message: 'O tempo máximo é de 365 dias.' })
  janelaDias!: number;

  /** Dias de trabalho da semana: 1 = segunda … 7 = domingo. Pelo menos um. */
  @IsArray({ message: 'Escolha os dias de trabalho.' })
  @ArrayMinSize(1, { message: 'Escolha pelo menos um dia de trabalho.' })
  @ArrayMaxSize(7, { message: 'Dias de trabalho inválidos.' })
  @IsInt({ each: true, message: 'Dias de trabalho inválidos.' })
  @Min(1, { each: true, message: 'Dias de trabalho inválidos.' })
  @Max(7, { each: true, message: 'Dias de trabalho inválidos.' })
  diasTrabalho!: number[];
}
