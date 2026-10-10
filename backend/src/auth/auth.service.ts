import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PayloadJwt, UsuarioAutenticado } from './auth.types.js';
import { gerarHashSenha, verificarSenha } from './senha.js';

const SELECAO_PUBLICA = {
  id: true,
  nome: true,
  email: true,
  papel: true,
} as const;

@Injectable()
export class AuthService {
  // Hash descartável usado quando o e-mail não existe: o tempo de resposta fica
  // igual ao de uma senha errada e não revela quais e-mails estão cadastrados.
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Retorna o usuário e o token de sessão, ou null se as credenciais forem inválidas. */
  async login(
    email: string,
    senha: string,
  ): Promise<{ usuario: UsuarioAutenticado; token: string } | null> {
    const registro = await this.prisma.usuarioAdmin.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { ...SELECAO_PUBLICA, senhaHash: true, ativo: true },
    });

    this.hashFicticio ??= gerarHashSenha('senha-ficticia-para-tempo-constante');
    const hash = registro?.senhaHash ?? (await this.hashFicticio);
    const senhaValida = await verificarSenha(senha, hash);
    if (!registro || !registro.ativo || !senhaValida) return null;

    const usuario: UsuarioAutenticado = {
      id: registro.id,
      nome: registro.nome,
      email: registro.email,
      papel: registro.papel,
    };
    const payload: PayloadJwt = { sub: usuario.id, papel: usuario.papel };
    return { usuario, token: await this.jwt.signAsync(payload) };
  }

  /** Revalida a sessão no banco a cada requisição: desativar o usuário corta o acesso na hora. */
  async buscarUsuarioAtivo(id: string): Promise<UsuarioAutenticado | null> {
    return this.prisma.usuarioAdmin.findFirst({
      where: { id, ativo: true },
      select: SELECAO_PUBLICA,
    });
  }
}
