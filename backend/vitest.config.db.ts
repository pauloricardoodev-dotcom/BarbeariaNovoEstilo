import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Testes de integração contra o banco de verdade (DATABASE_URL do .env).
// Criam dados com prefixo único e apagam tudo no final. Não rodam em `npm test`/`test:e2e`.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.db-spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    // Nunca fala com o Mercado Pago de verdade (pagamentos.db-spec injeta um gateway fake) e testa sempre
    // o bloqueio de conta não verificada, independentemente do .env local.
    env: { NODE_ENV: 'test', EXIGIR_CONTA_VERIFICADA: 'true', PAGAMENTO_PROVEDOR: 'desligado' },
  },
});
