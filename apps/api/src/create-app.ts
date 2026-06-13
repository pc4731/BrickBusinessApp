import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { Express } from 'express';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

/**
 * Builds and configures the Nest application. Shared by the long-running
 * server (main.ts) and the Vercel serverless handler (api/index.ts). Pass an
 * existing Express instance to mount Nest onto it for serverless use.
 */
export async function createApp(
  expressInstance?: Express,
): Promise<{ app: INestApplication; config: ConfigService<AppConfig, true> }> {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), { bufferLogs: false })
    : await NestFactory.create(AppModule, { bufferLogs: false });

  const config = app.get(ConfigService<AppConfig, true>);

  app.use(helmet());
  app.enableCors({
    origin: config.get('corsOrigin', { infer: true }),
    credentials: true,
  });
  app.setGlobalPrefix(config.get('apiPrefix', { infer: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  return { app, config };
}
