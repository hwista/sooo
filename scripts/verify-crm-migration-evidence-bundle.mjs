#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateReport as validateAccountingPaymentProviderReport } from './verify-crm-accounting-payment-provider-report.mjs';
import { validateReport as validateCrmAiRagRuntimeReport } from './verify-crm-ai-rag-runtime-report.mjs';
import { validateReport as validateProtectedSourceReflectionReport } from './verify-crm-protected-source-reflection-report.mjs';

const REPORT_SPECS = [
  {
    id: 'accounting-payment-provider-execution',
    fileName: 'crm-accounting-payment-provider-execution-report.template.json',
    validateReport: validateAccountingPaymentProviderReport,
  },
  {
    id: 'crm-ai-rag-provider-ready-runtime',
    fileName: 'crm-ai-rag-provider-ready-runtime-report.template.json',
    validateReport: validateCrmAiRagRuntimeReport,
  },
  {
    id: 'crm-protected-source-reflection',
    fileName: 'crm-protected-source-reflection-report.template.json',
    validateReport: validateProtectedSourceReflectionReport,
  },
];

const REQUIRED_LOCAL_CHECKS = [
  'crm-launch-static-readiness',
  'crm-server-unit-and-boundary-tests',
  'crm-web-production-build',
];

const REQUIRED_EXTERNAL_INPUT_IDS = [
  'accounting-payment-provider-env',
  'crm-ai-rag-provider-env',
  'accounting-payment-provider-execution-report',
  'crm-ai-rag-provider-ready-runtime-report',
  'crm-protected-source-reflection-report',
  'protected-source-unlock-and-reflection',
];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  bundleDir: readOption('bundle-dir', 'CRM_MIGRATION_EVIDENCE_BUNDLE_DIR', 'output/crm-migration-evidence'),
  reportPath: readOption('report-path', 'CRM_MIGRATION_EVIDENCE_BUNDLE_VERIFICATION_REPORT_PATH', ''),
};

if (isCliEntryPoint()) {
  try {
    if (config.help) {
      printUsage();
      process.exit(0);
    }

    if (config.selfTest) {
      assertSelfTest();
      console.log('OK CRM migration evidence bundle verifier self-test passed');
      process.exit(0);
    }

    const report = verifyEvidenceBundle({ bundleDir: config.bundleDir });
    writeReport(config.reportPath, report);
    printSummary(report);
    if (report.status !== 'passed') {
      process.exit(1);
    }
  } catch (error) {
    console.error(`FAIL CRM migration evidence bundle verification failed: ${formatError(error)}`);
    process.exit(1);
  }
}

export function verifyEvidenceBundle({ bundleDir }) {
  const absoluteBundleDir = path.resolve(bundleDir);
  let manifest = null;

  const checks = [
    runCheck('manifest-structure', 'Evidence bundle manifest declares every required CRM completion evidence artifact.', () => {
      manifest = readJson(path.join(absoluteBundleDir, 'manifest.json'), 'manifest');
      validateManifest(manifest);
      return {
        reportCount: manifest.reports.length,
        localVerification: manifest.localVerification,
        completionAudit: manifest.completionAudit,
      };
    }),
  ];

  checks.push(runCheck('local-verification-report', 'CRM local build/test verification report exists and passed.', () => {
    const reportPath = resolveManifestPath(
      absoluteBundleDir,
      manifest?.localVerification?.reportPath,
      'crm-local-verification-report.json',
    );
    const localReport = readJson(reportPath, 'CRM local verification report');
    validateLocalVerificationReport(localReport);
    return summarizeLocalVerification(reportPath, localReport);
  }));

  for (const spec of REPORT_SPECS) {
    checks.push(runCheck(`${spec.id}-report`, `CRM evidence report ${spec.id} exists and passes its verifier.`, () => {
      const manifestReport = findManifestReport(manifest, spec.id);
      const reportPath = resolveManifestPath(absoluteBundleDir, manifestReport?.templatePath, spec.fileName);
      const evidenceReport = readJson(reportPath, `${spec.id} report`);
      spec.validateReport(evidenceReport);
      return {
        reportPath,
        schemaVersion: evidenceReport.schemaVersion,
        status: evidenceReport.status,
      };
    }));
  }

  checks.push(runCheck('required-external-input-request-packet', 'Required external input request packet keeps completion check ids and verification commands.', () => {
    const packetPath = resolveManifestPath(
      absoluteBundleDir,
      manifest?.requiredExternalInputs?.jsonPath,
      'crm-migration-required-external-inputs.json',
    );
    const packet = readJson(packetPath, 'required external inputs packet');
    validateRequiredExternalInputsPacket(packet);
    return {
      packetPath,
      requiredInputCount: packet.requiredExternalInputs.length,
      requiredInputIds: packet.requiredExternalInputs.map((item) => item.id),
    };
  }));

  return {
    schemaVersion: 1,
    status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
    generatedAt: new Date().toISOString(),
    bundleDir: absoluteBundleDir,
    checks,
    note: 'This verifies the evidence bundle files only. CRM migration completion still requires verify:crm-migration-completion to pass with provider env and docs marker removal.',
  };
}

