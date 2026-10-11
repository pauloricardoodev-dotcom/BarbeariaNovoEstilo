import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Patch,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { Publico } from '../auth/decorators.js';
import { LoginDto } from '../auth/dto/login.dto.js';
import type { Env } from '../config/env.validation.js';
import { ClienteAtual, RotaCliente } from './cliente-auth.js';
import {
  COOKIE_SESSAO_CLIENTE,
  type ClienteAutenticado,
} from './clientes.types.js';
import {
  ContaClienteService,
  type SessaoCliente,
} from './conta-cliente.service.js';
import {
  AtualizarPerfilDto,
  CadastroClienteDto,
  CodigoVerificacaoDto,
  EsqueciSenhaDto,
  ReenviarCodigoDto,
  RedefinirSenhaDto,
  TrocarSenhaDto,
} from './dto/conta.dto.js';

@Injectable()
export class CookieSessaoCliente {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private opcoes(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/api',
    };
  }

  definir(res: Response, sessao: SessaoCliente): ClienteAutenticado {
    res.cookie(COOKIE_SESSAO_CLIENTE, sessao.token, {
      ...this.opcoes(),
      maxAge:
        this.config.get('SESSAO_CLIENTE_DURACAO_SEGUNDOS', { infer: true }) *
        1000,
    });
    return sessao.cliente;
  }

  limpar(res: Response): void {
    res.clearCookie(COOKIE_SESSAO_CLIENTE, this.opcoes());
  }
}

/** Cadastro, login e recuperação de senha (sem sessão). */
@Controller('clientes/auth')
export class ClientesAuthController {
  constructor(
    private readonly conta: ContaClienteService,
    private readonly cookie: CookieSessaoCliente,
  ) {}

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('cadastro')
  async cadastrar(
    @Body() dto: CadastroClienteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ClienteAutenticado> {
    return this.cookie.definir(res, await this.conta.cadastrar(dto));
  }

  @Publico()
  // Contra força bruta: 5 tentativas por minuto por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ClienteAutenticado> {
    const sessao = await this.conta.login(dto.email, dto.senha);
    if (!sessao) throw new UnauthorizedException('E-mail ou senha inválidos.');
    return this.cookie.definir(res, sessao);
  }

  @Publico()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.cookie.limpar(res);
  }

  @Publico()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('esqueci-senha')
  @HttpCode(HttpStatus.ACCEPTED)
  async esqueciSenha(
    @Body() dto: EsqueciSenhaDto,
  ): Promise<{ mensagem: string }> {
    await this.conta.solicitarRecuperacao(dto.email);
    return {
      mensagem:
        'Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.',
    };
  }

  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  async redefinirSenha(@Body() dto: RedefinirSenhaDto): Promise<void> {
    await this.conta.redefinirSenha(dto.token, dto.novaSenha);
  }
}

/** Conta do cliente logado. */
@RotaCliente()
@Controller('clientes/me')
export class ClientesMeController {
  constructor(
    private readonly conta: ContaClienteService,
    private readonly cookie: CookieSessaoCliente,
  ) {}

  @Get()
  me(@ClienteAtual() cliente: ClienteAutenticado): ClienteAutenticado {
    return cliente;
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch()
  atualizar(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: AtualizarPerfilDto,
  ): Promise<ClienteAutenticado> {
    return this.conta.atualizarPerfil(cliente.id, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('senha')
  async trocarSenha(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: TrocarSenhaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ClienteAutenticado> {
    const sessao = await this.conta.trocarSenha(
      cliente.id,
      dto.senhaAtual,
      dto.novaSenha,
    );
    return this.cookie.definir(res, sessao);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verificar-email')
  @HttpCode(HttpStatus.OK)
  verificarEmail(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: CodigoVerificacaoDto,
  ): Promise<ClienteAutenticado> {
    return this.conta.verificar(cliente.id, 'email', dto.codigo);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verificar-telefone')
  @HttpCode(HttpStatus.OK)
  verificarTelefone(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: CodigoVerificacaoDto,
  ): Promise<ClienteAutenticado> {
    return this.conta.verificar(cliente.id, 'telefone', dto.codigo);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('reenviar-codigo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reenviarCodigo(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: ReenviarCodigoDto,
  ): Promise<void> {
    await this.conta.reenviarCodigo(cliente.id, dto.canal);
  }
}
