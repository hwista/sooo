import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('SSOO API')
    .setDescription('SSOO API Reference')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  await app.close();

  const outputDir = join(__dirname, '..', '..', '..', 'docs', 'pms', 'reference', 'api');
  const outputFile = join(outputDir, 'openapi.json');

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, JSON.stringify(document, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`OpenAPI spec generated at ${outputFile}`);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
