#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

import {
  createDmsGoLiveGatePlan,
  DMS_GO_LIVE_REQUIRED_ASSETS,
  DMS_GO_LIVE_TRACK_IDS,
} from './dms-go-live-contract.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const selfTest = argv.includes('--self-test');
const help = argv.includes('--help');
const resume = argv.includes('--resume');
const runId = process.env.DMS_GO_LIVE_RUN_ID || createRunId();

if (!/^[A-Za-z0-9._-]+$/u.test(runId)) {
  throw new Error('DMS_GO_LIVE_RUN_ID may contain only letters, numbers, dot, underscore, and dash');
}
if (resume && !process.env.DMS_GO_LIVE_RUN_ID) {
  throw new Error('--resume requires an explicit DMS_GO_LIVE_RUN_ID');
}

if (help) {
  printUsage();
  process.exit(0);
}
if (selfTest) {
  runSelfTest();
  process.exit(0);
}

const envFile = path.resolve(process.env.DMS_GO_LIVE_ENV_FILE || '.env.production');
let evidenceDir = path.resolve(
  process.env.DMS_GO_LIVE_EVIDENCE_DIR || `output/dms-go-live/unresolved/${runId}`,
);
let evidencePath = path.resolve(
  process.env.DMS_GO_LIVE_EVIDENCE_PATH || path.join(evidenceDir, 'final-go-evidence.json'),
);
let checkpointPath = path.join(evidenceDir, 'checkpoint.json');
let report = createReport(runId);

