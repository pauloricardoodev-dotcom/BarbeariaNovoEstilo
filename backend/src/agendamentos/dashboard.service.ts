import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  limitesDoMes,
  mesValido,
  resumirMes,
  type ResumoDashboard,
} from './dashboard.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(mes: string): Promise<ResumoDashboard> {
    if (!mesValido(mes)) {
      throw new BadRequestException('Informe o mês no formato AAAA-MM.');
    }
    const { inicio, fim } = limitesDoMes(mes);
    const linhas = await this.prisma.agendamento.findMany({
      where: { inicio: { gte: inicio, lt: fim } },
      select: {
        inicio: true,
        status: true,
        preco: true,
        clienteId: true,
        servico: { select: { nome: true } },
      },
    });
    return resumirMes(
      mes,
      linhas.map((l) => ({
        inicio: l.inicio,
        status: l.status,
        preco: Number(l.preco),
        clienteId: l.clienteId,
        servico: l.servico.nome,
      })),
    );
  }
}
