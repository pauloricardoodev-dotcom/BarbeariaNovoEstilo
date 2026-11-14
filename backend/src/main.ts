import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Atrás do proxy do Render, sem isso req.ip é o IP do proxy (igual para todos os
  // usuários) e o rate limit por IP bloqueia todo mundo junto. TRUST_PROXY = nº de proxies à frente.
  app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
  configurarApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
