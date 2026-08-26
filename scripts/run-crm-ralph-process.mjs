import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertCrmRalphBuildArtifact,
  createCrmRalphBuildArtifact,
  readCrmRalphBuildReport,
} from './crm-ralph-build-provenance.mjs';
import {
  assertRepositoryWorktreeIdentity,
  createRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePackageRoot = path.join(repoRoot, 'packages', 'database');
const requireFromDatabase = createRequire(path.join(databasePackageRoot, 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const target = process.argv[2];

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });
const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) {
  throw new Error('DATABASE_URL is required for the CRM Ralph process.');
}

const runId = (process.env.CRM_RALPH_RUN_ID ?? '20260818_s5').toLowerCase();
const databaseName = process.env.CRM_RALPH_DATABASE_NAME ?? `ssoo_crm_ralph_${runId}`;
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`Unsafe CRM Ralph database name: ${databaseName}`);
}
const targetDatabaseUrl = new URL(sourceDatabaseUrl);
targetDatabaseUrl.pathname = `/${databaseName}`;
targetDatabaseUrl.searchParams.delete('schema');
const runtimeManifestPath = path.join(repoRoot, 'output', 'playwright', 'crm-ralph', `${runId}-runtime-manifest.json`);
if (!fs.existsSync(runtimeManifestPath)) {
  throw new Error(`CRM Ralph runtime manifest is missing: ${path.relative(repoRoot, runtimeManifestPath)}. Run crm:ralph-runtime:create first.`);
}
const runtimeManifest = JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'));
if (runtimeManifest.schemaVersion !== 2 || runtimeManifest.databaseName !== databaseName || runtimeManifest.runId !== runId) {
  throw new Error('CRM Ralph runtime manifest does not match the requested schema/run/database.');
}
const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
assertRepositoryWorktreeIdentity(runtimeManifest.worktreeIdentity, worktreeIdentity, 'runtimeManifest.worktreeIdentity');
const runtimeRoot = `/tmp/ssoo-crm-ralph-${runId.replaceAll('_', '-')}`;
const publicApiUrl = process.env.CRM_RALPH_PUBLIC_API_URL || 'http://127.0.0.1:4105/api';
const publicWebSocketUrl = process.env.CRM_RALPH_PUBLIC_WS_URL || 'http://127.0.0.1:4105';
const { absolutePath: buildReportPath, report: buildReport } = readCrmRalphBuildReport({
  repoRoot,
  runId,
  reportPath: process.env.CRM_RALPH_BUILD_REPORT_PATH,
});
assertRepositoryWorktreeIdentity(buildReport.worktreeIdentity, worktreeIdentity, 'buildReport.worktreeIdentity');
if (
  buildReport.publicRuntime?.publicApiUrl !== publicApiUrl
  || buildReport.publicRuntime?.publicWebSocketUrl !== publicWebSocketUrl
) {
  throw new Error('CRM Ralph build report public runtime does not match the requested process runtime');
}

let command;
let args;
let cwd;
let env;