try {
  if (!fs.existsSync(envFile)) throw new Error(`production environment file does not exist: ${envFile}`);
  const fileEnv = parseEnvFile(fs.readFileSync(envFile, 'utf8'));
  const releaseSha = fileEnv.SSOO_RELEASE_SHA || '';
  const localHead = runCapture('git', ['rev-parse', 'HEAD']).trim();
  if (!/^[0-9a-f]{40}$/u.test(releaseSha)) {
    throw new Error('SSOO_RELEASE_SHA must be a lowercase 40-character commit SHA');
  }
  if (releaseSha !== localHead) throw new Error('SSOO_RELEASE_SHA does not equal local HEAD');

  if (!process.env.DMS_GO_LIVE_EVIDENCE_DIR && !process.env.DMS_GO_LIVE_EVIDENCE_PATH) {
    evidenceDir = path.resolve(`output/dms-go-live/${releaseSha}/${runId}`);
    evidencePath = path.join(evidenceDir, 'final-go-evidence.json');
    checkpointPath = path.join(evidenceDir, 'checkpoint.json');
  }

  const localRuntimeDir = path.resolve(
    process.env.DMS_GO_LIVE_LOCAL_RUNTIME_DIR || path.join(os.tmpdir(), 'ssoo-dms-go-live-runtime', runId),
  );
  const localPostgresPort = process.env.DMS_GO_LIVE_LOCAL_POSTGRES_PORT || '55439';
  const localServerPort = process.env.DMS_GO_LIVE_LOCAL_SERVER_PORT || '24001';
  const localDmsPort = process.env.DMS_GO_LIVE_LOCAL_DMS_PORT || '23003';
  const localAdminPort = process.env.DMS_GO_LIVE_LOCAL_ADMIN_PORT || '23000';
  const localSmtpPort = process.env.DMS_GO_LIVE_LOCAL_SMTP_PORT || '22525';
  const localServerUrl = `http://127.0.0.1:${localServerPort}`;
  const localDmsUrl = `http://127.0.0.1:${localDmsPort}`;
  const localAdminUrl = `http://127.0.0.1:${localAdminPort}`;
  const gatePlan = createDmsGoLiveGatePlan({
    localRuntimeDir,
    localPostgresPort,
    localServerPort,
    localDmsPort,
    localAdminPort,
    localSmtpPort,
    localServerUrl,
    localDmsUrl,
    localAdminUrl,
    runId,
    evidenceDir,
  });
  const identity = {
    releaseSha,
    head: localHead,
    worktreeFingerprint: sha256(runCaptureBuffer('git', ['status', '--porcelain=v1', '-z'])),
    planHash: hashGatePlan(gatePlan),
  };

  const aiMode = fileEnv.DMS_AI_RAG_LAUNCH_MODE;
  if (!['exempted_external_provider', 'provider_ready'].includes(aiMode)) {
    throw new Error('DMS_AI_RAG_LAUNCH_MODE must be exempted_external_provider or provider_ready');
  }

  if (resume) {
    report = readCheckpoint(checkpointPath);
    validateResumeIdentity(report, { runId, ...identity });
    report.status = 'running';
    report.decision = 'NO_GO';
    report.resumedAt = [...(report.resumedAt ?? []), new Date().toISOString()];
  } else {
    if (fs.existsSync(checkpointPath) || fs.existsSync(evidencePath)) {
      throw new Error(`evidence already exists for run ${runId}; use --resume or choose a new DMS_GO_LIVE_RUN_ID`);
    }
    report = {
      ...report,
      status: 'running',
      releaseSha,
      head: localHead,
      worktreeFingerprint: identity.worktreeFingerprint,
      planHash: identity.planHash,
      evidenceDir,
      aiRag: aiMode === 'provider_ready'
        ? { status: 'REQUIRED_PROVIDER_PROOF', mode: aiMode, proofStatus: 'pending' }
        : {
          status: 'EXEMPTED_EXTERNAL_PROVIDER',
          mode: aiMode,
          scope: 'Azure/OpenAI provider-backed vector retrieval and AI summary smoke only',
          effect: 'Does not waive any release, infrastructure, recovery, endpoint, or browser failure.',
        },
    };
  }
  persistCheckpoint('initialized');

  const sharedEnv = {
    ...process.env,
    DMS_GO_LIVE_ENV_FILE: envFile,
    DMS_GO_LIVE_RUN_ID: runId,
    DMS_GO_LIVE_EVIDENCE_DIR: evidenceDir,
    PLAYWRIGHT_BASE_URL: fileEnv.NEXT_PUBLIC_DMS_APP_URL,
    PLAYWRIGHT_SKIP_WEB_SERVER: '1',
    DMS_GO_LIVE_API_URL: fileEnv.AUTH_PUBLIC_API_BASE_URL,
    DMS_GO_LIVE_DMS_URL: fileEnv.NEXT_PUBLIC_DMS_APP_URL,
    DMS_GO_LIVE_ADMIN_URL: fileEnv.NEXT_PUBLIC_ADMIN_APP_URL,
    DMS_AI_RAG_LAUNCH_MODE: aiMode,
    SSOO_TLS_CA_CERT_FILE: fileEnv.SSOO_TLS_CA_CERT_FILE || process.env.SSOO_TLS_CA_CERT_FILE || '',
    DMS_GO_LIVE_ENDPOINT_EVIDENCE_PATH:
      process.env.DMS_GO_LIVE_ENDPOINT_EVIDENCE_PATH || path.join(evidenceDir, 'public-endpoints.json'),
    WORKSPACE_RELEASE_EVIDENCE_PATH:
      process.env.WORKSPACE_RELEASE_EVIDENCE_PATH || path.join(evidenceDir, 'workspace-release.json'),
    DMS_BACKUP_EVIDENCE_PATH:
      process.env.DMS_BACKUP_EVIDENCE_PATH || path.join(evidenceDir, 'backup-restore.json'),
  };

  if (aiMode === 'provider_ready' && report.aiRag?.proofStatus !== 'passed') {
    report.aiRag.proofStatus = 'in_progress';
    persistCheckpoint('before:ai-rag-provider-proof');
    await runStep(
      'ai-rag-provider-proof',
      ['run', 'verify:ai-rag-runtime:ready'],
      sharedEnv,
      path.join(evidenceDir, 'logs', 'ai-rag-provider-proof.log'),
    );
    report.aiRag.proofStatus = 'passed';
    persistCheckpoint('after:ai-rag-provider-proof');
  } else if (aiMode === 'exempted_external_provider') {
    console.log('[go-live] AI/RAG: EXEMPTED_EXTERNAL_PROVIDER (explicit launch scope exception)');
  }

  for (const track of gatePlan) {
    let trackReport = report.tracks.find((candidate) => candidate.id === track.id);
    if (trackReport?.status === 'passed') {
      console.log(`[go-live] resume skip passed track: ${track.label}`);
      continue;
    }
    if (!trackReport) {
      trackReport = { id: track.id, label: track.label, status: 'pending', steps: [] };
      report.tracks.push(trackReport);
    }
    trackReport.status = 'in_progress';
    persistCheckpoint(`track:${track.id}:started`);
    console.log(`[go-live] track start: ${track.label}`);

    for (const [stepId, args, stepEnv] of track.steps) {
      let step = trackReport.steps.find((candidate) => candidate.id === stepId);
      if (step?.status === 'passed') {
        console.log(`[go-live] resume skip passed step: ${stepId}`);
        continue;
      }
      if (!step) {
        step = { id: stepId, status: 'pending', startedAt: null, finishedAt: null };
        trackReport.steps.push(step);
      }
      step.status = 'in_progress';
      step.startedAt = new Date().toISOString();
      step.finishedAt = null;
      delete step.error;
      persistCheckpoint(`before:${stepId}`);
      try {
        await runStep(
          stepId,
          args,
          { ...sharedEnv, ...(stepEnv ?? {}) },
          path.join(evidenceDir, 'logs', `${track.id}--${stepId}.log`),
        );
        step.status = 'passed';
        step.finishedAt = new Date().toISOString();
        persistCheckpoint(`after:${stepId}`);
      } catch (error) {
        step.status = 'failed';
        step.finishedAt = new Date().toISOString();
        step.error = sanitizeError(error);
        trackReport.status = 'failed';
        persistCheckpoint(`failed:${stepId}`);
        throw error;
      }
    }
    trackReport.status = 'passed';
    persistCheckpoint(`track:${track.id}:passed`);
  }

  assertEvidenceSecretFree(evidenceDir, sharedEnv);
  report.status = 'passed';
  report.decision = 'GO';
  report.finishedAt = new Date().toISOString();
  report.checkpointPhase = 'complete';
  atomicWriteJson(evidencePath, report);
  atomicWriteJson(checkpointPath, report);
  writeEvidenceManifest(evidenceDir);
  console.log(`[ok] DMS FINAL GO; release=${releaseSha}; run=${runId}; evidence=${evidencePath}`);
} catch (error) {
  report.status = 'failed';
  report.decision = 'NO_GO';
  report.finishedAt = new Date().toISOString();
  report.error = sanitizeError(error);
  report.checkpointPhase = report.checkpointPhase || 'initialization-failed';
  atomicWriteJson(evidencePath, report);
  if (fs.existsSync(path.dirname(checkpointPath))) atomicWriteJson(checkpointPath, report);
  writeEvidenceManifest(path.dirname(evidencePath));
  console.error(`[error] DMS FINAL NO-GO: ${sanitizeError(error)}; run=${runId}; evidence=${evidencePath}`);
  process.exitCode = 1;
}

