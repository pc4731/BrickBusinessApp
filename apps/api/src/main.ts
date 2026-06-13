import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './create-app';

async function bootstrap() {
  const { app, config } = await createApp();
  app.enableShutdownHooks();

  const port = config.get('port', { infer: true });
  await app.listen(port);
  Logger.log(
    `API running on http://localhost:${port}/${config.get('apiPrefix', { infer: true })}`,
    'Bootstrap',
  );
}

void bootstrap();
