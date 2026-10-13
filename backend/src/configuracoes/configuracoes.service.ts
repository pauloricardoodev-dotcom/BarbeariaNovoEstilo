import { BadRequestException, Injectable } from '@nestjs/common';
import { CONFIG_PADRAO, type ConfigHorarios } from '../agendamentos/horarios.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AtualizarConfiguracoesDto } from './dto/configuracoes.dto.js';

/** Dados exibidos no site e usados nas regras de agendamento. Nada pessoal: pode ser público. */
export interface Configuracoes extends ConfigHorarios {
  nome: string;
  telefone: string;
  endereco: string;
}

/** Usados só se a linha ainda não existir (a migration cria uma; isto evita derrubar o site sem ela). */
export const CONFIGURACOES_PADRAO: Configuracoes = {
  nome: 'Barbearia Novo Estilo',
  telefone: '(41) 3025-1187',
  endereco: 'Rua das Palmeiras, 482 — Batel, Curitiba - PR',
  ...CONFIG_PADRAO,
};

const SELECAO = {
  nome: true,
  telefone: true,
  endereco: true,
  manhaInicio: true,
  manhaFim: true,
  tardeInicio: true,
  tardeFim: true,
  antecedenciaHoras: true,
  janelaDias: true,
  diasTrabalho: true,
} as const;

/** Manhã começa antes de acabar e a tarde só começa depois do fim da manhã (pode encostar). 'HH:mm' compara como texto. */
export function horariosEmOrdem(
  c: Pick<ConfigHorarios, 'manhaInicio' | 'manhaFim' | 'tardeInicio' | 'tardeFim'>,
): string | null {
  if (c.manhaInicio >= c.manhaFim) {
    return 'O fim da manhã deve ser depois do início da manhã.';
  }
  if (c.tardeInicio < c.manhaFim) {
    return 'A tarde não pode começar antes do fim da manhã.';
  }
  if (c.tardeInicio >= c.tardeFim) {
    return 'O fim da tarde deve ser depois do início da tarde.';
  }
  return null;
}

@Injectable()
export class ConfiguracoesService {
  constructor(private readonly prisma: PrismaService) {}

  async obter(): Promise<Configuracoes> {
    const linha = await this.prisma.configuracao.findUnique({
      where: { id: true },
      select: SELECAO,
    });
    return linha ?? CONFIGURACOES_PADRAO;
  }

  async atualizar(dto: AtualizarConfiguracoesDto): Promise<Configuracoes> {
    const erro = horariosEmOrdem(dto);
    if (erro) throw new BadRequestException(erro);
    const dados = {
      nome: dto.nome,
      telefone: dto.telefone,
      endereco: dto.endereco,
      manhaInicio: dto.manhaInicio,
      manhaFim: dto.manhaFim,
      tardeInicio: dto.tardeInicio,
      tardeFim: dto.tardeFim,
      antecedenciaHoras: dto.antecedenciaHoras,
      janelaDias: dto.janelaDias,
      // Sem repetidos e em ordem (segunda … domingo), para o banco guardar sempre da mesma forma.
      diasTrabalho: [...new Set(dto.diasTrabalho)].sort((a, b) => a - b),
    };
    try {
      return await this.prisma.configuracao.upsert({
        where: { id: true },
        create: { id: true, ...dados },
        update: dados,
        select: SELECAO,
      });
    } catch (e) {
      // As constraints do banco são a garantia final; nunca expor o erro interno.
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Configuração inválida.');
      }
      throw e;
    }
  }
}