function createReport(currentRunId) {
  return {
    schemaVersion: 2,
    runId: currentRunId,
    status: 'failed',
    decision: 'NO_GO',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    releaseSha: null,
    head: null,
    worktreeFingerprint: null,
    planHash: null,
    checkpointPhase: null,
    aiRag: null,
    tracks: [],
  };
}

function persistCheckpoint(phase) {
  report.checkpointPhase = phase;
  report.updatedAt = new Date().toISOString();
  atomicWriteJson(checkpointPath, report);
}

async function runStep(stepId, args, env, logPath) {
  console.log(`[go-live] running ${stepId}: pnpm ${args.join(' ')}`);
  fs.mkdirSync(path.dirname(logPath), { recursive: true, mode: 0o700 });
  const logStream = fs.createWriteStream(logPath, { flags: 'a', mode: 0o600 });
  const secrets = sensitiveValues(env);
  const child = spawn('pnpm', args, {
    cwd: repoRoot,
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const forward = (target, chunk) => {
    const safe = redactSecrets(String(chunk), secrets);
    target.write(safe);
    logStream.write(safe);
  };
  child.stdout.on('data', (chunk) => forward(process.stdout, chunk));
  child.stderr.on('data', (chunk) => forward(process.stderr, chunk));
  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (status, signal) => resolve({ status, signal }));
  }).finally(() => new Promise((resolve) => logStream.end(resolve)));
  if (result.status !== 0) {
    throw new Error(`${stepId} failed (${result.status ?? result.signal ?? 'spawn'}): command exited non-zero`);
  }
}

function runCapture(command, args) {
  return runCaptureBuffer(command, args).toString('utf8');
}

function runCaptureBuffer(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: null });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args[0]} failed`);
  return result.stdout || Buffer.alloc(0);
}

function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.replace(/^export\s+/u, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, '').trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const fd = fs.openSync(tempPath, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempPath, filePath);
  fs.chmodSync(filePath, 0o600);
}

function readCheckpoint(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`resume checkpoint does not exist: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`resume checkpoint is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateResumeIdentity(checkpoint, expected) {
  for (const key of ['runId', 'releaseSha', 'head', 'worktreeFingerprint', 'planHash']) {
    if (checkpoint[key] !== expected[key]) {
      throw new Error(`resume identity mismatch for ${key}; start a new run instead of reusing stale evidence`);
    }
  }
}

function hashGatePlan(gatePlan) {
  const signature = gatePlan.map((track) => ({
    id: track.id,
    steps: track.steps.map(([id, args, env]) => ({ id, args, envKeys: Object.keys(env ?? {}).sort() })),
  }));
  return sha256(Buffer.from(JSON.stringify(signature)));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sensitiveValues(env) {
  return Object.entries(env)
    .filter(([key, value]) => /(PASSWORD|TOKEN|SECRET|PRIVATE_KEY)/u.test(key) && String(value).length >= 4)
    .map(([, value]) => String(value));
}

function redactSecrets(value, secrets) {
  let result = value;
  for (const secret of secrets) result = result.split(secret).join('[redacted]');
  return result;
}

function assertEvidenceSecretFree(root, env) {
  const secrets = sensitiveValues(env);
  if (secrets.length === 0 || !fs.existsSync(root)) return;
  for (const filePath of listFiles(root)) {
    if (!/\.(json|jsonl|log|txt|xml)$/u.test(filePath)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    if (secrets.some((secret) => source.includes(secret))) {
      throw new Error(`evidence contains an unredacted secret: ${path.relative(root, filePath)}`);
    }
  }
}

function writeEvidenceManifest(root) {
  if (!fs.existsSync(root)) return;
  const manifestPath = path.join(root, 'manifest.json');
  const files = listFiles(root)
    .filter((filePath) => filePath !== manifestPath)
    .map((filePath) => ({
      path: path.relative(root, filePath),
      size: fs.statSync(filePath).size,
      sha256: sha256(fs.readFileSync(filePath)),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  atomicWriteJson(manifestPath, {
    schemaVersion: 1,
    runId,
    generatedAt: new Date().toISOString(),
    files,
  });
}

function listFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  };
  visit(root);
  return files;
}

function sanitizeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/(password|token|secret)=([^\s&]+)/giu, '$1=***')
    .replace(/(https?:\/\/)[^/@\s]+@/giu, '$1***@');
}

function createRunId() {
  return `${new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z')}-${process.pid}`;
}

