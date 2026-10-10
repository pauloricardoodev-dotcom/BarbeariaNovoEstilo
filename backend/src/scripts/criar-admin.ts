// Cria um usuário do painel admin, ou redefine a senha de um existente.
//
// Uso (em backend/):
//   npm run admin:criar -- --email dono@exemplo.com --nome "Nome do Dono" [--papel ADMIN|SUPPORT]
//   npm run admin:criar -- --email dono@exemplo.com --redefinir-senha
//
// A senha é pedida no terminal (ou lida de ADMIN_SENHA, para automação).
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { gerarHashSenha } from '../auth/senha.js';
import { PapelAdmin, PrismaClient } from '../generated/prisma/client.js';

const SENHA_MINIMO = 12;

function perguntarSenhaOculta(pergunta: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const saida = rl as unknown as {
    _writeToOutput: (s: string) => void;
    output: NodeJS.WriteStream;
  };
  let mascarar = false;
  saida._writeToOutput = (s: string) => {
    if (!mascarar || s.includes(pergunta)) saida.output.write(s);
  };
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      rl.close();
      process.stdout.write('\n');
      resolve(resposta);
    });
    mascarar = true;
  });
}

async function obterSenha(): Promise<string> {
  if (process.env.ADMIN_SENHA) return process.env.ADMIN_SENHA;
  const senha = await perguntarSenhaOculta('Senha: ');
  const confirmacao = await perguntarSenhaOculta('Confirme a senha: ');
  if (senha !== confirmacao) throw new Error('As senhas não conferem.');
  return senha;
}

async function main() {
  try {
    process.loadEnvFile();
  } catch {
    // Sem .env: usa as variáveis do ambiente.
  }

  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      nome: { type: 'string' },
      papel: { type: 'string', default: 'ADMIN' },
      'redefinir-senha': { type: 'boolean', default: false },
    },
  });

  const email = values.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Informe --email válido.');

  const papel = values.papel as PapelAdmin;
  if (!Object.values(PapelAdmin).includes(papel))
    throw new Error('--papel deve ser ADMIN ou SUPPORT.');

  const redefinir = values['redefinir-senha'];
  const nome = values.nome?.trim();
  if (!redefinir && !nome) throw new Error('Informe --nome.');

  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL não definida (veja .env.example).');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const existente = await prisma.usuarioAdmin.findUnique({
      where: { email },
    });
    if (redefinir && !existente)
      throw new Error(`Nenhum admin com o e-mail ${email}.`);
    if (!redefinir && existente) {
      throw new Error(
        `Já existe um admin com o e-mail ${email}. Use --redefinir-senha.`,
      );
    }

    const senha = await obterSenha();
    if (senha.length < SENHA_MINIMO) {
      throw new Error(
        `A senha deve ter pelo menos ${SENHA_MINIMO} caracteres.`,
      );
    }
    const senhaHash = await gerarHashSenha(senha);

    if (redefinir) {
      await prisma.usuarioAdmin.update({
        where: { email },
        data: { senhaHash },
      });
      console.log(`Senha de ${email} redefinida.`);
    } else {
      await prisma.usuarioAdmin.create({
        data: { nome: nome!, email, papel, senhaHash },
      });
      console.log(`Admin ${email} (${papel}) criado.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
