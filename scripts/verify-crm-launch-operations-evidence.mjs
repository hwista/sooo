#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const evidenceRoot = path.join(repoRoot, 'docs', 'crm', 'evidence', 'launch-operations');
const bt24Path = path.join(evidenceRoot, 'bt-24-database.json');
const bt25Path = path.join(evidenceRoot, 'bt-25-repo-release.json');
const bt25CrmLocalPath = path.join(evidenceRoot, 'bt-25-crm-local.json');
const bt26Path = path.join(evidenceRoot, 'bt-26-residue.json');
const operationsPrdPath = path.join(repoRoot, 'docs', 'crm', 'planning', 'launch-operations-prd.md');
const action = process.argv.slice(2).find((argument) => argument !== '--') ?? 'verify';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJson(filePath) {
  assert.ok(fs.existsSync(filePath), `required launch evidence is missing: ${path.relative(repoRoot, filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function tail(value, limit = 1_500) {
  const normalized = value.replace(/\x1b\[[0-9;]*m/g, '').trim();
  return normalized.length <= limit ? normalized : normalized.slice(-limit);
}

function runCheck(check) {
  const startedAt = new Date();
  process.stdout.write(`[crm-launch-repo] ${check.id}: ${check.command.join(' ')}\n`);
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(check.env ?? {}) },
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    id: check.id,
    command: check.command.join(' '),
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    outputTail: tail(`${result.stdout ?? ''}\n${result.stderr ?? ''}`),
  };
}

function countOpenApiOperations(document) {
  return Object.values(document.paths ?? {}).reduce((count, pathItem) => (
    count + ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
      .filter((method) => pathItem?.[method]).length
  ), 0);
}

function recordBt25() {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const startedAt = new Date();
  const checks = [
    {
      id: 'crm-local-tests-and-build',
      command: ['pnpm', 'run', 'verify:crm-local'],
      env: { CRM_LOCAL_VERIFICATION_REPORT_PATH: bt25CrmLocalPath },
    },
    { id: 'production-runtime-contract', command: ['pnpm', 'run', 'verify:crm-production-runtime-contract'] },
    { id: 'server-production-build', command: ['pnpm', 'run', 'build:server'] },
    { id: 'crm-production-build', command: ['pnpm', 'run', 'build:web-crm'] },
    { id: 'admin-production-build', command: ['pnpm', 'run', 'build:web-admin'] },
    { id: 'dms-production-build', command: ['pnpm', 'run', 'build:web-dms'] },
    { id: 'docs-and-openapi', command: ['pnpm', 'run', 'docs:verify'] },
    { id: 'codex-sync', command: ['pnpm', 'run', 'codex:verify-sync'] },
    { id: 'dms-guard', command: ['pnpm', 'run', 'codex:dms-guard'] },
    { id: 'production-security-audit-high', command: ['pnpm', 'run', 'security:audit:raw'] },
    { id: 'codex-preflight', command: ['pnpm', 'run', 'codex:preflight'] },
  ];
  const results = [];
  for (const check of checks) {
    const result = runCheck(check);
    results.push(result);
    if (result.status !== 'passed') break;
  }

  const openApiPaths = ['common', 'crm', 'dms', 'pms', 'sns'].map((domain) => (
    path.join(repoRoot, 'docs', domain, 'reference', 'api', 'openapi.json')
  ));
  const openApiDocuments = openApiPaths.map((filePath) => {
    const buffer = fs.readFileSync(filePath);
    return {
      path: path.relative(repoRoot, filePath),
      sha256: sha256(buffer),
      operationCount: countOpenApiOperations(JSON.parse(buffer.toString('utf8'))),
    };
  });
  const report = {
    contract: 'BT-25',
    status: results.length === checks.length && results.every((result) => result.status === 'passed') ? 'PASS' : 'FAIL',
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    credentialsStored: false,
    checks: results,
    crmLocalEvidence: {
      path: path.relative(repoRoot, bt25CrmLocalPath),
      sha256: fs.existsSync(bt25CrmLocalPath) ? sha256(fs.readFileSync(bt25CrmLocalPath)) : null,
    },
    openApi: {
      documents: openApiDocuments,
      operationCount: openApiDocuments.reduce((sum, document) => sum + document.operationCount, 0),
    },
    security: {
      command: 'pnpm audit --prod --audit-level high',
      highCriticalVulnerabilities: results.find((result) => result.id === 'production-security-audit-high')?.status === 'passed' ? 0 : null,
    },
  };
  fs.writeFileSync(bt25Path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ status: report.status, evidencePath: path.relative(repoRoot, bt25Path), openApiOperations: report.openApi.operationCount }, null, 2)}\n`);
  if (report.status !== 'PASS') process.exit(1);
}

