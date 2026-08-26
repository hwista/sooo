import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../dist/app.module.js';
import { CommonModule } from '../dist/modules/common/common.module.js';
import { CrmAccessModule } from '../dist/modules/crm/access/access.module.js';
import { CrmModule } from '../dist/modules/crm/crm.module.js';
import { DmsModule } from '../dist/modules/dms/dms.module.js';
import { PmsModule } from '../dist/modules/pms/pms.module.js';
import { SnsModule } from '../dist/modules/sns/sns.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const domains = [
  {
    key: 'common',
    title: 'SSOO Common API',
    description: 'Common module API reference',
    module: CommonModule,
  },
  {
    key: 'pms',
    title: 'SSOO PMS API',
    description: 'PMS module API reference',
    module: PmsModule,
  },
  {
    key: 'sns',
    title: 'SSOO SNS API',
    description: 'SNS module API reference',
    module: SnsModule,
  },
  {
    key: 'dms',
    title: 'SSOO DMS API',
    description: 'DMS module API reference',
    module: DmsModule,
  },
  {
    key: 'crm',
    title: 'SSOO CRM API',
    description: 'CRM module API reference',
    module: CrmModule,
  },
] as const;

function buildConfig(title: string, description: string) {
  return new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
}

function operationKeys(document: OpenAPIObject): Set<string> {
  const keys = new Set<string>();
  for (const [pathValue, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of Object.keys(pathItem ?? {})) {
      if (HTTP_METHODS.has(method)) {
        keys.add(`${method.toUpperCase()} ${pathValue}`);
      }
    }
  }
  return keys;
}

function partitionDuplicateOperations(documents: OpenAPIObject[]): void {
  const seen = new Set<string>();

  for (const document of documents) {
    for (const [pathValue, pathItem] of Object.entries(document.paths ?? {})) {
      for (const method of Object.keys(pathItem ?? {})) {
        if (!HTTP_METHODS.has(method)) {
          continue;
        }

        const key = `${method.toUpperCase()} ${pathValue}`;
        if (seen.has(key)) {
          delete pathItem[method as keyof typeof pathItem];
          continue;
        }
        seen.add(key);
      }

      const hasOperation = Object.keys(pathItem ?? {}).some((method) => HTTP_METHODS.has(method));
      if (!hasOperation) {
        delete document.paths[pathValue];
      }
    }
  }
}

function mergeSupplementalDocument(target: OpenAPIObject, supplemental: OpenAPIObject): void {
  target.paths = {
    ...supplemental.paths,
    ...target.paths,
  };
  target.components = {
    ...supplemental.components,
    ...target.components,
    schemas: {
      ...supplemental.components?.schemas,
      ...target.components?.schemas,
    },
    securitySchemes: {
      ...supplemental.components?.securitySchemes,
      ...target.components?.securitySchemes,
    },
  };
}

function assertExactRuntimeInventory(runtimeDocument: OpenAPIObject, documents: OpenAPIObject[]): void {
  const runtimeOperations = operationKeys(runtimeDocument);
  const generatedOperations = new Set(documents.flatMap((document) => [...operationKeys(document)]));
  const missing = [...runtimeOperations].filter((key) => !generatedOperations.has(key));
  const extra = [...generatedOperations].filter((key) => !runtimeOperations.has(key));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Generated OpenAPI domain inventory does not match runtime. missing=${missing.join(', ') || '(none)'} extra=${extra.join(', ') || '(none)'}`,
    );
  }
}

async function generate() {
  const skipRedoc = process.argv.includes('--skip-redoc');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const runtimeDocument = SwaggerModule.createDocument(
    app,
    buildConfig('SSOO API', 'SSOO runtime API reference'),
  );
  const documents = domains.map((domain) => SwaggerModule.createDocument(
    app,
    buildConfig(domain.title, domain.description),
    { include: [domain.module], deepScanRoutes: true },
  ));
  const appControllerDocument = SwaggerModule.createDocument(
    app,
    buildConfig('SSOO App Controllers', 'Controllers declared directly by AppModule'),
    { include: [AppModule], deepScanRoutes: false },
  );
  const crmAccessDocument = SwaggerModule.createDocument(
    app,
    buildConfig('SSOO CRM Access API', 'CRM access controller supplement'),
    { include: [CrmAccessModule], deepScanRoutes: false },
  );

  const commonDocument = documents.find((_document, index) => domains[index]?.key === 'common');
  const crmDocument = documents.find((_document, index) => domains[index]?.key === 'crm');
  if (!commonDocument || !crmDocument) {
    throw new Error('OpenAPI common/CRM document target is missing');
  }
  mergeSupplementalDocument(commonDocument, appControllerDocument);
  mergeSupplementalDocument(crmDocument, crmAccessDocument);

  partitionDuplicateOperations(documents);
  assertExactRuntimeInventory(runtimeDocument, documents);
  await app.close();

  for (const [index, domain] of domains.entries()) {
    const document = documents[index];
    if (!document) {
      throw new Error(`OpenAPI document missing for ${domain.key}`);
    }

    const outputDir = join(repoRoot, 'docs', domain.key, 'reference', 'api');
    const jsonFile = join(outputDir, 'openapi.json');
    const htmlFile = join(outputDir, 'index.html');
    await mkdir(outputDir, { recursive: true });
    await writeFile(jsonFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

    if (!skipRedoc) {
      execFileSync('pnpm', ['exec', 'redocly', 'build-docs', jsonFile, '-o', htmlFile], {
        cwd: repoRoot,
        stdio: 'inherit',
      });
    }

    console.log(
      `[openapi] ${domain.key}: ${operationKeys(document).size} operations -> ${jsonFile}${skipRedoc ? '' : `, ${htmlFile}`}`,
    );
  }

  console.log(`[openapi] runtime inventory matched: ${operationKeys(runtimeDocument).size} operations`);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
