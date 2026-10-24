import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Valores só para teste; os specs substituem o PrismaService por um fake.
    env: {
      DATABASE_URL: 'postgresql://teste:teste@localhost:5432/teste',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
      NODE_ENV: 'test',
      // Os specs testam o bloqueio de conta não verificada, independentemente do .env local.
      EXIGIR_CONTA_VERIFICADA: 'true',
      PAGAMENTO_PROVEDOR: 'desligado',
    },
  },
});
