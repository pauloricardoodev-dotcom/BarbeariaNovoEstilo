import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import type { Env } from '../config/env.validation.js';
import { COOKIE_SESSAO } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { UsuarioAutenticado } from './auth.types.js';
import { Publico, UsuarioAtual } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private opcoesCookie(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/api',
    };
  }

  @Publico()
  // Contra força bruta: 5 tentativas por minuto por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioAutenticado> {
    const resultado = await this.authService.login(dto.email, dto.senha);
    if (!resultado)
      throw new UnauthorizedException('E-mail ou senha inválidos.');

    res.cookie(COOKIE_SESSAO, resultado.token, {
      ...this.opcoesCookie(),
      maxAge:
        this.config.get('SESSAO_DURACAO_SEGUNDOS', { infer: true }) * 1000,
    });
    return resultado.usuario;
  }

  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado): UsuarioAutenticado {
    return usuario;
  }

  @Publico()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(COOKIE_SESSAO, this.opcoesCookie());
  }
}
