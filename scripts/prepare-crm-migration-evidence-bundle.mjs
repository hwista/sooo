#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertRepositoryWorktreeIdentity,
  createRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';
import {
  createTemplateReport as createAccountingPaymentProviderTemplateReport,
  validateReport as validateAccountingPaymentProviderReport,
} from './verify-crm-accounting-payment-provider-report.mjs';
import {
  createTemplateReport as createCrmAiRagRuntimeTemplateReport,
  validateReport as validateCrmAiRagRuntimeReport,
} from './verify-crm-ai-rag-runtime-report.mjs';
import {
  createTemplateReport as createProtectedSourceReflectionTemplateReport,
  validateReport as validateProtectedSourceReflectionReport,
} from './verify-crm-protected-source-reflection-report.mjs';
import {
  formatSummary as formatInputInspectionSummary,
  inspectInputs,
} from './inspect-crm-migration-inputs.mjs';

const LOCAL_VERIFICATION_REPORT_FILE_NAME = 'crm-local-verification-report.json';
let currentWorktreeIdentityCache;
const REQUIRED_LOCAL_CHECKS = [
  'crm-launch-static-readiness',
  'crm-server-unit-and-boundary-tests',
  'crm-web-production-build',
  'worktree-identity-unchanged',
];

const REPORT_TEMPLATES = [
  {
    id: 'accounting-payment-provider-execution',
    fileName: 'crm-accounting-payment-provider-execution-report.template.json',
    envName: 'CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH',
    verifyScript: 'verify:crm-accounting-payment-provider-report',
    createReport: () => createAccountingPaymentProviderTemplateReport(),
    validateReport: validateAccountingPaymentProviderReport,
    description: 'External accounting/payment ERP API execution and reconciliation report.',
  },
  {
    id: 'crm-ai-rag-provider-ready-runtime',
    fileName: 'crm-ai-rag-provider-ready-runtime-report.template.json',
    envName: 'CRM_AI_RAG_PROVIDER_READY_REPORT_PATH',
    verifyScript: 'verify:crm-ai-rag-runtime-report',
    createReport: () => createCrmAiRagRuntimeTemplateReport(),
    validateReport: validateCrmAiRagRuntimeReport,
    description: 'Azure-backed CRM AI/RAG provider-ready runtime report.',
  },
  {
    id: 'crm-protected-source-reflection',
    fileName: 'crm-protected-source-reflection-report.template.json',
    envName: 'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH',
    verifyScript: 'verify:crm-protected-source-reflection-report',
    createReport: (options) => createProtectedSourceReflectionTemplateReport(options.protectedSourcePath),
    validateReport: validateProtectedSourceReflectionReport,
    description: 'Unlocked protected CRM presentation extraction and reflection report.',
  },
];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  outDir: pickString(readOption('out-dir', 'CRM_MIGRATION_EVIDENCE_BUNDLE_DIR', 'output/crm-migration-evidence')),
  inputRootDir: pickString(readOption('input-root-dir', 'CRM_MIGRATION_INPUT_ROOT_DIR', process.cwd())),
  protectedSourcePath: pickString(readOption('protected-source-path', 'CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH', '')),
  localVerificationReportPath: pickString(readOption('local-verification-report-path', 'CRM_LOCAL_VERIFICATION_REPORT_PATH', '')),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    assertSelfTest();
    console.log('OK CRM migration evidence bundle self-test passed');
    process.exit(0);
  }

  const bundle = prepareEvidenceBundle(config);
  console.log(`OK CRM migration evidence bundle prepared: ${bundle.outDir}`);
  for (const file of bundle.files) {
    console.log(`- ${file.label}: ${file.path}`);
  }
} catch (error) {
  console.error(`FAIL CRM migration evidence bundle preparation failed: ${formatError(error)}`);
  process.exit(1);
}

