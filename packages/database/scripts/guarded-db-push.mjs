import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertDisposableDbPushTarget } from './db-push-target.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaBin = path.join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const target = assertDisposableDbPushTarget({
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  baselineMode: process.env.DB_INIT_BASELINE_MODE,
});

console.log(`[db-push] disposable local target accepted: host=${target.host}, database=${target.databaseName}`);

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(prismaBin, ['db', 'push'], {
    cwd: packageRoot,
    env: process.env,
    stdio: 'inherit',
  });
  child.on('error', reject);
  child.on('close', (code) => resolve(code ?? 1));
});

process.exitCode = exitCode;
