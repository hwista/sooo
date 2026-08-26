#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseRoot = path.join(repoRoot, 'packages', 'database');
const requireFromDatabase = createRequire(path.join(databaseRoot, 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const { Client } = requireFromDatabase('pg');

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const action = process.argv[2] ?? 'run';
const runId = (process.env.CRM_RALPH_RUN_ID ?? '20260819_s8').toLowerCase();
const apiBaseUrl = (process.env.CRM_RECOVERY_API_URL ?? 'http://127.0.0.1:4105/api').replace(/\/$/, '');
const markdownRoot = path.resolve(process.env.CRM_RECOVERY_MARKDOWN_ROOT ?? '/tmp/ssoo-crm-ralph-20260818-s5/markdown');
const storageRoot = path.resolve(process.env.CRM_RECOVERY_STORAGE_ROOT ?? '/tmp/ssoo-crm-ralph-20260818-s5/storage');
const evidencePath = path.join(repoRoot, 'output', 'playwright', 'crm-ralph', `${runId}-s10-operation-recovery.json`);
const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required.');

const databaseName = process.env.CRM_RALPH_DATABASE_NAME?.trim() || new URL(sourceDatabaseUrl).pathname.slice(1);
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`CRM recovery verification is restricted to an isolated ssoo_crm_ralph_* database, got ${databaseName}`);
}
const targetDatabaseUrl = new URL(sourceDatabaseUrl);
targetDatabaseUrl.pathname = `/${databaseName}`;
targetDatabaseUrl.searchParams.delete('schema');

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item));
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

async function writeEvidence(evidence) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(evidencePath, `${JSON.stringify(jsonSafe(evidence), null, 2)}\n`, 'utf8');
}

async function request(pathname, { token, method = 'GET', body, statuses = [200], headers = {} } = {}) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      'x-ssoo-app': 'crm',
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.ok(statuses.includes(response.status), `${method} ${pathname} expected ${statuses.join('/')}, got ${response.status}: ${text.slice(0, 800)}`);
  return { status: response.status, payload, text };
}

async function downloadArtifact(pathname, token) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    headers: { Authorization: `Bearer ${token}`, 'x-ssoo-app': 'crm' },
    signal: AbortSignal.timeout(30_000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200, `GET ${pathname} returned ${response.status}: ${bytes.toString('utf8', 0, 500)}`);
  return {
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    size: bytes.length,
    contentType: response.headers.get('content-type'),
  };
}

async function login() {
  const result = await request('/auth/login', {
    method: 'POST',
    body: {
      loginId: 'admin',
      password: process.env.CRM_RECOVERY_ADMIN_PASSWORD ?? 'admin123!',
    },
  });
  const token = result.payload?.data?.accessToken;
  assert.equal(typeof token, 'string', 'admin login did not return an access token');
  return token;
}

function assertIsoDate(label, value) {
  assert.equal(typeof value, 'string', `${label} must be an ISO timestamp`);
  assert.ok(Number.isFinite(Date.parse(value)), `${label} must be parseable`);
}

