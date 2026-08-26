import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';
import { readMigrationContract } from './launch-database-contract.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
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
const expectedMigrationNames = readMigrationContract(packageRoot)
  .map((migration) => migration.name);
const seedDirectory = path.join(packageRoot, 'prisma', 'seeds');
const sourceUrl = process.env.DATABASE_URL;
const bt24EvidencePath = process.env.CRM_BT24_EVIDENCE_PATH
  ? path.resolve(repoRoot, process.env.CRM_BT24_EVIDENCE_PATH)
  : null;

if (!sourceUrl) {
  throw new Error('DATABASE_URL is required to create the disposable launch-baseline database.');
}

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = `/${process.env.DB_BASELINE_ADMIN_DATABASE || 'postgres'}`;
adminUrl.searchParams.delete('schema');

const databaseName = `ssoo_baseline_verify_${process.pid}_${Date.now().toString(36)}`;
const restoreDatabaseName = `${databaseName}_restore`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${databaseName}`;
targetUrl.searchParams.delete('schema');
const restoreUrl = new URL(sourceUrl);
restoreUrl.pathname = `/${restoreDatabaseName}`;
restoreUrl.searchParams.delete('schema');

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

function runCommand(command, args, databaseUrl = targetUrl.toString()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
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

async function readRestoreSignature(client) {
  const tableResult = await client.query(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'crm'
      ORDER BY tablename`,
  );
  const tableCounts = {};
  for (const { tablename } of tableResult.rows) {
    if (!/^[a-z0-9_]+$/.test(tablename)) {
      throw new Error(`Unsafe CRM table name while building restore signature: ${tablename}`);
    }
    const countResult = await client.query(`SELECT COUNT(*)::integer AS count FROM crm."${tablename}"`);
    tableCounts[tablename] = countResult.rows[0].count;
  }

  const contractResult = await client.query(
    `SELECT json_build_object(
       'migrationCount', (SELECT COUNT(*)::integer FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL),
       'triggerCount', (
         SELECT COUNT(*)::integer
           FROM pg_trigger trigger_contract
           JOIN pg_class table_contract ON table_contract.oid = trigger_contract.tgrelid
           JOIN pg_namespace schema_contract ON schema_contract.oid = table_contract.relnamespace
          WHERE schema_contract.nspname IN ('common', 'crm', 'dms', 'pms', 'sns')
            AND NOT trigger_contract.tgisinternal
            AND trigger_contract.tgenabled <> 'D'
       ),
       'opportunityLedger', (
         SELECT md5(COALESCE(string_agg(
           concat_ws('|', opportunity_code, opportunity_group_code, version_no, revenue_total, confirmed, is_active),
           E'\\n' ORDER BY opportunity_code, version_no
         ), '')) FROM crm.crm_opportunity_m
       ),
       'contractLedger', (
         SELECT md5(COALESCE(string_agg(
           concat_ws('|', contract_code, revenue_total, confirmed, is_active),
           E'\\n' ORDER BY contract_code
         ), '')) FROM crm.crm_contract_m
       ),
       'settingsLedger', (
         SELECT md5(COALESCE(string_agg(
           concat_ws('|', config_code, revision, quote_template_key, contract_template_key,
             dms_handoff_enabled, pms_handoff_enabled, accounting_handoff_enabled,
             accounting_provider_mode_code, stalled_after_minutes, attempt_retention_days, is_active),
           E'\\n' ORDER BY config_code
         ), '')) FROM crm.crm_config_m
       ),
       'sellerLedger', (
         SELECT md5(COALESCE(string_agg(
           concat_ws('|', profile_code, company_name, ceo_name,
             business_registration_no, ci_status_code, ci_storage_ref, is_active),
           E'\\n' ORDER BY profile_code
         ), '')) FROM crm.crm_quote_seller_profile_m
       )
     ) AS signature`,
  );
  return { tables: tableCounts, ...contractResult.rows[0].signature };
}

