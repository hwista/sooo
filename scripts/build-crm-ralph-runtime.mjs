#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CRM_RALPH_BUILD_TARGETS,
  createCrmRalphBuildArtifact,
} from './crm-ralph-build-provenance.mjs';
import {
  createRepositoryWorktreeIdentity,
  sameRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = (process.env.CRM_RALPH_RUN_ID ?? '').trim().toLowerCase();
if (!/^[-_a-z0-9]+$/u.test(runId)) throw new Error('CRM_RALPH_RUN_ID is required and must be lowercase-safe');
const publicApiUrl = validateUrl(process.env.CRM_RALPH_PUBLIC_API_URL || 'http://127.0.0.1:4105/api', 'CRM_RALPH_PUBLIC_API_URL');
const publicWebSocketUrl = validateUrl(process.env.CRM_RALPH_PUBLIC_WS_URL || 'http://127.0.0.1:4105', 'CRM_RALPH_PUBLIC_WS_URL');
const reportPath = path.resolve(
  process.env.CRM_RALPH_BUILD_REPORT_PATH
    || path.join(repoRoot, 'output', 'playwright', 'crm-ralph', `${runId}-build-report.json`),
);
const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const sharedEnv = {
  ...process.env,
  NEXT_PUBLIC_API_URL: publicApiUrl,
  ADMIN_SERVER_API_URL: publicApiUrl,
  CRM_SERVER_API_URL: publicApiUrl,
  DMS_SERVER_API_URL: publicApiUrl,
  SERVER_API_URL: publicApiUrl,
  NEXT_PUBLIC_WS_URL: publicWebSocketUrl,
  NEXT_PUBLIC_ADMIN_APP_URL: 'http://127.0.0.1:3110',
  NEXT_PUBLIC_CRM_APP_URL: 'http://127.0.0.1:3105',
  NEXT_PUBLIC_PMS_APP_URL: 'http://127.0.0.1:3111',
  NEXT_PUBLIC_DMS_APP_URL: 'http://127.0.0.1:3113',
  NEXT_PUBLIC_SNS_APP_URL: 'http://127.0.0.1:3114',
};
const packageByTarget = {
  server: 'server',
  web: 'web-crm',
  admin: 'web-admin',
  dms: 'web-dms',
};
const startedAt = new Date();
const results = [];

for (const target of CRM_RALPH_BUILD_TARGETS) {
  const command = ['pnpm', 'exec', 'turbo', 'build', `--filter=${packageByTarget[target]}`, '--force'];
  const started = Date.now();
  process.stdout.write(`[crm-ralph-build] ${target}: ${command.join(' ')}\n`);
  const child = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    env: sharedEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 100 * 1024 * 1024,
  });
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  const result = {
    target,
    command: command.join(' '),
    status: child.status === 0 ? 'passed' : 'failed',
    exitCode: child.status,
    durationMs: Date.now() - started,
  };
  if (child.status === 0) {
    try {
      result.buildArtifact = createCrmRalphBuildArtifact({ repoRoot, target, publicApiUrl, publicWebSocketUrl });
    } catch (error) {
      result.status = 'failed';
      result.exitCode = 1;
      result.error = formatError(error);
    }
  }
  results.push(result);
  if (result.status !== 'passed') break;
}

const completedWorktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const worktreeUnchanged = sameRepositoryWorktreeIdentity(worktreeIdentity, completedWorktreeIdentity);
const report = {
  schemaVersion: 1,
  scope: 'crm-ralph-production-builds',
  status: results.length === CRM_RALPH_BUILD_TARGETS.length
    && results.every((result) => result.status === 'passed')
    && worktreeUnchanged
    ? 'passed'
    : 'failed',
  runId,
  worktreeIdentity,
  publicRuntime: { publicApiUrl, publicWebSocketUrl },
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  results,
  worktreeUnchanged,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`[crm-ralph-build] ${report.status}: ${path.relative(repoRoot, reportPath)}\n`);
if (report.status !== 'passed') process.exit(1);

function validateUrl(value, label) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${label} must use http or https`);
  if (parsed.username || parsed.password || parsed.hash) throw new Error(`${label} must not contain credentials or a fragment`);
  return parsed.toString().replace(/\/$/u, '');
}

function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
