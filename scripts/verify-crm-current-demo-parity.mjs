#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
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
  sameRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const selfTest = argv.includes('--self-test');
const sourceIds = rangeIds('SRC', 1, 28);
const uxIds = rangeIds('UX', 1, 17);
const coreCheckIds = [
  'BT-01-auth-session',
  'BT-02-profile-and-shared-settings',
  'BT-04-dashboard-source-semantics',
  'BT-05-opportunity-core',
  'BT-09-contract-core',
  'BT-10-billing-actual-and-performance',
  'BT-11-business-plan-core',
  'BT-12-business-plan-performance',
  'BT-13-internal-cost-source-grid',
  'BT-17-reports-errors-and-confirmation',
  'worktree-identity-unchanged',
];
const commandIds = [
  'runtime-provenance-start',
  'runtime-provenance-final',
  'source-contract',
  'database-runtime',
  'database-contract',
  'local-verification',
  'source-sample',
  'core-runtime',
  'auth-throttle-window-after-core',
  'domain-access',
  'quote-parity',
  'auth-throttle-window-after-quote',
  'uiux-parity',
  'readiness-consistency',
  'secret-masking',
  'production-runtime-contract',
  'operation-recovery-run',
  'operation-recovery-cleanup',
  'worktree-identity-unchanged',
];
const functionalGlobalRequirements = [
  'runtime-provenance-start',
  'runtime-provenance-final',
  'source-contract',
  'database-runtime',
  'database-contract',
  'local-verification',
  'auth-throttle-window-after-core',
  'auth-throttle-window-after-quote',
  'worktree-identity-unchanged',
];
const sourceRequirements = {
  'SRC-01': ['core:BT-01-auth-session'],
  'SRC-02': ['core:BT-02-profile-and-shared-settings'],
  'SRC-03': ['domain-access', 'ux:UX-17'],
  'SRC-04': ['core:BT-02-profile-and-shared-settings', 'quote-parity', 'ux:UX-12', 'ux:UX-15', 'ux:UX-16'],
  'SRC-05': ['core:BT-04-dashboard-source-semantics'],
  'SRC-06': ['core:BT-04-dashboard-source-semantics'],
  'SRC-07': ['core:BT-04-dashboard-source-semantics', 'core:BT-05-opportunity-core'],
  'SRC-08': ['core:BT-05-opportunity-core'],
  'SRC-09': ['core:BT-05-opportunity-core', 'quote-parity'],
  'SRC-10': ['core:BT-04-dashboard-source-semantics', 'core:BT-05-opportunity-core', 'quote-parity'],
  'SRC-11': ['core:BT-05-opportunity-core'],
  'SRC-12': ['operation-recovery-run', 'operation-recovery-cleanup'],
  'SRC-13': ['core:BT-05-opportunity-core', 'quote-parity'],
  'SRC-14': ['uiux-parity', 'ux:UX-04'],
  'SRC-15': ['core:BT-09-contract-core'],
  'SRC-16': ['core:BT-09-contract-core'],
  'SRC-17': ['core:BT-09-contract-core'],
  'SRC-18': ['core:BT-10-billing-actual-and-performance'],
  'SRC-19': ['core:BT-10-billing-actual-and-performance'],
  'SRC-20': ['core:BT-11-business-plan-core'],
  'SRC-21': ['core:BT-11-business-plan-core'],
  'SRC-22': ['core:BT-12-business-plan-performance'],
  'SRC-23': ['core:BT-13-internal-cost-source-grid'],
  'SRC-24': ['domain-access'],
  'SRC-25': ['domain-access'],
  'SRC-26': ['domain-access'],
  'SRC-27': ['source-sample'],
  'SRC-28': [
    'core:BT-17-reports-errors-and-confirmation',
    'readiness-consistency',
    'secret-masking',
    'production-runtime-contract',
    'operation-recovery-run',
    'operation-recovery-cleanup',
  ],
};

assertMappingContract();
if (selfTest) {
  runSelfTest();
  process.exit(0);
}