function runCheck(id, requirement, callback) {
  const startedAt = Date.now();
  try {
    return {
      id,
      requirement,
      status: 'passed',
      durationMs: Date.now() - startedAt,
      evidence: callback(),
    };
  } catch (error) {
    return {
      id,
      requirement,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: formatError(error),
    };
  }
}

function validateManifest(manifest) {
  assertObject(manifest, 'manifest');
  assertEquals(manifest.schemaVersion, 1, 'manifest.schemaVersion');
  if (!Array.isArray(manifest.reports)) {
    throw new Error('manifest.reports must be an array.');
  }
  for (const spec of REPORT_SPECS) {
    const report = findManifestReport(manifest, spec.id);
    assertObject(report, `manifest.reports.${spec.id}`);
    assertNonEmptyString(report.templatePath, `manifest.reports.${spec.id}.templatePath`);
    assertNonEmptyString(report.verifyScript, `manifest.reports.${spec.id}.verifyScript`);
    assertNonEmptyString(report.verifyCommand, `manifest.reports.${spec.id}.verifyCommand`);
  }
  assertObject(manifest.localVerification, 'manifest.localVerification');
  assertEquals(manifest.localVerification.script, 'verify:crm-local', 'manifest.localVerification.script');
  assertNonEmptyString(manifest.localVerification.reportPath, 'manifest.localVerification.reportPath');
  assertEquals(manifest.localVerification.requiredBeforeCompletionAudit, true, 'manifest.localVerification.requiredBeforeCompletionAudit');
  assertObject(manifest.requiredExternalInputs, 'manifest.requiredExternalInputs');
  assertEquals(manifest.requiredExternalInputs.status, 'request-only', 'manifest.requiredExternalInputs.status');
  assertNonEmptyString(manifest.requiredExternalInputs.jsonPath, 'manifest.requiredExternalInputs.jsonPath');
  assertObject(manifest.completionAudit, 'manifest.completionAudit');
  assertEquals(manifest.completionAudit.script, 'verify:crm-migration-completion', 'manifest.completionAudit.script');
}

function validateLocalVerificationReport(report) {
  assertObject(report, 'localVerificationReport');
  assertEquals(report.schemaVersion, 1, 'localVerificationReport.schemaVersion');
  assertEquals(report.status, 'passed', 'localVerificationReport.status');
  if (!Array.isArray(report.checks)) {
    throw new Error('localVerificationReport.checks must be an array.');
  }
  for (const id of REQUIRED_LOCAL_CHECKS) {
    const check = report.checks.find((item) => item?.id === id);
    assertObject(check, `localVerificationReport.checks.${id}`);
    assertEquals(check.status, 'passed', `localVerificationReport.checks.${id}.status`);
  }
}