function assertAttemptMetadata(attempt, expected) {
  assert.equal(attempt.target, 'dms');
  assert.equal(attempt.action, 'quote-dms-lifecycle');
  assert.equal(attempt.sourceEntityType, 'crm.opportunity');
  assert.equal(attempt.sourceEntityId, expected.opportunityId);
  assert.equal(attempt.ownerHref, '/settings/operations/git');
  assert.equal(attempt.sourceHref, `/?selected=${encodeURIComponent(expected.opportunityId)}`);
  assert.match(attempt.correlationId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(attempt.requestedBy, expected.adminUserId);
  assertIsoDate('attempt.createdAt', attempt.createdAt);
  assertIsoDate('attempt.updatedAt', attempt.updatedAt);
  assertIsoDate('attempt.startedAt', attempt.startedAt);
  assertIsoDate('attempt.finishedAt', attempt.finishedAt);
}

async function selectCandidate(client) {
  const result = await client.query(`
    select
      o.opportunity_id as "id",
      o.opportunity_code as "opportunityCode",
      o.dms_link_status_code as "dmsLinkStatusCode",
      o.updated_by as "updatedBy",
      o.updated_at as "updatedAt",
      o.last_source as "lastSource",
      o.last_activity as "lastActivity",
      o.transaction_id as "transactionId",
      coalesce((
        select max(h.history_seq)
          from crm.crm_opportunity_h h
         where h.opportunity_id = o.opportunity_id
      ), 0) as "baselineHistorySeq"
      from crm.crm_opportunity_m o
     where o.is_active = true
       and o.confirmed = true
       and o.contract_created = false
       and not exists (
         select 1
           from crm.crm_opportunity_m newer
          where newer.opportunity_group_code = o.opportunity_group_code
            and newer.version_no > o.version_no
       )
       and not exists (
         select 1 from crm.crm_quote_dms_handoff_m h where h.opportunity_id = o.opportunity_id
       )
       and not exists (
         select 1
           from crm.crm_operation_attempt_m a
          where a.source_entity_type = 'crm.opportunity'
            and a.source_entity_id = o.opportunity_id::text
       )
     order by o.opportunity_id
     limit 1
  `);
  assert.equal(result.rowCount, 1, 'a clean confirmed opportunity is required for the isolated recovery test');
  return result.rows[0];
}

async function captureMutations(client, evidence) {
  if (!evidence.opportunity?.id || !evidence.startedAt) return evidence;
  const [attempts, handoffs, jobs, markdownFiles, storageFiles] = await Promise.all([
    client.query(`
      select operation_attempt_id as id
        from crm.crm_operation_attempt_m
       where source_entity_type = 'crm.opportunity'
         and source_entity_id = $1
         and created_at >= $2::timestamptz
       order by operation_attempt_id
    `, [evidence.opportunity.id, evidence.startedAt]),
    client.query(`
      select quote_dms_handoff_id as id
        from crm.crm_quote_dms_handoff_m
       where opportunity_id = $1::bigint
         and saved_at >= $2::timestamptz
       order by quote_dms_handoff_id
    `, [evidence.opportunity.id, evidence.startedAt]),
    client.query(`
      select ai_index_job_id as id
        from common.cm_ai_index_job_m
       where source_app_code = 'crm'
         and entity_type_code = 'opportunity'
         and entity_id = $1
         and requested_at >= $2::timestamptz
       order by ai_index_job_id
    `, [evidence.opportunity.id, evidence.startedAt]),
    listFiles(markdownRoot),
    listFiles(storageRoot),
  ]);
  const baseline = new Set(evidence.baselineFiles ?? []);
  return {
    ...evidence,
    attemptIds: attempts.rows.map((row) => row.id.toString()),
    handoffIds: handoffs.rows.map((row) => row.id.toString()),
    aiIndexJobIds: jobs.rows.map((row) => row.id.toString()),
    createdFiles: [...markdownFiles, ...storageFiles].filter((file) => !baseline.has(file)).sort(),
  };
}

async function runVerification(client) {
  const candidate = await selectCandidate(client);
  const adminUser = await client.query(`
    select u.user_id as id
      from common.cm_user_m u
      join common.cm_user_auth_m a on a.user_id = u.user_id
     where a.login_id = 'admin' and u.is_active = true and a.account_status_code = 'active'
     limit 1
  `);
  assert.equal(adminUser.rowCount, 1, 'active admin user was not found');
  const adminUserId = adminUser.rows[0].id.toString();
  const baselineFiles = [...await listFiles(markdownRoot), ...await listFiles(storageRoot)];
  const evidence = {
    contract: 'BT-21',
    status: 'RUNNING',
    databaseName,
    startedAt: new Date().toISOString(),
    apiBaseUrl,
    opportunity: {
      id: candidate.id.toString(),
      opportunityCode: candidate.opportunityCode,
      snapshot: {
        dmsLinkStatusCode: candidate.dmsLinkStatusCode,
        updatedBy: candidate.updatedBy?.toString() ?? null,
        updatedAt: candidate.updatedAt.toISOString(),
        lastSource: candidate.lastSource,
        lastActivity: candidate.lastActivity,
        transactionId: candidate.transactionId,
        baselineHistorySeq: candidate.baselineHistorySeq.toString(),
      },
    },
    baselineFiles,
    createdFiles: [],
    attemptIds: [],
    handoffIds: [],
    aiIndexJobIds: [],
    credentialsStored: false,
  };
  await writeEvidence(evidence);

  try {
    const token = await login();
    const opportunityId = evidence.opportunity.id;
    const preview = await request(`/crm/opportunities/${opportunityId}/quote-preview`, { token });
    const quotePreview = preview.payload?.data?.dmsDocument;
    assert.equal(quotePreview?.readiness, 'ready', `candidate quote readiness is ${quotePreview?.readiness}: ${JSON.stringify(quotePreview?.blockedReasons)}`);
    assert.equal(typeof quotePreview?.draftPathHint, 'string', 'quote preview did not provide a draft path hint');
    const expectedDraft = path.resolve(markdownRoot, quotePreview.draftPathHint);
    assert.ok(isContained(markdownRoot, expectedDraft), 'quote draft path escaped the isolated markdown root');
    await assert.rejects(fs.stat(expectedDraft), (error) => error?.code === 'ENOENT', 'candidate draft path already exists');

    const failure = await request(`/crm/opportunities/${opportunityId}/quote-dms-document-lifecycle-execution`, {
      token,
      method: 'POST',
      body: { memo: 'S10 BT-21 isolated failure before owner fix' },
      statuses: [400],
      headers: { 'x-idempotency-key': `s10-failure-${Date.now()}` },
    });
    assert.match(failure.text, /markdown 초안 handoff를 먼저 생성해야/i, 'failure response did not preserve the actionable cause');

    const afterFailure = await request(`/crm/operations/attempts?sourceEntityId=${encodeURIComponent(opportunityId)}&limit=20`, { token });
    const failedAttempts = afterFailure.payload?.data?.items ?? [];
    assert.equal(failedAttempts.length, 1, `expected one failed attempt, got ${failedAttempts.length}`);
    const failed = failedAttempts[0];
    assertAttemptMetadata(failed, { opportunityId, adminUserId });
    assert.equal(failed.status, 'failed');
    assert.equal(failed.retryable, true);
    assert.equal(failed.recoveryStatus, 'unresolved');
    assert.match(failed.recoverySummary, /원인을 owner 화면에서 수정한 뒤 안전 재시도/);
    assert.match(failed.errorMessage, /markdown 초안 handoff를 먼저 생성해야/i);
    assert.equal(afterFailure.payload?.data?.unresolvedFailedCount, 1);
    assert.equal(afterFailure.payload?.data?.recoveredFailedCount, 0);

    const failedDetail = await request(`/crm/operations/attempts/${failed.id}`, { token });
    assert.deepEqual(failedDetail.payload?.data, failed, 'failed attempt detail diverged from the canonical list contract');

    const draft = await request(`/crm/opportunities/${opportunityId}/quote-dms-document-draft`, {
      token,
      method: 'POST',
      body: { memo: 'S10 BT-21 owner cause fixed by creating the required draft' },
      statuses: [200, 201],
    });
    assert.equal(draft.payload?.data?.savedPath, quotePreview.draftPathHint, 'owner fix did not create the expected draft');

    const retried = await request(`/crm/operations/attempts/${failed.id}/retry`, {
      token,
      method: 'POST',
      statuses: [200, 201],
    });
    assert.equal(retried.payload?.data?.opportunityId, opportunityId, 'retry response did not target the original opportunity');

    const recoveredList = await request(`/crm/operations/attempts?sourceEntityId=${encodeURIComponent(opportunityId)}&limit=20`, { token });
    const recoveredItems = recoveredList.payload?.data?.items ?? [];
    assert.equal(recoveredItems.length, 2, `retry chain expected two attempts, got ${recoveredItems.length}`);
    const original = recoveredItems.find((item) => item.id === failed.id);
    const retry = recoveredItems.find((item) => item.retryOfAttemptId === failed.id);
    assert.ok(original && retry, 'retry chain did not preserve both original and child attempts');
    assertAttemptMetadata(original, { opportunityId, adminUserId });
    assertAttemptMetadata(retry, { opportunityId, adminUserId });
    assert.equal(original.status, 'failed', 'original failure evidence was overwritten');
    assert.equal(original.errorMessage, failed.errorMessage, 'original failure reason changed after recovery');
    assert.equal(original.recoveryStatus, 'recovered');
    assert.equal(original.retryable, false);
    assert.equal(retry.status, 'succeeded');
    assert.equal(retry.attemptNumber, 2);
    assert.equal(retry.rootAttemptId, failed.id);
    assert.equal(retry.correlationId, failed.correlationId);
    assert.equal(retry.recoveryStatus, 'recovered');
    assert.equal(recoveredList.payload?.data?.unresolvedFailedCount, 0);
    assert.equal(recoveredList.payload?.data?.recoveredFailedCount, 1);

    const hashesBeforeRepeat = {
      word: await downloadArtifact(`/crm/opportunities/${opportunityId}/quote-dms-artifacts/word-export`, token),
      pdf: await downloadArtifact(`/crm/opportunities/${opportunityId}/quote-dms-artifacts/pdf-export`, token),
    };
    assert.ok(hashesBeforeRepeat.word.size > 0 && hashesBeforeRepeat.pdf.size > 0, 'recovery artifacts must be non-empty');

    const beforeRepeatCount = recoveredItems.length;
    const repeat = await request(`/crm/operations/attempts/${failed.id}/retry`, {
      token,
      method: 'POST',
      statuses: [409],
    });
    assert.match(repeat.text, /중복 실행을 차단/i, 'repeat retry did not report duplicate execution prevention');
    const afterRepeat = await request(`/crm/operations/attempts?sourceEntityId=${encodeURIComponent(opportunityId)}&limit=20`, { token });
    assert.equal(afterRepeat.payload?.data?.items?.length, beforeRepeatCount, 'repeat retry created a duplicate attempt');
    const hashesAfterRepeat = {
      word: await downloadArtifact(`/crm/opportunities/${opportunityId}/quote-dms-artifacts/word-export`, token),
      pdf: await downloadArtifact(`/crm/opportunities/${opportunityId}/quote-dms-artifacts/pdf-export`, token),
    };
    assert.deepEqual(hashesAfterRepeat, hashesBeforeRepeat, 'repeat retry changed the recovered artifacts');

    const completed = await captureMutations(client, {
      ...evidence,
      status: 'PASS_RETAINED_FOR_BROWSER',
      completedAt: new Date().toISOString(),
      failure: {
        attemptId: failed.id,
        status: failed.status,
        errorMessage: failed.errorMessage,
        requestedBy: failed.requestedBy,
        createdAt: failed.createdAt,
        correlationId: failed.correlationId,
        ownerHref: failed.ownerHref,
        sourceHref: failed.sourceHref,
      },
      recovery: {
        retryAttemptId: retry.id,
        attemptNumber: retry.attemptNumber,
        status: retry.status,
        recoveryStatus: retry.recoveryStatus,
        correlationId: retry.correlationId,
      },
      repeatRetryStatus: repeat.status,
      duplicateAttempts: 0,
      artifactHashes: hashesBeforeRepeat,
    });
    delete completed.baselineFiles;
    assert.equal(completed.attemptIds.length, 2, 'database mutation scope must contain exactly two attempts');
    assert.equal(completed.handoffIds.length, 2, 'database mutation scope must contain exactly draft and execution handoffs');
    assert.ok(completed.createdFiles.length >= 5, `expected at least five created files, got ${completed.createdFiles.length}`);
    await writeEvidence(completed);
    process.stdout.write(`${JSON.stringify({
      status: 'PASS_RETAINED_FOR_BROWSER',
      databaseName,
      opportunityId,
      failureAttemptId: failed.id,
      retryAttemptId: retry.id,
      correlationId: retry.correlationId,
      repeatRetryStatus: repeat.status,
      duplicateAttempts: 0,
      createdFileCount: completed.createdFiles.length,
      evidencePath: path.relative(repoRoot, evidencePath),
    }, null, 2)}\n`);
  } catch (error) {
    const failedEvidence = await captureMutations(client, {
      ...evidence,
      status: 'FAILED_RETAINED_FOR_CLEANUP',
      failedAt: new Date().toISOString(),
      failureMessage: error instanceof Error ? error.message : String(error),
    });
    delete failedEvidence.baselineFiles;
    await writeEvidence(failedEvidence);
    throw error;
  }
}

async function removeCreatedFiles(createdFiles) {
  const roots = [markdownRoot, storageRoot];
  const directories = new Set();
  for (const file of createdFiles) {
    const absolute = path.resolve(file);
    const root = roots.find((candidate) => isContained(candidate, absolute));
    if (!root) throw new Error(`Refusing to remove a file outside isolated roots: ${absolute}`);
    await fs.rm(absolute, { force: true });
    let directory = path.dirname(absolute);
    while (isContained(root, directory)) {
      directories.add(directory);
      directory = path.dirname(directory);
    }
  }
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    try {
      await fs.rmdir(directory);
    } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY'].includes(error?.code)) throw error;
    }
  }
}