const sourcePrototypeDir = requirePathEnv('CRM_SOURCE_PROTOTYPE_DIR');
const sourceDdlPath = requirePathEnv('CRM_SOURCE_DDL_PATH');
const sourceManifestPath = path.resolve(process.env.CRM_SOURCE_UIUX_MANIFEST || path.join(repoRoot, 'docs/crm/evidence/source-uiux/ref-01/source-uiux-manifest.json'));
const targetManifestPath = path.resolve(process.env.CRM_TARGET_UIUX_MANIFEST || path.join(repoRoot, 'docs/crm/evidence/target-uiux/current/target-uiux-parity-manifest.json'));
const runId = (process.env.CRM_RALPH_RUN_ID || '').trim().toLowerCase();
const databaseName = (process.env.CRM_RALPH_DATABASE_NAME || '').trim();
assert(/^[-_a-z0-9]+$/.test(runId), 'CRM_RALPH_RUN_ID is required and must be lowercase-safe');
assert(/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName), 'CRM_RALPH_DATABASE_NAME must name an isolated ssoo_crm_ralph_* database');
const runtimeManifestPath = path.resolve(process.env.CRM_RALPH_RUNTIME_MANIFEST || path.join(repoRoot, 'output/playwright/crm-ralph', `${runId}-runtime-manifest.json`));
const reportPath = path.resolve(readOption('report-path', 'CRM_CURRENT_DEMO_REPORT_PATH', path.join(repoRoot, 'output/crm-current-demo/current-demo-parity-report.json')));
const localReportPath = path.resolve(
  process.env.CRM_LOCAL_VERIFICATION_REPORT_PATH
    || path.join(repoRoot, 'output/crm-current-demo/crm-local-verification-report.json'),
);
const coreReportPath = path.join(repoRoot, 'output/crm-current-demo/core-runtime-report.json');
const runtimeRoot = `/tmp/ssoo-crm-ralph-${runId.replaceAll('_', '-')}`;
const startedAt = new Date();
const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const commandResults = [];
const publicApiUrl = process.env.CRM_RALPH_PUBLIC_API_URL || 'http://127.0.0.1:4105/api';
const publicWebSocketUrl = process.env.CRM_RALPH_PUBLIC_WS_URL || 'http://127.0.0.1:4105';

const sourceDatabaseUrl = process.env.DATABASE_URL;
assert(sourceDatabaseUrl, 'DATABASE_URL is required');
const targetDatabaseUrl = new URL(sourceDatabaseUrl);
targetDatabaseUrl.pathname = `/${databaseName}`;
targetDatabaseUrl.searchParams.delete('schema');

const sharedEnv = {
  ...process.env,
  DATABASE_URL: targetDatabaseUrl.toString(),
  CRM_RALPH_RUN_ID: runId,
  CRM_RALPH_DATABASE_NAME: databaseName,
  CRM_SOURCE_SAMPLE_DATABASE_NAME: databaseName,
  CRM_SOURCE_PROTOTYPE_DIR: sourcePrototypeDir,
  CRM_SOURCE_DDL_PATH: sourceDdlPath,
  CRM_SOURCE_UIUX_MANIFEST: sourceManifestPath,
  CRM_TARGET_UIUX_MANIFEST: targetManifestPath,
  CRM_RUNTIME_API_URL: process.env.CRM_RUNTIME_API_URL || publicApiUrl,
  CRM_CORE_RUNTIME_REPORT_PATH: coreReportPath,
  CRM_QUOTE_PARITY_API_URL: process.env.CRM_QUOTE_PARITY_API_URL || 'http://127.0.0.1:4105/api',
  CRM_QUOTE_PARITY_WEB_URL: process.env.CRM_QUOTE_PARITY_WEB_URL || 'http://127.0.0.1:3105',
  CRM_QUOTE_PARITY_MARKDOWN_ROOT: path.join(runtimeRoot, 'markdown'),
  CRM_QUOTE_PARITY_STORAGE_ROOT: path.join(runtimeRoot, 'storage'),
  CRM_READINESS_API_URL: process.env.CRM_READINESS_API_URL || 'http://127.0.0.1:4105/api',
  CRM_READINESS_ADMIN_URL: process.env.CRM_READINESS_ADMIN_URL || 'http://127.0.0.1:3110/api/launch-readiness',
  CRM_READINESS_CRM_WEB_URL: process.env.CRM_READINESS_CRM_WEB_URL || 'http://127.0.0.1:3105/api/crm/operations/launch-readiness',
  CRM_READINESS_DMS_WEB_URL: process.env.CRM_READINESS_DMS_WEB_URL || 'http://127.0.0.1:3113/api/settings?includeRuntime=1',
  CRM_SECRET_AUDIT_API_URL: process.env.CRM_SECRET_AUDIT_API_URL || 'http://127.0.0.1:4105/api',
  CRM_SECRET_AUDIT_ADMIN_URL: process.env.CRM_SECRET_AUDIT_ADMIN_URL || 'http://127.0.0.1:3110/api/launch-readiness',
  CRM_RECOVERY_API_URL: process.env.CRM_RECOVERY_API_URL || 'http://127.0.0.1:4105/api',
  CRM_RECOVERY_MARKDOWN_ROOT: path.join(runtimeRoot, 'markdown'),
  CRM_RECOVERY_STORAGE_ROOT: path.join(runtimeRoot, 'storage'),
};
assert(sharedEnv.CRM_RUNTIME_API_URL === publicApiUrl, 'CRM_RUNTIME_API_URL must equal the public API URL compiled into the Ralph production builds');

