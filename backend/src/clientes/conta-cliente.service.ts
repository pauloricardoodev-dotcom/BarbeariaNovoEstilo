import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { gerarHashSenha, verificarSenha } from '../auth/senha.js';
import type { Env } from '../config/env.validation.js';
import { EmailService, WhatsAppService } from '../mensagens/mensagens.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AUDIENCIA_GOOGLE_PENDENTE,
  DURACAO_GOOGLE_PENDENTE_SEGUNDOS,
  paraClienteAutenticado,
  SELECAO_SESSAO,
  TERMOS_VERSAO_ATUAL,
  type ClienteAutenticado,
  type PayloadGooglePendente,
  type PayloadJwtCliente,
  type ResultadoGoogle,
} from './clientes.types.js';
import { traduzirConflito } from './conflitos.js';
import type {
  AtualizarPerfilDto,
  CadastroClienteDto,
  GoogleCompletarDto,
} from './dto/conta.dto.js';
import { VerificadorGoogle } from './google.js';
import { TokensClienteService } from './tokens-cliente.service.js';

export interface SessaoCliente {
  cliente: ClienteAutenticado;
  token: string;
}

type Canal = 'email' | 'telefone';

const MSG_GOOGLE_INVALIDO = 'Não foi possível entrar com o Google.';
const MSG_GOOGLE_EXPIRADO =
  'Seu cadastro com o Google expirou. Entre com o Google novamente.';

