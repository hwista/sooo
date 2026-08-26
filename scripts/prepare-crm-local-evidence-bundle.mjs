#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRepositoryWorktreeIdentity } from './repository-worktree-identity.mjs';

const LOCAL_VERIFICATION_REPORT_FILE_NAME = 'crm-local-verification-report.json';
const LOCAL_VERIFICATION_SOURCE_FILE_NAME = 'crm-local-verification-report.source.json';
const BUNDLE_VERIFICATION_REPORT_FILE_NAME = 'crm-migration-evidence-bundle-verification.json';
const WRAPPER_REPORT_FILE_NAME = 'crm-local-evidence-bundle-report.json';
const EXPECTED_PENDING_EXTERNAL_REPORT_CHECKS = [
  'accounting-payment-provider-execution-report',
  'crm-ai-rag-provider-ready-runtime-report',
  'crm-protected-source-reflection-report',
];
const EXTERNAL_EVIDENCE_REPORT_SPECS = [
  {
    id: 'accounting-payment-provider-execution',
    checkId: 'accounting-payment-provider-execution-report',
    optionName: 'accounting-payment-report-path',
    envNames: ['CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH'],
    bundleFileName: 'crm-accounting-payment-provider-execution-report.template.json',
  },
  {
    id: 'crm-ai-rag-provider-ready-runtime',
    checkId: 'crm-ai-rag-provider-ready-runtime-report',
    optionName: 'crm-ai-rag-report-path',
    envNames: ['CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', 'CRM_AI_RAG_REPORT_PATH'],
    bundleFileName: 'crm-ai-rag-provider-ready-runtime-report.template.json',
  },
  {
    id: 'crm-protected-source-reflection',
    checkId: 'crm-protected-source-reflection-report',
    optionName: 'protected-source-reflection-report-path',
    envNames: ['CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH'],
    bundleFileName: 'crm-protected-source-reflection-report.template.json',
  },
];
const REQUIRED_PASSED_BUNDLE_CHECKS = [
  'manifest-structure',
  'local-verification-report',
  'required-external-input-request-packet',
];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  outDir: pickString(readOption('out-dir', 'CRM_LOCAL_EVIDENCE_BUNDLE_DIR', 'output/crm-local-evidence-bundle')),
  inputRootDir: pickString(readOption('input-root-dir', 'CRM_MIGRATION_INPUT_ROOT_DIR', process.cwd())),
  protectedSourcePath: pickString(readOption('protected-source-path', 'CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH', '')),
  localVerificationReportPath: pickString(readOption('local-verification-report-path', 'CRM_LOCAL_VERIFICATION_REPORT_PATH', '')),
  externalReportPaths: readExternalReportPathOptions(),
  reportPath: pickString(readOption('report-path', 'CRM_LOCAL_EVIDENCE_BUNDLE_REPORT_PATH', '')),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    assertSelfTest();
    console.log('OK CRM local evidence bundle self-test passed');
    process.exit(0);
  }

  const report = prepareLocalEvidenceBundle(config);
  printSummary(report);
  process.exit(report.status === 'failed' ? 1 : 0);
} catch (error) {
  console.error(`FAIL CRM local evidence bundle preparation failed: ${formatError(error)}`);
  process.exit(1);
}