const localReport = readJsonIfExists(localReportPath);
commandResults.push(runRuntimeProvenanceCheck({
  id: 'runtime-provenance-start',
  manifestPath: runtimeManifestPath,
  expectedIdentity: worktreeIdentity,
  expectedDatabase: databaseName,
  expectedRunId: runId,
  publicApiUrl,
  publicWebSocketUrl,
}));
commandResults.push(runLocalReportProvenanceCheck(localReport, worktreeIdentity, localReportPath));
const commands = [
  {
    id: 'source-contract',
    requirement: 'The source tree, 23-table DDL hash/mapping, exact 28+17 denominator, and reference manifests pass the canonical goal contract.',
    command: ['node', 'scripts/verify-crm-goal-contract.mjs'],
  },
  {
    id: 'database-runtime',
    requirement: 'The isolated database matches the current Prisma runtime schema, migrations, and trigger contract.',
    command: ['pnpm', '-C', 'packages/database', 'db:runtime:verify'],
  },
  {
    id: 'database-contract',
    requirement: 'The launch database contract passes against the isolated database.',
    command: ['pnpm', '-C', 'packages/database', 'db:contract:test'],
  },
  {
    id: 'source-sample',
    requirement: 'The exact source sample values/counts and two-pass idempotent seed pass in the isolated database.',
    command: ['node', 'scripts/verify-crm-source-sample.mjs', '--reseed'],
  },
  {
    id: 'core-runtime',
    requirement: 'Actual auth/profile/opportunity/contract/billing/business-plan/cost/report DB/API workflows and cleanup pass.',
    command: ['node', 'scripts/verify-crm-core-runtime.mjs', `--report-path=${coreReportPath}`],
  },
  {
    id: 'auth-throttle-window-after-core',
    requirement: 'The production login throttle remains enabled while the next independent role-login verification receives a fresh window.',
    command: ['node', '-e', 'setTimeout(() => {}, 61000)'],
  },
  {
    id: 'domain-access',
    requirement: 'Four-role capability matrix, Admin permission catalog, internal cost/AMS mutation/lock/reopen, and cleanup pass.',
    command: ['node', 'scripts/verify-crm-domain-access-runtime.mjs'],
  },
  {
    id: 'quote-parity',
    requirement: 'Actual source quote math/party/CI, desktop/mobile/print/PDF, DMS artifact reopen, and cleanup pass.',
    command: ['node', 'scripts/verify-crm-quote-parity.mjs', 'run'],
  },
  {
    id: 'auth-throttle-window-after-quote',
    requirement: 'The production login throttle remains enabled while readiness, masking, and recovery checks receive a fresh window.',
    command: ['node', '-e', 'setTimeout(() => {}, 61000)'],
  },
  {
    id: 'uiux-parity',
    requirement: 'All 17 screens and all 83 states pass source/desktop/mobile/diff/browser evidence against this worktree.',
    command: ['node', 'scripts/verify-crm-uiux-parity-evidence.mjs', '--require-all'],
  },
  {
    id: 'readiness-consistency',
    requirement: 'CRM/DMS owner snapshots and Admin/CRM/DMS consumer surfaces agree without false-ready fallbacks.',
    command: ['node', 'scripts/verify-crm-readiness-consistency.mjs'],
  },
  {
    id: 'secret-masking',
    requirement: 'Admin/CRM/DMS settings, errors, authorization, logs, and OpenAPI surfaces mask secrets.',
    command: ['node', 'scripts/verify-crm-secret-masking.mjs'],
  },
  {
    id: 'production-runtime-contract',
    requirement: 'URL-first routes, proxy origin precedence, CORS, and DMS WebSocket production contracts pass.',
    command: ['node', 'scripts/verify-crm-production-runtime-contract.mjs'],
  },
  {
    id: 'operation-recovery-run',
    requirement: 'Failure ledger, retry/idempotency, manual recovery link, and artifact evidence execute in the isolated runtime.',
    command: ['node', 'scripts/verify-crm-operation-recovery.mjs', 'run'],
  },
  {
    id: 'operation-recovery-cleanup',
    requirement: 'Failure/retry operation rows and files are restored with zero scoped residue.',
    command: ['node', 'scripts/verify-crm-operation-recovery.mjs', 'cleanup'],
    alwaysRun: true,
  },
];

