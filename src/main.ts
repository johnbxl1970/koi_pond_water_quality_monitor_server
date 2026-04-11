import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfig } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Koi Pond Water Quality Monitor')
    .setDescription('Server API for pond telemetry, alerts, and recommendations')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(AppConfig);
  await app.listen(config.httpPort);
  Logger.log(`API listening on http://localhost:${config.httpPort}/api`, 'Bootstrap');
  Logger.log(`Swagger UI at http://localhost:${config.httpPort}/api/docs`, 'Bootstrap');
}

bootstrap();