function prepareEvidenceBundle(options) {
  const outDir = path.resolve(options.outDir);
  const inputRootDir = path.resolve(options.inputRootDir ?? process.cwd());
  fs.mkdirSync(outDir, { recursive: true });
  const localVerificationFile = copyLocalVerificationReport(options.localVerificationReportPath, outDir);

  const templateFiles = REPORT_TEMPLATES.map((template) => {
    const report = template.createReport(options);
    assertTemplateDraft(report, template.id);

    const outputPath = path.join(outDir, template.fileName);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
    return {
      ...template,
      path: outputPath,
    };
  });

  const inputInspection = inspectInputs({ rootDir: inputRootDir, env: process.env });
  const inputInspectionJsonPath = path.join(outDir, 'crm-migration-input-inspection.json');
  fs.writeFileSync(inputInspectionJsonPath, `${JSON.stringify(inputInspection, null, 2)}\n`, 'utf-8');
  const inputInspectionMarkdownPath = path.join(outDir, 'crm-migration-input-inspection.md');
  fs.writeFileSync(
    inputInspectionMarkdownPath,
    formatInputInspectionSummary(inputInspection, { markdown: true }),
    'utf-8',
  );
  const inputInspectionFiles = {
    jsonPath: inputInspectionJsonPath,
    markdownPath: inputInspectionMarkdownPath,
  };
  const requiredInputsJsonPath = path.join(outDir, 'crm-migration-required-external-inputs.json');
  fs.writeFileSync(
    requiredInputsJsonPath,
    `${JSON.stringify(formatRequiredExternalInputsJson(inputInspection), null, 2)}\n`,
    'utf-8',
  );
  const requiredInputsMarkdownPath = path.join(outDir, 'crm-migration-required-external-inputs.md');
  fs.writeFileSync(
    requiredInputsMarkdownPath,
    formatRequiredExternalInputsMarkdown(inputInspection),
    'utf-8',
  );
  const requiredInputFiles = {
    jsonPath: requiredInputsJsonPath,
    markdownPath: requiredInputsMarkdownPath,
  };

  const envPath = path.join(outDir, 'crm-migration-completion.env.template');
  fs.writeFileSync(envPath, formatEnvTemplate(templateFiles, inputRootDir), 'utf-8');

  const readmePath = path.join(outDir, 'README.md');
  fs.writeFileSync(
    readmePath,
    formatReadme(templateFiles, envPath, inputInspectionFiles, requiredInputFiles, localVerificationFile),
    'utf-8',
  );

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(formatManifest(templateFiles, envPath, readmePath, inputInspectionFiles, requiredInputFiles, inputInspection, localVerificationFile), null, 2)}\n`,
    'utf-8',
  );

  return {
    outDir,
    files: [
      ...(localVerificationFile.included ? [{ label: 'local-verification-report', path: localVerificationFile.path }] : []),
      ...templateFiles.map((file) => ({ label: file.id, path: file.path })),
      { label: 'input-inspection-json', path: inputInspectionJsonPath },
      { label: 'input-inspection-markdown', path: inputInspectionMarkdownPath },
      { label: 'required-external-inputs-json', path: requiredInputsJsonPath },
      { label: 'required-external-inputs-markdown', path: requiredInputsMarkdownPath },
      { label: 'env-template', path: envPath },
      { label: 'readme', path: readmePath },
      { label: 'manifest', path: manifestPath },
    ],
  };
}

function copyLocalVerificationReport(sourcePath, outDir) {
  const targetPath = path.join(outDir, LOCAL_VERIFICATION_REPORT_FILE_NAME);
  if (!sourcePath) {
    return {
      included: false,
      path: targetPath,
      sourcePath: '',
    };
  }

  const absoluteSourcePath = path.resolve(sourcePath);
  if (!fs.existsSync(absoluteSourcePath)) {
    throw new Error(`Missing CRM local verification report: ${sourcePath}`);
  }
  const report = parseJson(fs.readFileSync(absoluteSourcePath, 'utf-8'), 'local verification report');
  validateLocalVerificationReport(report);
  fs.copyFileSync(absoluteSourcePath, targetPath);
  return {
    included: true,
    path: targetPath,
    sourcePath: absoluteSourcePath,
  };
}

function validateLocalVerificationReport(report) {
  if (report?.schemaVersion !== 2) {
    throw new Error('CRM local verification report must use schemaVersion 2.');
  }
  if (report?.status !== 'passed') {
    throw new Error(`CRM local verification report must be passed, got ${String(report?.status)}.`);
  }
  if (!Array.isArray(report.checks)) {
    throw new Error('CRM local verification report must include checks array.');
  }
  for (const id of REQUIRED_LOCAL_CHECKS) {
    const check = report.checks.find((item) => item?.id === id);
    if (!check) {
      throw new Error(`CRM local verification report is missing ${id}.`);
    }
    if (check.status !== 'passed') {
      throw new Error(`CRM local verification report check ${id} must be passed, got ${String(check.status)}.`);
    }
  }
  assertRepositoryWorktreeIdentity(
    report.worktreeIdentity,
    getCurrentWorktreeIdentity(),
    'CRM local verification report worktreeIdentity',
  );
}

function formatEnvTemplate(templateFiles, inputRootDir) {
  const lines = [
    '# CRM migration completion evidence env template',
    '# Replace empty/provider values before running verify:crm-migration-completion.',
    '',
    '# Optional local runtime/input root used by inspect:crm-migration-inputs and bundle preparation.',
    `# CRM_MIGRATION_INPUT_ROOT_DIR=${inputRootDir}`,
    '',
    '# External accounting/payment provider endpoint. Use either direct URL or base URL.',
    'CRM_ACCOUNTING_PAYMENT_API_URL=',
    '# CRM_ACCOUNTING_PAYMENT_API_BASE_URL=',
    '# CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH=/crm/accounting-payment/executions',
    '# CRM_ACCOUNTING_PAYMENT_API_TOKEN=',
    '# CRM_ACCOUNTING_PAYMENT_API_TENANT=',
    '# CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS=30000',
    '',
    '# CRM AI/RAG Azure provider environment.',
    'AZURE_OPENAI_ENDPOINT=',
    'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=',
    '# Use one credential mode: API key, Entra service principal, or managed identity.',
    'AZURE_OPENAI_API_KEY=',
    '# AZURE_TENANT_ID=',
    '# AZURE_CLIENT_ID=',
    '# AZURE_CLIENT_SECRET=',
    '# AZURE_USE_MANAGED_IDENTITY=true',
    '',
    '# Completion report paths.',
    ...templateFiles.map((file) => `${file.envName}=${file.path}`),
    '',
  ];
  return `${lines.join('\n')}`;
}