function validateRequiredExternalInputsPacket(packet) {
  assertObject(packet, 'requiredExternalInputsPacket');
  assertEquals(packet.schemaVersion, 1, 'requiredExternalInputsPacket.schemaVersion');
  assertEquals(packet.status, 'request-only', 'requiredExternalInputsPacket.status');
  if (!Array.isArray(packet.requiredExternalInputs)) {
    throw new Error('requiredExternalInputsPacket.requiredExternalInputs must be an array.');
  }
  for (const id of REQUIRED_EXTERNAL_INPUT_IDS) {
    const item = packet.requiredExternalInputs.find((input) => input?.id === id);
    assertObject(item, `requiredExternalInputs.${id}`);
    assertNonEmptyString(item.completionCheckId, `requiredExternalInputs.${id}.completionCheckId`);
    assertNonEmptyString(item.verificationCommand, `requiredExternalInputs.${id}.verificationCommand`);
  }
}

function summarizeLocalVerification(reportPath, report) {
  const serverCheck = report.checks.find((check) => check.id === 'crm-server-unit-and-boundary-tests');
  return {
    reportPath,
    status: report.status,
    checks: report.checks.map((check) => ({ id: check.id, status: check.status })),
    serverTests: serverCheck?.evidence
      ? {
        numTotalTestSuites: serverCheck.evidence.numTotalTestSuites,
        numPassedTestSuites: serverCheck.evidence.numPassedTestSuites,
        numTotalTests: serverCheck.evidence.numTotalTests,
        numPassedTests: serverCheck.evidence.numPassedTests,
      }
      : undefined,
  };
}

function findManifestReport(manifest, id) {
  return Array.isArray(manifest?.reports) ? manifest.reports.find((item) => item?.id === id) : null;
}