for (const definition of commands) {
  const result = runCommand(definition, sharedEnv);
  commandResults.push(result);
}

commandResults.push(runRuntimeProvenanceCheck({
  id: 'runtime-provenance-final',
  manifestPath: runtimeManifestPath,
  expectedIdentity: worktreeIdentity,
  expectedDatabase: databaseName,
  expectedRunId: runId,
  publicApiUrl,
  publicWebSocketUrl,
}));

const completedWorktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot });
const worktreeUnchanged = sameRepositoryWorktreeIdentity(worktreeIdentity, completedWorktreeIdentity);
commandResults.push({
  id: 'worktree-identity-unchanged',
  requirement: 'Repository file contents remain unchanged throughout the entire current-demo gate.',
  status: worktreeUnchanged ? 'passed' : 'failed',
  durationMs: 0,
  evidence: { started: worktreeIdentity, completed: completedWorktreeIdentity },
});

const coreReport = readJsonIfExists(coreReportPath);
const targetManifest = readJsonIfExists(targetManifestPath);
const reportValidation = validateBoundReports({
  localReport,
  coreReport,
  targetManifest,
  worktreeIdentity,
});
if (reportValidation.failures.length > 0) {
  for (const failureMessage of reportValidation.failures) {
    commandResults.push({
      id: `bound-report-${commandResults.filter((item) => item.id.startsWith('bound-report-')).length + 1}`,
      requirement: 'Generated evidence reports must be complete and bound to the same worktree identity.',
      status: 'failed',
      durationMs: 0,
      evidence: failureMessage,
    });
  }
}