if (target === 'server') {
  loadEnv({ path: path.join(repoRoot, 'apps', 'server', '.env.local'), quiet: true, override: true });
  command = process.execPath;
  args = [path.join(repoRoot, 'apps', 'server', 'dist', 'main.js')];
  cwd = path.join(repoRoot, 'apps', 'server');
  env = {
    ...process.env,
    DATABASE_URL: targetDatabaseUrl.toString(),
    PORT: '4105',
    CORS_ORIGIN: [3100, 3105, 3110, 3111, 3113]
      .flatMap((port) => [`http://127.0.0.1:${port}`, `http://localhost:${port}`])
      .join(','),
    DMS_INSTANCE_ENV: 'local-test',
    DMS_GIT_BOOTSTRAP_REMOTE_URL: '',
    GIT_TERMINAL_PROMPT: '0',
    DMS_MARKDOWN_ROOT: path.join(runtimeRoot, 'markdown'),
    DMS_INGEST_QUEUE_PATH: path.join(runtimeRoot, 'ingest'),
    DMS_STORAGE_LOCAL_BASE_PATH: path.join(runtimeRoot, 'storage'),
  };
} else if (target === 'web') {
  const nextBin = path.join(repoRoot, 'apps', 'web', 'crm', 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
  command = nextBin;
  args = ['start', '--port', '3105'];
  cwd = path.join(repoRoot, 'apps', 'web', 'crm');
  env = {
    ...process.env,
    NODE_ENV: 'production',
    CRM_SERVER_API_URL: 'http://127.0.0.1:4105/api',
    SERVER_API_URL: 'http://127.0.0.1:4105/api',
    NEXT_PUBLIC_API_URL: publicApiUrl,
    PORT: '3105',
  };
} else if (target === 'admin') {
  const nextBin = path.join(repoRoot, 'apps', 'web', 'admin', 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
  command = nextBin;
  args = ['start', '--port', '3110'];
  cwd = path.join(repoRoot, 'apps', 'web', 'admin');
  env = {
    ...process.env,
    NODE_ENV: 'production',
    ADMIN_SERVER_API_URL: 'http://127.0.0.1:4105/api',
    SERVER_API_URL: 'http://127.0.0.1:4105/api',
    NEXT_PUBLIC_API_URL: publicApiUrl,
    PORT: '3110',
  };
} else if (target === 'dms') {
  const nextBin = path.join(repoRoot, 'apps', 'web', 'dms', 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
  command = nextBin;
  args = ['start', '--port', '3113'];
  cwd = path.join(repoRoot, 'apps', 'web', 'dms');
  env = {
    ...process.env,
    NODE_ENV: 'production',
    DMS_SERVER_API_URL: 'http://127.0.0.1:4105/api',
    SERVER_API_URL: 'http://127.0.0.1:4105/api',
    NEXT_PUBLIC_API_URL: publicApiUrl,
    NEXT_PUBLIC_WS_URL: publicWebSocketUrl,
    PORT: '3113',
  };
} else {
  throw new Error('Choose CRM Ralph process "server", "web", "admin", or "dms".');
}

const buildArtifact = createCrmRalphBuildArtifact({ repoRoot, target, publicApiUrl, publicWebSocketUrl });
const preparedTarget = buildReport.results?.find((result) => result.target === target && result.status === 'passed');
if (!preparedTarget?.buildArtifact) throw new Error(`CRM Ralph build report does not contain passed target ${target}`);
assertCrmRalphBuildArtifact(preparedTarget.buildArtifact, buildArtifact, `buildReport.results.${target}.buildArtifact`);
const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
try {
  updateRuntimeManifestProcess({
    target,
    processEntry: {
      target,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      worktreeIdentity,
      buildArtifact,
      buildReportPath: path.relative(repoRoot, buildReportPath),
      runtimeConfiguration: {
        publicApiUrl: target === 'server' ? null : publicApiUrl,
        publicWebSocketUrl: target === 'dms' ? publicWebSocketUrl : null,
        serverApiUrl: target === 'server' ? null : 'http://127.0.0.1:4105/api',
      },
      origin: target === 'server'
        ? 'http://127.0.0.1:4105'
        : target === 'web'
          ? 'http://127.0.0.1:3105'
          : target === 'admin'
            ? 'http://127.0.0.1:3110'
            : 'http://127.0.0.1:3113',
      credentialsStored: false,
    },
  });
} catch (error) {
  child.kill('SIGTERM');
  throw error;
}
let shutdownRequested = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdownRequested = true;
    child.kill(signal);
  });
}
child.on('error', (error) => {
  throw error;
});
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal && !shutdownRequested ? 1 : 0));
});

function updateRuntimeManifestProcess({ target: processTarget, processEntry }) {
  const lockPath = `${runtimeManifestPath}.lock`;
  const deadline = Date.now() + 15_000;
  let lockHandle;
  while (lockHandle === undefined) {
    try {
      lockHandle = fs.openSync(lockPath, 'wx', 0o600);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (ageMs > 30_000) {
        fs.unlinkSync(lockPath);
        continue;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out locking CRM Ralph runtime manifest: ${lockPath}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }

  const temporaryPath = `${runtimeManifestPath}.${process.pid}.${processTarget}.tmp`;
  try {
    fs.writeFileSync(lockHandle, `${JSON.stringify({ pid: process.pid, target: processTarget, acquiredAt: new Date().toISOString() })}\n`);
    const currentManifest = JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'));
    if (
      currentManifest.schemaVersion !== 2
      || currentManifest.databaseName !== databaseName
      || currentManifest.runId !== runId
    ) {
      throw new Error('CRM Ralph runtime manifest changed while registering the process.');
    }
    assertRepositoryWorktreeIdentity(currentManifest.worktreeIdentity, worktreeIdentity, 'runtimeManifest.worktreeIdentity');
    currentManifest.processes = {
      ...(currentManifest.processes ?? {}),
      [processTarget]: processEntry,
    };
    fs.writeFileSync(temporaryPath, `${JSON.stringify(currentManifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryPath, runtimeManifestPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    fs.closeSync(lockHandle);
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  }
}