function resolveManifestPath(bundleDir, manifestPath, fallbackFileName) {
  const candidates = [];
  if (manifestPath) {
    if (path.isAbsolute(manifestPath)) {
      candidates.push(manifestPath);
    } else {
      candidates.push(path.resolve(bundleDir, manifestPath));
    }
    candidates.push(path.join(bundleDir, path.basename(manifestPath)));
  }
  candidates.push(path.join(bundleDir, fallbackFileName));
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to parse ${label} at ${filePath}: ${formatError(error)}`);
  }
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }
  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`Wrote CRM migration evidence bundle verification report: ${absolutePath}`);
}

function printSummary(report) {
  console.log(`CRM migration evidence bundle verification: ${report.status}`);
  for (const check of report.checks) {
    const marker = check.status === 'passed' ? 'OK' : 'FAIL';
    console.log(`${marker} ${check.id}`);
    if (check.status !== 'passed') {
      console.log(`  ${check.error}`);
    }
  }
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-evidence-bundle-verify-'));
  try {
    const passedBundleDir = path.join(tempDir, 'passed');
    writeSelfTestBundle(passedBundleDir, { draftAccountingReport: false });
    const passedReport = verifyEvidenceBundle({ bundleDir: passedBundleDir });
    if (passedReport.status !== 'passed') {
      throw new Error(`expected self-test passed bundle to pass: ${JSON.stringify(passedReport.checks, null, 2)}`);
    }

    const failedBundleDir = path.join(tempDir, 'failed');
    writeSelfTestBundle(failedBundleDir, { draftAccountingReport: true });
    const failedReport = verifyEvidenceBundle({ bundleDir: failedBundleDir });
    if (failedReport.status !== 'failed') {
      throw new Error('expected self-test draft accounting bundle to fail.');
    }
    const failedAccounting = failedReport.checks.find((check) => check.id === 'accounting-payment-provider-execution-report');
    if (failedAccounting?.status !== 'failed' || !failedAccounting.error.includes('status')) {
      throw new Error('expected draft accounting report failure to mention status.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeSelfTestBundle(bundleDir, { draftAccountingReport }) {
  fs.mkdirSync(bundleDir, { recursive: true });
  const protectedSourcePath = path.join(bundleDir, 'unlocked-protected-crm-source.txt');
  fs.writeFileSync(protectedSourcePath, 'unlocked protected CRM migration source evidence material\n', 'utf-8');
  const protectedSourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(protectedSourcePath)).digest('hex');

  const accountingReportPath = path.join(bundleDir, 'crm-accounting-payment-provider-execution-report.template.json');
  const accountingReport = createAccountingPaymentReport();
  if (draftAccountingReport) {
    accountingReport.status = 'draft';
  }
  writeJson(accountingReportPath, accountingReport);

  const aiReportPath = path.join(bundleDir, 'crm-ai-rag-provider-ready-runtime-report.template.json');
  writeJson(aiReportPath, createCrmAiRagReport());

  const protectedReportPath = path.join(bundleDir, 'crm-protected-source-reflection-report.template.json');
  writeJson(protectedReportPath, createProtectedSourceReflectionReport(protectedSourcePath, protectedSourceSha256));

  const localReportPath = path.join(bundleDir, 'crm-local-verification-report.json');
  writeJson(localReportPath, createLocalVerificationReport());

  const requiredInputsPath = path.join(bundleDir, 'crm-migration-required-external-inputs.json');
  writeJson(requiredInputsPath, createRequiredExternalInputsPacket());

  const manifest = {
    schemaVersion: 1,
    status: 'draft',
    localVerification: {
      script: 'verify:crm-local',
      command: 'pnpm run verify:crm-local -- --report-path=crm-local-verification-report.json',
      reportPath: localReportPath,
      requiredBeforeCompletionAudit: true,
    },
    requiredExternalInputs: {
      status: 'request-only',
      jsonPath: requiredInputsPath,
      count: REQUIRED_EXTERNAL_INPUT_IDS.length,
    },
    reports: REPORT_SPECS.map((spec) => ({
      id: spec.id,
      templatePath: path.join(bundleDir, spec.fileName),
      verifyScript: spec.id === 'accounting-payment-provider-execution'
        ? 'verify:crm-accounting-payment-provider-report'
        : spec.id === 'crm-ai-rag-provider-ready-runtime'
          ? 'verify:crm-ai-rag-runtime-report'
          : 'verify:crm-protected-source-reflection-report',
      verifyCommand: `pnpm run ${spec.id}`,
    })),
    completionAudit: {
      script: 'verify:crm-migration-completion',
      command: 'pnpm run verify:crm-migration-completion',
      requiresUnresolvedMarkerRemoval: true,
    },
  };
  writeJson(path.join(bundleDir, 'manifest.json'), manifest);
}

function createLocalVerificationReport() {
  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt: '2026-07-10T00:00:00.000Z',
    finishedAt: '2026-07-10T00:01:00.000Z',
    durationMs: 60000,
    checks: [
      { id: 'crm-launch-static-readiness', status: 'passed', durationMs: 1000 },
      {
        id: 'crm-server-unit-and-boundary-tests',
        status: 'passed',
        durationMs: 30000,
        evidence: {
          numTotalTestSuites: 15,
          numPassedTestSuites: 15,
          numTotalTests: 130,
          numPassedTests: 130,
        },
      },
      { id: 'crm-web-production-build', status: 'passed', durationMs: 5000 },
    ],
  };
}

function createAccountingPaymentReport() {
  const executedAt = '2026-07-10T00:00:00.000Z';
  const settlementAmountTotal = 1200000;
  const lineCount = 3;
  const steps = ['accounting-voucher', 'payment-request', 'payment-execution', 'external-system-sync'];
  return {
    schemaVersion: 1,
    status: 'passed',
    providerMode: 'external-api',
    handoffId: 'crm-handoff-7429',
    executionId: 'crm-accounting-payment-execution-7429',
    providerName: 'sap-fi-payment-gateway',
    providerRequestId: 'erp-request-7429',
    executedAt,
    lineCount,
    settlementAmountTotal,
    artifacts: steps.map((key) => ({
      key,
      label: key,
      evidencePath: `erp://accounting-payment/crm-handoff-7429/${key}.json`,
      referenceNo: `ERP-7429-${key}`,
      amount: settlementAmountTotal,
      executedAt,
    })),
    reconciliation: {
      status: 'matched',
      checkedAt: '2026-07-10T00:05:00.000Z',
      sourceSystem: 'external-erp',
      evidencePath: 'erp://accounting-payment/crm-handoff-7429/reconciliation.json',
      crmLineCount: lineCount,
      providerLineCount: lineCount,
      crmSettlementAmountTotal: settlementAmountTotal,
      providerSettlementAmountTotal: settlementAmountTotal,
      amountDifference: 0,
    },
  };
}

