#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  formatSummary as formatInputInspectionSummary,
  inspectInputs,
} from './inspect-crm-migration-inputs.mjs';

const argv = process.argv.slice(2);
const REQUIRED_ACCOUNTING_PAYMENT_EVIDENCE_STEPS = [
  'accounting-voucher',
  'payment-request',
  'payment-execution',
  'external-system-sync',
];
const CRM_AI_RAG_ENTITY_TYPES = ['opportunity', 'customer', 'activity'];
const ACCOUNTING_PAYMENT_SYNTHETIC_EVIDENCE_MARKERS = [
  'crm-handoff-1001',
  'crm-accounting-payment-execution-1001',
  'erp-request-1001',
  'external-accounting-payment-api',
  'ERP-1001-',
  'ERP-accounting-voucher-1001',
  'evidence.example.test',
];
const CRM_AI_RAG_SYNTHETIC_EVIDENCE_MARKERS = [
  'CRM-OPP-1001',
  'CRM-CUS-2001',
  'Provider-ready opportunity',
  'Provider-ready customer',
  'Provider-ready activity',
  'CRM opportunity query',
  'CRM customer query',
  'CRM activity query',
  'http://127.0.0.1:4000/api',
  'crm://ai-object/8001',
  'crm://ai-object/8002',
  'crm://ai-object/8003',
];
const PROTECTED_SOURCE_SYNTHETIC_EVIDENCE_MARKERS = [
  'self-test',
  'protected CRM source self-test material',
  'text-extraction-self-test',
  'Reflected protected source decision',
];
const CRM_PROTECTED_SOURCE_REQUIRED_DOCS = [
  'docs/crm/README.md',
  'docs/crm/planning/backlog.md',
  'docs/crm/planning/source-migration-prd.md',
];
const config = {
  help: argv.includes('--help'),
  requireExtensions: argv.includes('--require-extensions') || readOptionalBooleanEnv('CRM_MIGRATION_REQUIRE_EXTENSIONS').value === true,
  reportPath: readOption('report-path', 'CRM_MIGRATION_COMPLETION_REPORT_PATH', ''),
};

if (config.help) {
  printUsage();
  process.exit(0);
}

const startedAt = new Date();
const auditArtifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-completion-'));
const crmLocalVerificationReportPath = path.join(auditArtifactDir, 'crm-local-verification-report.json');
const commandChecks = [
  {
    id: 'crm-launch-static-readiness',
    script: 'verify:crm-launch',
    command: ['node', 'scripts/verify-crm-launch-readiness.mjs'],
    requirement: 'CRM demo source migration static readiness passes: CRM source, server, web, database, PMS/DMS boundary, and docs scope checks.',
  },
  {
    id: 'crm-local-build-and-unit-tests',
    script: 'verify:crm-local',
    command: ['node', 'scripts/verify-crm-local-evidence.mjs', `--report-path=${crmLocalVerificationReportPath}`],
    reportPath: crmLocalVerificationReportPath,
    requirement: 'CRM demo source migration local verification passes: static readiness, CRM-related server Jest suites, DMS/PMS CRM boundary tests, and web-crm production build.',
  },
];

const extensionEnvironmentChecks = [
  {
    id: 'crm-accounting-payment-provider-ready',
    type: 'accounting-payment-provider-env',
    script: 'verify:crm-accounting-payment-provider:ready-precheck',
    requirement: 'Extension readiness only: external accounting/payment ERP API endpoint is configured for provider execution evidence.',
    getStatus: getAccountingPaymentProviderStatus,
  },
  {
    id: 'crm-ai-rag-provider-ready',
    type: 'crm-ai-rag-provider-env',
    script: 'verify:crm-ai-rag-runtime:ready-precheck',
    requirement: 'Extension readiness only: SSOO common AI/RAG embedding provider environment is configured for CRM AI/RAG provider-ready evidence.',
    getStatus: getCrmAiRagProviderStatus,
  },
];

const extensionReportChecks = [
  {
    id: 'crm-accounting-payment-provider-execution-report',
    type: 'provider-execution-report',
    script: 'verify:crm-accounting-payment-provider-report',
    requirement: 'Extension readiness only: external accounting/payment provider execution report proves ERP/API execution and operation reconciliation evidence.',
    pathEnvName: 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH',
    validateReport: validateAccountingPaymentExecutionReport,
  },
  {
    id: 'crm-ai-rag-provider-ready-runtime-report',
    type: 'crm-ai-rag-runtime-report',
    script: 'verify:crm-ai-rag-runtime-report',
    requirement: 'Extension readiness only: CRM AI/RAG provider-ready runtime report proves provider-backed indexing, embeddings, retrieval, and audit evidence for opportunity/customer/activity.',
    pathEnvNames: ['CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', 'CRM_AI_RAG_REPORT_PATH'],
    validateReport: validateCrmAiRagProviderReadyRuntimeReport,
  },
  {
    id: 'crm-protected-source-reflection-report',
    type: 'protected-source-reflection-report',
    script: 'verify:crm-protected-source-reflection-report',
    requirement: 'Extension readiness only: protected CRM source presentation is unlocked, extracted, mapped, and reflected into CRM docs with no unresolved source items.',
    pathEnvName: 'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH',
    validateReport: validateProtectedSourceReflectionReport,
  },
];

