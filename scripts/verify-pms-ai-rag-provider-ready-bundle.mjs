#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createTemplateReport,
  validateReport,
} from './verify-pms-ai-rag-runtime-report.mjs';

const REPORT_FILE_NAME = 'pms-ai-rag-provider-ready-runtime-report.template.json';
const SUMMARY_FILE_NAME = 'pms-ai-rag-provider-ready-runtime-summary.md';
const REQUIRED_INPUTS_FILE_NAME = 'pms-ai-rag-provider-ready-required-inputs.json';
const ENV_FILE_NAME = 'pms-ai-rag-provider-ready.env.template';
const README_FILE_NAME = 'README.md';
const MANIFEST_FILE_NAME = 'manifest.json';

const REQUIRED_INPUT_IDS = [
  'pms-ai-rag-provider-env',
  'pms-ai-rag-provider-ready-runtime-report',
  'pms-ai-rag-provider-ready-summary',
  'pms-ai-rag-provider-ready-evidence-recording',
];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  bundleDir: readOption('bundle-dir', 'PMS_AI_RAG_PROVIDER_READY_BUNDLE_DIR', 'output/pms-ai-rag-provider-ready'),
  reportPath: readOption('report-path', 'PMS_AI_RAG_PROVIDER_READY_BUNDLE_VERIFICATION_REPORT_PATH', ''),
};

if (isCliEntryPoint()) {
  try {
    if (config.help) {
      printUsage();
      process.exit(0);
    }

    if (config.selfTest) {
      assertSelfTest();
      console.log('OK PMS AI/RAG provider-ready evidence bundle verifier self-test passed');
      process.exit(0);
    }

    const report = verifyEvidenceBundle({ bundleDir: config.bundleDir });
    writeReport(config.reportPath, report);
    printSummary(report);
    if (report.status !== 'passed') {
      process.exit(1);
    }
  } catch (error) {
    console.error(`FAIL PMS AI/RAG provider-ready evidence bundle verification failed: ${formatError(error)}`);
    process.exit(1);
  }
}