function createCrmAiRagReport() {
  const startedAt = '2026-07-10T00:00:00.000Z';
  const finishedAt = '2026-07-10T00:01:00.000Z';
  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt,
    finishedAt,
    durationMs: 60000,
    providerMode: 'ready',
    baseUrl: 'https://crm.internal.corp/api',
    opportunity: createEntity('41037', 'CRM-OPP-41037', 'Won migration opportunity', 'July enterprise CRM pipeline'),
    customer: createEntity('52088', 'CRM-CUS-52088', 'Northwind Systems', 'Northwind renewal account'),
    activity: {
      id: '63109',
      code: 'CRM-ACT-63109',
      customerId: '52088',
      subject: 'Renewal steering meeting',
      query: 'Northwind renewal meeting',
    },
    sourceStatus: {
      before: createSourceStatus(),
      after: createSourceStatus(),
    },
    backfill: {
      opportunity: {
        sourceApp: 'crm',
        entityType: 'opportunity',
        entityId: '41037',
        jobType: 'backfill',
        jobId: '81001',
        queuedCount: 1,
        failedCount: 0,
        reasonCode: 'crm_provider_ready_evidence_opportunity',
      },
      customerActivity: {
        sourceApp: 'crm',
        entityTypes: ['customer', 'activity'],
        jobType: 'backfill',
        selectedCustomerCount: 1,
        selectedActivityCount: 1,
        queuedCount: 2,
        failedCount: 0,
        reasonCode: 'crm_provider_ready_evidence_customer_activity',
      },
    },
    jobRun: {
      attempts: 1,
      runs: [{ attempt: 1, shape: 'object', processedCount: 3 }],
      targetJobs: [
        { jobId: '81001', entityType: 'opportunity', entityId: '41037', jobStatusCode: 'indexed' },
        { jobId: '81002', entityType: 'customer', entityId: '52088', jobStatusCode: 'indexed' },
        { jobId: '81003', entityType: 'activity', entityId: '63109', jobStatusCode: 'indexed' },
      ],
    },
    retrieval: {
      opportunity: createRetrieval('91001'),
      customer: createRetrieval('91002'),
      activity: createRetrieval('91003'),
    },
    database: {
      opportunity: createDatabaseEvidence('92001', '91001', 'July enterprise CRM pipeline', '81001'),
      customer: createDatabaseEvidence('92002', '91002', 'Northwind renewal account', '81002'),
      activity: createDatabaseEvidence('92003', '91003', 'Northwind renewal meeting', '81003'),
    },
  };
}