const extensionDocumentChecks = [
  {
    id: 'protected-source-reflected',
    requirement: 'Extension readiness only: all protected CRM source presentation material has been unlocked, reflected, and no longer documented as unresolved.',
    paths: [
      'docs/crm/README.md',
      'docs/crm/planning/backlog.md',
      'docs/crm/planning/source-migration-prd.md',
    ],
    unresolvedMarkers: [
      '보호된 발표자료 1개는 본문 추출이 되지 않아 현재 기준선에는 미반영',
      '보호된 발표자료 1개는 미반영',
      '보호된 발표자료 반영 완료를 의미하지 않는다',
    ],
  },
  {
    id: 'external-erp-not-documented-as-unproven',
    requirement: 'Extension readiness only: CRM docs no longer document live ERP/API provider execution and operation reconciliation as unresolved.',
    paths: [
      'docs/crm/README.md',
      'docs/crm/planning/backlog.md',
      'docs/crm/planning/source-migration-prd.md',
    ],
    unresolvedMarkers: [
      '실환경 ERP/API provider 실행 결과와 운영 대조 증거는 후속',
      '실환경 ERP/API provider 실행 결과와 운영 대조 증거가 아직 남아',
      '실환경 ERP/API provider 실행 결과와 운영 대조 증거가 없어',
      '실환경 ERP/API 완료 판정은 provider 실행 결과와 운영 대조 증거가 필요',
      '실제 ERP/API 반영 완료 증거는 구현·검증 전까지 미완료',
    ],
  },
  {
    id: 'azure-rag-not-documented-as-unproven',
    requirement: 'Extension readiness only: CRM docs no longer document provider-ready RAG evidence as unresolved.',
    paths: [
      'docs/crm/README.md',
      'docs/crm/planning/backlog.md',
      'docs/crm/planning/source-migration-prd.md',
    ],
    unresolvedMarkers: [
      'Azure provider-ready vector artifact는 잔여',
      'Azure provider-ready vector artifact다',
      'Azure embedding provider가 연결된 provider-ready 실환경 artifact가 없으면',
      'Azure provider-ready 실환경 artifact는 후속',
    ],
  },
];

const commandResults = commandChecks.map(runCommandCheck);
const extensionEnvironmentResults = extensionEnvironmentChecks.map(runEnvironmentCheck);
const extensionReportResults = extensionReportChecks.map(runReportCheck);
const extensionDocumentResults = extensionDocumentChecks.map(runDocumentCheck);
const extensionReadinessChecks = [...extensionEnvironmentResults, ...extensionReportResults, ...extensionDocumentResults];
const checks = config.requireExtensions ? [...commandResults, ...extensionReadinessChecks] : commandResults;
const finishedAt = new Date();
const inputInspection = inspectInputs({ rootDir: process.cwd(), env: process.env });
const demoScopePassed = commandResults.every((check) => check.status === 'passed');
const extensionScopePassed = extensionReadinessChecks.every((check) => check.status === 'passed');
const report = {
  schemaVersion: 1,
  scope: 'crm-demo-source-migration',
  status: demoScopePassed && (!config.requireExtensions || extensionScopePassed) ? 'passed' : 'failed',
  requireExtensions: config.requireExtensions,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  checks,
  extensionReadiness: {
    status: extensionScopePassed ? 'ready' : 'pending',
    blocking: config.requireExtensions,
    checks: extensionReadinessChecks,
  },
  inputInspection: {
    status: 'diagnostic-only',
    ...inputInspection,
  },
};

writeReport(config.reportPath, report);
printSummary(report);

if (report.status !== 'passed') {
  process.exit(1);
}

function runCommandCheck(check) {
  const started = Date.now();
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  const errorMessage = result.error instanceof Error ? result.error.message : '';
  return {
    id: check.id,
    type: 'command',
    requirement: check.requirement,
    status: result.status === 0 ? 'passed' : 'failed',
    script: check.script,
    command: check.command.join(' '),
    exitCode: result.status,
    durationMs: Date.now() - started,
    evidence: readCommandReport(check.reportPath) ?? summarizeOutput(output || errorMessage || `command exited with status ${String(result.status)}`),
  };
}

function readCommandReport(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) {
    return null;
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  return {
    reportPath,
    schemaVersion: report.schemaVersion,
    status: report.status,
    durationMs: report.durationMs,
    checks: Array.isArray(report.checks)
      ? report.checks.map((check) => ({
        id: check.id,
        status: check.status,
        durationMs: check.durationMs,
        evidence: check.evidence,
      }))
      : [],
  };
}