async function cleanupVerification(client) {
  const evidence = JSON.parse(await fs.readFile(evidencePath, 'utf8'));
  assert.equal(evidence.databaseName, databaseName, 'evidence database does not match the requested isolated database');
  assert.equal(evidence.contract, 'BT-21', 'evidence is not a BT-21 recovery run');
  const opportunity = evidence.opportunity;
  assert.ok(opportunity?.id && opportunity.snapshot, 'evidence does not include the opportunity snapshot');
  const attemptIds = evidence.attemptIds ?? [];
  const handoffIds = evidence.handoffIds ?? [];
  const aiIndexJobIds = evidence.aiIndexJobIds ?? [];

  await client.query('begin');
  try {
    if (aiIndexJobIds.length) {
      await client.query('delete from common.cm_ai_index_job_m where ai_index_job_id = any($1::bigint[])', [aiIndexJobIds]);
    }
    if (handoffIds.length) {
      await client.query('delete from crm.crm_quote_dms_handoff_m where quote_dms_handoff_id = any($1::bigint[])', [handoffIds]);
    }
    if (attemptIds.length) {
      await client.query('delete from crm.crm_operation_attempt_m where operation_attempt_id = any($1::bigint[])', [attemptIds]);
      await client.query('delete from crm.crm_operation_attempt_h where operation_attempt_id = any($1::bigint[])', [attemptIds]);
    }
    await client.query(`
      update crm.crm_opportunity_m
         set dms_link_status_code = $2,
             updated_by = $3::bigint,
             updated_at = $4::timestamptz,
             last_source = $5,
             last_activity = $6,
             transaction_id = $7::uuid
       where opportunity_id = $1::bigint
    `, [
      opportunity.id,
      opportunity.snapshot.dmsLinkStatusCode,
      opportunity.snapshot.updatedBy,
      opportunity.snapshot.updatedAt,
      opportunity.snapshot.lastSource,
      opportunity.snapshot.lastActivity,
      opportunity.snapshot.transactionId,
    ]);
    await client.query(`
      delete from crm.crm_opportunity_h
       where opportunity_id = $1::bigint
         and history_seq > $2::bigint
    `, [opportunity.id, opportunity.snapshot.baselineHistorySeq]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  await removeCreatedFiles(evidence.createdFiles ?? []);
  const residue = await client.query(`
    select
      (select count(*)::int from crm.crm_operation_attempt_m where operation_attempt_id = any($1::bigint[])) as attempts,
      (select count(*)::int from crm.crm_operation_attempt_h where operation_attempt_id = any($1::bigint[])) as attempt_history,
      (select count(*)::int from crm.crm_quote_dms_handoff_m where quote_dms_handoff_id = any($2::bigint[])) as handoffs,
      (select count(*)::int from common.cm_ai_index_job_m where ai_index_job_id = any($3::bigint[])) as ai_jobs
  `, [attemptIds, handoffIds, aiIndexJobIds]);
  const remainingFiles = [];
  for (const file of evidence.createdFiles ?? []) {
    try {
      await fs.stat(file);
      remainingFiles.push(file);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  assert.deepEqual(residue.rows[0], { attempts: 0, attempt_history: 0, handoffs: 0, ai_jobs: 0 });
  assert.equal(remainingFiles.length, 0, `created files remain after cleanup: ${remainingFiles.join(', ')}`);
  const cleaned = {
    ...evidence,
    status: 'PASS_CLEANED',
    cleanup: {
      cleanedAt: new Date().toISOString(),
      databaseRowsRemaining: residue.rows[0],
      filesRemaining: 0,
    },
  };
  await writeEvidence(cleaned);
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_CLEANED',
    databaseName,
    databaseRowsRemaining: residue.rows[0],
    filesRemaining: 0,
    evidencePath: path.relative(repoRoot, evidencePath),
  }, null, 2)}\n`);
}

if (!['run', 'cleanup'].includes(action)) {
  throw new Error('Use verify-crm-operation-recovery.mjs run|cleanup');
}

const client = new Client({ connectionString: targetDatabaseUrl.toString() });
await client.connect();
try {
  if (action === 'cleanup') await cleanupVerification(client);
  else await runVerification(client);
} finally {
  await client.end();
}