function prepareLocalEvidenceBundle(options) {
  const outDir = path.resolve(options.outDir ?? 'output/crm-local-evidence-bundle');
  const inputRootDir = path.resolve(options.inputRootDir ?? process.cwd());
  fs.mkdirSync(outDir, { recursive: true });

  const startedAt = new Date();
  const localVerification = resolveLocalVerificationReport({
    outDir,
    localVerificationReportPath: options.localVerificationReportPath,
  });

  const prepareCommand = [
    'node',
    'scripts/prepare-crm-migration-evidence-bundle.mjs',
    `--out-dir=${outDir}`,
    `--input-root-dir=${inputRootDir}`,
    `--local-verification-report-path=${localVerification.sourceReportPath}`,
  ];
  if (options.protectedSourcePath) {
    prepareCommand.push(`--protected-source-path=${path.resolve(options.protectedSourcePath)}`);
  }

  const prepareResult = runCommand(prepareCommand, 'CRM migration evidence bundle preparer');
  assertCommandPassed(prepareResult);
  const externalEvidenceReports = applyExternalEvidenceReports(outDir, options.externalReportPaths ?? {});

  const bundleVerificationReportPath = path.join(outDir, BUNDLE_VERIFICATION_REPORT_FILE_NAME);
  const bundleVerificationCommand = [
    'node',
    'scripts/verify-crm-migration-evidence-bundle.mjs',
    `--bundle-dir=${outDir}`,
    `--report-path=${bundleVerificationReportPath}`,
  ];
  const bundleVerificationResult = runCommand(bundleVerificationCommand, 'CRM migration evidence bundle verifier');
  const bundleVerificationReport = readJson(bundleVerificationReportPath, 'CRM migration evidence bundle verification report');
  const status = determineWrapperStatus(bundleVerificationReport);
  const pendingExternalReports = getPendingExternalReports(bundleVerificationReport);
  const wrapperReportPath = path.resolve(options.reportPath || path.join(outDir, WRAPPER_REPORT_FILE_NAME));

  const finishedAt = new Date();
  const report = {
    schemaVersion: 1,
    status,
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    outDir,
    inputRootDir,
    wrapperReportPath,
    localVerification: {
      mode: localVerification.mode,
      sourceReportPath: localVerification.sourceReportPath,
      bundledReportPath: path.join(outDir, LOCAL_VERIFICATION_REPORT_FILE_NAME),
      command: localVerification.commandResult?.command,
      commandResult: localVerification.commandResult,
    },
    externalEvidenceReports,
    prepareEvidenceBundle: prepareResult,
    bundleVerification: {
      reportPath: bundleVerificationReportPath,
      commandResult: bundleVerificationResult,
      status: bundleVerificationReport.status,
      checks: bundleVerificationReport.checks.map((check) => ({
        id: check.id,
        status: check.status,
        error: check.error,
      })),
    },
    pendingExternalReports,
    completionAudit: {
      script: 'verify:crm-migration-completion',
      command: 'pnpm run verify:crm-migration-completion',
    },
    note: 'This local evidence bundle proves local build/test evidence is bundled, but does not replace verify:crm-migration-completion.',
  };

  writeWrapperReport(wrapperReportPath, report);

  if (status === 'failed') {
    throw new Error('CRM local evidence bundle has unexpected verification failures. See bundleVerification.checks in the wrapper report.');
  }

  return report;
}

function resolveLocalVerificationReport({ outDir, localVerificationReportPath }) {
  if (localVerificationReportPath) {
    const sourceReportPath = ensureCopyableLocalReportSource(path.resolve(localVerificationReportPath), outDir);
    return {
      mode: 'existing-report',
      sourceReportPath,
    };
  }

  const sourceReportPath = path.join(outDir, LOCAL_VERIFICATION_SOURCE_FILE_NAME);
  const command = [
    'node',
    'scripts/verify-crm-local-evidence.mjs',
    `--report-path=${sourceReportPath}`,
  ];
  const commandResult = runCommand(command, 'CRM local build/test verifier');
  assertCommandPassed(commandResult);
  return {
    mode: 'generated',
    sourceReportPath,
    commandResult,
  };
}

function ensureCopyableLocalReportSource(sourceReportPath, outDir) {
  if (!fs.existsSync(sourceReportPath)) {
    throw new Error(`Missing CRM local verification report: ${sourceReportPath}`);
  }

  const canonicalBundlePath = path.join(outDir, LOCAL_VERIFICATION_REPORT_FILE_NAME);
  if (path.resolve(sourceReportPath) !== path.resolve(canonicalBundlePath)) {
    return sourceReportPath;
  }

  const copyableSourcePath = path.join(outDir, LOCAL_VERIFICATION_SOURCE_FILE_NAME);
  fs.copyFileSync(sourceReportPath, copyableSourcePath);
  return copyableSourcePath;
}

