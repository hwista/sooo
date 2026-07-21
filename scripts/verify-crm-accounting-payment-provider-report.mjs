#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_EVIDENCE_STEPS = [
  'accounting-voucher',
  'payment-request',
  'payment-execution',
  'external-system-sync',
];
const SYNTHETIC_EVIDENCE_MARKERS = [
  'crm-handoff-1001',
  'crm-accounting-payment-execution-1001',
  'erp-request-1001',
  'external-accounting-payment-api',
  'ERP-1001-',
  'ERP-accounting-voucher-1001',
  'evidence.example.test',
];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  printTemplate: argv.includes('--template'),
  printSummary: argv.includes('--summary'),
  reportPath: pickString(readOption('path', 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH', '')),
  summaryPath: pickString(readOption('summary-path', 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_SUMMARY_PATH', '')),
};

if (isCliEntryPoint()) {
  try {
    if (config.help) {
      printUsage();
      process.exit(0);
    }

    if (config.printTemplate) {
      console.log(JSON.stringify(createTemplateReport(), null, 2));
      process.exit(0);
    }

    if (config.selfTest) {
      assertSelfTest();
      console.log('✓ CRM accounting/payment provider execution report self-test passed');
      process.exit(0);
    }

    validateConfig(config);
    const report = readReport(config.reportPath);
    validateReport(report);
    const summary = formatReportSummary(report);
    writeSummary(config.summaryPath, summary);
    if (config.printSummary) {
      console.log(summary);
    }
    console.log('✓ CRM accounting/payment provider execution report verification passed');
  } catch (error) {
    console.error(`✗ CRM accounting/payment provider execution report verification failed: ${formatError(error)}`);
    process.exit(1);
  }
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH or --path=<path.json> is required.');
  }
}

function readReport(reportPath) {
  const absolutePath = path.resolve(reportPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing report file: ${reportPath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to parse report JSON at ${reportPath}: ${formatError(error)}`);
  }
}

export function validateReport(report, options = {}) {
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
  validateArtifacts(report.artifacts, report);
  validateReconciliation(report.reconciliation, report);
  assertNotSyntheticEvidence(report, options);
}

function validateArtifacts(artifacts, report) {
  if (!Array.isArray(artifacts)) {
    throw new Error('artifacts must be an array.');
  }
  if (artifacts.length < REQUIRED_EVIDENCE_STEPS.length) {
    throw new Error(`artifacts must include at least ${REQUIRED_EVIDENCE_STEPS.length} evidence steps.`);
  }

  const seenKeys = new Set();
  for (const artifact of artifacts) {
    assertObject(artifact, 'artifact');
    const key = assertRequiredStepKey(artifact.key, 'artifact.key');
    seenKeys.add(key);
    assertNonEmptyString(artifact.evidencePath, `artifact.${key}.evidencePath`);
    assertNotPlaceholder(artifact.evidencePath, `artifact.${key}.evidencePath`);
    assertNonEmptyString(artifact.referenceNo, `artifact.${key}.referenceNo`);
    assertNumberAtLeast(artifact.amount, 0, `artifact.${key}.amount`);
    if (artifact.executedAt !== undefined) {
      assertIsoDateString(artifact.executedAt, `artifact.${key}.executedAt`);
    }
  }

  const missing = REQUIRED_EVIDENCE_STEPS.filter((key) => !seenKeys.has(key));
  if (missing.length > 0) {
    throw new Error(`Missing required evidence steps: ${missing.join(', ')}`);
  }

  const positiveAmountArtifacts = artifacts.filter((artifact) => Number(artifact.amount) === Number(report.settlementAmountTotal));
  if (positiveAmountArtifacts.length === 0) {
    throw new Error('At least one artifact amount must match settlementAmountTotal.');
  }
}

function validateReconciliation(reconciliation, report) {
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

function formatReportSummary(report) {
  const reconciliation = report.reconciliation ?? {};
  const artifactRows = Array.isArray(report.artifacts)
    ? report.artifacts.map((artifact) => `${artifact.key}:${artifact.referenceNo}`).join(', ')
    : '(missing)';

  return [
    '# CRM Accounting/Payment Provider Execution Evidence',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| status | ${escapeMarkdownCell(String(report.status))} |`,
    `| providerMode | ${escapeMarkdownCell(String(report.providerMode))} |`,
    `| handoffId | ${escapeMarkdownCell(String(report.handoffId))} |`,
    `| executionId | ${escapeMarkdownCell(String(report.executionId))} |`,
    `| providerName | ${escapeMarkdownCell(String(report.providerName))} |`,
    `| executedAt | ${escapeMarkdownCell(String(report.executedAt))} |`,
    `| lineCount | ${escapeMarkdownCell(String(report.lineCount))} |`,
    `| settlementAmountTotal | ${escapeMarkdownCell(String(report.settlementAmountTotal))} |`,
    `| evidenceSteps | ${escapeMarkdownCell(artifactRows)} |`,
    `| reconciliation.status | ${escapeMarkdownCell(String(reconciliation.status))} |`,
    `| reconciliation.sourceSystem | ${escapeMarkdownCell(String(reconciliation.sourceSystem))} |`,
    `| reconciliation.evidencePath | ${escapeMarkdownCell(String(reconciliation.evidencePath))} |`,
    '',
  ].join('\n');
}

function writeSummary(summaryPath, summary) {
  if (!summaryPath) {
    return;
  }
  const absolutePath = path.resolve(summaryPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${summary.trimEnd()}\n`, 'utf-8');
  console.log(`→ wrote CRM accounting/payment provider execution summary: ${summaryPath}`);
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-accounting-provider-report-'));
  const validPath = path.join(tempDir, 'valid-report.json');
  const invalidPath = path.join(tempDir, 'invalid-report.json');
  const summaryPath = path.join(tempDir, 'summary.md');
  try {
    const validReport = createSelfTestReport();
    fs.writeFileSync(validPath, `${JSON.stringify(validReport, null, 2)}\n`, 'utf-8');
    validateReport(readReport(validPath), { allowSyntheticEvidence: true });
    writeSummary(summaryPath, formatReportSummary(validReport));
    const summary = fs.readFileSync(summaryPath, 'utf-8');
    assertSelfTestIncludes(summary, 'CRM Accounting/Payment Provider Execution Evidence');
    assertSelfTestIncludes(summary, 'reconciliation.status');

    const invalidReport = {
      ...validReport,
      reconciliation: {
        ...validReport.reconciliation,
        amountDifference: 10,
      },
    };
    fs.writeFileSync(invalidPath, `${JSON.stringify(invalidReport, null, 2)}\n`, 'utf-8');
    assertThrows(() => validateReport(readReport(invalidPath), { allowSyntheticEvidence: true }), 'reconciliation.amountDifference');
    assertThrows(() => validateReport(createTemplateReport()), 'status');
    assertThrows(() => validateReport(validReport), 'synthetic');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function createTemplateReport() {
  const executedAt = '2026-07-10T00:00:00.000Z';
  const settlementAmountTotal = 1000000;
  const lineCount = 1;
  return {
    schemaVersion: 1,
    status: 'draft',
    templateNote: 'Replace every change-me value with real external ERP/API execution evidence, then set status to passed.',
    providerMode: 'external-api',
    handoffId: 'change-me-crm-handoff-id',
    executionId: 'change-me-provider-execution-id',
    providerName: 'change-me-provider-name',
    providerRequestId: 'change-me-provider-request-id',
    executedAt,
    lineCount,
    settlementAmountTotal,
    artifacts: REQUIRED_EVIDENCE_STEPS.map((key) => ({
      key,
      label: key,
      evidencePath: `change-me://accounting-payment/${key}.json`,
      referenceNo: `change-me-${key}`,
      amount: settlementAmountTotal,
      executedAt,
    })),
    reconciliation: {
      status: 'matched',
      checkedAt: '2026-07-10T00:05:00.000Z',
      sourceSystem: 'change-me-erp-source-system',
      evidencePath: 'change-me://accounting-payment/reconciliation.json',
      crmLineCount: lineCount,
      providerLineCount: lineCount,
      crmSettlementAmountTotal: settlementAmountTotal,
      providerSettlementAmountTotal: settlementAmountTotal,
      amountDifference: 0,
    },
  };
}

