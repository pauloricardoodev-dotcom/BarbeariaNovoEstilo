import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** Configuração HTTP compartilhada entre main.ts e os testes. */
export function configurarApp(app: INestApplication): void {
  // O frontend chama /api/... (proxy do Vite em dev; mesmo domínio em produção), então não há CORS.
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