function runDocumentCheck(check) {
  const findings = [];

  for (const relativePath of check.paths) {
    const absolutePath = path.resolve(relativePath);
    if (!fs.existsSync(absolutePath)) {
      findings.push({
        path: relativePath,
        marker: '(missing file)',
      });
      continue;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    for (const marker of check.unresolvedMarkers) {
      if (content.includes(marker)) {
        findings.push({
          path: relativePath,
          marker,
        });
      }
    }
  }

  return {
    id: check.id,
    type: 'document-marker',
    requirement: check.requirement,
    status: findings.length === 0 ? 'passed' : 'failed',
    findings,
  };
}

function runEnvironmentCheck(check) {
  const status = check.getStatus();
  return {
    id: check.id,
    type: check.type,
    script: check.script,
    requirement: check.requirement,
    status: status.ready ? 'passed' : 'failed',
    evidence: status,
  };
}

function runReportCheck(check) {
  const pathEnvNames = check.pathEnvNames ?? [check.pathEnvName];
  const reportPath = pathEnvNames.map((name) => pickString(process.env[name])).find(Boolean);
  if (!reportPath) {
    return {
      id: check.id,
      type: check.type,
      script: check.script,
      requirement: check.requirement,
      status: 'failed',
      evidence: {
        ready: false,
        missing: [pathEnvNames.join(' or ')],
        placeholders: [],
        invalid: [],
      },
    };
  }

  try {
    const absolutePath = path.resolve(reportPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing report file: ${reportPath}`);
    }
    const report = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    const evidence = check.validateReport(report);
    return {
      id: check.id,
      type: check.type,
      script: check.script,
      requirement: check.requirement,
      status: 'passed',
      evidence: {
        ready: true,
        reportPath,
        ...evidence,
      },
    };
  } catch (error) {
    return {
      id: check.id,
      type: check.type,
      script: check.script,
      requirement: check.requirement,
      status: 'failed',
      evidence: {
        ready: false,
        missing: [],
        placeholders: [],
        invalid: [formatError(error)],
        reportPath,
      },
    };
  }
}

function validateAccountingPaymentExecutionReport(report) {
  assertObject(report, 'report');
  assertEquals(report.schemaVersion, 1, 'schemaVersion');
  assertEquals(report.status, 'passed', 'status');
  assertEquals(report.providerMode, 'external-api', 'providerMode');
  assertNonEmptyString(report.handoffId, 'handoffId');
  assertNonEmptyString(report.executionId, 'executionId');
  assertNonEmptyString(report.providerName, 'providerName');
  assertIsoDateString(report.executedAt, 'executedAt');
  assertNumberAtLeast(report.lineCount, 1, 'lineCount');
  assertNumberAtLeast(report.settlementAmountTotal, 1, 'settlementAmountTotal');
  validateAccountingPaymentArtifacts(report.artifacts, report.settlementAmountTotal);
  validateAccountingPaymentReconciliation(report.reconciliation, report);
  assertNotSyntheticEvidence(report, ACCOUNTING_PAYMENT_SYNTHETIC_EVIDENCE_MARKERS);
  return {
    handoffId: report.handoffId,
    executionId: report.executionId,
    providerName: report.providerName,
    lineCount: report.lineCount,
    settlementAmountTotal: report.settlementAmountTotal,
    reconciliationStatus: report.reconciliation.status,
  };
}

function validateAccountingPaymentArtifacts(artifacts, settlementAmountTotal) {
  if (!Array.isArray(artifacts)) {
    throw new Error('artifacts must be an array.');
  }
  const keys = new Set();
  for (const artifact of artifacts) {
    assertObject(artifact, 'artifact');
    assertRequiredAccountingPaymentStepKey(artifact.key, 'artifact.key');
    keys.add(artifact.key);
    assertNonEmptyString(artifact.evidencePath, `artifact.${artifact.key}.evidencePath`);
    assertNotPlaceholder(artifact.evidencePath, `artifact.${artifact.key}.evidencePath`);
    assertNonEmptyString(artifact.referenceNo, `artifact.${artifact.key}.referenceNo`);
    assertNumberAtLeast(artifact.amount, 0, `artifact.${artifact.key}.amount`);
    if (artifact.executedAt !== undefined) {
      assertIsoDateString(artifact.executedAt, `artifact.${artifact.key}.executedAt`);
    }
  }
  const missing = REQUIRED_ACCOUNTING_PAYMENT_EVIDENCE_STEPS.filter((key) => !keys.has(key));
  if (missing.length > 0) {
    throw new Error(`Missing required evidence steps: ${missing.join(', ')}`);
  }
  if (!artifacts.some((artifact) => Number(artifact.amount) === Number(settlementAmountTotal))) {
    throw new Error('At least one artifact amount must match settlementAmountTotal.');
  }
}

function validateAccountingPaymentReconciliation(reconciliation, report) {
  assertObject(reconciliation, 'reconciliation');
  if (!['matched', 'reconciled'].includes(reconciliation.status)) {
    throw new Error(`reconciliation.status must be matched or reconciled, got ${String(reconciliation.status)}`);
  }
  assertIsoDateString(reconciliation.checkedAt, 'reconciliation.checkedAt');
  assertNonEmptyString(reconciliation.sourceSystem, 'reconciliation.sourceSystem');
  assertNonEmptyString(reconciliation.evidencePath, 'reconciliation.evidencePath');
  assertNotPlaceholder(reconciliation.evidencePath, 'reconciliation.evidencePath');
  assertNumberEquals(reconciliation.crmLineCount, report.lineCount, 'reconciliation.crmLineCount');
  assertNumberEquals(reconciliation.providerLineCount, report.lineCount, 'reconciliation.providerLineCount');
  assertNumberEquals(reconciliation.crmSettlementAmountTotal, report.settlementAmountTotal, 'reconciliation.crmSettlementAmountTotal');
  assertNumberEquals(reconciliation.providerSettlementAmountTotal, report.settlementAmountTotal, 'reconciliation.providerSettlementAmountTotal');
  assertNumberEquals(reconciliation.amountDifference, 0, 'reconciliation.amountDifference');
}

function validateCrmAiRagProviderReadyRuntimeReport(report) {
  assertObject(report, 'report');
  assertEquals(report.schemaVersion, 1, 'schemaVersion');
  assertEquals(report.status, 'passed', 'status');
  assertEquals(report.providerMode, 'ready', 'providerMode');
  assertIsoDateString(report.startedAt, 'startedAt');
  assertIsoDateString(report.finishedAt, 'finishedAt');
  assertNumberAtLeast(report.durationMs, 0, 'durationMs');
  assertHttpUrl(report.baseUrl, 'baseUrl');
  assertNotPlaceholder(report.baseUrl, 'baseUrl');
  validateCrmAiRagSourceStatus(report.sourceStatus?.before, 'sourceStatus.before');
  validateCrmAiRagSourceStatus(report.sourceStatus?.after, 'sourceStatus.after');
  validateCrmAiRagBackfill(report.backfill);
  validateCrmAiRagJobRun(report.jobRun);

  const evidence = {};
  for (const entityType of CRM_AI_RAG_ENTITY_TYPES) {
    const entity = validateCrmAiRagEntity(report[entityType], entityType);
    const retrieval = validateCrmAiRagRetrieval(report.retrieval?.[entityType], entityType);
    const database = validateCrmAiRagDatabase(report.database?.[entityType], entity, entityType, retrieval);
    evidence[entityType] = {
      entityId: entity.id,
      retrievalLogId: retrieval.retrievalLogId,
      objectId: database.objectId,
      embeddingCount: database.embeddingCount,
      indexStatusCode: database.indexStatusCode,
    };
  }

  assertNotSyntheticEvidence(report, CRM_AI_RAG_SYNTHETIC_EVIDENCE_MARKERS);
  return {
    providerMode: report.providerMode,
    baseUrl: report.baseUrl,
    entities: evidence,
  };
}

function validateCrmAiRagEntity(entity, entityType) {
  assertObject(entity, entityType);
  assertNumericIdString(entity.id, `${entityType}.id`);
  assertNonEmptyString(entity.query, `${entityType}.query`);
  if (entityType === 'activity') {
    assertNumericIdString(entity.customerId, 'activity.customerId');
    assertNonEmptyString(entity.subject, 'activity.subject');
  } else {
    assertNonEmptyString(entity.code, `${entityType}.code`);
    assertNonEmptyString(entity.name, `${entityType}.name`);
  }
  return entity;
}

function validateCrmAiRagSourceStatus(status, label) {
  assertObject(status, label);
  assertEquals(status.sourceApp, 'crm', `${label}.sourceApp`);
  assertEquals(status.registered, true, `${label}.registered`);
  assertEquals(status.registrationStatus, 'registered', `${label}.registrationStatus`);
  for (const key of [
    'indexingEnabled',
    'keywordSearchEnabled',
    'metadataSearchEnabled',
    'semanticSearchEnabled',
    'vectorSearchEnabled',
    'ragContextEnabled',
  ]) {
    assertEquals(status[key], true, `${label}.${key}`);
  }
}

function validateCrmAiRagBackfill(backfill) {
  assertObject(backfill, 'backfill');
  assertObject(backfill.opportunity, 'backfill.opportunity');
  assertEquals(backfill.opportunity.sourceApp, 'crm', 'backfill.opportunity.sourceApp');
  assertEquals(backfill.opportunity.entityType, 'opportunity', 'backfill.opportunity.entityType');
  assertEquals(backfill.opportunity.jobType, 'backfill', 'backfill.opportunity.jobType');
  assertNumericIdString(backfill.opportunity.jobId, 'backfill.opportunity.jobId');
  assertNumberAtLeast(backfill.opportunity.queuedCount, 1, 'backfill.opportunity.queuedCount');
  assertNumberEquals(backfill.opportunity.failedCount, 0, 'backfill.opportunity.failedCount');

  assertObject(backfill.customerActivity, 'backfill.customerActivity');
  assertEquals(backfill.customerActivity.sourceApp, 'crm', 'backfill.customerActivity.sourceApp');
  assertEquals(backfill.customerActivity.jobType, 'backfill', 'backfill.customerActivity.jobType');
  assertStringArrayIncludes(backfill.customerActivity.entityTypes, 'customer', 'backfill.customerActivity.entityTypes');
  assertStringArrayIncludes(backfill.customerActivity.entityTypes, 'activity', 'backfill.customerActivity.entityTypes');
  assertNumberAtLeast(backfill.customerActivity.queuedCount, 2, 'backfill.customerActivity.queuedCount');
  assertNumberEquals(backfill.customerActivity.failedCount, 0, 'backfill.customerActivity.failedCount');
}

function validateCrmAiRagJobRun(jobRun) {
  assertObject(jobRun, 'jobRun');
  assertNumberAtLeast(jobRun.attempts, 1, 'jobRun.attempts');
  if (!Array.isArray(jobRun.runs) || jobRun.runs.length < 1) {
    throw new Error('jobRun.runs must contain at least one run summary.');
  }
  if (!Array.isArray(jobRun.targetJobs) || jobRun.targetJobs.length < CRM_AI_RAG_ENTITY_TYPES.length) {
    throw new Error(`jobRun.targetJobs must include ${CRM_AI_RAG_ENTITY_TYPES.length} CRM entity jobs.`);
  }
  for (const entityType of CRM_AI_RAG_ENTITY_TYPES) {
    const targetJob = jobRun.targetJobs.find((job) => job?.entityType === entityType);
    assertObject(targetJob, `jobRun.targetJobs.${entityType}`);
    assertNumericIdString(targetJob.jobId, `jobRun.targetJobs.${entityType}.jobId`);
    assertEquals(targetJob.jobStatusCode, 'indexed', `jobRun.targetJobs.${entityType}.jobStatusCode`);
  }
}

function validateCrmAiRagRetrieval(retrieval, entityType) {
  assertObject(retrieval, `retrieval.${entityType}`);
  assertNumericIdString(retrieval.retrievalLogId, `retrieval.${entityType}.retrievalLogId`);
  assertEquals(retrieval.ragReady, true, `retrieval.${entityType}.ragReady`);
  assertNumberAtLeast(retrieval.resultCount, 1, `retrieval.${entityType}.resultCount`);
  assertNumberAtLeast(retrieval.contextItemCount, 1, `retrieval.${entityType}.contextItemCount`);
  assertObject(retrieval.capabilities, `retrieval.${entityType}.capabilities`);
  assertEquals(retrieval.capabilities.semantic, true, `retrieval.${entityType}.capabilities.semantic`);
  assertEquals(retrieval.capabilities.vector, true, `retrieval.${entityType}.capabilities.vector`);
  assertEquals(retrieval.capabilities.ragContext, true, `retrieval.${entityType}.capabilities.ragContext`);
  return retrieval;
}

function validateCrmAiRagDatabase(database, entity, entityType, retrieval) {
  assertObject(database, `database.${entityType}`);
  assertNumericIdString(database.objectId, `database.${entityType}.objectId`);
  assertEquals(database.indexStatusCode, 'indexed', `database.${entityType}.indexStatusCode`);
  assertNonEmptyString(database.targetPath, `database.${entityType}.targetPath`);
  assertNotPlaceholder(database.targetPath, `database.${entityType}.targetPath`);
  assertNumberAtLeast(database.chunkCount, 1, `database.${entityType}.chunkCount`);
  assertNumberAtLeast(database.indexedChunkCount, database.chunkCount, `database.${entityType}.indexedChunkCount`);
  assertNumberAtLeast(database.embeddingCount, database.chunkCount, `database.${entityType}.embeddingCount`);
  assertEquals(database.aclScope, 'policy', `database.${entityType}.aclScope`);
  assertObject(database.latestJob, `database.${entityType}.latestJob`);
  assertEquals(database.latestJob.jobStatusCode, 'indexed', `database.${entityType}.latestJob.jobStatusCode`);
  assertObject(database.retrievalAudit, `database.${entityType}.retrievalAudit`);
  assertEquals(database.retrievalAudit.retrievalLogId, retrieval.retrievalLogId, `database.${entityType}.retrievalAudit.retrievalLogId`);
  assertEquals(database.retrievalAudit.sourceApp, 'crm', `database.${entityType}.retrievalAudit.sourceApp`);
  assertEquals(database.retrievalAudit.queryText, entity.query, `database.${entityType}.retrievalAudit.queryText`);
  assertNumberAtLeast(database.retrievalAudit.resultCount, 1, `database.${entityType}.retrievalAudit.resultCount`);
  assertNumberAtLeast(database.retrievalAudit.contextItemCount, 1, `database.${entityType}.retrievalAudit.contextItemCount`);
  return database;
}

function validateProtectedSourceReflectionReport(report) {
  assertObject(report, 'report');
  assertEquals(report.schemaVersion, 1, 'schemaVersion');
  assertEquals(report.status, 'passed', 'status');
  assertEquals(report.sourceType, 'protected-crm-presentation', 'sourceType');
  assertNonEmptyString(report.sourceFilePath, 'sourceFilePath');
  assertNotPlaceholder(report.sourceFilePath, 'sourceFilePath');
  assertSha256(report.sourceSha256, 'sourceSha256');
  assertIsoDateString(report.unlockedAt, 'unlockedAt');
  assertIsoDateString(report.extractedAt, 'extractedAt');
  assertIsoDateString(report.reflectedAt, 'reflectedAt');
  validateProtectedSourceFile(report.sourceFilePath, report.sourceSha256);
  validateProtectedSourceExtraction(report.extraction);
  validateProtectedSourceCoverage(report.coverage);
  validateProtectedSourceDecisions(report.decisions);
  assertNotSyntheticEvidence(report, PROTECTED_SOURCE_SYNTHETIC_EVIDENCE_MARKERS);
  return {
    sourceFilePath: report.sourceFilePath,
    sourceSha256: report.sourceSha256,
    reflectedAt: report.reflectedAt,
    reflectedDocumentPaths: report.coverage.reflectedDocumentPaths,
    decisionCount: report.decisions.length,
  };
}

function validateProtectedSourceFile(sourceFilePath, expectedSha256) {
  const absolutePath = path.resolve(sourceFilePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing protected source file: ${sourceFilePath}`);
  }
  const digest = crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
  if (digest !== expectedSha256) {
    throw new Error(`sourceSha256 mismatch for ${sourceFilePath}: expected ${expectedSha256}, got ${digest}`);
  }
}

function validateProtectedSourceExtraction(extraction) {
  assertObject(extraction, 'extraction');
  assertNonEmptyString(extraction.method, 'extraction.method');
  assertEquals(extraction.textExtracted, true, 'extraction.textExtracted');
  assertNumberAtLeast(extraction.extractedCharacterCount, 1, 'extraction.extractedCharacterCount');
  const slideCount = Number(extraction.slideCount ?? extraction.pageCount);
  if (!Number.isFinite(slideCount) || slideCount < 1) {
    throw new Error('extraction.slideCount or extraction.pageCount must be a number >= 1.');
  }
}

function validateProtectedSourceCoverage(coverage) {
  assertObject(coverage, 'coverage');
  assertEquals(coverage.protectedSourceReflected, true, 'coverage.protectedSourceReflected');
  assertNumberEquals(coverage.unresolvedCount, 0, 'coverage.unresolvedCount');
  assertNumberEquals(coverage.unmappedSourceItemCount, 0, 'coverage.unmappedSourceItemCount');
  if (!Array.isArray(coverage.reflectedDocumentPaths)) {
    throw new Error('coverage.reflectedDocumentPaths must be an array.');
  }
  for (const requiredPath of CRM_PROTECTED_SOURCE_REQUIRED_DOCS) {
    assertStringArrayIncludes(coverage.reflectedDocumentPaths, requiredPath, 'coverage.reflectedDocumentPaths');
  }
}

function validateProtectedSourceDecisions(decisions) {
  if (!Array.isArray(decisions) || decisions.length < 1) {
    throw new Error('decisions must include at least one protected source reflection decision.');
  }
  const targetedDocs = new Set();
  for (const decision of decisions) {
    assertObject(decision, 'decision');
    assertNonEmptyString(decision.id, 'decision.id');
    assertNonEmptyString(decision.sourceRef, `decision.${decision.id}.sourceRef`);
    assertNonEmptyString(decision.summary, `decision.${decision.id}.summary`);
    if (!['reflected', 'not-applicable'].includes(decision.status)) {
      throw new Error(`decision.${decision.id}.status must be reflected or not-applicable.`);
    }
    if (!Array.isArray(decision.targetPaths) || decision.targetPaths.length < 1) {
      throw new Error(`decision.${decision.id}.targetPaths must contain at least one target path.`);
    }
    for (const targetPath of decision.targetPaths) {
      assertNonEmptyString(targetPath, `decision.${decision.id}.targetPath`);
      targetedDocs.add(targetPath);
    }
    if (decision.status === 'not-applicable') {
      assertNonEmptyString(decision.rationale, `decision.${decision.id}.rationale`);
    }
  }
  for (const requiredPath of CRM_PROTECTED_SOURCE_REQUIRED_DOCS) {
    if (!targetedDocs.has(requiredPath)) {
      throw new Error(`decisions must include a target for ${requiredPath}.`);
    }
  }
}

function getAccountingPaymentProviderStatus() {
  const directUrl = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_URL);
  const baseUrl = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL);
  const executionPath = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH) ?? '/crm/accounting-payment/executions';
  const token = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_TOKEN);
  const tenant = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_TENANT);
  const timeout = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS);
  const missing = [];
  const placeholders = [];
  const invalid = [];

  const endpointUrl = directUrl ?? (baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${executionPath.replace(/^\/+/, '')}` : undefined);
  if (!endpointUrl) {
    missing.push('CRM_ACCOUNTING_PAYMENT_API_URL or CRM_ACCOUNTING_PAYMENT_API_BASE_URL');
  } else {
    if (isPlaceholderConfigValue(endpointUrl)) {
      placeholders.push(directUrl ? 'CRM_ACCOUNTING_PAYMENT_API_URL' : 'CRM_ACCOUNTING_PAYMENT_API_BASE_URL');
    }
    validateHttpUrl(endpointUrl, directUrl ? 'CRM_ACCOUNTING_PAYMENT_API_URL' : 'CRM_ACCOUNTING_PAYMENT_API_BASE_URL', invalid);
  }

  if (directUrl && baseUrl) {
    invalid.push('CRM_ACCOUNTING_PAYMENT_API_URL and CRM_ACCOUNTING_PAYMENT_API_BASE_URL are both set');
  }
  if (isPlaceholderConfigValue(executionPath)) {
    placeholders.push('CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH');
  }
  if (token && isPlaceholderConfigValue(token)) {
    placeholders.push('CRM_ACCOUNTING_PAYMENT_API_TOKEN');
  }
  if (tenant && isPlaceholderConfigValue(tenant)) {
    placeholders.push('CRM_ACCOUNTING_PAYMENT_API_TENANT');
  }
  if (timeout && !Number.isFinite(Number(timeout))) {
    invalid.push('CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS must be a number');
  }

  return {
    ready: missing.length === 0 && placeholders.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    invalid,
    endpointConfigured: Boolean(endpointUrl),
    tokenConfigured: Boolean(token),
    tenantConfigured: Boolean(tenant),
    requiredEvidenceSteps: [
      ...REQUIRED_ACCOUNTING_PAYMENT_EVIDENCE_STEPS,
    ],
  };
}

function getCrmAiRagProviderStatus() {
  const endpoint = pickString(process.env.AZURE_OPENAI_ENDPOINT);
  const embeddingDeployment = pickString(process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
  const apiKey = pickString(process.env.AZURE_OPENAI_API_KEY);
  const hasEntraCredential = Boolean(
    pickString(process.env.AZURE_TENANT_ID)
      && pickString(process.env.AZURE_CLIENT_ID)
      && pickString(process.env.AZURE_CLIENT_SECRET),
  );
  const managedIdentity = readOptionalBooleanEnv('AZURE_USE_MANAGED_IDENTITY');
  const missing = [];
  const placeholders = [];
  const invalid = [];

  if (managedIdentity.invalid) {
    invalid.push('AZURE_USE_MANAGED_IDENTITY must be true or false');
  }
  if (!endpoint) {
    missing.push('AZURE_OPENAI_ENDPOINT');
  } else if (isPlaceholderConfigValue(endpoint)) {
    placeholders.push('AZURE_OPENAI_ENDPOINT');
  }
  if (!embeddingDeployment) {
    missing.push('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
  } else if (isPlaceholderConfigValue(embeddingDeployment)) {
    placeholders.push('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
  }
  if (apiKey && looksLikeJwtToken(apiKey)) {
    invalid.push('AZURE_OPENAI_API_KEY looks like an Entra JWT token');
  }

  let credentialMode;
  if (apiKey) {
    credentialMode = 'api-key';
  } else if (hasEntraCredential) {
    credentialMode = 'entra';
  } else if (managedIdentity.value === true) {
    credentialMode = 'managed-identity';
  } else {
    missing.push('AZURE_OPENAI_API_KEY or Entra credential or explicit AZURE_USE_MANAGED_IDENTITY=true');
  }

  return {
    ready: missing.length === 0 && placeholders.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    invalid,
    credentialMode: credentialMode ?? '(missing)',
    endpointConfigured: Boolean(endpoint),
    embeddingDeploymentConfigured: Boolean(embeddingDeployment),
  };
}

function summarizeOutput(output) {
  if (!output) {
    return '';
  }

  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const selected = lines.filter((line) => {
    return line.includes('✓')
      || line.includes('✗')
      || line.includes('providerEnvReady')
      || line.includes('providerEnvMissing')
      || line.includes('configuration invalid')
      || line.includes('Missing required file')
      || line.includes('passed')
      || line.includes('failed');
  });
  return (selected.length > 0 ? selected : lines).slice(-20).join('\n');
}

function printSummary(report) {
  const scopeLabel = report.requireExtensions ? 'CRM migration completion audit with extensions' : 'CRM demo source migration completion audit';
  console.log(`${scopeLabel}: ${report.status}`);
  for (const check of report.checks) {
    console.log(`${check.status === 'passed' ? '✓' : '✗'} ${check.id}`);
    if (check.status !== 'passed') {
      if (typeof check.evidence === 'string' && check.evidence) {
        console.log(indent(check.evidence));
      }
      if (Array.isArray(check.findings) && check.findings.length > 0) {
        for (const finding of check.findings.slice(0, 10)) {
          console.log(indent(`${finding.path}: ${finding.marker}`));
        }
        if (check.findings.length > 10) {
          console.log(indent(`... ${check.findings.length - 10} more findings`));
        }
      }
      if (check.evidence && typeof check.evidence === 'object') {
        const evidence = check.evidence;
        console.log(indent(`missing=${formatList(evidence.missing)}`));
        console.log(indent(`placeholders=${formatList(evidence.placeholders)}`));
        console.log(indent(`invalid=${formatList(evidence.invalid)}`));
      }
    }
  }
  if (report.extensionReadiness) {
    const extensionChecks = Array.isArray(report.extensionReadiness.checks) ? report.extensionReadiness.checks : [];
    const readyCount = extensionChecks.filter((check) => check.status === 'passed').length;
    console.log('');
    console.log(`CRM extension readiness: ${report.extensionReadiness.status} (${readyCount}/${extensionChecks.length} ready, ${report.extensionReadiness.blocking ? 'blocking' : 'non-blocking'})`);
    if (!report.extensionReadiness.blocking) {
      for (const check of extensionChecks.filter((item) => item.status !== 'passed')) {
        console.log(`○ ${check.id}`);
      }
    }
  }
  if (report.status !== 'passed') {
    console.log('');
    console.log('CRM migration input inspection: diagnostic-only');
    console.log(indent(formatInputInspectionSummary(report.inputInspection, { markdown: false }).trim()));
  }
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }

  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`Wrote CRM migration completion report: ${reportPath}`);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((value) => value.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] ?? fallback;
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateHttpUrl(value, source, invalid) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      invalid.push(`${source} must use http(s)`);
    }
  } catch {
    invalid.push(`${source} must be an absolute http(s) URL`);
  }
}

function assertObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertEquals(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must be ${String(expected)}, got ${String(actual)}`);
  }
}