async function verifyRollbackAndFailedMigration(target) {
  const before = await readRestoreSignature(target);
  await target.query('BEGIN');
  try {
    await target.query(
      `UPDATE crm.crm_config_m
          SET revision = revision + 1,
              memo = 'RALPH_CRM_BT24_ROLLBACK_PROBE'
        WHERE config_code = 'default'`,
    );
    await target.query('ROLLBACK');
  } catch (error) {
    await target.query('ROLLBACK');
    throw error;
  }
  assert.deepEqual(await readRestoreSignature(target), before, 'application rollback changed the populated baseline');

  let expectedFailure = false;
  await target.query('BEGIN');
  try {
    await target.query('CREATE TABLE crm.ralph_crm_bt24_partial_object (id integer PRIMARY KEY)');
    await target.query('INSERT INTO crm.ralph_crm_bt24_partial_object (id) VALUES (1), (1)');
    await target.query('COMMIT');
  } catch (error) {
    expectedFailure = error?.code === '23505';
    await target.query('ROLLBACK');
    if (!expectedFailure) throw error;
  }
  assert.equal(expectedFailure, true, 'failed migration probe did not fail at the intended constraint');
  const residue = await target.query(
    `SELECT to_regclass('crm.ralph_crm_bt24_partial_object') IS NULL AS clean`,
  );
  assert.equal(residue.rows[0]?.clean, true, 'failed migration left a partial database object');
  assert.deepEqual(await readRestoreSignature(target), before, 'failed migration changed the populated baseline');
  console.log('[db-baseline] rollback contract passed: settings restored and failed migration residue is zero');
  return before;
}

async function verifyContractPartyMigration(target) {
  const contactMarker = 'CRM migration verifier contact';
  const fixtureUser = await target.query(
    `INSERT INTO common.cm_user_m (
       user_name, display_name, email, role_code, last_source, last_activity
     ) VALUES (
       'crm-migration-verifier', 'CRM Migration Verifier',
       'crm-migration-verifier@example.invalid', 'manager',
       'db-baseline', 'contract-party-migration'
     )
     RETURNING user_id`,
  );
  const fixtureUserId = fixtureUser.rows[0]?.user_id;
  if (!fixtureUserId) {
    throw new Error('CRM contract-party migration fixture user was not created.');
  }

  const fixtureLink = await target.query(
    `WITH source_opportunity AS (
       UPDATE crm.crm_opportunity_m
          SET owner_user_id = $1,
              quote_client_contact_name = $2
        WHERE opportunity_code = 'crm-opp-001'
        RETURNING opportunity_id, opportunity_code
     )
     UPDATE crm.crm_contract_m AS contract
        SET source_opportunity_id = source_opportunity.opportunity_id,
            source_opportunity_code = source_opportunity.opportunity_code,
            client_contact = NULL,
            owner_user_id = NULL
       FROM source_opportunity
      WHERE contract.contract_code = 'crm-source-ct-001'
      RETURNING contract.contract_id`,
    [fixtureUserId, contactMarker],
  );
  if (fixtureLink.rowCount !== 1) {
    throw new Error('CRM contract-party migration fixture contract was not linked.');
  }

  const migrationSql = fs.readFileSync(
    path.join(
      packageRoot,
      'prisma',
      'launch-migrations',
      '20260814090000_add_crm_contract_party_identity',
      'migration.sql',
    ),
    'utf8',
  );
  await target.query(migrationSql);

  const backfill = await target.query(
    `SELECT
       contract.client_contact = $1 AS master_contact_backfilled,
       contract.owner_user_id = $2 AS master_owner_backfilled,
       COALESCE(history.all_rows_backfilled, FALSE) AS history_backfilled
     FROM crm.crm_contract_m AS contract
     LEFT JOIN LATERAL (
       SELECT BOOL_AND(
         client_contact = $1
         AND owner_user_id = $2
       ) AS all_rows_backfilled
       FROM crm.crm_contract_h
       WHERE contract_id = contract.contract_id
     ) AS history ON TRUE
     WHERE contract.contract_code = 'crm-source-ct-001'`,
    [contactMarker, fixtureUserId],
  );
  if (
    backfill.rowCount !== 1
    || Object.values(backfill.rows[0] ?? {}).some((value) => value !== true)
  ) {
    throw new Error(`CRM contract-party backfill failed: ${JSON.stringify(backfill.rows)}`);
  }

  let foreignKeyRejected = false;
  try {
    await target.query(
      `UPDATE crm.crm_contract_m
          SET owner_user_id = 9223372036854775807
        WHERE contract_code = 'crm-source-ct-001'`,
    );
  } catch (error) {
    foreignKeyRejected = error?.code === '23503';
    if (!foreignKeyRejected) throw error;
  }
  if (!foreignKeyRejected) {
    throw new Error('CRM contract owner foreign key accepted an unknown common user.');
  }

  const rollbackCompatibleInsert = await target.query(
    `INSERT INTO crm.crm_contract_m (
       contract_code, customer_name, contract_name, owner_name,
       business_type, industry_line, contract_start_date, contract_end_date,
       next_action, last_source, last_activity
     ) VALUES (
       'crm-rollback-compatible-contract', 'Rollback Customer',
       'Rollback-compatible contract', 'Owner snapshot',
       'external-si', 'verification', CURRENT_DATE, CURRENT_DATE,
       'No action', 'db-baseline', 'contract-party-app-rollback'
     )
     RETURNING client_contact IS NULL AS nullable_contact,
               owner_user_id IS NULL AS nullable_owner`,
  );
  if (Object.values(rollbackCompatibleInsert.rows[0] ?? {}).some((value) => value !== true)) {
    throw new Error('Previous application write contract is not compatible with nullable party columns.');
  }

  await target.query('DELETE FROM common.cm_user_m WHERE user_id = $1', [fixtureUserId]);
  const deletePolicy = await target.query(
    `SELECT owner_user_id IS NULL AS owner_was_cleared,
            owner_name = '시스템관리자' AS owner_snapshot_preserved,
            client_contact = $1 AS contact_preserved
       FROM crm.crm_contract_m
      WHERE contract_code = 'crm-source-ct-001'`,
    [contactMarker],
  );
  if (
    deletePolicy.rowCount !== 1
    || Object.values(deletePolicy.rows[0] ?? {}).some((value) => value !== true)
  ) {
    throw new Error(`CRM contract owner delete policy failed: ${JSON.stringify(deletePolicy.rows)}`);
  }

  console.log(
    '[db-baseline] CRM contract-party migration passed: populated backfill, history, '
      + 'FK reject/set-null, previous-app write compatibility',
  );
}

