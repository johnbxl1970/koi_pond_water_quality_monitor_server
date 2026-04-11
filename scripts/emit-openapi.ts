import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'yaml';
import { AppModule } from '../src/app.module';

async function emit() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Koi Pond Water Quality Monitor')
    .setDescription('Server API for pond telemetry, alerts, and recommendations')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('openapi.yaml', yaml.stringify(document));
  await app.close();
  console.log('Wrote openapi.yaml');
}

emit().catch((err) => {
  console.error(err);
  process.exit(1);
});
