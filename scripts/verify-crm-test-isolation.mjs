#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const requireFromDatabase = createRequire(path.join(repoRoot, 'packages', 'database', 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const { Client } = requireFromDatabase('pg');

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const action = process.argv.slice(2).find((argument) => argument !== '--') ?? 'audit';
const sourceDatabaseUrl = process.env.DATABASE_URL;
assert.ok(sourceDatabaseUrl, 'DATABASE_URL is required');
const databaseName = process.env.CRM_RALPH_DATABASE_NAME?.trim();
assert.match(databaseName ?? '', /^ssoo_crm_ralph_[a-z0-9_]+$/, 'BT-26 is restricted to a named ssoo_crm_ralph_* database');

const adminUrl = new URL(sourceDatabaseUrl);
adminUrl.pathname = `/${process.env.DB_BASELINE_ADMIN_DATABASE || 'postgres'}`;
adminUrl.searchParams.delete('schema');
const targetUrl = new URL(sourceDatabaseUrl);
targetUrl.pathname = `/${databaseName}`;
targetUrl.searchParams.delete('schema');

const runtimeRoots = (process.env.CRM_RALPH_RUNTIME_ROOTS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => path.resolve(value));
for (const runtimeRoot of runtimeRoots) {
  assert.equal(path.dirname(runtimeRoot).startsWith('/tmp/ssoo-crm-ralph-') || runtimeRoot.startsWith('/tmp/ssoo-crm-ralph-'), true,
    `BT-26 runtime root must be an isolated /tmp/ssoo-crm-ralph-* path: ${runtimeRoot}`);
}

const ports = (process.env.CRM_RALPH_PROCESS_PORTS ?? '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0 && value < 65_536);
const evidencePath = path.resolve(
  process.env.CRM_BT26_EVIDENCE_PATH
    ?? path.join(repoRoot, 'docs', 'crm', 'evidence', 'launch-operations', action === 'audit' ? 'bt-26-pre-destroy.json' : 'bt-26-residue.json'),
);
const preDestroyPath = path.resolve(
  process.env.CRM_BT26_PRE_DESTROY_PATH
    ?? path.join(repoRoot, 'docs', 'crm', 'evidence', 'launch-operations', 'bt-26-pre-destroy.json'),
);

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function writeEvidence(report) {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(jsonSafe(report), null, 2)}\n`, 'utf8');
}

function fileInventory(root) {
  if (!fs.existsSync(root)) return { root, exists: false, files: 0, bytes: 0, digest: null };
  const entries = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const content = fs.readFileSync(absolute);
        entries.push({ path: path.relative(root, absolute), bytes: content.length, sha256: sha256(content) });
      }
    }
  };
  visit(root);
  return {
    root,
    exists: true,
    files: entries.length,
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    digest: sha256(Buffer.from(JSON.stringify(entries))),
  };
}

async function databaseExists(client) {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  return result.rowCount === 1;
}

async function tableCounts(client) {
  const tables = [
    'common.cm_user_session_m',
    'common.cm_user_session_h',
    'common.cm_user_password_reset_challenge_m',
    'common.cm_user_password_reset_challenge_h',
    'common.cm_auth_email_outbox_m',
    'common.cm_auth_email_outbox_h',
    'common.cm_ai_index_job_m',
    'crm.crm_config_h',
    'crm.crm_operation_attempt_m',
    'crm.crm_operation_attempt_h',
    'crm.crm_quote_dms_handoff_m',
    'crm.crm_opportunity_contract_dms_handoff_m',
    'crm.crm_contract_dms_handoff_m',
    'crm.crm_quote_seller_profile_h',
  ];
  const result = {};
  for (const table of tables) {
    const row = await client.query(`SELECT COUNT(*)::integer AS count FROM ${table}`);
    result[table] = row.rows[0].count;
  }
  return result;
}

async function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(750, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function audit() {
  assert.ok(runtimeRoots.length > 0, 'CRM_RALPH_RUNTIME_ROOTS is required for BT-26 audit');
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    assert.equal(await databaseExists(admin), true, `${databaseName} does not exist for the pre-destroy inventory`);
  } finally {
    await admin.end();
  }
  const target = new Client({ connectionString: targetUrl.toString() });
  await target.connect();
  let counts;
  try {
    counts = await tableCounts(target);
  } finally {
    await target.end();
  }
  const report = {
    contract: 'BT-26',
    phase: 'pre-destroy-inventory',
    status: 'ISOLATED_ACTIVE',
    capturedAt: new Date().toISOString(),
    credentialsStored: false,
    isolation: {
      databaseName,
      databasePatternValid: true,
      databaseExists: true,
      runtimeRoots: runtimeRoots.map(fileInventory),
      databaseRowsContained: counts,
    },
  };
  writeEvidence(report);
  process.stdout.write(`${JSON.stringify({ status: report.status, evidencePath: path.relative(repoRoot, evidencePath), databaseName }, null, 2)}\n`);
}

async function verifyDestroyed() {
  assert.ok(fs.existsSync(preDestroyPath), `BT-26 pre-destroy inventory is missing: ${preDestroyPath}`);
  const preDestroyBuffer = fs.readFileSync(preDestroyPath);
  const preDestroy = JSON.parse(preDestroyBuffer.toString('utf8'));
  assert.equal(preDestroy.contract, 'BT-26');
  assert.equal(preDestroy.phase, 'pre-destroy-inventory');
  assert.equal(preDestroy.status, 'ISOLATED_ACTIVE');
  assert.equal(preDestroy.isolation?.databaseName, databaseName);

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  let exists;
  try {
    exists = await databaseExists(admin);
  } finally {
    await admin.end();
  }
  const roots = runtimeRoots.map(fileInventory);
  const portResults = [];
  for (const port of ports) portResults.push({ port, open: await portIsOpen(port) });
  assert.equal(exists, false, `${databaseName} still exists after cleanup`);
  assert.deepEqual(roots.map((root) => root.exists), roots.map(() => false), 'an isolated runtime root still exists after cleanup');
  assert.equal(portResults.some((result) => result.open), false, 'a temporary CRM Ralph process port is still open');

  const report = {
    contract: 'BT-26',
    phase: 'post-destroy-verification',
    status: 'PASS_CLEANED',
    completedAt: new Date().toISOString(),
    credentialsStored: false,
    preDestroyEvidence: {
      path: path.relative(repoRoot, preDestroyPath),
      sha256: sha256(preDestroyBuffer),
      containedDatabaseRows: preDestroy.isolation.databaseRowsContained,
      containedRuntimeRoots: preDestroy.isolation.runtimeRoots,
    },
    residue: {
      databaseName,
      databaseExists: false,
      databaseRows: 0,
      runtimeRoots: roots,
      runtimeFiles: 0,
      temporaryPorts: portResults,
      openTemporaryPorts: 0,
    },
  };
  writeEvidence(report);
  process.stdout.write(`${JSON.stringify({ status: report.status, evidencePath: path.relative(repoRoot, evidencePath), residue: { databaseRows: 0, runtimeFiles: 0, openTemporaryPorts: 0 } }, null, 2)}\n`);
}

if (action === 'audit') await audit();
else if (action === 'verify-destroyed') await verifyDestroyed();
else throw new Error(`Unknown BT-26 action: ${action}. Use audit or verify-destroyed.`);