function verifyEvidence() {
  const bt24Buffer = fs.readFileSync(bt24Path);
  const bt25Buffer = fs.readFileSync(bt25Path);
  const bt26Buffer = fs.readFileSync(bt26Path);
  const bt24 = JSON.parse(bt24Buffer.toString('utf8'));
  const bt25 = JSON.parse(bt25Buffer.toString('utf8'));
  const bt26 = JSON.parse(bt26Buffer.toString('utf8'));
  const crmLocal = readJson(bt25CrmLocalPath);

  assert.equal(bt24.contract, 'BT-24');
  assert.equal(bt24.status, 'PASS_CLEANED');
  assert.equal(bt24.isolation?.databaseResidue, 0);
  assert.equal(bt24.migration?.cleanDeploy, true);
  assert.equal(bt24.migration?.populatedBackfill, true);
  assert.equal(bt24.migration?.failedMigrationPartialObjectResidue, 0);
  assert.equal(bt24.rollbackRestore?.settingsRollbackExact, true);
  assert.equal(bt24.rollbackRestore?.populatedRestoreSignatureExact, true);
  assert.equal(bt24.databaseContract?.schemaDrift, 0);

  assert.equal(bt25.contract, 'BT-25');
  assert.equal(bt25.status, 'PASS');
  assert.equal(bt25.checks.length, 11);
  assert.equal(bt25.checks.every((check) => check.status === 'passed'), true);
  assert.ok(bt25.openApi?.operationCount > 0);
  assert.equal(bt25.security?.highCriticalVulnerabilities, 0);
  assert.equal(crmLocal.status, 'passed');
  assert.equal(sha256(fs.readFileSync(bt25CrmLocalPath)), bt25.crmLocalEvidence?.sha256);

  assert.equal(bt26.contract, 'BT-26');
  assert.equal(bt26.status, 'PASS_CLEANED');
  assert.equal(bt26.residue?.databaseExists, false);
  assert.equal(bt26.residue?.databaseRows, 0);
  assert.equal(bt26.residue?.runtimeFiles, 0);
  assert.equal(bt26.residue?.openTemporaryPorts, 0);

  const operationsPrd = fs.readFileSync(operationsPrdPath, 'utf8');
  for (const id of ['OPS-15', 'OPS-16', 'OPS-17']) {
    assert.match(operationsPrd, new RegExp(`\\| ${id} \\|[^\\n]+\\| 완료 \\|`), `${id} must be documented as 완료`);
  }

  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    operations: '17/17',
    evidence: {
      bt24: { sha256: sha256(bt24Buffer), residue: 0 },
      bt25: { sha256: sha256(bt25Buffer), highCritical: 0, openApiOperations: bt25.openApi.operationCount },
      bt26: { sha256: sha256(bt26Buffer), residue: 0 },
    },
  }, null, 2)}\n`);
}

if (action === 'record-bt25') recordBt25();
else if (action === 'verify') verifyEvidence();
else throw new Error(`Unknown action: ${action}. Use record-bt25 or verify.`);