function assertNumberEquals(actual, expected, label) {
  if (typeof actual !== 'number' || !Number.isFinite(actual) || actual !== expected) {
    throw new Error(`${label} must be ${String(expected)}, got ${String(actual)}`);
  }
}

function assertNumberAtLeast(value, minimum, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${label} must be a number >= ${String(minimum)}, got ${String(value)}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertNumericIdString(value, label) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a numeric id string, got ${String(value)}`);
  }
}

function assertRequiredAccountingPaymentStepKey(value, label) {
  assertNonEmptyString(value, label);
  if (!REQUIRED_ACCOUNTING_PAYMENT_EVIDENCE_STEPS.includes(value)) {
    throw new Error(`${label} must be one of ${REQUIRED_ACCOUNTING_PAYMENT_EVIDENCE_STEPS.join(', ')}, got ${String(value)}`);
  }
}

function assertIsoDateString(value, label) {
  assertNonEmptyString(value, label);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be an ISO date string.`);
  }
}

function assertSha256(value, label) {
  assertNonEmptyString(value, label);
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hex digest.`);
  }
}

function assertHttpUrl(value, label) {
  assertNonEmptyString(value, label);
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new Error(`${label} must be an absolute http(s) URL.`);
  }
}

function assertStringArrayIncludes(value, expected, label) {
  if (!Array.isArray(value) || !value.includes(expected)) {
    throw new Error(`${label} must include ${expected}.`);
  }
}

function assertNotPlaceholder(value, label) {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized.includes('placeholder') || normalized.includes('change-me') || normalized.includes('your-')) {
    throw new Error(`${label} must not be a placeholder.`);
  }
}

function assertNotSyntheticEvidence(report, markers) {
  const serialized = JSON.stringify(report);
  const marker = markers.find((value) => serialized.includes(value));
  if (marker) {
    throw new Error(`report must not use synthetic/self-test evidence marker: ${marker}`);
  }
}

function isPlaceholderConfigValue(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith('<') && normalized.endsWith('>')) {
    return true;
  }
  return ['placeholder', 'change-me', 'your-'].some((marker) => normalized.includes(marker));
}

function readOptionalBooleanEnv(name) {
  const rawValue = pickString(process.env[name]);
  if (!rawValue) {
    return { value: undefined, invalid: false };
  }
  const normalized = rawValue.toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return { value: true, invalid: false };
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return { value: false, invalid: false };
  }
  return { value: undefined, invalid: true };
}

function looksLikeJwtToken(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function formatList(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : '(none)';
}

function indent(value) {
  return value.split(/\r?\n/).map((line) => `  ${line}`).join('\n');
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:crm-migration-completion -- [options]

Options:
  --report-path=<path.json>   Optional JSON completion audit report output
  --require-extensions        Also require external ERP/API, AI/RAG provider-ready,
                              and protected-source reflection readiness

By default this audit closes only the user-requested CRM demo source migration
scope: CRM static readiness plus local build/test evidence. External ERP/API
execution, AI/RAG provider-ready evidence, and protected-source reflection are
reported as non-blocking extension readiness unless --require-extensions is set.
Failed reports include a diagnostic-only input inspection snapshot; that
snapshot can recover local candidate paths but does not satisfy extension
readiness evidence.
`);
}
