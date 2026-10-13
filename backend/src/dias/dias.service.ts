import { BadRequestException, Injectable } from '@nestjs/common';
import {
  dataSP,
  dataValida,
  somarDias,
  type ConfigHorarios,
} from '../agendamentos/horarios.js';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  diasEspeciais,
  estadoDoDia,
  padraoDoDia,
  type EstadoDia,
  type ExcecaoDia,
} from './dias.js';

/** Maior intervalo que o calendário pode pedir de uma vez (a janela de agendamento chega a 365 dias). */
const MAX_DIAS_CONSULTA = 400;

const paraData = (data: string) => new Date(`${data}T00:00:00.000Z`);
const daData = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class DiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracoes: ConfiguracoesService,
  ) {}

  /** Estado de um dia (aberto/fechado e o motivo). `config` evita reler as configurações quando quem chama já as tem. */
  async estado(data: string, config?: ConfigHorarios): Promise<EstadoDia> {
    const semana = config ?? (await this.configuracoes.obter());
    const linha = await this.prisma.diaEspecial.findUnique({
      where: { data: paraData(data) },
      select: { aberto: true, motivo: true },
    });
    return estadoDoDia(data, semana, linha);
  }

  /** Só os dias do intervalo que fogem do dia comum aberto: fechados ou desbloqueados. Nada pessoal. */
  async especiais(de: string, ate: string): Promise<EstadoDia[]> {
    if (!dataValida(de) || !dataValida(ate)) {
      throw new BadRequestException('Datas inválidas (use AAAA-MM-DD).');
    }
    if (ate < de || ate > somarDias(de, MAX_DIAS_CONSULTA)) {
      throw new BadRequestException('Intervalo de datas inválido.');
    }
    const semana = await this.configuracoes.obter();
    const linhas = await this.prisma.diaEspecial.findMany({
      where: { data: { gte: paraData(de), lte: paraData(ate) } },
      select: { data: true, aberto: true, motivo: true },
    });
    const excecoes = new Map<string, ExcecaoDia>(
      linhas.map((l) => [daData(l.data), { aberto: l.aberto, motivo: l.motivo }]),
    );
    return diasEspeciais(de, ate, excecoes, semana);
  }

  /**
   * Fecha (fechado = true) ou abre (fechado = false) um dia. Só guarda no banco o que foge do padrão
   * (domingo/feriado fechados, resto aberto); voltar ao padrão apaga a exceção. Agendamentos existentes
   * no dia nunca são alterados.
   */
  async definir(
    data: string,
    fechado: boolean,
    motivo?: string,
  ): Promise<EstadoDia> {
    if (!dataValida(data)) throw new BadRequestException('Data inválida.');
    if (data < dataSP(new Date())) {
      throw new BadRequestException('Não é possível alterar um dia que já passou.');
    }
    const where = { data: paraData(data) };
    const config = await this.configuracoes.obter();
    if (fechado === padraoDoDia(data, config).fechado) {
      await this.prisma.diaEspecial.deleteMany({ where });
    } else {
      const dados = { aberto: !fechado, motivo: fechado ? (motivo ?? null) : null };
      await this.prisma.diaEspecial.upsert({
        where,
        create: { data: paraData(data), ...dados },
        update: dados,
      });
    }
    return this.estado(data, config);
  }
}