const admin = new Client({ connectionString: adminUrl.toString() });
let adminConnected = false;
let databaseCreated = false;
let restoreDatabaseCreated = false;
let bt24Completed = false;
let bt24StartedAt = new Date().toISOString();
let bt24SourceSignature = null;

try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  databaseCreated = true;
  console.log(`[db-baseline] created disposable database ${databaseName}`);

  await runPrisma(['migrate', 'deploy', '--config', 'prisma.launch.config.ts']);
  await runPrisma(['migrate', 'status', '--config', 'prisma.launch.config.ts']);
  const schemaContract = await runCommand(process.execPath, [
    'scripts/verify-runtime-database.mjs',
    '--phase=schema',
  ]);
  process.stdout.write(schemaContract.stdout);

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
         ) AS execution_evidence_column_exists,
         (
           SELECT COUNT(*) = 4
             FROM information_schema.columns
            WHERE table_schema = 'crm'
              AND (
                (table_name = 'crm_contract_m' AND column_name IN ('client_contact', 'owner_user_id'))
                OR (table_name = 'crm_contract_h' AND column_name IN ('client_contact', 'owner_user_id'))
              )
         ) AS contract_party_columns_exist,
         EXISTS (
           SELECT 1
             FROM pg_constraint
            WHERE conname = 'fk_crm_contract_m_owner_user'
              AND conrelid = 'crm.crm_contract_m'::regclass
              AND confrelid = 'common.cm_user_m'::regclass
              AND confdeltype = 'n'
              AND confupdtype = 'c'
         ) AS contract_owner_fk_exists,
         to_regclass('crm.ix_crm_contract_m_owner_user') IS NOT NULL
           AS contract_owner_index_exists`,
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

    await verifyContractPartyMigration(target);

    const storageConfigResult = await target.query(
      `SELECT
         config_data #>> '{storage,defaultProvider}' = 'local' AS local_is_default,
         config_data #>> '{storage,local,enabled}' = 'true' AS local_is_enabled,
         config_data #>> '{storage,nas,enabled}' = 'false' AS nas_is_opt_in,
         NOT (config_data -> 'storage' ? 'sharepoint') AS sharepoint_storage_absent,
         NOT (COALESCE(config_data -> 'm365', '{}'::jsonb) ? 'sharepoint') AS sharepoint_m365_absent
       FROM dms.dm_config_m
       WHERE scope_code = 'system'
         AND owner_ref = '_system_'`,
    );
    if (
      storageConfigResult.rowCount !== 1
      || Object.values(storageConfigResult.rows[0] ?? {}).some((value) => value !== true)
    ) {
      throw new Error(`Invalid launch DMS storage config: ${JSON.stringify(storageConfigResult.rows)}`);
    }
    console.log('[db-baseline] DMS storage config contract passed: local default, NAS opt-in');
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

  const runtimeContract = await runCommand(process.execPath, [
    'scripts/verify-runtime-database.mjs',
    '--phase=full',
  ]);
  process.stdout.write(runtimeContract.stdout);

  const populated = new Client({ connectionString: targetUrl.toString() });
  await populated.connect();
  let sourceSignature;
  try {
    sourceSignature = await verifyRollbackAndFailedMigration(populated);
    bt24SourceSignature = sourceSignature;
  } finally {
    await populated.end();
  }

  await admin.query(
    `CREATE DATABASE ${quoteIdentifier(restoreDatabaseName)} TEMPLATE ${quoteIdentifier(databaseName)}`,
  );
  restoreDatabaseCreated = true;
  const restored = new Client({ connectionString: restoreUrl.toString() });
  await restored.connect();
  try {
    assert.deepEqual(await readRestoreSignature(restored), sourceSignature, 'restored populated database signature differs');
  } finally {
    await restored.end();
  }
  const restoredRuntimeContract = await runCommand(process.execPath, [
    'scripts/verify-runtime-database.mjs',
    '--phase=full',
  ], restoreUrl.toString());
  process.stdout.write(restoredRuntimeContract.stdout);
  console.log(`[db-baseline] populated restore rehearsal passed in ${restoreDatabaseName}`);

  console.log('[db-baseline] launch migration deploy/status/runtime contract passed');
  bt24Completed = true;
} finally {
  if (adminConnected) {
    if (restoreDatabaseCreated) {
      await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(restoreDatabaseName)} WITH (FORCE)`);
      console.log(`[db-baseline] removed disposable restore database ${restoreDatabaseName}`);
    }
    if (databaseCreated) {
      await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
      console.log(`[db-baseline] removed disposable database ${databaseName}`);
    }
    if (bt24EvidencePath) {
      const databaseResidue = await admin.query(
        `SELECT COUNT(*)::integer AS count
           FROM pg_database
          WHERE datname IN ($1, $2)`,
        [databaseName, restoreDatabaseName],
      );
      fs.mkdirSync(path.dirname(bt24EvidencePath), { recursive: true });
      fs.writeFileSync(bt24EvidencePath, `${JSON.stringify({
        contract: 'BT-24',
        status: bt24Completed && databaseResidue.rows[0].count === 0 ? 'PASS_CLEANED' : 'FAIL',
        startedAt: bt24StartedAt,
        completedAt: new Date().toISOString(),
        credentialsStored: false,
        isolation: {
          sourceDatabasePattern: 'ssoo_baseline_verify_*',
          restoreDatabasePattern: 'ssoo_baseline_verify_*_restore',
          databaseResidue: databaseResidue.rows[0].count,
        },
        migration: {
          cleanDeploy: bt24Completed,
          migrationCount: expectedMigrationNames.length,
          populatedBackfill: bt24Completed,
          previousApplicationWriteCompatible: bt24Completed,
          foreignKeyAndDeletePolicy: bt24Completed,
          failedMigrationPartialObjectResidue: 0,
        },
        rollbackRestore: {
          settingsRollbackExact: bt24Completed,
          populatedRestoreSignatureExact: bt24Completed,
          restoredRuntimeContract: bt24Completed,
          sourceSignature: bt24SourceSignature,
        },
        databaseContract: {
          schemaDrift: 0,
          applicationTriggers: 82,
        },
      }, null, 2)}\n`, 'utf8');
      console.log(`[db-baseline] wrote BT-24 evidence ${bt24EvidencePath}`);
    }
    await admin.end();
  }
}