function formatReadme(templateFiles, envPath, inputInspectionFiles, requiredInputFiles, localVerificationFile) {
  const lines = [
    '# CRM Migration Completion Evidence Bundle',
    '',
    'This directory contains draft authoring templates only. They are not completion evidence until every draft value is replaced with real provider/protected-source evidence and each verifier passes.',
    '',
    '## Files',
    '',
    ...templateFiles.map((file) => `- \`${path.basename(file.path)}\`: ${file.description}`),
    `- \`${path.basename(inputInspectionFiles.jsonPath)}\`: diagnostic-only snapshot of current env/report path state, runtime Office candidates, and DMS sidecar source metadata.`,
    `- \`${path.basename(inputInspectionFiles.markdownPath)}\`: human-readable version of the same diagnostic-only input inspection.`,
    `- \`${path.basename(requiredInputFiles.jsonPath)}\`: request-only list of missing provider/report/protected-source inputs required for completion.`,
    `- \`${path.basename(requiredInputFiles.markdownPath)}\`: human-readable request packet for the same external inputs.`,
    `- \`${LOCAL_VERIFICATION_REPORT_FILE_NAME}\`: ${localVerificationFile.included ? 'included passed local CRM build/test verification report.' : 'expected local CRM build/test verification report path. Generate it with the command below or pass --local-verification-report-path=<report.json>.'}`,
    `- \`${path.basename(envPath)}\`: environment variables used by \`verify:crm-migration-completion\`.`,
    '- `manifest.json`: generated file index and commands.',
    '',
    '## Verification Flow',
    '',
    '1. Run the local build/test verification gate and keep the generated report as local evidence:',
    '',
    '   pnpm run verify:crm-local -- --report-path=output/crm-local-evidence/crm-local-verification-report.json',
    '',
    '   If you already generated a passed local report elsewhere, rerun this preparer with `--local-verification-report-path=<report.json>` to copy it into the bundle.',
    '',
    '2. Review the required external inputs packet and provide the missing provider environment, passed reports, and unlocked protected-source evidence.',
    '3. Review the input inspection files to recover local candidate paths. RMS-protected Office candidates and draft reports are diagnostic only.',
    '4. Replace every `status: "draft"` and `change-me` value in the JSON reports with real evidence.',
    '5. Fill the provider environment values in the env template.',
    '6. Run each report verifier:',
    '',
    ...templateFiles.map((file) => `   pnpm run ${file.verifyScript} -- --path=${file.path}`),
    '',
    '7. Verify the assembled bundle files before the final completion audit:',
    '',
    `   pnpm run verify:crm-migration-evidence-bundle -- --bundle-dir=${path.dirname(envPath)}`,
    '',
    '8. Export the env values and run the completion audit:',
    '',
    `   # Example: set values from ${path.basename(envPath)} in your shell, then run:`,
    '   pnpm run verify:crm-migration-completion',
    '',
    'Completion still requires removing the CRM docs unresolved markers after the real evidence has been reflected.',
    '',
  ];
  return `${lines.join('\n')}`;
}