const assessment = buildAssessment({ commandResults, coreReport, targetManifest });
const finishedAt = new Date();
const report = {
  schemaVersion: 1,
  scope: 'crm-current-demo-strict-parity',
  status: assessment.strictDemo.completed === 45 && reportValidation.failures.length === 0 ? 'passed' : 'failed',
  formula: '(completed SRC + completed UX) / 45',
  worktreeIdentity,
  databaseName,
  runId,
  runtimeManifestPath: path.relative(repoRoot, runtimeManifestPath),
  sourceInputs: {
    prototypeDirectory: sourcePrototypeDir,
    ddlPath: sourceDdlPath,
    sourceManifestPath: path.relative(repoRoot, sourceManifestPath),
    targetManifestPath: path.relative(repoRoot, targetManifestPath),
    ddlTableCount: 23,
    ddlPoints: 0,
  },
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  commandResults,
  reportValidation,
  assessment,
  externalLaunchScope: {
    countedInDemo45: false,
    requiredSeparately: ['OPS-01~17', 'EXT-01~02', 'DMS same-release FINAL GO', 'CRM production browser/artifact gate'],
  },
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
printSummary(report, reportPath);
if (report.status !== 'passed') process.exit(1);

function runCommand(definition, env) {
  const started = Date.now();
  process.stdout.write(`[crm-current-demo] running ${definition.id}: ${definition.command.join(' ')}\n`);
  const result = spawnSync(definition.command[0], definition.command.slice(1), {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 100 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const status = result.status === 0 ? 'passed' : 'failed';
  process.stdout.write(`[crm-current-demo] ${status} ${definition.id} (${Date.now() - started}ms)\n`);
  if (status === 'failed' && output) process.stderr.write(`${tail(output, 80)}\n`);
  return {
    id: definition.id,
    requirement: definition.requirement,
    command: definition.command.join(' '),
    status,
    exitCode: result.status,
    durationMs: Date.now() - started,
    evidence: tail(output || result.error?.message || '', 120),
  };
}

function runRuntimeProvenanceCheck({
  id,
  manifestPath,
  expectedIdentity,
  expectedDatabase,
  expectedRunId,
  publicApiUrl,
  publicWebSocketUrl,
}) {
  const started = Date.now();
  try {
    const manifest = readJson(manifestPath, 'CRM Ralph runtime manifest');
    assert(manifest.schemaVersion === 2, 'CRM Ralph runtime manifest schemaVersion must equal 2');
    assert(manifest.databaseName === expectedDatabase && manifest.runId === expectedRunId, 'CRM Ralph runtime manifest run/database mismatch');
    assertRepositoryWorktreeIdentity(manifest.worktreeIdentity, expectedIdentity, 'runtimeManifest.worktreeIdentity');
    const { absolutePath: buildReportPath, report: buildReport } = readCrmRalphBuildReport({
      repoRoot,
      runId: expectedRunId,
      reportPath: manifest.buildPreparation?.reportPath,
    });
    assertRepositoryWorktreeIdentity(buildReport.worktreeIdentity, expectedIdentity, 'buildReport.worktreeIdentity');
    assert(manifest.buildPreparation?.reportPath === path.relative(repoRoot, buildReportPath), 'runtime manifest build report path mismatch');
    assert(buildReport.publicRuntime?.publicApiUrl === publicApiUrl, 'compiled public API URL does not match current runtime API URL');
    assert(buildReport.publicRuntime?.publicWebSocketUrl === publicWebSocketUrl, 'compiled public WebSocket URL does not match current runtime URL');
    for (const target of CRM_RALPH_BUILD_TARGETS) {
      const entry = manifest.processes?.[target];
      assert(entry?.target === target, `runtime manifest process ${target} is missing`);
      assertRepositoryWorktreeIdentity(entry.worktreeIdentity, expectedIdentity, `runtimeManifest.processes.${target}.worktreeIdentity`);
      assert(Number.isSafeInteger(entry.pid) && entry.pid > 0, `runtime manifest process ${target} pid is invalid`);
      process.kill(entry.pid, 0);
      const currentArtifact = createCrmRalphBuildArtifact({ repoRoot, target, publicApiUrl, publicWebSocketUrl });
      assertCrmRalphBuildArtifact(entry.buildArtifact, currentArtifact, `runtimeManifest.processes.${target}.buildArtifact`);
      const preparedTarget = buildReport.results?.find((result) => result.target === target && result.status === 'passed');
      assert(preparedTarget?.buildArtifact, `build report target ${target} is missing or failed`);
      assertCrmRalphBuildArtifact(preparedTarget.buildArtifact, currentArtifact, `buildReport.results.${target}.buildArtifact`);
      assert(entry.buildReportPath === path.relative(repoRoot, buildReportPath), `runtime process ${target} build report path mismatch`);
      if (target !== 'server') {
        assert(entry.runtimeConfiguration?.publicApiUrl === publicApiUrl, `runtime process ${target} public API URL mismatch`);
      }
      if (target === 'dms') {
        assert(entry.runtimeConfiguration?.publicWebSocketUrl === publicWebSocketUrl, 'runtime process dms public WebSocket URL mismatch');
      }
    }
    return {
      id,
      requirement: 'All four current production builds are live and bound to the same worktree/database runtime manifest.',
      status: 'passed',
      durationMs: Date.now() - started,
      evidence: {
        manifestPath: path.relative(repoRoot, manifestPath),
        databaseName: manifest.databaseName,
        buildReportPath: path.relative(repoRoot, buildReportPath),
        publicRuntime: buildReport.publicRuntime,
        processes: Object.fromEntries(CRM_RALPH_BUILD_TARGETS.map((target) => [target, {
          pid: manifest.processes[target].pid,
          origin: manifest.processes[target].origin,
          buildArtifactFingerprint: manifest.processes[target].buildArtifact.fingerprint,
        }])),
      },
    };
  } catch (error) {
    return {
      id,
      requirement: 'All four current production builds are live and bound to the same worktree/database runtime manifest.',
      status: 'failed',
      durationMs: Date.now() - started,
      evidence: formatError(error),
    };
  }
}

function runLocalReportProvenanceCheck(report, expectedIdentity, reportPath) {
  const started = Date.now();
  try {
    assert(report?.schemaVersion === 2 && report.status === 'passed', 'local report must be passed schema 2');
    assertRepositoryWorktreeIdentity(report.worktreeIdentity, expectedIdentity, 'localReport.worktreeIdentity');
    const requiredChecks = [
      'crm-launch-static-readiness',
      'crm-server-unit-and-boundary-tests',
      'crm-web-production-build',
      'worktree-identity-unchanged',
    ];
    const statusById = new Map((report.checks ?? []).map((check) => [check.id, check.status]));
    for (const checkId of requiredChecks) assert(statusById.get(checkId) === 'passed', `local report check ${checkId} is missing or failed`);
    return {
      id: 'local-verification',
      requirement: 'A pre-runtime local report proves static readiness, CRM/DMS/PMS boundary tests, and a CRM production build without mutating live runtime artifacts.',
      status: 'passed',
      durationMs: Date.now() - started,
      evidence: { reportPath: path.relative(repoRoot, reportPath), checks: requiredChecks },
    };
  } catch (error) {
    return {
      id: 'local-verification',
      requirement: 'A pre-runtime local report proves static readiness, CRM/DMS/PMS boundary tests, and a CRM production build without mutating live runtime artifacts.',
      status: 'failed',
      durationMs: Date.now() - started,
      evidence: formatError(error),
    };
  }
}

function validateBoundReports({ localReport, coreReport, targetManifest, worktreeIdentity: expectedIdentity }) {
  const failures = [];
  validate(() => {
    assert(localReport?.schemaVersion === 2 && localReport.status === 'passed', 'local report must be passed schema 2');
    assertRepositoryWorktreeIdentity(localReport.worktreeIdentity, expectedIdentity, 'localReport.worktreeIdentity');
    assert(localReport.checks?.some((check) => check.id === 'worktree-identity-unchanged' && check.status === 'passed'), 'local report worktree check is missing or failed');
  });
  validate(() => {
    assert(coreReport?.schemaVersion === 1 && coreReport.status === 'passed', 'core runtime report must be passed schema 1');
    assert(coreReport.databaseName === databaseName && coreReport.isolatedDatabase === true, 'core runtime report database/isolation mismatch');
    assertRepositoryWorktreeIdentity(coreReport.worktreeIdentity, expectedIdentity, 'coreReport.worktreeIdentity');
    const actual = new Map((coreReport.checks ?? []).map((check) => [check.id, check.status]));
    for (const id of coreCheckIds) assert(actual.get(id) === 'passed', `core runtime report check ${id} is missing or failed`);
    assert(coreReport.cleanup?.status === 'passed', 'core runtime cleanup did not pass');
    assert(Object.values(coreReport.cleanup?.activeResidue ?? {}).every((value) => value === 0), 'core runtime active residue is not zero');
  });
  validate(() => {
    assert(targetManifest?.version === 2, 'target UI/UX manifest must use version 2');
    assertRepositoryWorktreeIdentity(targetManifest.worktreeIdentity, expectedIdentity, 'targetManifest.worktreeIdentity');
    const ids = (targetManifest.captures ?? []).map((capture) => capture.uxId);
    assert(JSON.stringify(ids) === JSON.stringify(uxIds), 'target UI/UX manifest must contain UX-01~17 in order');
    assert(targetManifest.captures.reduce((sum, capture) => sum + (capture.states?.length ?? 0), 0) === 83, 'target UI/UX manifest must contain exactly 83 states');
    assert(targetManifest.captures.every((capture) => capture.status === 'complete'), 'target UI/UX manifest contains a non-complete screen');
  });
  return { status: failures.length === 0 ? 'passed' : 'failed', failures };

  function validate(action) {
    try {
      action();
    } catch (error) {
      failures.push(formatError(error));
    }
  }
}

function buildAssessment({ commandResults: results, coreReport, targetManifest }) {
  const commandStatus = new Map(results.map((result) => [result.id, result.status]));
  const coreStatus = new Map((coreReport?.checks ?? []).map((check) => [check.id, check.status]));
  const uxStatus = new Map((targetManifest?.captures ?? []).map((capture) => [capture.uxId, capture.status]));
  const source = sourceIds.map((id) => {
    const requirements = [...functionalGlobalRequirements, ...(sourceRequirements[id] ?? [])];
    const failedRequirements = requirements.filter((requirement) => !requirementPassed(requirement));
    return { id, status: failedRequirements.length === 0 ? 'completed' : 'unproven', requirements, failedRequirements };
  });
  const ux = uxIds.map((id) => {
    const requirements = ['runtime-provenance-start', 'runtime-provenance-final', 'source-contract', 'uiux-parity', 'worktree-identity-unchanged', `ux:${id}`];
    const failedRequirements = requirements.filter((requirement) => !requirementPassed(requirement));
    return { id, status: failedRequirements.length === 0 ? 'completed' : 'unproven', requirements, failedRequirements };
  });
  const sourceCompleted = source.filter((item) => item.status === 'completed').length;
  const uxCompleted = ux.filter((item) => item.status === 'completed').length;
  const completed = sourceCompleted + uxCompleted;
  return {
    source: { completed: sourceCompleted, denominator: 28, percent: percentage(sourceCompleted, 28), items: source },
    ux: { completed: uxCompleted, denominator: 17, percent: percentage(uxCompleted, 17), stateCount: (targetManifest?.captures ?? []).reduce((sum, capture) => sum + (capture.states?.length ?? 0), 0), items: ux },
    strictDemo: { completed, denominator: 45, percent: percentage(completed, 45), passed: completed === 45 },
    ddl: { tableCount: 23, points: 0, role: 'mapping-and-runtime-contract' },
  };

  function requirementPassed(requirement) {
    if (requirement.startsWith('core:')) return coreStatus.get(requirement.slice('core:'.length)) === 'passed';
    if (requirement.startsWith('ux:')) return uxStatus.get(requirement.slice('ux:'.length)) === 'complete';
    return commandStatus.get(requirement) === 'passed';
  }
}

function assertMappingContract() {
  assert(JSON.stringify(Object.keys(sourceRequirements)) === JSON.stringify(sourceIds), 'source requirements must enumerate SRC-01~28 exactly in order');
  const allowedCommands = new Set(commandIds);
  const allowedCore = new Set(coreCheckIds);
  const allowedUx = new Set(uxIds);
  for (const [sourceId, requirements] of Object.entries(sourceRequirements)) {
    assert(Array.isArray(requirements) && requirements.length > 0, `${sourceId} must have at least one executable requirement`);
    for (const requirement of requirements) {
      if (requirement.startsWith('core:')) assert(allowedCore.has(requirement.slice(5)), `${sourceId} references unknown core check ${requirement}`);
      else if (requirement.startsWith('ux:')) assert(allowedUx.has(requirement.slice(3)), `${sourceId} references unknown UX check ${requirement}`);
      else assert(allowedCommands.has(requirement), `${sourceId} references unknown command ${requirement}`);
    }
  }
}

function runSelfTest() {
  const identity = createRepositoryWorktreeIdentity({ repoRoot });
  const commandResults = commandIds.map((id) => ({ id, status: 'passed' }));
  const coreReport = {
    checks: coreCheckIds.map((id) => ({ id, status: 'passed' })),
  };
  const targetManifest = {
    captures: uxIds.map((uxId, index) => ({
      uxId,
      status: 'complete',
      states: Array.from({ length: index < 15 ? 5 : 4 }, (_, stateIndex) => ({ id: `${uxId}-${stateIndex}` })),
    })),
  };
  while (targetManifest.captures.reduce((sum, capture) => sum + capture.states.length, 0) > 83) targetManifest.captures[0].states.pop();
  while (targetManifest.captures.reduce((sum, capture) => sum + capture.states.length, 0) < 83) targetManifest.captures[0].states.push({ id: `extra-${targetManifest.captures[0].states.length}` });
  const passing = buildAssessment({ commandResults, coreReport, targetManifest });
  assert(passing.strictDemo.completed === 45 && passing.strictDemo.passed, 'all-passing fixture did not score 45/45');

  const missingSource = structuredClone(coreReport);
  missingSource.checks.find((check) => check.id === 'BT-05-opportunity-core').status = 'failed';
  const rejectedSource = buildAssessment({ commandResults, coreReport: missingSource, targetManifest });
  assert(rejectedSource.source.completed < 28 && rejectedSource.strictDemo.passed === false, 'failed functional proof was accepted');

  const missingUx = structuredClone(targetManifest);
  missingUx.captures.find((capture) => capture.uxId === 'UX-04').status = 'partial';
  const rejectedUx = buildAssessment({ commandResults, coreReport, targetManifest: missingUx });
  assert(rejectedUx.ux.completed === 16 && rejectedUx.source.items.find((item) => item.id === 'SRC-14').status === 'unproven', 'partial UX proof was accepted');

  const changedWorktree = commandResults.map((result) => result.id === 'worktree-identity-unchanged' ? { ...result, status: 'failed' } : result);
  const rejectedIdentity = buildAssessment({ commandResults: changedWorktree, coreReport, targetManifest });
  assert(rejectedIdentity.strictDemo.completed === 0, 'changed worktree identity did not invalidate all current points');

  const changedBuild = commandResults.map((result) => result.id === 'runtime-provenance-final' ? { ...result, status: 'failed' } : result);
  const rejectedBuild = buildAssessment({ commandResults: changedBuild, coreReport, targetManifest });
  assert(rejectedBuild.strictDemo.completed === 0, 'changed runtime build artifact did not invalidate all current points');
  assert(identity.fingerprint.length === 64, 'self-test repository identity is invalid');
  console.log('✓ CRM current demo parity mapping/negative/freshness self-test passed');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath, filePath);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${formatError(error)}`);
  }
}

function requirePathEnv(name) {
  const value = process.env[name]?.trim();
  assert(value, `${name} is required`);
  const absolutePath = path.resolve(value);
  assert(fs.existsSync(absolutePath), `${name} does not exist: ${absolutePath}`);
  return absolutePath;
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const inline = argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1]) return argv[index + 1];
  return process.env[envName] || fallback;
}

function rangeIds(prefix, first, last) {
  return Array.from({ length: last - first + 1 }, (_, index) => `${prefix}-${String(first + index).padStart(2, '0')}`);
}

function percentage(numerator, denominator) {
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function tail(output, count) {
  return output.split(/\r?\n/).filter(Boolean).slice(-count).join('\n');
}

function printSummary(report, outputPath) {
  console.log(`CRM current demo strict parity: ${report.status}`);
  console.log(`- SRC: ${report.assessment.source.completed}/28 (${report.assessment.source.percent}%)`);
  console.log(`- UX: ${report.assessment.ux.completed}/17 (${report.assessment.ux.percent}%), states ${report.assessment.ux.stateCount}/83`);
  console.log(`- strict demo: ${report.assessment.strictDemo.completed}/45 (${report.assessment.strictDemo.percent}%)`);
  console.log(`- DDL: 23 mapped tables, 0 score points`);
  console.log(`- report: ${path.relative(repoRoot, outputPath)}`);
  const failed = report.commandResults.filter((result) => result.status !== 'passed');
  if (failed.length > 0) console.log(`- failed evidence: ${failed.map((result) => result.id).join(', ')}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
