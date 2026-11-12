import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('LedgerFlowBootstrap');
  const app = await NestFactory.create(AppModule);

  // Global HTTP Configuration
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Cross-Origin Resource Sharing
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Strict Runtime Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger / OpenAPI Specification
  const config = new DocumentBuilder()
    .setTitle('LedgerFlow API')
    .setDescription(
      'Payment Reconciliation & Automated Billing Engine — High-concurrency B2B Multi-Tenant Platform.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT Token in Authorization header (Bearer <token>)',
      },
      'JWT-auth',
    )
    .addTag('Health', 'System and connectivity status')
    .addTag('Auth', 'Multi-tenant authentication and RBAC session generation')
    .addTag('Transactions', 'ACID transaction ingestion and invoice generation')
    .addTag('Reconciliation', 'Background batch ingestion and discrepancy resolution')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 LedgerFlow API is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📖 Swagger API documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
