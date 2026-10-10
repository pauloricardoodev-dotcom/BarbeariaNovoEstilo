import { defineConfig } from 'prisma/config';

// Prisma 7 não carrega o .env sozinho.
try {
  process.loadEnvFile();
} catch {
  // Sem .env (ex.: CI): usa as variáveis já presentes no ambiente.
}

// Migrations usam a conexão direta/session (DIRECT_URL); o runtime usa DATABASE_URL.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(url ? { datasource: { url } } : {}),
});