function createSelfTestReport() {
  const executedAt = '2026-07-10T00:00:00.000Z';
  const settlementAmountTotal = 1200000;
  const lineCount = 3;
  return {
    schemaVersion: 1,
    status: 'passed',
    providerMode: 'external-api',
    handoffId: 'crm-handoff-1001',
    executionId: 'crm-accounting-payment-execution-1001',
    providerName: 'external-accounting-payment-api',
    providerRequestId: 'erp-request-1001',
    executedAt,
    lineCount,
    settlementAmountTotal,
    artifacts: REQUIRED_EVIDENCE_STEPS.map((key) => ({
      key,
      label: key,
      evidencePath: `erp://accounting-payment/crm-handoff-1001/${key}.json`,
      referenceNo: `ERP-1001-${key}`,
      amount: settlementAmountTotal,
      executedAt,
    })),
    reconciliation: {
      status: 'matched',
      checkedAt: '2026-07-10T00:05:00.000Z',
      sourceSystem: 'ERP',
      evidencePath: 'erp://accounting-payment/crm-handoff-1001/reconciliation.json',
      crmLineCount: lineCount,
      providerLineCount: lineCount,
      crmSettlementAmountTotal: settlementAmountTotal,
      providerSettlementAmountTotal: settlementAmountTotal,
      amountDifference: 0,
    },
  };
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
  return value.trim();
}