export function verifyEvidenceBundle({ bundleDir }) {
  const absoluteBundleDir = path.resolve(bundleDir);
  let manifest = null;
  const checks = [
    runCheck('manifest-structure', 'PMS provider-ready bundle manifest declares required evidence artifacts.', () => {
      manifest = readJson(path.join(absoluteBundleDir, MANIFEST_FILE_NAME), 'manifest');
      validateManifest(manifest);
      return {
        reportCount: manifest.reports.length,
        completionFlow: manifest.completionFlow,
      };
    }),
  ];

  checks.push(runCheck('provider-ready-runtime-report', 'PMS provider-ready runtime report exists and passes its verifier.', () => {
    const reportPath = resolveManifestPath(
      absoluteBundleDir,
      manifest?.reports?.[0]?.templatePath,
      REPORT_FILE_NAME,
    );
    const report = readJson(reportPath, 'PMS provider-ready runtime report');
    const evidence = validateReport(report);
    return {
      reportPath,
      schemaVersion: report.schemaVersion,
      status: report.status,
      entityTypes: Object.keys(evidence),
    };
  }));

  checks.push(runCheck('provider-ready-summary', 'PMS provider-ready summary exists and names the verified evidence.', () => {
    const summaryPath = resolveManifestPath(
      absoluteBundleDir,
      manifest?.reports?.[0]?.summaryPath,
      SUMMARY_FILE_NAME,
    );
    const summary = readText(summaryPath, 'PMS provider-ready summary');
    assertIncludes(summary, 'PMS AI/RAG Provider-Ready Runtime Evidence', 'summary title');
    if (summary.includes('Draft placeholder')) {
      throw new Error('summary must be generated from the passed provider-ready report, not the draft placeholder.');
    }
    return { summaryPath };
  }));

  checks.push(runCheck('required-external-input-request-packet', 'Required input request packet keeps completion check ids and verification commands.', () => {
    const packetPath = resolveManifestPath(
      absoluteBundleDir,
      manifest?.requiredExternalInputs?.jsonPath,
      REQUIRED_INPUTS_FILE_NAME,
    );
    const packet = readJson(packetPath, 'required external inputs packet');
    validateRequiredInputsPacket(packet);
    return {
      packetPath,
      requiredInputIds: packet.requiredExternalInputs.map((item) => item.id),
    };
  }));

  checks.push(runCheck('env-template-and-readme', 'Env template and README keep the canonical PMS provider-ready commands.', () => {
    const envPath = resolveManifestPath(absoluteBundleDir, manifest?.envTemplatePath, ENV_FILE_NAME);
    const readmePath = resolveManifestPath(absoluteBundleDir, manifest?.readmePath, README_FILE_NAME);
    const envText = readText(envPath, 'env template');
    const readme = readText(readmePath, 'README');
    for (const pattern of [
      'AZURE_OPENAI_ENDPOINT=',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=',
      'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH=',
      'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH=',
    ]) {
      assertIncludes(envText, pattern, 'env template');
    }
    for (const pattern of [
      'complete:pms-ai-rag-provider-ready',
      'verify:pms-ai-rag-runtime-report',
      'verify:pms-ai-rag-provider-ready-bundle',
      'draft report must fail',
    ]) {
      assertIncludes(readme, pattern, 'README');
    }
    return { envPath, readmePath };
  }));

  return {
    schemaVersion: 1,
    status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
    generatedAt: new Date().toISOString(),
    bundleDir: absoluteBundleDir,
    checks,
    note: 'This verifies final PMS provider-ready bundle files only. It does not replace complete:pms-ai-rag-provider-ready or the PMS planning evidence recording step.',
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
  if (!Array.isArray(manifest.reports) || manifest.reports.length !== 1) {
    throw new Error('manifest.reports must include exactly one PMS AI/RAG report.');
  }
  const report = manifest.reports[0];
  assertEquals(report.id, 'pms-ai-rag-provider-ready-runtime', 'manifest.reports[0].id');
  assertNonEmptyString(report.templatePath, 'manifest.reports[0].templatePath');
  assertNonEmptyString(report.summaryPath, 'manifest.reports[0].summaryPath');
  assertEquals(report.verifyScript, 'verify:pms-ai-rag-runtime-report', 'manifest.reports[0].verifyScript');
  assertNonEmptyString(report.verifyCommand, 'manifest.reports[0].verifyCommand');
  assertObject(manifest.requiredExternalInputs, 'manifest.requiredExternalInputs');
  assertEquals(manifest.requiredExternalInputs.status, 'request-only', 'manifest.requiredExternalInputs.status');
  assertNonEmptyString(manifest.requiredExternalInputs.jsonPath, 'manifest.requiredExternalInputs.jsonPath');
  assertObject(manifest.completionFlow, 'manifest.completionFlow');
  assertEquals(manifest.completionFlow.script, 'complete:pms-ai-rag-provider-ready', 'manifest.completionFlow.script');
  assertEquals(manifest.completionFlow.recordsEvidenceAfterVerification, true, 'manifest.completionFlow.recordsEvidenceAfterVerification');
}

function validateRequiredInputsPacket(packet) {
  assertObject(packet, 'requiredExternalInputsPacket');
  assertEquals(packet.schemaVersion, 1, 'requiredExternalInputsPacket.schemaVersion');
  assertEquals(packet.status, 'request-only', 'requiredExternalInputsPacket.status');
  if (!Array.isArray(packet.requiredExternalInputs)) {
    throw new Error('requiredExternalInputsPacket.requiredExternalInputs must be an array.');
  }
  for (const id of REQUIRED_INPUT_IDS) {
    const item = packet.requiredExternalInputs.find((input) => input?.id === id);
    assertObject(item, `requiredExternalInputs.${id}`);
    assertNonEmptyString(item.completionCheckId, `requiredExternalInputs.${id}.completionCheckId`);
    assertNonEmptyString(item.verificationCommand, `requiredExternalInputs.${id}.verificationCommand`);
  }
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-pms-ai-rag-provider-ready-bundle-verify-'));
  try {
    const passedBundleDir = path.join(tempDir, 'passed');
    writeSelfTestBundle(passedBundleDir, { draftReport: false });
    const passedReport = verifyEvidenceBundle({ bundleDir: passedBundleDir });
    if (passedReport.status !== 'passed') {
      throw new Error(`expected self-test passed bundle to pass: ${JSON.stringify(passedReport.checks, null, 2)}`);
    }

    const failedBundleDir = path.join(tempDir, 'failed');
    writeSelfTestBundle(failedBundleDir, { draftReport: true });
    const failedReport = verifyEvidenceBundle({ bundleDir: failedBundleDir });
    if (failedReport.status !== 'failed') {
      throw new Error('expected self-test draft bundle to fail.');
    }
    const reportCheck = failedReport.checks.find((check) => check.id === 'provider-ready-runtime-report');
    if (reportCheck?.status !== 'failed' || !reportCheck.error.includes('status')) {
      throw new Error('expected draft PMS report failure to mention status.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeSelfTestBundle(bundleDir, { draftReport }) {
  fs.mkdirSync(bundleDir, { recursive: true });
  const reportPath = path.join(bundleDir, REPORT_FILE_NAME);
  const summaryPath = path.join(bundleDir, SUMMARY_FILE_NAME);
  const report = draftReport ? createTemplateReport() : createPassedReport();
  writeJson(reportPath, report);
  fs.writeFileSync(
    summaryPath,
    draftReport
      ? '# PMS AI/RAG Provider-Ready Runtime Evidence\n\nDraft placeholder\n'
      : '# PMS AI/RAG Provider-Ready Runtime Evidence\n\nVerified self-test summary\n',
    'utf-8',
  );
  writeJson(path.join(bundleDir, REQUIRED_INPUTS_FILE_NAME), createRequiredInputsPacket());
  fs.writeFileSync(
    path.join(bundleDir, ENV_FILE_NAME),
    [
      'AZURE_OPENAI_ENDPOINT=',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=',
      'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH=',
      'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH=',
      '',
    ].join('\n'),
    'utf-8',
  );
  fs.writeFileSync(
    path.join(bundleDir, README_FILE_NAME),
    [
      'complete:pms-ai-rag-provider-ready',
      'verify:pms-ai-rag-runtime-report',
      'verify:pms-ai-rag-provider-ready-bundle',
      'draft report must fail',
      '',
    ].join('\n'),
    'utf-8',
  );
  writeJson(path.join(bundleDir, MANIFEST_FILE_NAME), {
    schemaVersion: 1,
    status: 'draft',
    envTemplatePath: path.join(bundleDir, ENV_FILE_NAME),
    readmePath: path.join(bundleDir, README_FILE_NAME),
    requiredExternalInputs: {
      status: 'request-only',
      jsonPath: path.join(bundleDir, REQUIRED_INPUTS_FILE_NAME),
      count: REQUIRED_INPUT_IDS.length,
    },
    reports: [
      {
        id: 'pms-ai-rag-provider-ready-runtime',
        templatePath: reportPath,
        summaryPath,
        verifyScript: 'verify:pms-ai-rag-runtime-report',
        verifyCommand: `pnpm run verify:pms-ai-rag-runtime-report -- --path=${reportPath} --summary-path=${summaryPath}`,
      },
    ],
    completionFlow: {
      script: 'complete:pms-ai-rag-provider-ready',
      command: 'pnpm run complete:pms-ai-rag-provider-ready',
      recordsEvidenceAfterVerification: true,
    },
  });
}

function createPassedReport() {
  const report = createTemplateReport();
  const startedAt = '2026-07-13T00:00:00.000Z';
  const finishedAt = '2026-07-13T00:01:00.000Z';
  const project = { id: '1001', name: 'Provider-ready PMS project', query: 'PMS project query' };
  const task = { id: '2001', projectId: '1001', name: 'Provider-ready PMS task', query: 'PMS task query' };
  const projectMember = {
    id: '1001:3001:pm',
    projectId: '1001',
    userId: '3001',
    roleCode: 'pm',
    name: 'Provider-ready PMS member',
    query: 'PMS member query',
  };
  const projectStatus = {
    id: '1001:execution',
    projectId: '1001',
    statusCode: 'execution',
    query: 'PMS status query',
  };

  return {
    ...report,
    status: 'passed',
    templateNote: undefined,
    startedAt,
    finishedAt,
    durationMs: 60000,
    providerMode: 'ready',
    baseUrl: 'http://127.0.0.1:4000/api',
    project,
    task,
    projectMember,
    projectStatus,
    backfill: {
      project: createBatchBackfill('project', 'pms_provider_ready_evidence_project'),
      task: createBatchBackfill('task', 'pms_provider_ready_evidence_task'),
      projectMember: createQueuedBackfill('projectMember', projectMember.id, '9003', 'pms_provider_ready_evidence_project_member'),
      projectStatus: createQueuedBackfill('projectStatus', projectStatus.id, '9004', 'pms_provider_ready_evidence_project_status'),
    },
    jobRun: {
      attempts: 1,
      runs: [{ attempt: 1, shape: 'object', processedCount: 4 }],
      targetJobs: [
        createTargetJob('project', project.id, '9001'),
        createTargetJob('task', task.id, '9002'),
        createTargetJob('projectMember', projectMember.id, '9003'),
        createTargetJob('projectStatus', projectStatus.id, '9004'),
      ],
    },
    retrieval: {
      project: createRetrieval('7001'),
      task: createRetrieval('7002'),
      projectMember: createRetrieval('7003'),
      projectStatus: createRetrieval('7004'),
    },
    database: {
      project: createDatabaseEvidence('8001', '7001', project.query, '9001'),
      task: createDatabaseEvidence('8002', '7002', task.query, '9002'),
      projectMember: createDatabaseEvidence('8003', '7003', projectMember.query, '9003'),
      projectStatus: createDatabaseEvidence('8004', '7004', projectStatus.query, '9004'),
    },
  };
}

function createBatchBackfill(entityType, reasonCode) {
  return {
    sourceApp: 'pms',
    entityType,
    jobType: 'backfill',
    selectedCount: 1,
    queuedCount: 1,
    failedCount: 0,
    reasonCode,
  };
}

function createQueuedBackfill(entityType, entityId, jobId, reasonCode) {
  return {
    sourceApp: 'pms',
    entityType,
    entityId,
    jobType: 'backfill',
    jobId,
    queuedCount: 1,
    failedCount: 0,
    reasonCode,
  };
}

function createTargetJob(entityType, entityId, jobId) {
  return {
    jobId,
    entityType,
    entityId,
    jobStatusCode: 'indexed',
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
    title: `PMS AI object ${objectId}`,
    indexStatusCode: 'indexed',
    targetPath: '/project/detail',
    chunkCount: 2,
    queryChunkCount: 1,
    stateChunkCount: 2,
    indexedChunkCount: 2,
    embeddingCount: 2,
    aclScope: 'acl',
    latestJob: {
      jobId,
      jobStatusCode: 'indexed',
      requestedAt: '2026-07-13T00:00:00.000Z',
      finishedAt: '2026-07-13T00:00:30.000Z',
      reasonCode: 'pms_provider_ready_evidence',
    },
    retrievalAudit: {
      retrievalLogId,
      sourceApp: 'pms',
      queryText,
      resultCount: 1,
      contextCount: 1,
      itemCount: 1,
      contextItemCount: 1,
    },
  };
}

function createRequiredInputsPacket() {
  return {
    schemaVersion: 1,
    status: 'request-only',
    generatedAt: '2026-07-13T00:00:00.000Z',
    requiredExternalInputs: REQUIRED_INPUT_IDS.map((id) => ({
      id,
      status: 'missing',
      kind: id.endsWith('-env') ? 'environment' : 'report',
      required: ['self-test-required-input'],
      completionCheckId: id,
      verificationCommand: 'pnpm run self-test-verifier',
      description: 'self-test required PMS provider-ready input',
    })),
  };
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

function readText(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }
  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`Wrote PMS AI/RAG provider-ready bundle verification report: ${absolutePath}`);
}

function printSummary(report) {
  console.log(`PMS AI/RAG provider-ready evidence bundle verification: ${report.status}`);
  for (const check of report.checks) {
    const marker = check.status === 'passed' ? 'OK' : 'FAIL';
    console.log(`${marker} ${check.id}`);
    if (check.status !== 'passed') {
      console.log(`  ${check.error}`);
    }
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

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertIncludes(value, pattern, label) {
  if (!value.includes(pattern)) {
    throw new Error(`${label} must include ${pattern}.`);
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
  pnpm run verify:pms-ai-rag-provider-ready-bundle -- [options]

Options:
  --bundle-dir=<dir>   PMS provider-ready evidence bundle directory
  --report-path=<path> Write a JSON verification report
  --self-test          Run local verifier self-test

Environment:
  PMS_AI_RAG_PROVIDER_READY_BUNDLE_DIR
  PMS_AI_RAG_PROVIDER_READY_BUNDLE_VERIFICATION_REPORT_PATH

This verifier checks final bundle files only. A freshly prepared draft bundle is expected to fail until a real Azure-backed PMS provider-ready report and summary replace the templates.
`);
}