function determineWrapperStatus(bundleVerificationReport) {
  if (bundleVerificationReport.status === 'passed') {
    return 'bundle-ready';
  }
  if (isPendingExternalOnly(bundleVerificationReport)) {
    return 'local-ready-pending-external';
  }
  return 'failed';
}

function isPendingExternalOnly(bundleVerificationReport) {
  if (!Array.isArray(bundleVerificationReport.checks)) {
    return false;
  }

  const failedChecks = bundleVerificationReport.checks.filter((check) => check.status !== 'passed');
  if (failedChecks.length === 0 || failedChecks.length > EXPECTED_PENDING_EXTERNAL_REPORT_CHECKS.length) {
    return false;
  }

  const requiredPassed = REQUIRED_PASSED_BUNDLE_CHECKS.every((id) => {
    const check = bundleVerificationReport.checks.find((item) => item.id === id);
    return check?.status === 'passed';
  });
  if (!requiredPassed) {
    return false;
  }

  return failedChecks.every((check) => (
    EXPECTED_PENDING_EXTERNAL_REPORT_CHECKS.includes(check.id)
      && String(check.error).includes('status must be passed, got draft')
  ));
}

function applyExternalEvidenceReports(outDir, externalReportPaths) {
  return EXTERNAL_EVIDENCE_REPORT_SPECS.map((spec) => {
    const sourcePath = pickString(externalReportPaths[spec.id]);
    const targetPath = path.join(outDir, spec.bundleFileName);
    if (!sourcePath) {
      return {
        id: spec.id,
        checkId: spec.checkId,
        status: 'not-supplied',
        targetPath,
      };
    }

    const absoluteSourcePath = path.resolve(sourcePath);
    if (!fs.existsSync(absoluteSourcePath)) {
      throw new Error(`Missing external CRM evidence report for ${spec.id}: ${sourcePath}`);
    }
    if (path.resolve(targetPath) !== absoluteSourcePath) {
      fs.copyFileSync(absoluteSourcePath, targetPath);
    }
    return {
      id: spec.id,
      checkId: spec.checkId,
      status: 'applied',
      sourcePath: absoluteSourcePath,
      targetPath,
    };
  });
}

function getPendingExternalReports(bundleVerificationReport) {
  if (!Array.isArray(bundleVerificationReport.checks)) {
    return [];
  }
  return bundleVerificationReport.checks
    .filter((check) => EXPECTED_PENDING_EXTERNAL_REPORT_CHECKS.includes(check.id) && check.status !== 'passed')
    .map((check) => ({
      id: check.id,
      status: check.status,
      error: check.error,
    }));
}