function createProtectedSourceReflectionReport(sourceFilePath, sourceSha256) {
  const reflectedAt = '2026-07-10T00:00:00.000Z';
  const reflectedDocumentPaths = [
    'docs/crm/README.md',
    'docs/crm/planning/backlog.md',
    'docs/crm/planning/source-migration-prd.md',
  ];
  return {
    schemaVersion: 1,
    status: 'passed',
    sourceType: 'protected-crm-presentation',
    sourceFilePath,
    sourceSha256,
    unlockedAt: reflectedAt,
    extractedAt: reflectedAt,
    reflectedAt,
    extraction: {
      method: 'pptx-text-extraction',
      textExtracted: true,
      slideCount: 3,
      extractedCharacterCount: 128,
    },
    coverage: {
      protectedSourceReflected: true,
      unresolvedCount: 0,
      unmappedSourceItemCount: 0,
      reflectedDocumentPaths,
    },
    decisions: reflectedDocumentPaths.map((targetPath, index) => ({
      id: `protected-crm-source-${index + 1}`,
      sourceRef: `slide-${index + 1}`,
      status: 'reflected',
      summary: `Reflected protected CRM migration source material into ${targetPath}.`,
      targetPaths: [targetPath],
    })),
  };
}

function createEntity(id, code, name, query) {
  return { id, code, name, query };
}

function createSourceStatus() {
  return {
    sourceApp: 'crm',
    registered: true,
    registrationStatus: 'registered',
    indexingEnabled: true,
    keywordSearchEnabled: true,
    metadataSearchEnabled: true,
    semanticSearchEnabled: true,
    vectorSearchEnabled: true,
    ragContextEnabled: true,
  };
}

function createRetrieval(retrievalLogId) {
  return {
    retrievalLogId,
    total: 1,
    ranker: 'vector',
    ragReady: true,
    resultCount: 1,
    contextItemCount: 1,
    citationCount: 0,
    capabilities: {
      semantic: true,
      vector: true,
      ragContext: true,
    },
  };
}

function createDatabaseEvidence(objectId, retrievalLogId, queryText, jobId) {
  return {
    objectId,
    title: `CRM AI object ${objectId}`,
    indexStatusCode: 'indexed',
    targetPath: `crm://ai-object/${objectId}`,
    chunkCount: 2,
    queryChunkCount: 1,
    stateChunkCount: 2,
    indexedChunkCount: 2,
    embeddingCount: 2,
    aclScope: 'policy',
    latestJob: {
      jobId,
      jobStatusCode: 'indexed',
      requestedAt: '2026-07-10T00:00:00.000Z',
      finishedAt: '2026-07-10T00:00:30.000Z',
      reasonCode: 'crm_provider_ready_evidence',
    },
    retrievalAudit: {
      retrievalLogId,
      sourceApp: 'crm',
      queryText,
      resultCount: 1,
      contextCount: 1,
      itemCount: 1,
      contextItemCount: 1,
    },
  };
}

function createRequiredExternalInputsPacket() {
  return {
    schemaVersion: 1,
    status: 'request-only',
    generatedAt: '2026-07-10T00:00:00.000Z',
    rootDir: process.cwd(),
    requiredExternalInputs: REQUIRED_EXTERNAL_INPUT_IDS.map((id) => ({
      id,
      status: id === 'protected-source-unlock-and-reflection' ? 'candidate-found' : 'missing',
      kind: id.endsWith('-env') ? 'environment' : id === 'protected-source-unlock-and-reflection' ? 'protected-source' : 'report',
      required: ['self-test-required-input'],
      completionCheckId: id === 'protected-source-unlock-and-reflection'
        ? 'crm-protected-source-reflection-report'
        : id.replace(/-env$/, '-ready'),
      verificationCommand: 'pnpm run self-test-verifier',
      description: 'self-test required input',
    })),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
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

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1]) {
    return argv[index + 1];
  }
  return process.env[envName] ?? fallback;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isCliEntryPoint() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:crm-migration-evidence-bundle -- [options]

Options:
  --bundle-dir=<dir>   Evidence bundle directory generated by prepare:crm-migration-evidence
  --report-path=<path> Write a JSON verification report
  --self-test          Run local verifier self-test

Environment:
  CRM_MIGRATION_EVIDENCE_BUNDLE_DIR
  CRM_MIGRATION_EVIDENCE_BUNDLE_VERIFICATION_REPORT_PATH

This verifier checks bundle files only. It does not replace verify:crm-migration-completion.
`);
}
