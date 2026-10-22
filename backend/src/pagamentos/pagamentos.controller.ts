import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Publico } from '../auth/decorators.js';
import { ClienteAtual, RotaCliente } from '../clientes/cliente-auth.js';
import type { ClienteAutenticado } from '../clientes/clientes.types.js';
import { PagarComCartaoDto } from './dto/pagamentos.dto.js';
import { PagamentosService, type PagamentoCliente } from './pagamentos.service.js';

const uuid = () => new ParseUUIDPipe({ version: '4' });

/** Pagamento online do agendamento do cliente logado (só o dono do agendamento acessa). */
@RotaCliente()
@Controller('clientes/me/agendamentos/:id/pagamento')
export class ClientePagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Get()
  consultar(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Param('id', uuid()) id: string,
  ): Promise<PagamentoCliente> {
    return this.pagamentos.statusDoAgendamento(cliente, id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('pix')
  pix(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Param('id', uuid()) id: string,
  ): Promise<PagamentoCliente> {
    return this.pagamentos.iniciarPix(cliente, id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('cartao')
  cartao(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Param('id', uuid()) id: string,
    @Body() dto: PagarComCartaoDto,
  ): Promise<PagamentoCliente> {
    return this.pagamentos.pagarComCartao(cliente, id, dto);
  }
}

/** O que o site precisa saber antes de montar o pagamento. Público e sem dado pessoal. */
@Controller('pagamentos')
export class ConfigPagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Publico()
  @Get('config')
  config(): { online: boolean; chavePublica: string } {
    return this.pagamentos.configPublica();
  }
}

/**
 * Webhook do gateway. Público por necessidade (o gateway não tem sessão), protegido pela assinatura; o estado
 * real do pagamento é sempre reconsultado na API do gateway, nunca lido do corpo da requisição.
 */
@Controller('pagamentos')
export class WebhookPagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Publico()
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async receber(
    @Headers('x-signature') assinatura: string | undefined,
    @Headers('x-request-id') idRequisicao: string | undefined,
    @Query() query: Record<string, unknown>,
    @Body() corpo: Record<string, unknown> | undefined,
  ): Promise<void> {
    const texto = (v: unknown): string | undefined =>
      typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;
    await this.pagamentos.processarWebhook({
      assinatura,
      idRequisicao,
      // A assinatura cobre o `data.id` da query string.
      idDado: texto(query['data.id']),
      tipo: texto(query.type) ?? texto(corpo?.type),
      idEvento: texto(corpo?.id),
      acao: texto(corpo?.action),
    });
  }
}
