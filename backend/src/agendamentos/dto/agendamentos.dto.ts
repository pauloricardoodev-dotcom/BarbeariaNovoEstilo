import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  FormaPagamento,
  StatusAgendamento,
  StatusSolicitacaoCancelamento,
} from '../../generated/prisma/client.js';

const aparar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** 'YYYY-MM-DD'. Se a data não existir no calendário, o serviço recusa com 400. */
const CampoData = (mensagem = 'Informe a data no formato AAAA-MM-DD.') =>
  applyDecorators(
    IsString({ message: mensagem }),
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: mensagem }),
  );

/** 'HH:mm' (24 h). */
const CampoHora = () =>
  applyDecorators(
    IsString({ message: 'Informe o horário no formato HH:mm.' }),
    Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
      message: 'Informe o horário no formato HH:mm.',
    }),
  );

const CampoServicoId = () =>
  IsUUID('4', { message: 'Serviço inválido.' });

export class DisponibilidadeDto {
  @CampoData()
  data!: string;

  @CampoServicoId()
  servicoId!: string;
}

export class CriarAgendamentoDto {
  @CampoServicoId()
  servicoId!: string;

  @CampoData()
  data!: string;

  @CampoHora()
  hora!: string;

  @IsEnum(FormaPagamento, { message: 'Forma de pagamento inválida.' })
  pagamento!: FormaPagamento;
}

export class ReagendarDto {
  @CampoData()
  data!: string;

  @CampoHora()
  hora!: string;
}

export class SolicitarCancelamentoDto {
  @Transform(aparar)
  @IsString({ message: 'Informe o motivo do cancelamento.' })
  @MinLength(1, { message: 'Informe o motivo do cancelamento.' })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres.' })
  motivo!: string;
}

// --- Admin ---

class PaginaDto {
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
}

export class ListarAgendamentosAdminDto extends PaginaDto {
  /** Primeiro dia (inclusive), 'AAAA-MM-DD'. */
  @IsOptional()
  @CampoData('Data inicial inválida (use AAAA-MM-DD).')
  de?: string;

  /** Último dia (inclusive), 'AAAA-MM-DD'. */
  @IsOptional()
  @CampoData('Data final inválida (use AAAA-MM-DD).')
  ate?: string;

  @IsOptional()
  @IsEnum(StatusAgendamento, { message: 'Status inválido.' })
  status?: StatusAgendamento;
}

export class ReservaManualDto {
  @Transform(aparar)
  @IsString({ message: 'Informe o nome.' })
  @MinLength(1, { message: 'Informe o nome.' })
  @MaxLength(120, { message: 'O nome deve ter no máximo 120 caracteres.' })
  nome!: string;

  @CampoServicoId()
  servicoId!: string;

  @IsInt({ message: 'A duração deve ser um número inteiro de minutos.' })
  @Min(5, { message: 'A duração mínima é de 5 minutos.' })
  @Max(480, { message: 'A duração máxima é de 480 minutos.' })
  duracaoMinutos!: number;

  @CampoData()
  data!: string;

  @CampoHora()
  hora!: string;
}

export class AtualizarAgendamentoAdminDto {
  @IsIn(['concluido', 'cancelado'], {
    message: 'O status deve ser "concluido" ou "cancelado".',
  })
  status!: 'concluido' | 'cancelado';
}

export class ListarSolicitacoesDto extends PaginaDto {
  @IsOptional()
  @IsEnum(StatusSolicitacaoCancelamento, { message: 'Status inválido.' })
  status?: StatusSolicitacaoCancelamento;
}

export class DecidirSolicitacaoDto {
  @IsBoolean({ message: 'Informe se a solicitação foi aprovada.' })
  aprovar!: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const texto = value.trim();
    return texto === '' ? undefined : texto;
  })
  @IsString({ message: 'Resposta inválida.' })
  @MaxLength(500, { message: 'A resposta deve ter no máximo 500 caracteres.' })
  resposta?: string;
}