function assertIsoDateString(value, label) {
  assertNonEmptyString(value, label);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be an ISO date string.`);
  }
}

function assertRequiredStepKey(value, label) {
  assertNonEmptyString(value, label);
  if (!REQUIRED_EVIDENCE_STEPS.includes(value)) {
    throw new Error(`${label} must be one of ${REQUIRED_EVIDENCE_STEPS.join(', ')}, got ${String(value)}`);
  }
  return value;
}

function assertNotPlaceholder(value, label) {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized.includes('placeholder') || normalized.includes('change-me') || normalized.includes('your-')) {
    throw new Error(`${label} must not be a placeholder.`);
  }
}

function assertNotSyntheticEvidence(report, options) {
  if (options.allowSyntheticEvidence === true) {
    return;
  }
  const serialized = JSON.stringify(report);
  const marker = SYNTHETIC_EVIDENCE_MARKERS.find((value) => serialized.includes(value));
  if (marker) {
    throw new Error(`report must not use synthetic/self-test evidence marker: ${marker}`);
  }
}

function assertThrows(callback, expectedMessagePart) {
  try {
    callback();
  } catch (error) {
    if (formatError(error).includes(expectedMessagePart)) {
      return;
    }
    throw new Error(`Expected error containing ${expectedMessagePart}, got ${formatError(error)}`);
  }
  throw new Error(`Expected error containing ${expectedMessagePart}.`);
}

function assertSelfTestIncludes(value, pattern) {
  if (!value.includes(pattern)) {
    throw new Error(`self-test summary must include ${pattern}`);
  }
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((value) => value.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] ?? fallback;
}

function escapeMarkdownCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isCliEntryPoint() {
  return process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:crm-accounting-payment-provider-report -- [options]

Options:
  --path=<path.json>          Provider execution report JSON
  --summary-path=<path.md>    Optional Markdown summary output
  --summary                   Print Markdown summary
  --template                  Print a draft JSON authoring template
  --self-test                 Run local schema validation self-test

Environment:
  CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH
  CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_SUMMARY_PATH
`);
}