function runCommand(command, label) {
  const startedAt = Date.now();
  console.log(`[crm-local-evidence-bundle] running ${label}: ${formatCommand(command)}`);
  const result = spawnSync(command[0], command.slice(1), {
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
    label,
    command: formatCommand(command),
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? (result.error || result.signal ? 1 : 0),
    signal: result.signal ?? undefined,
    durationMs: Date.now() - startedAt,
    stdoutTail: summarizeOutput(stdout),
    stderrTail: summarizeOutput(stderr),
    error: result.error ? formatError(result.error) : undefined,
  };
}

function assertCommandPassed(result) {
  if (result.status !== 'passed') {
    throw new Error(`${result.label} failed with exit code ${result.exitCode}.`);
  }
}

function writeWrapperReport(reportPath, report) {
  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`Wrote CRM local evidence bundle report: ${absolutePath}`);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to parse ${label}: ${formatError(error)}`);
  }
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-local-evidence-bundle-'));
  try {
    const localVerificationReportPath = path.join(tempDir, 'passed-crm-local-verification-report.json');
    fs.writeFileSync(
      localVerificationReportPath,
      `${JSON.stringify(createSelfTestLocalVerificationReport(), null, 2)}\n`,
      'utf-8',
    );
    const accountingPaymentReportPath = path.join(tempDir, 'passed-crm-accounting-payment-provider-report.json');
    fs.writeFileSync(
      accountingPaymentReportPath,
      `${JSON.stringify(createSelfTestAccountingPaymentProviderReport(), null, 2)}\n`,
      'utf-8',
    );

    const outDir = path.join(tempDir, 'bundle');
    const reportPath = path.join(tempDir, 'wrapper-report.json');
    const report = prepareLocalEvidenceBundle({
      outDir,
      inputRootDir: tempDir,
      localVerificationReportPath,
      reportPath,
      externalReportPaths: {
        'accounting-payment-provider-execution': accountingPaymentReportPath,
      },
    });

    if (report.status !== 'local-ready-pending-external') {
      throw new Error(`expected local-ready-pending-external, got ${report.status}`);
    }
    if (!fs.existsSync(path.join(outDir, LOCAL_VERIFICATION_REPORT_FILE_NAME))) {
      throw new Error('expected bundled local verification report to exist.');
    }
    if (!fs.existsSync(path.join(outDir, BUNDLE_VERIFICATION_REPORT_FILE_NAME))) {
      throw new Error('expected bundle verification report to exist.');
    }
    if (report.pendingExternalReports.length !== EXPECTED_PENDING_EXTERNAL_REPORT_CHECKS.length - 1) {
      throw new Error('expected supplied accounting report to reduce pending external report checks.');
    }
    for (const id of EXPECTED_PENDING_EXTERNAL_REPORT_CHECKS.filter((item) => item !== 'accounting-payment-provider-execution-report')) {
      if (!report.pendingExternalReports.some((item) => item.id === id)) {
        throw new Error(`missing pending external report check: ${id}`);
      }
    }
    const appliedAccounting = report.externalEvidenceReports.find((item) => item.id === 'accounting-payment-provider-execution');
    if (appliedAccounting?.status !== 'applied') {
      throw new Error('expected accounting/payment external evidence report to be applied.');
    }
    const accountingCheck = report.bundleVerification.checks.find((item) => item.id === 'accounting-payment-provider-execution-report');
    if (accountingCheck?.status !== 'passed') {
      throw new Error('expected applied accounting/payment report to pass bundle verification.');
    }

    const savedReport = readJson(reportPath, 'self-test wrapper report');
    if (savedReport.status !== report.status) {
      throw new Error('saved wrapper report status must match returned report status.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createSelfTestLocalVerificationReport() {
  const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot: process.cwd() });
  return {
    schemaVersion: 2,
    status: 'passed',
    worktreeIdentity,
    startedAt: '2026-07-10T00:00:00.000Z',
    finishedAt: '2026-07-10T00:01:00.000Z',
    durationMs: 60000,
    checks: [
      {
        id: 'crm-launch-static-readiness',
        requirement: 'CRM static readiness source gate passes.',
        status: 'passed',
        durationMs: 1000,
      },
      {
        id: 'crm-server-unit-and-boundary-tests',
        requirement: 'CRM server unit tests and DMS/PMS CRM boundary tests pass.',
        status: 'passed',
        durationMs: 30000,
        evidence: {
          numTotalTestSuites: 15,
          numPassedTestSuites: 15,
          numTotalTests: 130,
          numPassedTests: 130,
        },
      },
      {
        id: 'crm-web-production-build',
        requirement: 'web-crm production build passes with route generation and type checks.',
        status: 'passed',
        durationMs: 5000,
      },
      {
        id: 'worktree-identity-unchanged',
        requirement: 'Repository file contents remain unchanged throughout CRM local verification.',
        status: 'passed',
        durationMs: 0,
        evidence: { started: worktreeIdentity, completed: worktreeIdentity },
      },
    ],
  };
}

function createSelfTestAccountingPaymentProviderReport() {
  const executedAt = '2026-07-10T00:00:00.000Z';
  const settlementAmountTotal = 1200000;
  const steps = ['accounting-voucher', 'payment-request', 'payment-execution', 'external-system-sync'];
  return {
    schemaVersion: 1,
    status: 'passed',
    providerMode: 'external-api',
    handoffId: 'crm-handoff-7429',
    executionId: 'crm-accounting-payment-execution-7429',
    providerName: 'sap-fi-payment-gateway',
    executedAt,
    lineCount: 3,
    settlementAmountTotal,
    artifacts: steps.map((key) => ({
      key,
      evidencePath: `erp://accounting-payment/crm-handoff-7429/${key}.json`,
      referenceNo: `ERP-7429-${key}`,
      amount: settlementAmountTotal,
      executedAt,
    })),
    reconciliation: {
      status: 'matched',
      checkedAt: '2026-07-10T00:05:00.000Z',
      sourceSystem: 'ERP',
      evidencePath: 'erp://accounting-payment/crm-handoff-7429/reconciliation.json',
      crmLineCount: 3,
      providerLineCount: 3,
      crmSettlementAmountTotal: settlementAmountTotal,
      providerSettlementAmountTotal: settlementAmountTotal,
      amountDifference: 0,
    },
  };
}

