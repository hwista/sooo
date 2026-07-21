import { spawn } from 'node:child_process';
import fs from 'node:fs';
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
const tsNodeBin = path.join(
  packageRoot,
  '..',
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node',
);
const expectedMigrationNames = [
  '0_launch_baseline',
  '20260720010000_add_launch_native_constraints',
];
const seedDirectory = path.join(packageRoot, 'prisma', 'seeds');
const sourceUrl = process.env.DATABASE_URL;

if (!sourceUrl) {
  throw new Error('DATABASE_URL is required to create the disposable launch-baseline database.');
}

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = `/${process.env.DB_BASELINE_ADMIN_DATABASE || 'postgres'}`;
adminUrl.searchParams.delete('schema');

const databaseName = `ssoo_baseline_verify_${process.pid}_${Date.now().toString(36)}`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${databaseName}`;
targetUrl.searchParams.delete('schema');

function quoteIdentifier(value) {
  if (!/^[a-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe generated database identifier: ${value}`);
  }
  return `"${value}"`;
}

function runPrisma(args, { acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(prismaBin, args, {
      cwd: packageRoot,
      env: {
        ...process.env,
        DATABASE_URL: targetUrl.toString(),
      },
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

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      env: {
        ...process.env,
        DATABASE_URL: targetUrl.toString(),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed (${command} ${args.join(' ')}), exit=${code}\n${stdout}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

const admin = new Client({ connectionString: adminUrl.toString() });
let adminConnected = false;
let databaseCreated = false;

try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  databaseCreated = true;
  console.log(`[db-baseline] created disposable database ${databaseName}`);

  await runPrisma(['migrate', 'deploy', '--config', 'prisma.launch.config.ts']);
  await runPrisma(['migrate', 'status', '--config', 'prisma.launch.config.ts']);

  const target = new Client({ connectionString: targetUrl.toString() });
  await target.connect();
  try {
    const migrationResult = await target.query(
      `SELECT migration_name, finished_at, rolled_back_at
         FROM public._prisma_migrations
        ORDER BY started_at`,
    );
    const appliedMigrationNames = migrationResult.rows.map((row) => row.migration_name);
    const migrationHistoryIsValid =
      migrationResult.rowCount === expectedMigrationNames.length
      && appliedMigrationNames.every((name, index) => name === expectedMigrationNames[index])
      && migrationResult.rows.every((row) => row.finished_at && !row.rolled_back_at);
    if (!migrationHistoryIsValid) {
      throw new Error(`Unexpected launch migration history: ${JSON.stringify(migrationResult.rows)}`);
    }

    const nativeContractResult = await target.query(
      `SELECT
         to_regclass('dms.dm_chat_session_m') IS NOT NULL AS chat_session_table_exists,
         to_regclass('crm.crm_business_plan_performance_actual_d') IS NOT NULL AS performance_table_exists,
         to_regclass('crm.crm_report_confirmation_m') IS NOT NULL AS confirmation_table_exists,
         (
           SELECT COUNT(*) = 6
             FROM pg_constraint
            WHERE conname IN (
              'ck_dm_chat_session_m_messages_array',
              'ck_pr_project_closeout_approval_step_m_target_type',
              'ck_pr_project_closeout_approval_step_m_status',
              'ck_pr_project_closeout_approval_step_m_sequence',
              'ck_pr_task_effort_log_m_actual_hours',
              'ck_pr_legacy_issue_archive_m_reason'
            )
         ) AS native_checks_exist,
         (
           SELECT COUNT(*) = 6
             FROM pg_indexes
            WHERE indexname IN (
              'ux_crm_report_confirmation_m_active_basis',
              'ux_pr_project_closeout_approval_step_m_sequence',
              'ux_crm_business_plan_m_confirmed_year',
              'ux_crm_contract_dms_handoff_m_active_contract_template',
              'ux_crm_quote_dms_handoff_m_active_opportunity_template',
              'ux_crm_cost_plan_accounting_handoff_m_active_basis'
            )
         ) AS native_partial_indexes_exist,
         EXISTS (
           SELECT 1
             FROM pg_trigger trigger_contract
             JOIN pg_class table_contract ON table_contract.oid = trigger_contract.tgrelid
             JOIN pg_namespace schema_contract ON schema_contract.oid = table_contract.relnamespace
            WHERE schema_contract.nspname = 'crm'
              AND table_contract.relname = 'crm_contract_m'
              AND trigger_contract.tgname = 'trg_crm_contract_m_h_record'
              AND trigger_contract.tgenabled <> 'D'
         ) AS contract_history_trigger_exists,
         EXISTS (
           SELECT 1
             FROM information_schema.columns
            WHERE table_schema = 'crm'
              AND table_name = 'crm_cost_plan_accounting_handoff_m'
              AND column_name = 'execution_evidence_snapshot'
         ) AS execution_evidence_column_exists`,
    );
    if (Object.values(nativeContractResult.rows[0] ?? {}).some((value) => value !== true)) {
      throw new Error(`Missing launch database contract: ${JSON.stringify(nativeContractResult.rows[0])}`);
    }

    const seedManifest = fs.readFileSync(path.join(seedDirectory, 'apply_all_seeds.sql'), 'utf8');
    const seedFiles = [...seedManifest.matchAll(/^\\i\s+([^\s]+)\s*$/gm)].map((match) => match[1]);
    if (seedFiles.length === 0) {
      throw new Error('No seed files found in prisma/seeds/apply_all_seeds.sql.');
    }
    for (const seedFile of seedFiles) {
      const seedSql = fs.readFileSync(path.join(seedDirectory, seedFile), 'utf8');
      await target.query(seedSql);
    }
    console.log(`[db-baseline] seed contract passed: ${seedFiles.length} files applied`);
  } finally {
    await target.end();
  }

  const triggerResult = await runCommand(tsNodeBin, [
    '--project',
    'tsconfig.json',
    'scripts/apply-triggers.ts',
  ]);
  const triggerSummary = triggerResult.stdout
    .split('\n')
    .filter((line) => /Source contract:|Database total:|Files applied:/.test(line))
    .join(' | ');
  console.log(`[db-baseline] trigger contract passed: ${triggerSummary}`);

  const diff = await runPrisma(
    [
      'migrate',
      'diff',
      '--from-url',
      targetUrl.toString(),
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--exit-code',
    ],
    { acceptedExitCodes: [0, 2] },
  );
  if (diff.code === 2) {
    throw new Error('Launch migration history does not reproduce prisma/schema.prisma without drift.');
  }

  console.log('[db-baseline] launch migration deploy/status/schema parity passed');
} finally {
  if (adminConnected) {
    if (databaseCreated) {
      await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
      console.log(`[db-baseline] removed disposable database ${databaseName}`);
    }
    await admin.end();
  }
}