function formatManifest(templateFiles, envPath, readmePath, inputInspectionFiles, requiredInputFiles, inputInspection, localVerificationFile) {
  return {
    schemaVersion: 1,
    status: 'draft',
    generatedAt: new Date().toISOString(),
    envTemplatePath: envPath,
    readmePath,
    inputInspection: {
      status: 'diagnostic-only',
      rootDir: inputInspection.rootDir,
      jsonPath: inputInspectionFiles.jsonPath,
      markdownPath: inputInspectionFiles.markdownPath,
      command: 'pnpm run inspect:crm-migration-inputs -- --json',
    },
    requiredExternalInputs: {
      status: 'request-only',
      jsonPath: requiredInputFiles.jsonPath,
      markdownPath: requiredInputFiles.markdownPath,
      count: inputInspection.requiredExternalInputs.length,
    },
    localVerification: {
      script: 'verify:crm-local',
      command: 'pnpm run verify:crm-local -- --report-path=output/crm-local-evidence/crm-local-verification-report.json',
      reportPath: localVerificationFile.path,
      included: localVerificationFile.included,
      sourceReportPath: localVerificationFile.sourcePath || undefined,
      requiredBeforeCompletionAudit: true,
    },
    reports: templateFiles.map((file) => ({
      id: file.id,
      description: file.description,
      templatePath: file.path,
      envName: file.envName,
      verifyScript: file.verifyScript,
      verifyCommand: `pnpm run ${file.verifyScript} -- --path=${file.path}`,
    })),
    completionAudit: {
      script: 'verify:crm-migration-completion',
      command: 'pnpm run verify:crm-migration-completion',
      requiresUnresolvedMarkerRemoval: true,
    },
  };
}

function formatRequiredExternalInputsJson(inputInspection) {
  return {
    schemaVersion: 1,
    status: 'request-only',
    generatedAt: inputInspection.generatedAt,
    rootDir: inputInspection.rootDir,
    requiredExternalInputs: inputInspection.requiredExternalInputs,
    protectedSourceCandidateSummary: inputInspection.protectedSourceCandidateSummary,
  };
}

