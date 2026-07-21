import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaBin = path.join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const baselineName = '0_launch_baseline';
const expectedMigrationNames = new Set([
  baselineName,
  '20260720010000_add_launch_native_constraints',
]);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. No default is allowed for baseline resolution.');
}
if (process.env.DB_BASELINE_RESOLVE_CONFIRM !== baselineName) {
  throw new Error(`Set DB_BASELINE_RESOLVE_CONFIRM=${baselineName} after backup/review to continue.`);
}

function runPrisma(args, { acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(prismaBin, args, {
      cwd: packageRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (!acceptedExitCodes.includes(code ?? 1)) {
        reject(new Error(`Prisma command failed (${args.join(' ')}), exit=${code}\n${stderr}`));
        return;
      }
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

const diff = await runPrisma(
  [
    'migrate',
    'diff',
    '--from-url',
    databaseUrl,
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--exit-code',
  ],
  { acceptedExitCodes: [0, 2] },
);
if (diff.code === 2) {
  throw new Error('Refusing to resolve the launch baseline because the target database has schema drift.');
}

const client = new Client({ connectionString: databaseUrl });
let alreadyApplied = false;
await client.connect();
try {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
     ) AS migration_table_exists`,
  );
  if (result.rows[0]?.migration_table_exists) {
    const migrationHistory = await client.query(
      `SELECT migration_name, finished_at, rolled_back_at
         FROM public._prisma_migrations
        ORDER BY started_at`,
    );
    const unexpectedMigrations = migrationHistory.rows.filter(
      (row) => !expectedMigrationNames.has(row.migration_name),
    );
    if (unexpectedMigrations.length > 0) {
      throw new Error(
        `Refusing to mix launch history with unexpected Prisma migrations: ${JSON.stringify(unexpectedMigrations)}`,
      );
    }

    const baselineRows = migrationHistory.rows.filter(
      (row) => row.migration_name === baselineName,
    );
    if (baselineRows.some((row) => !row.finished_at || row.rolled_back_at)) {
      throw new Error(`Resolve the failed/rolled-back ${baselineName} record before baseline adoption.`);
    }
    if (baselineRows.length > 0) {
      console.log(`[db-baseline] ${baselineName} is already applied`);
      alreadyApplied = true;
    }

    const nativeMigrationApplied = migrationHistory.rows.some(
      (row) => row.migration_name === '20260720010000_add_launch_native_constraints',
    );
    if (nativeMigrationApplied && !alreadyApplied) {
      throw new Error('Native launch migration exists without the launch baseline; refusing inconsistent history.');
    }
  }
} finally {
  await client.end();
}

if (!alreadyApplied) {
  await runPrisma([
    'migrate',
    'resolve',
    '--applied',
    baselineName,
    '--config',
    'prisma.launch.config.ts',
  ]);
}
await runPrisma(['migrate', 'deploy', '--config', 'prisma.launch.config.ts']);
await runPrisma(['migrate', 'status', '--config', 'prisma.launch.config.ts']);
console.log(`[db-baseline] resolved ${baselineName} and deployed pending launch migrations after zero-drift verification`);
