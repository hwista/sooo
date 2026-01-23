import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { CommonModule } from '../src/modules/common/common.module';
import { PmsModule } from '../src/modules/pms/pms.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const baseBuilder = () =>
    new DocumentBuilder()
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

  const commonDoc = SwaggerModule.createDocument(app, {
    ...baseBuilder(),
    info: { title: 'SSOO Common API', description: 'Common module API reference', version: '1.0.0' },
  }, { include: [CommonModule] });

  const pmsDoc = SwaggerModule.createDocument(app, {
    ...baseBuilder(),
    info: { title: 'SSOO PMS API', description: 'PMS module API reference', version: '1.0.0' },
  }, { include: [PmsModule] });
  await app.close();

  const commonDir = join(__dirname, '..', '..', '..', 'docs', 'common', 'reference', 'api');
  const commonFile = join(commonDir, 'openapi.json');
  await mkdir(commonDir, { recursive: true });
  await writeFile(commonFile, JSON.stringify(commonDoc, null, 2), 'utf8');

  const pmsDir = join(__dirname, '..', '..', '..', 'docs', 'pms', 'reference', 'api');
  const pmsFile = join(pmsDir, 'openapi.json');
  await mkdir(pmsDir, { recursive: true });
  await writeFile(pmsFile, JSON.stringify(pmsDoc, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`OpenAPI specs generated at:
- ${commonFile}
- ${pmsFile}`);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