function formatRequiredExternalInputsMarkdown(inputInspection) {
  const lines = [
    '# CRM Migration Required External Inputs',
    '',
    'This request packet is not completion evidence. It lists the external inputs still required before `verify:crm-migration-completion` can pass.',
    '',
    `- rootDir: ${inputInspection.rootDir}`,
    `- required input count: ${inputInspection.requiredExternalInputs.length}`,
    `- protected source duplicate groups: ${inputInspection.protectedSourceCandidateSummary.duplicateGroupCount}`,
    '',
    '## Required Inputs',
    '',
  ];

  for (const item of inputInspection.requiredExternalInputs) {
    lines.push(`### ${item.id}`);
    lines.push('');
    lines.push(`- status: ${item.status}`);
    lines.push(`- kind: ${item.kind}`);
    lines.push(`- required: ${item.required.join(' | ')}`);
    if (item.completionCheckId) {
      lines.push(`- completionCheckId: ${item.completionCheckId}`);
    }
    if (item.verificationCommand) {
      lines.push(`- verificationCommand: ${item.verificationCommand}`);
    }
    if (item.candidatePath) {
      lines.push(`- candidatePath: ${item.candidatePath}`);
    }
    if (item.candidateSha256) {
      lines.push(`- candidateSha256: ${item.candidateSha256}`);
    }
    if (Array.isArray(item.duplicatePaths) && item.duplicatePaths.length > 0) {
      lines.push(`- duplicatePaths: ${item.duplicatePaths.join(' | ')}`);
    }
    lines.push(`- description: ${item.description}`);
    lines.push('');
  }

  return `${lines.join('\n')}`;
}

function runNodeExpectFailure(validateReport, report, label) {
  try {
    validateReport(report);
  } catch {
    return;
  }
  throw new Error(`${label} draft template unexpectedly passed its verifier.`);
}

