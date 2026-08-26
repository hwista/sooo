import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CRM_RALPH_BUILD_TARGETS,
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
const { Client } = requireFromDatabase('pg');
const evidenceRoot = path.join(repoRoot, 'output', 'playwright', 'crm-ralph');
const action = process.argv[2] ?? 'status';

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) {
  throw new Error('DATABASE_URL is required. Configure it in .env.local or the process environment.');
}

const runId = (process.env.CRM_RALPH_RUN_ID ?? '20260818_s5').toLowerCase();
const databaseName = process.env.CRM_RALPH_DATABASE_NAME ?? `ssoo_crm_ralph_${runId}`;
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`Unsafe CRM Ralph database name: ${databaseName}`);
}

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = `/${process.env.DB_BASELINE_ADMIN_DATABASE || 'postgres'}`;
adminUrl.searchParams.delete('schema');

const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${databaseName}`;
targetUrl.searchParams.delete('schema');

const prismaBin = path.join(
  databasePackageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);
const tsNodeBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node',
);
const manifestPath = path.join(evidenceRoot, `${runId}-runtime-manifest.json`);
const runtimeRoot = path.resolve('/tmp', `ssoo-crm-ralph-${runId.replaceAll('_', '-')}`);
if (!runtimeRoot.startsWith('/tmp/ssoo-crm-ralph-') || path.dirname(runtimeRoot) !== '/tmp') {
  throw new Error(`Unsafe CRM Ralph runtime root: ${runtimeRoot}`);
}

function quoteIdentifier(value) {
  return `"${value}"`;
}

function run(command, args, cwd = databasePackageRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, DATABASE_URL: targetUrl.toString() },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit ${code}: ${command} ${args.join(' ')}`));
        return;
      }
      resolve();
    });
  });
}

async function databaseExists(admin) {
  const result = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  return result.rowCount === 1;
}

async function dropDatabase(admin) {
  await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
}

async function createRuntime(admin) {
  if (await databaseExists(admin)) {
    throw new Error(`${databaseName} already exists. Destroy it explicitly before creating a fresh runtime.`);
  }

  const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
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
    throw new Error('CRM Ralph build report public runtime does not match the requested isolated runtime');
  }
  for (const target of CRM_RALPH_BUILD_TARGETS) {
    const preparedTarget = buildReport.results?.find((result) => result.target === target && result.status === 'passed');
    if (!preparedTarget?.buildArtifact) throw new Error(`CRM Ralph build report does not contain passed target ${target}`);
    const currentArtifact = createCrmRalphBuildArtifact({ repoRoot, target, publicApiUrl, publicWebSocketUrl });
    assertCrmRalphBuildArtifact(preparedTarget.buildArtifact, currentArtifact, `buildReport.results.${target}.buildArtifact`);
  }

  let created = false;
  try {
    await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    created = true;
    process.stdout.write(`[crm-ralph] created isolated database ${databaseName}\n`);

    await run(prismaBin, ['migrate', 'deploy', '--config', 'prisma.launch.config.ts']);

    const seedDirectory = path.join(databasePackageRoot, 'prisma', 'seeds');
    const seedManifest = fs.readFileSync(path.join(seedDirectory, 'apply_all_seeds.sql'), 'utf8');
    const seedFiles = [...seedManifest.matchAll(/^\\i\s+([^\s]+)\s*$/gm)].map((match) => match[1]);
    if (seedFiles.length === 0) {
      throw new Error('No seed files found in apply_all_seeds.sql.');
    }

    const target = new Client({ connectionString: targetUrl.toString() });
    await target.connect();
    try {
      for (const seedFile of seedFiles) {
        await target.query(fs.readFileSync(path.join(seedDirectory, seedFile), 'utf8'));
      }
    } finally {
      await target.end();
    }
    process.stdout.write(`[crm-ralph] applied ${seedFiles.length} ordered seed files\n`);

    await run(tsNodeBin, ['--project', 'tsconfig.json', 'scripts/apply-triggers.ts']);
    await run(process.execPath, ['scripts/verify-runtime-database.mjs', '--phase=full']);

    fs.mkdirSync(evidenceRoot, { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify({
      schemaVersion: 2,
      runId,
      databaseName,
      createdAt: new Date().toISOString(),
      isolation: 'dedicated-postgresql-database',
      worktreeIdentity,
      buildPreparation: {
        reportPath: path.relative(repoRoot, buildReportPath),
        publicRuntime: buildReport.publicRuntime,
        targets: Object.fromEntries(buildReport.results.map((result) => [result.target, {
          status: result.status,
          fingerprint: result.buildArtifact?.fingerprint ?? null,
          fileCount: result.buildArtifact?.fileCount ?? 0,
        }])),
      },
      seedManifest: 'packages/database/prisma/seeds/apply_all_seeds.sql',
      sourceReference: 'docs/crm/evidence/source-uiux/ref-01/source-uiux-manifest.json',
      serverOrigin: 'http://127.0.0.1:4105',
      crmOrigin: 'http://127.0.0.1:3105',
      adminOrigin: 'http://127.0.0.1:3110',
      dmsOrigin: 'http://127.0.0.1:3113',
      processes: {},
      credentialsStored: false,
    }, null, 2)}\n`, 'utf8');
    process.stdout.write(`[crm-ralph] runtime manifest ${path.relative(repoRoot, manifestPath)}\n`);
  } catch (error) {
    if (created) {
      await dropDatabase(admin);
      process.stderr.write(`[crm-ralph] removed incomplete database ${databaseName}\n`);
    }
    throw error;
  }
}

const admin = new Client({ connectionString: adminUrl.toString() });
await admin.connect();
try {
  if (action === 'create') {
    await createRuntime(admin);
  } else if (action === 'destroy') {
    await dropDatabase(admin);
    if (fs.existsSync(runtimeRoot)) {
      fs.rmSync(runtimeRoot, { recursive: true, force: true });
    }
    if (fs.existsSync(manifestPath)) {
      fs.rmSync(manifestPath);
    }
    process.stdout.write(`[crm-ralph] destroyed isolated database ${databaseName} and runtime root ${runtimeRoot}\n`);
  } else if (action === 'status') {
    process.stdout.write(`${JSON.stringify({
      runId,
      databaseName,
      exists: await databaseExists(admin),
      manifestPath: path.relative(repoRoot, manifestPath),
      manifestExists: fs.existsSync(manifestPath),
      runtimeRoot,
      runtimeRootExists: fs.existsSync(runtimeRoot),
    })}\n`);
  } else {
    throw new Error(`Unknown action "${action}". Use create, status, or destroy.`);
  }
} finally {
  await admin.end();
}
