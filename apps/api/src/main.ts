import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://tabibistan.org',
    'https://tabibistan.org',
    'http://www.tabibistan.org',
    'https://www.tabibistan.org',
    'http://api.tabibistan.org',
    'https://api.tabibistan.org',
    'http://admin.tabibistan.org',
    'https://admin.tabibistan.org',
    'http://tabibistan.com',
    'https://tabibistan.com',
    'http://www.tabibistan.com',
    'https://www.tabibistan.com',
    'http://admin.tabibistan.com',
    'https://admin.tabibistan.com',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.tabibistan.org') ||
        origin.endsWith('.tabibistan.com')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  // 'uploads' folder ko /uploads URL path par publicly serve karne ke liye
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log('Application started on port ' + port);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