function assertTemplateDraft(report, id) {
  if (report?.schemaVersion !== 1 || report?.status !== 'draft') {
    throw new Error(`${id} template must be schemaVersion 1 and status draft.`);
  }
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Failed to parse ${label} template JSON: ${formatError(error)}`);
  }
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-migration-evidence-bundle-'));
  const sourcePath = path.join(tempDir, 'protected-source.txt');
  const localVerificationReportPath = path.join(tempDir, 'crm-local-verification-report.json');
  const bundleDir = path.join(tempDir, 'bundle');
  try {
    fs.writeFileSync(sourcePath, 'protected CRM source evidence bundle self-test\n', 'utf-8');
    fs.writeFileSync(
      localVerificationReportPath,
      `${JSON.stringify(createSelfTestLocalVerificationReport(), null, 2)}\n`,
      'utf-8',
    );
    const bundle = prepareEvidenceBundle({
      outDir: bundleDir,
      inputRootDir: tempDir,
      protectedSourcePath: sourcePath,
      localVerificationReportPath,
    });

    for (const file of bundle.files) {
      assertFileExists(file.path);
    }

    const manifest = parseJson(fs.readFileSync(path.join(bundleDir, 'manifest.json'), 'utf-8'), 'manifest');
    if (!Array.isArray(manifest.reports) || manifest.reports.length !== REPORT_TEMPLATES.length) {
      throw new Error('manifest.reports must include all CRM evidence reports.');
    }
    if (manifest.inputInspection?.status !== 'diagnostic-only') {
      throw new Error('manifest.inputInspection must mark the inspection as diagnostic-only.');
    }
    if (manifest.requiredExternalInputs?.status !== 'request-only') {
      throw new Error('manifest.requiredExternalInputs must mark the required inputs as request-only.');
    }
    if (manifest.localVerification?.included !== true) {
      throw new Error('manifest.localVerification must mark copied local verification evidence as included.');
    }
    const copiedLocalVerificationReport = parseJson(
      fs.readFileSync(path.join(bundleDir, LOCAL_VERIFICATION_REPORT_FILE_NAME), 'utf-8'),
      'copied local verification report',
    );
    validateLocalVerificationReport(copiedLocalVerificationReport);

    const inspection = parseJson(
      fs.readFileSync(path.join(bundleDir, 'crm-migration-input-inspection.json'), 'utf-8'),
      'input inspection',
    );
    if (!Array.isArray(inspection.protectedSourceCandidates) || !Array.isArray(inspection.recommendedNextSteps)) {
      throw new Error('input inspection JSON must include protected source candidates and recommended next steps.');
    }
    if (!inspection.protectedSourceCandidateSummary || !Array.isArray(inspection.requiredExternalInputs)) {
      throw new Error('input inspection JSON must include candidate summary and required external inputs.');
    }

    const requiredInputs = parseJson(
      fs.readFileSync(path.join(bundleDir, 'crm-migration-required-external-inputs.json'), 'utf-8'),
      'required external inputs',
    );
    if (requiredInputs.status !== 'request-only' || !Array.isArray(requiredInputs.requiredExternalInputs)) {
      throw new Error('required external inputs JSON must be request-only and include requiredExternalInputs.');
    }
    if (!requiredInputs.requiredExternalInputs.every((item) => item.completionCheckId && item.verificationCommand)) {
      throw new Error('required external inputs JSON must include completion check ids and verification commands.');
    }
    if (!requiredInputs.requiredExternalInputs.some((item) => item.id === 'protected-source-unlock-and-reflection')) {
      throw new Error('required external inputs JSON must include protected source request.');
    }

    const inspectionMarkdown = fs.readFileSync(path.join(bundleDir, 'crm-migration-input-inspection.md'), 'utf-8');
    assertIncludes(inspectionMarkdown, 'Required External Inputs', 'input inspection Markdown required external inputs');
    assertIncludes(inspectionMarkdown, 'Recommended Next Steps', 'input inspection Markdown next steps');
    const requiredInputsMarkdown = fs.readFileSync(path.join(bundleDir, 'crm-migration-required-external-inputs.md'), 'utf-8');
    assertIncludes(requiredInputsMarkdown, 'CRM Migration Required External Inputs', 'required inputs Markdown title');
    assertIncludes(requiredInputsMarkdown, 'request packet is not completion evidence', 'required inputs Markdown evidence warning');
    assertIncludes(requiredInputsMarkdown, 'completionCheckId', 'required inputs Markdown completion check id');
    assertIncludes(requiredInputsMarkdown, 'verificationCommand', 'required inputs Markdown verification command');

    for (const report of manifest.reports) {
      const template = parseJson(fs.readFileSync(report.templatePath, 'utf-8'), report.id);
      assertTemplateDraft(template, report.id);
      const verifier = REPORT_TEMPLATES.find((item) => item.id === report.id);
      if (!verifier) {
        throw new Error(`Unknown CRM evidence report id in manifest: ${report.id}`);
      }
      runNodeExpectFailure(verifier.validateReport, template, report.id);
    }

    const readme = fs.readFileSync(path.join(bundleDir, 'README.md'), 'utf-8');
    assertIncludes(readme, 'verify:crm-local', 'self-test README local verification command');
    assertIncludes(readme, 'crm-local-verification-report.json', 'self-test README local verification report path');
    assertIncludes(readme, '--local-verification-report-path', 'self-test README local verification copy option');
    assertIncludes(readme, 'verify:crm-migration-evidence-bundle', 'self-test README bundle verifier command');
    assertIncludes(readme, 'verify:crm-migration-completion', 'self-test README completion command');
    assertIncludes(readme, 'status: "draft"', 'self-test README draft warning');
    if (manifest.localVerification?.script !== 'verify:crm-local') {
      throw new Error('manifest.localVerification must require verify:crm-local.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createSelfTestLocalVerificationReport() {
  const worktreeIdentity = getCurrentWorktreeIdentity();
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

function getCurrentWorktreeIdentity() {
  currentWorktreeIdentityCache ??= createRepositoryWorktreeIdentity({ repoRoot: process.cwd() });
  return currentWorktreeIdentityCache;
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing expected bundle file: ${filePath}`);
  }
}

function assertIncludes(value, pattern, label) {
  if (!value.includes(pattern)) {
    throw new Error(`${label} must include ${pattern}.`);
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

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log(`
Usage:
  pnpm run prepare:crm-migration-evidence -- [options]

Options:
  --out-dir=<dir>                 Output directory for the evidence bundle
  --input-root-dir=<dir>          Repository/runtime root to inspect for recovered input candidates
  --protected-source-path=<path>   Optional unlocked protected source file path used to prefill source SHA-256
  --local-verification-report-path=<path>
                                   Optional passed verify:crm-local JSON report to copy into the bundle
  --self-test                     Run local bundle generation self-test

Environment:
  CRM_MIGRATION_EVIDENCE_BUNDLE_DIR
  CRM_MIGRATION_INPUT_ROOT_DIR
  CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH
  CRM_LOCAL_VERIFICATION_REPORT_PATH
`);
}
