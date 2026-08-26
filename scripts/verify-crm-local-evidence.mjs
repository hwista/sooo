#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createRepositoryWorktreeIdentity,
  REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES,
  sameRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';

const repoRoot = process.cwd();

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  reportPath: readOption('report-path', 'CRM_LOCAL_VERIFICATION_REPORT_PATH', ''),
};
assertReportPathDoesNotAffectIdentity(config.reportPath);
const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });

const CRM_SERVER_TEST_TARGETS = [
  'src/modules/crm',
  'src/modules/dms/crm-contract-lifecycle',
  'src/modules/dms/crm-quote-lifecycle',
  'src/modules/pms/project/project-handoff-contract.service.spec.ts',
];
const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-local-'));
const crmServerJestReportPath = path.join(artifactDir, 'crm-server-jest.json');

const checks = [
  {
    id: 'crm-launch-static-readiness',
    requirement: 'CRM static readiness source gate passes.',
    command: ['node', 'scripts/verify-crm-launch-readiness.mjs'],
  },
  {
    id: 'crm-server-unit-and-boundary-tests',
    requirement: 'CRM server unit tests and DMS/PMS CRM boundary tests pass.',
    command: [
      'pnpm',
      '-C',
      'apps/server',
      'test',
      '--runInBand',
      '--json',
      `--outputFile=${crmServerJestReportPath}`,
      ...CRM_SERVER_TEST_TARGETS,
    ],
    evidenceReader: () => readJestEvidence(crmServerJestReportPath),
  },
  {
    id: 'crm-web-production-build',
    requirement: 'web-crm production build passes with route generation and type checks.',
    command: ['pnpm', 'build:web-crm'],
  },
];

if (config.help) {
  printUsage();
  process.exit(0);
}

const startedAt = new Date();
const results = checks.map(runCheck);
const completedWorktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const worktreeUnchanged = sameRepositoryWorktreeIdentity(worktreeIdentity, completedWorktreeIdentity);
results.push({
  id: 'worktree-identity-unchanged',
  requirement: 'Repository file contents remain unchanged throughout CRM local verification.',
  command: 'internal repository worktree identity comparison',
  status: worktreeUnchanged ? 'passed' : 'failed',
  exitCode: worktreeUnchanged ? 0 : 1,
  durationMs: 0,
  evidence: {
    started: worktreeIdentity,
    completed: completedWorktreeIdentity,
  },
});
const finishedAt = new Date();
const report = {
  schemaVersion: 2,
  status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
  worktreeIdentity,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  checks: results,
};

writeReport(config.reportPath, report);
printSummary(report);

if (report.status !== 'passed') {
  process.exit(1);
}

function runCheck(check) {
  const started = Date.now();
  console.log(`[crm-local] running ${check.id}: ${formatCommand(check.command)}`);
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 80 * 1024 * 1024,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }

  return {
    id: check.id,
    requirement: check.requirement,
    command: formatCommand(check.command),
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    durationMs: Date.now() - started,
    evidence: check.evidenceReader?.() ?? summarizeOutput(`${stdout}${stderr}` || result.error?.message || ''),
  };
}

function readJestEvidence(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return {
      reportPath,
      summary: 'missing jest json report',
    };
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  return {
    reportPath,
    success: report.success === true,
    numTotalTestSuites: report.numTotalTestSuites,
    numPassedTestSuites: report.numPassedTestSuites,
    numFailedTestSuites: report.numFailedTestSuites,
    numTotalTests: report.numTotalTests,
    numPassedTests: report.numPassedTests,
    numFailedTests: report.numFailedTests,
    testResults: Array.isArray(report.testResults)
      ? report.testResults.map((result) => ({
        name: path.relative(process.cwd(), result.name),
        status: result.status,
        assertionResults: Array.isArray(result.assertionResults) ? result.assertionResults.length : 0,
      }))
      : [],
  };
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1]) {
    return argv[index + 1];
  }
  return process.env[envName] || fallback;
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }
  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote CRM local verification report: ${absolutePath}`);
}

function assertReportPathDoesNotAffectIdentity(reportPath) {
  if (!reportPath) return;
  const absolutePath = path.resolve(reportPath);
  const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join('/');
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return;
  if (REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) return;
  throw new Error(
    'CRM local verification report must be outside the repository or under an excluded evidence path '
      + `(${REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES.join(', ')}) so it cannot invalidate its own worktree identity`,
  );
}

function printSummary(report) {
  console.log(`CRM local verification: ${report.status}`);
  for (const check of report.checks) {
    const marker = check.status === 'passed' ? '✓' : '✗';
    console.log(`${marker} ${check.id} (${check.durationMs}ms)`);
  }
}

function summarizeOutput(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  return lines.slice(-80).join('\n');
}

function formatCommand(command) {
  return command.map(quoteCommandArg).join(' ');
}

function quoteCommandArg(value) {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function printUsage() {
  console.log(`Usage: node scripts/verify-crm-local-evidence.mjs [--report-path <path>]

Runs the local CRM migration verification pack:
- node scripts/verify-crm-launch-readiness.mjs
- pnpm -C apps/server test --runInBand --json --outputFile=<tmp>/crm-server-jest.json ${CRM_SERVER_TEST_TARGETS.join(' ')}
- pnpm build:web-crm

Options:
  --report-path <path>  Write a JSON report outside the repository or under output/. Also supported by CRM_LOCAL_VERIFICATION_REPORT_PATH.
  --help               Show this help.
`);
}