@Injectable()
export class ContaClienteService {
  private readonly logger = new Logger(ContaClienteService.name);
  // Hash descartável usado quando o e-mail não existe ou a conta não tem senha:
  // o tempo de resposta fica igual ao de uma senha errada (não revela cadastros).
  private hashFicticio?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokens: TokensClienteService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService<Env, true>,
    private readonly google: VerificadorGoogle,
  ) {}

  /**
   * Login com Google. Nome e e-mail vêm só do ID token verificado, nunca do corpo da requisição.
   * Conta nova não é criada aqui: falta o telefone (NOT NULL) e o aceite dos termos.
   */
  async entrarComGoogle(credencial: string): Promise<ResultadoGoogle> {
    const id = await this.google.verificar(credencial);
    if (!id) throw new UnauthorizedException(MSG_GOOGLE_INVALIDO);

    const porSub = await this.prisma.cliente.findUnique({
      where: { googleSub: id.sub },
      select: { ...SELECAO_SESSAO, ativo: true },
    });
    if (porSub) return this.sessaoGoogle(porSub);

    const porEmail = await this.prisma.cliente.findUnique({
      where: { email: id.email },
      select: {
        ...SELECAO_SESSAO,
        ativo: true,
        googleSub: true,
        senhaHash: true,
      },
    });
    if (porEmail) {
      // Outra conta Google já vinculada a este cadastro: não troca o vínculo.
      if (porEmail.googleSub && porEmail.googleSub !== id.sub) {
        throw new UnauthorizedException(MSG_GOOGLE_INVALIDO);
      }
      if (!porEmail.ativo) throw new UnauthorizedException(MSG_GOOGLE_INVALIDO);

      // O Google comprovou o e-mail. Se o cadastro nunca o tinha verificado, quem o criou
      // pode não ser o dono do e-mail: a senha definida por essa pessoa é descartada
      // e as sessões abertas caem. Com o e-mail já verificado, só vincula.
      const emailNaoVerificado = porEmail.emailVerificadoEm === null;
      const vinculado = await this.prisma.$transaction(async (tx) => {
        const cliente = await tx.cliente.update({
          where: { id: porEmail.id },
          data: {
            googleSub: id.sub,
            ultimoLoginEm: new Date(),
            ...(emailNaoVerificado
              ? {
                  emailVerificadoEm: new Date(),
                  senhaHash: null,
                  versaoSessao: { increment: 1 },
                }
              : {}),
          },
          select: SELECAO_SESSAO,
        });
        if (emailNaoVerificado) {
          await this.tokens.invalidar(tx, porEmail.id, 'recuperar_senha');
        }
        return cliente;
      });
      return {
        status: 'autenticado',
        sessao: await this.criarSessao(vinculado),
      };
    }

    const payload: PayloadGooglePendente = {
      sub: id.sub,
      email: id.email,
      nome: id.nome,
    };
    return {
      status: 'cadastro_pendente',
      nome: id.nome,
      email: id.email,
      tokenPendente: await this.jwt.signAsync(payload, {
        audience: AUDIENCIA_GOOGLE_PENDENTE,
        expiresIn: DURACAO_GOOGLE_PENDENTE_SEGUNDOS,
      }),
    };
  }

  /** Segunda etapa do primeiro acesso com Google: telefone + aceite dos termos. */
  async completarCadastroGoogle(
    dto: GoogleCompletarDto,
  ): Promise<SessaoCliente> {
    let pendente: PayloadGooglePendente;
    try {
      pendente = await this.jwt.verifyAsync<PayloadGooglePendente>(
        dto.tokenPendente,
        { audience: AUDIENCIA_GOOGLE_PENDENTE, algorithms: ['HS256'] },
      );
    } catch {
      throw new UnauthorizedException(MSG_GOOGLE_EXPIRADO);
    }
    if (
      typeof pendente.sub !== 'string' ||
      typeof pendente.email !== 'string' ||
      typeof pendente.nome !== 'string'
    ) {
      throw new UnauthorizedException(MSG_GOOGLE_EXPIRADO);
    }

    const agora = new Date();
    let cliente;
    try {
      cliente = await this.prisma.cliente.create({
        data: {
          nome: pendente.nome,
          email: pendente.email,
          telefone: dto.telefone,
          googleSub: pendente.sub,
          emailVerificadoEm: agora,
          termosVersaoAceita: TERMOS_VERSAO_ATUAL,
          termosAceitosEm: agora,
          ultimoLoginEm: agora,
        },
        select: SELECAO_SESSAO,
      });
    } catch (erro) {
      return traduzirConflito(this.prisma, erro, {
        email: pendente.email,
        telefone: dto.telefone,
      });
    }

    // O e-mail já vem verificado pelo Google; falta só o telefone (WhatsApp).
    this.enviarCodigo(cliente.id, 'telefone').catch((erro: unknown) =>
      this.logger.error(
        `Falha ao enviar código (telefone) do cadastro Google: ${String(erro)}`,
      ),
    );
    return this.criarSessao(cliente);
  }

  private async sessaoGoogle(registro: {
    ativo: boolean;
    id: string;
    nome: string;
    email: string;
    telefone: string;
    emailVerificadoEm: Date | null;
    telefoneVerificadoEm: Date | null;
    senhaHash: string | null;
    versaoSessao: number;
  }): Promise<ResultadoGoogle> {
    if (!registro.ativo) throw new UnauthorizedException(MSG_GOOGLE_INVALIDO);
    await this.prisma.cliente.update({
      where: { id: registro.id },
      data: { ultimoLoginEm: new Date() },
      select: { id: true },
    });
    return {
      status: 'autenticado',
      sessao: await this.criarSessao(registro),
    };
  }

  async cadastrar(dto: CadastroClienteDto): Promise<SessaoCliente> {
    const agora = new Date();
    let cliente;
    try {
      cliente = await this.prisma.cliente.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          telefone: dto.telefone,
          senhaHash: await gerarHashSenha(dto.senha),
          termosVersaoAceita: TERMOS_VERSAO_ATUAL,
          termosAceitosEm: agora,
          ultimoLoginEm: agora,
        },
        select: SELECAO_SESSAO,
      });
    } catch (erro) {
      return traduzirConflito(this.prisma, erro, dto);
    }

    // Não segura a resposta do cadastro esperando os provedores; se falhar,
    // o cliente pede reenvio na tela de verificação.
    for (const canal of ['email', 'telefone'] as const) {
      this.enviarCodigo(cliente.id, canal).catch((erro: unknown) =>
        this.logger.error(
          `Falha ao enviar código (${canal}) do cadastro: ${String(erro)}`,
        ),
      );
    }
    return this.criarSessao(cliente);
  }

  /** Retorna a sessão, ou null se as credenciais forem inválidas (resposta genérica). */
  async login(email: string, senha: string): Promise<SessaoCliente | null> {
    const registro = await this.prisma.cliente.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { ...SELECAO_SESSAO, senhaHash: true, ativo: true },
    });

    this.hashFicticio ??= gerarHashSenha('senha-ficticia-para-tempo-constante');
    const hash = registro?.senhaHash ?? (await this.hashFicticio);
    const senhaValida = await verificarSenha(senha, hash);
    if (!registro || !registro.ativo || !registro.senhaHash || !senhaValida) {
      return null;
    }

    await this.prisma.cliente.update({
      where: { id: registro.id },
      data: { ultimoLoginEm: new Date() },
      select: { id: true },
    });
    return this.criarSessao(registro);
  }

  /** Revalida a sessão no banco a cada requisição: desativar ou trocar a senha corta o acesso. */
  async buscarClienteDaSessao(
    payload: PayloadJwtCliente,
  ): Promise<ClienteAutenticado | null> {
    if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') {
      return null;
    }
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: payload.sub, ativo: true, versaoSessao: payload.ver },
      select: SELECAO_SESSAO,
    });
    return cliente ? paraClienteAutenticado(cliente) : null;
  }

  async verificar(
    clienteId: string,
    canal: Canal,
    codigo: string,
  ): Promise<ClienteAutenticado> {
    const tipo = canal === 'email' ? 'verificar_email' : 'verificar_telefone';
    await this.tokens.consumirCodigo(clienteId, tipo, codigo, async (tx) => {
      await tx.cliente.update({
        where: { id: clienteId },
        data:
          canal === 'email'
            ? { emailVerificadoEm: new Date() }
            : { telefoneVerificadoEm: new Date() },
        select: { id: true },
      });
    });
    return this.perfil(clienteId);
  }

  async reenviarCodigo(clienteId: string, canal: Canal): Promise<void> {
    const cliente = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: { emailVerificadoEm: true, telefoneVerificadoEm: true },
    });
    const verificado =
      canal === 'email'
        ? cliente.emailVerificadoEm
        : cliente.telefoneVerificadoEm;
    if (verificado) {
      throw new BadRequestException(
        canal === 'email'
          ? 'Seu e-mail já está verificado.'
          : 'Seu telefone já está verificado.',
      );
    }
    try {
      await this.enviarCodigo(clienteId, canal);
    } catch (erro) {
      if (erro instanceof HttpException) throw erro; // limite de reenvio (429)
      this.logger.error(`Falha ao reenviar código (${canal}): ${String(erro)}`);
      throw new ServiceUnavailableException(
        'Não foi possível enviar o código agora. Tente novamente em instantes.',
      );
    }
  }

  /** Sempre "dá certo" para quem chama: não revela se o e-mail está cadastrado. */
  async solicitarRecuperacao(email: string): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, ativo: true },
    });
    if (!cliente?.ativo) return;

    // Em segundo plano: o tempo de resposta não denuncia se o e-mail existe.
    void (async () => {
      const token = await this.tokens.emitir(cliente.id, 'recuperar_senha');
      // Fragmento (#) não vai para o servidor nem para o Referer.
      const link = `${this.config.get('FRONTEND_URL', { infer: true })}/redefinir-senha#token=${token}`;
      await this.email.enviar({
        para: cliente.email,
        assunto: 'Redefinir sua senha — Barbearia Novo Estilo',
        texto:
          `Olá, ${cliente.nome}!\n\n` +
          `Para criar uma nova senha, acesse o link abaixo (válido por 30 minutos):\n${link}\n\n` +
          'Se você não pediu a redefinição, ignore este e-mail: sua senha continua a mesma.',
      });
    })().catch((erro: unknown) =>
      this.logger.warn(`Recuperação de senha não enviada: ${String(erro)}`),
    );
  }

  async redefinirSenha(token: string, novaSenha: string): Promise<void> {
    const senhaHash = await gerarHashSenha(novaSenha);
    const ok = await this.prisma.$transaction(async (tx) => {
      const clienteId = await this.tokens.consumirRecuperacao(tx, token);
      if (!clienteId) return false;
      await tx.cliente.update({
        where: { id: clienteId },
        data: {
          senhaHash,
          versaoSessao: { increment: 1 }, // derruba todas as sessões abertas
        },
        select: { id: true },
      });
      // Quem recebeu o link no e-mail comprovou que é dono dele.
      await tx.cliente.updateMany({
        where: { id: clienteId, emailVerificadoEm: null },
        data: { emailVerificadoEm: new Date() },
      });
      return true;
    });
    if (!ok) {
      throw new BadRequestException(
        'Link de redefinição inválido ou expirado. Solicite um novo.',
      );
    }
  }

  async perfil(clienteId: string): Promise<ClienteAutenticado> {
    const cliente = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: SELECAO_SESSAO,
    });
    return paraClienteAutenticado(cliente);
  }

  /** Alteração explícita dos dados pessoais. Trocar e-mail/telefone exige nova verificação. */
  async atualizarPerfil(
    clienteId: string,
    dto: AtualizarPerfilDto,
  ): Promise<ClienteAutenticado> {
    const atual = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: { email: true, telefone: true, senhaHash: true },
    });
    const trocaEmail = dto.email !== undefined && dto.email !== atual.email;
    const trocaTelefone =
      dto.telefone !== undefined && dto.telefone !== atual.telefone;

    if (trocaEmail && atual.senhaHash) {
      const senhaOk =
        dto.senhaAtual !== undefined &&
        (await verificarSenha(dto.senhaAtual, atual.senhaHash));
      if (!senhaOk) {
        throw new UnauthorizedException(
          'Confirme sua senha atual para trocar o e-mail.',
        );
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            nome: dto.nome,
            ...(trocaEmail
              ? { email: dto.email, emailVerificadoEm: null }
              : {}),
            ...(trocaTelefone
              ? { telefone: dto.telefone, telefoneVerificadoEm: null }
              : {}),
          },
          select: { id: true },
        });
        if (trocaEmail) {
          await this.tokens.invalidar(tx, clienteId, 'verificar_email');
          await this.tokens.invalidar(tx, clienteId, 'recuperar_senha');
        }
        if (trocaTelefone) {
          await this.tokens.invalidar(tx, clienteId, 'verificar_telefone');
        }
      });
    } catch (erro) {
      return traduzirConflito(this.prisma, erro, dto, clienteId);
    }

    const canais: Canal[] = [];
    if (trocaEmail) canais.push('email');
    if (trocaTelefone) canais.push('telefone');
    for (const canal of canais) {
      this.enviarCodigo(clienteId, canal, { contatoNovo: true }).catch(
        (erro: unknown) =>
          this.logger.error(
            `Falha ao enviar código (${canal}): ${String(erro)}`,
          ),
      );
    }
    return this.perfil(clienteId);
  }

  /** Troca a senha e derruba as outras sessões; devolve uma sessão nova para quem trocou. */
  async trocarSenha(
    clienteId: string,
    senhaAtual: string | undefined,
    novaSenha: string,
  ): Promise<SessaoCliente> {
    const atual = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: { senhaHash: true },
    });
    if (atual.senhaHash) {
      const senhaOk =
        senhaAtual !== undefined &&
        (await verificarSenha(senhaAtual, atual.senhaHash));
      if (!senhaOk) throw new UnauthorizedException('Senha atual incorreta.');
    }
    const cliente = await this.prisma.cliente.update({
      where: { id: clienteId },
      data: {
        senhaHash: await gerarHashSenha(novaSenha),
        versaoSessao: { increment: 1 },
      },
      select: SELECAO_SESSAO,
    });
    await this.tokens.invalidar(this.prisma, clienteId, 'recuperar_senha');
    return this.criarSessao(cliente);
  }

  private async criarSessao(cliente: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    emailVerificadoEm: Date | null;
    telefoneVerificadoEm: Date | null;
    senhaHash: string | null;
    versaoSessao: number;
  }): Promise<SessaoCliente> {
    const payload: PayloadJwtCliente = {
      sub: cliente.id,
      ver: cliente.versaoSessao,
    };
    return {
      cliente: paraClienteAutenticado(cliente),
      token: await this.jwt.signAsync(payload),
    };
  }

  private async enviarCodigo(
    clienteId: string,
    canal: Canal,
    opcoes: { contatoNovo?: boolean } = {},
  ): Promise<void> {
    const cliente = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      select: { nome: true, email: true, telefone: true },
    });
    if (canal === 'email') {
      const codigo = await this.tokens.emitir(
        clienteId,
        'verificar_email',
        opcoes,
      );
      await this.email.enviar({
        para: cliente.email,
        assunto: `${codigo} é seu código de verificação — Barbearia Novo Estilo`,
        texto:
          `Olá, ${cliente.nome}!\n\n` +
          `Seu código de verificação é: ${codigo}\n` +
          'Ele vale por 10 minutos.\n\n' +
          'Se você não criou uma conta na Barbearia Novo Estilo, ignore este e-mail.',
      });
    } else {
      const codigo = await this.tokens.emitir(
        clienteId,
        'verificar_telefone',
        opcoes,
      );
      await this.whatsapp.enviarCodigoVerificacao(cliente.telefone, codigo);
    }
  }
}
