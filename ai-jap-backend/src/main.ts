import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { createWinstonConfig } from './common/logger/winston.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(createWinstonConfig('bootstrap')),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:5173',
  );
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // ─── Security ─────────────────────────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Middleware ────────────────────────────────────────────────────────────
  app.use(compression());
  app.use(cookieParser());

  // ─── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Global Pipes ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const loggerService = app.get(LoggerService);

  // ─── Global Filters ───────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter(loggerService));

  // ─── Global Interceptors ──────────────────────────────────────────────────
  app.useGlobalInterceptors(new LoggingInterceptor(loggerService));

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Job Application Platform API')
      .setDescription(
        'AI Powered Job Application Platform — automated job search, browser automation & AI-driven applications.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('Health', 'Health check endpoints')
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Profile', 'User profile management')
      .addTag('Resume', 'Resume management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`\n🚀 Server running on:  http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs:       http://localhost:${port}/api/docs`);
  console.log(`🌍 Environment:        ${nodeEnv}\n`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