function printSummary(report) {
  console.log(`CRM local evidence bundle: ${report.status}`);
  console.log(`- bundle: ${report.outDir}`);
  console.log(`- wrapper report: ${report.wrapperReportPath}`);
  console.log(`- local verification: ${report.localVerification.mode}`);
  if (report.pendingExternalReports.length > 0) {
    console.log(`- pending external reports: ${report.pendingExternalReports.map((item) => item.id).join(', ')}`);
  }
  console.log('- completion audit still required: pnpm run verify:crm-migration-completion');
}

function summarizeOutput(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  return lines.slice(-80).join('\n');
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

function readExternalReportPathOptions() {
  return Object.fromEntries(EXTERNAL_EVIDENCE_REPORT_SPECS.map((spec) => [
    spec.id,
    pickString(readOptionFromEnvNames(spec.optionName, spec.envNames, '')),
  ]));
}

function readOptionFromEnvNames(name, envNames, fallback) {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1]) {
    return argv[index + 1];
  }
  for (const envName of envNames) {
    if (process.env[envName]) {
      return process.env[envName];
    }
  }
  return fallback;
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log(`
Usage:
  pnpm run prepare:crm-local-evidence-bundle -- [options]

Options:
  --out-dir=<dir>                       Output directory for the local-ready evidence bundle
  --input-root-dir=<dir>                Repository/runtime root to inspect for recovered input candidates
  --protected-source-path=<path>         Optional unlocked protected source file path used to prefill source SHA-256
  --local-verification-report-path=<path>
                                         Optional passed verify:crm-local JSON report. If omitted, this command runs the local verifier.
  --accounting-payment-report-path=<path>
                                         Optional passed external accounting/payment provider execution report to apply to the bundle
  --crm-ai-rag-report-path=<path>        Optional passed CRM AI/RAG provider-ready runtime report to apply to the bundle
  --protected-source-reflection-report-path=<path>
                                         Optional passed protected-source reflection report to apply to the bundle
  --report-path=<path>                  Wrapper JSON report path
  --self-test                           Run local wrapper self-test without the heavy local verifier

Environment:
  CRM_LOCAL_EVIDENCE_BUNDLE_DIR
  CRM_MIGRATION_INPUT_ROOT_DIR
  CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH
  CRM_LOCAL_VERIFICATION_REPORT_PATH
  CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH
  CRM_AI_RAG_PROVIDER_READY_REPORT_PATH or CRM_AI_RAG_REPORT_PATH
  CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH
  CRM_LOCAL_EVIDENCE_BUNDLE_REPORT_PATH

This command prepares a local-ready bundle and records local-ready-pending-external when only the three external evidence reports are still draft. It does not replace verify:crm-migration-completion.
`);
}