function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-dms-go-live-self-test-'));
  try {
    const fixture = {
      localRuntimeDir: path.join(tempRoot, 'runtime'),
      localPostgresPort: '55439',
      localServerPort: '24001',
      localDmsPort: '23003',
      localAdminPort: '23000',
      localSmtpPort: '22525',
      localServerUrl: 'http://127.0.0.1:24001',
      localDmsUrl: 'http://127.0.0.1:23003',
      localAdminUrl: 'http://127.0.0.1:23000',
      runId: 'self-test',
      evidenceDir: path.join(tempRoot, 'evidence'),
    };
    const gatePlan = createDmsGoLiveGatePlan(fixture);
    const trackIds = gatePlan.map((track) => track.id);
    if (JSON.stringify(trackIds) !== JSON.stringify(DMS_GO_LIVE_TRACK_IDS)) {
      throw new Error(`expected canonical five launch tracks, received ${trackIds.join(', ')}`);
    }
    const stepIds = gatePlan.flatMap((track) => track.steps.map(([id]) => id));
    if (new Set(stepIds).size !== stepIds.length) throw new Error('go-live gate step IDs must be unique');
    for (const requiredPath of DMS_GO_LIVE_REQUIRED_ASSETS) {
      if (!fs.existsSync(path.join(repoRoot, requiredPath))) throw new Error(`required gate asset is missing: ${requiredPath}`);
    }

    const atomicPath = path.join(tempRoot, 'atomic', 'checkpoint.json');
    atomicWriteJson(atomicPath, { status: 'in_progress' });
    if (readCheckpoint(atomicPath).status !== 'in_progress') throw new Error('atomic checkpoint roundtrip failed');
    if (fs.readdirSync(path.dirname(atomicPath)).some((name) => name.includes('.tmp-'))) {
      throw new Error('atomic checkpoint left a temporary file behind');
    }

    const identity = {
      runId: 'self-test',
      releaseSha: 'a'.repeat(40),
      head: 'a'.repeat(40),
      worktreeFingerprint: 'b'.repeat(64),
      planHash: hashGatePlan(gatePlan),
    };
    validateResumeIdentity(identity, identity);
    let mismatchRejected = false;
    try {
      validateResumeIdentity({ ...identity, planHash: 'c'.repeat(64) }, identity);
    } catch {
      mismatchRejected = true;
    }
    if (!mismatchRejected) throw new Error('stale resume identity was accepted');
    console.log(`[ok] DMS final go-live self-test passed: ${trackIds.length} tracks, atomic checkpoint, stale-resume rejection`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function printUsage() {
  console.log(`Usage: pnpm run verify:dms-go-live [--resume]

Runs five fail-closed final Go tracks against one committed release SHA. Every step is
checkpointed atomically under output/dms-go-live/<release-sha>/<run-id>/ and every
Playwright/log/report artifact is hashed in manifest.json.

Resume an interrupted run only when release SHA, HEAD, worktree fingerprint, and plan
hash are unchanged:
  DMS_GO_LIVE_RUN_ID=<existing-run-id> pnpm run verify:dms-go-live -- --resume

AI/RAG must be explicitly set in .env.production as exempted_external_provider or
provider_ready. The external-provider exemption never suppresses another gate.

Options:
  --resume      Resume passed steps from an identity-matched atomic checkpoint
  --self-test   Verify topology, atomic checkpoint, and stale-resume rejection
  --help        Show this help`);
}
