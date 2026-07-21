#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const argv = process.argv.slice(2);

const EXPECTED_SOURCE_APPS = ['admin', 'crm', 'dms', 'pms', 'sns'];
const EXPECTED_REGISTERED_SOURCE_APPS = ['crm', 'dms', 'pms', 'sns'];
const EXPECTED_MISSING_ADAPTER_SOURCE_APPS = ['admin'];
const CENTRAL_SCOPE_NOTE = 'service rollout backlog is excluded from central foundation completion';

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  requireProviderReadyReport: argv.includes('--require-provider-ready-report'),
  providerReadyReportPath: pickString(readOption('provider-ready-report', 'AI_RAG_PROVIDER_READY_REPORT_PATH', '')),
  providerReadySummaryPath: pickString(readOption('provider-ready-summary', 'AI_RAG_PROVIDER_READY_SUMMARY_PATH', '')),
  providerReadyRoadmapPath: pickString(readOption(
    'provider-ready-roadmap',
    'AI_RAG_PROVIDER_READY_ROADMAP_PATH',
    'docs/common/explanation/architecture/ai-rag-platform-roadmap.md',
  )),
  providerReadyHandoffPath: pickString(readOption(
    'provider-ready-handoff',
    'AI_RAG_PROVIDER_READY_HANDOFF_PATH',
    'docs/common/explanation/architecture/ai-rag-platform-handoff.md',
  )),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    const selfTestReport = createSelfTestReadyReport();
    validateProviderReadyReport(selfTestReport);
    validateProviderReadySummary(createSelfTestReadySummary(), selfTestReport);
    console.log('[ok] AI/RAG central foundation verifier self-test passed');
    process.exit(0);
  }

  validateStaticFoundation();

  if (config.providerReadyReportPath) {
    if (config.requireProviderReadyReport && !config.providerReadySummaryPath) {
      throw new Error(
        'Provider-ready summary is required. Provide --provider-ready-summary=<path> or AI_RAG_PROVIDER_READY_SUMMARY_PATH.',
      );
    }
    if (config.providerReadySummaryPath) {
      verifyProviderReadyRuntimeReport(config.providerReadyReportPath, config.providerReadySummaryPath);
    }
    const { value: report, rawText: reportRawText } = readJsonWithText(config.providerReadyReportPath);
    validateProviderReadyReport(report);
    let summaryRawText = '';
    if (config.providerReadySummaryPath) {
      summaryRawText = readPathText(config.providerReadySummaryPath, 'provider-ready summary');
      validateProviderReadySummary(summaryRawText, report);
    }
    if (config.requireProviderReadyReport) {
      validateProviderReadyEvidenceRecord(
        sha256(reportRawText),
        sha256(summaryRawText),
        config.providerReadyRoadmapPath,
        config.providerReadyHandoffPath,
      );
    }
    console.log('[ok] AI/RAG central foundation completion verification passed');
  } else if (config.requireProviderReadyReport) {
    throw new Error(
      'Provider-ready report is required. Provide --provider-ready-report=<path> or AI_RAG_PROVIDER_READY_REPORT_PATH.',
    );
  } else {
    console.log('[ok] AI/RAG central foundation static verification passed');
    console.log(`[info] ${CENTRAL_SCOPE_NOTE}.`);
    console.log('[info] provider-ready runtime report not supplied; central foundation completion remains unproven.');
  }
} catch (error) {
  console.error(`[error] AI/RAG central foundation verification failed: ${formatError(error)}`);
  process.exit(1);
}

function validateStaticFoundation() {
  for (const file of [
    'packages/types/src/common/ai.ts',
    'packages/types/src/common/ai-index.ts',
    'packages/types/src/common/ai-retrieval.ts',
    'apps/server/src/modules/common/ai-index/ai-index.module.ts',
    'apps/server/src/modules/common/ai-index/ai-index.controller.ts',
    'apps/server/src/modules/common/ai-index/ai-indexing.service.ts',
    'apps/server/src/modules/common/ai-index/ai-index-worker.service.ts',
    'apps/server/src/modules/common/ai-index/ai-index-scheduler.service.ts',
    'apps/server/src/modules/common/ai-index/ai-retrieval.service.ts',
    'apps/server/src/modules/common/ai-index/ai-conversation.service.ts',
    'apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts',
    'apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts',
    'scripts/verify-ai-rag-runtime-smoke.mjs',
    'scripts/verify-ai-rag-runtime-report.mjs',
    'scripts/record-ai-rag-provider-ready-evidence.mjs',
    'scripts/complete-ai-rag-central-foundation.mjs',
    'docs/common/guides/ai-rag-runtime-runbook.md',
    'docs/common/explanation/architecture/ai-rag-platform-roadmap.md',
    'docs/common/explanation/architecture/ai-rag-platform-handoff.md',
    '.github/workflows/ai-rag-runtime.yml',
    'compose.yaml',
  ]) {
    readText(file);
  }

  const rootPackage = readText('package.json');
  assertIncludes(rootPackage, '"verify:ai-rag-central-foundation"', 'package must expose central foundation verifier');
  assertIncludes(rootPackage, '"verify:ai-rag-central-foundation:complete"', 'package must expose central completion verifier');
  assertIncludes(rootPackage, '"verify:ai-rag-runtime:ready"', 'package must expose provider-ready runtime verifier');
  assertIncludes(rootPackage, '"record:ai-rag-provider-ready-evidence"', 'package must expose provider-ready evidence recorder');
  assertIncludes(rootPackage, '"verify:ai-rag-evidence-recorder"', 'package must expose provider-ready evidence recorder self-test');
  assertIncludes(rootPackage, '"complete:ai-rag-central-foundation"', 'package must expose central foundation completion flow');
  assertIncludes(rootPackage, '"verify:ai-rag-central-foundation:flow"', 'package must expose central foundation completion flow self-test');
  assertNotIncludes(rootPackage, '"langchain"', 'central AI/RAG foundation must not add LangChain');
  assertNotIncludes(rootPackage, '"@langchain/', 'central AI/RAG foundation must not add @langchain packages');
  assertNotIncludes(rootPackage, '"@langchain/langgraph"', 'central AI/RAG foundation must not add LangGraph');

  const aiIndexTypes = readText('packages/types/src/common/ai-index.ts');
  for (const pattern of [
    'AiIndexJobQueueMetrics',
    'AiIndexJobSchedulerStatus',
    'AiIndexJobSafetySnapshot',
    'AiIndexEmbeddingSyncSnapshot',
    'AiIndexSourceRegistrationStatus',
    'missing_adapter',
  ]) {
    assertIncludes(aiIndexTypes, pattern, `AI index type contract must include ${pattern}`);
  }

  const aiRetrievalTypes = readText('packages/types/src/common/ai-retrieval.ts');
  assertIncludes(aiRetrievalTypes, 'CommonAiRetrievalRequest', 'common retrieval request alias must exist');
  assertIncludes(aiRetrievalTypes, 'CommonAiRetrievalResponse', 'common retrieval response alias must exist');

  const module = readText('apps/server/src/modules/common/ai-index/ai-index.module.ts');
  for (const provider of [
    'AiEmbeddingProviderService',
    'AiIndexRegistryService',
    'AiIndexingService',
    'AiIndexWorkerService',
    'AiIndexSchedulerService',
    'AiRetrievalService',
    'AiConversationService',
    'AiModelGatewayService',
  ]) {
    assertIncludes(module, provider, `CommonAiIndexModule must provide ${provider}`);
  }

  const controller = readText('apps/server/src/modules/common/ai-index/ai-index.controller.ts');
  for (const pattern of [
    'RolesGuard',
    "@Roles('admin')",
    "Get('jobs/metrics')",
    "Get('jobs/scheduler')",
    "Post('jobs/run')",
    "Post('retrieval/query')",
    "Post('conversations')",
    'AiIndexWorkerService',
    'AiIndexSchedulerService',
  ]) {
    assertIncludes(controller, pattern, `AI index controller must include ${pattern}`);
  }

  const indexing = readText('apps/server/src/modules/common/ai-index/ai-indexing.service.ts');
  for (const pattern of [
    'assertAiIndexObjectProjection',
    'getJobQueueMetrics',
    'computeRetryDelayMs',
    'common.cm_ai_embedding_m',
    'AI_INDEX_SOURCE_BASELINES',
    "registrationStatus: 'missing_adapter'",
  ]) {
    assertIncludes(indexing, pattern, `AI indexing service must include ${pattern}`);
  }

  const scheduler = readText('apps/server/src/modules/common/ai-index/ai-index-scheduler.service.ts');
  for (const pattern of [
    'AI_INDEX_WORKER_ENABLED',
    'AI_INDEX_WORKER_INTERVAL_MS',
    'AI_INDEX_WORKER_BATCH_LIMIT',
    'AI_INDEX_WORKER_RUN_ON_START',
    'setInterval',
    'runOnce',
  ]) {
    assertIncludes(scheduler, pattern, `AI index scheduler must include ${pattern}`);
  }

  const retrieval = readText('apps/server/src/modules/common/ai-index/ai-retrieval.service.ts');
  for (const pattern of [
    'embedText(query',
    'e.embedding <=> $1::vector',
    'findKeywordRows',
    'aclPredicateSql',
    'common.cm_ai_retrieval_log_m',
    'common.cm_ai_retrieval_log_item_m',
    'retrievalLogId && contextItems.length > 0',
  ]) {
    assertIncludes(retrieval, pattern, `AI retrieval service must include ${pattern}`);
  }

  const conversation = readText('apps/server/src/modules/common/ai-index/ai-conversation.service.ts');
  for (const table of [
    'common.cm_ai_conversation_m',
    'common.cm_ai_message_m',
    'common.cm_ai_reference_m',
    'common.cm_ai_run_m',
    'common.cm_ai_run_source_r',
  ]) {
    assertIncludes(conversation, table, `AI conversation service must write ${table}`);
  }

  const runtimeSmoke = readText('scripts/verify-ai-rag-runtime-smoke.mjs');
  for (const pattern of [
    'AI_RAG_SMOKE_PROVIDER_MODE',
    'AI_RAG_SMOKE_CHECK_PROVIDER_ENV',
    'providerEnvReady',
    'readOptionalBooleanEnv(\'AZURE_USE_MANAGED_IDENTITY\')',
    'explicit AZURE_USE_MANAGED_IDENTITY=true',
    'verifyLegacyCommonRetrievalComparison',
    '/ai-index/jobs/run?limit=10',
    '/ai-index/retrieval/query',
    '/dms/ask',
    'sourceCoverage',
  ]) {
    assertIncludes(runtimeSmoke, pattern, `runtime smoke must include ${pattern}`);
  }

  const runtimeReport = readText('scripts/verify-ai-rag-runtime-report.mjs');
  for (const pattern of [
    'validateReport',
    'validateSourceCoverage',
    'legacyCommonComparison',
    'commonQueryNeedleMatched',
    'formatReportSummary',
    '--self-test',
  ]) {
    assertIncludes(runtimeReport, pattern, `runtime report verifier must include ${pattern}`);
  }

  const evidenceRecorder = readText('scripts/record-ai-rag-provider-ready-evidence.mjs');
  for (const pattern of [
    'AI_RAG_PROVIDER_READY_EVIDENCE:START',
    'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH',
    '--evidence-block-path',
    '--roadmap',
    '--handoff',
    'assertProviderReadyFlow',
    'verifyRecordedEvidence',
    'verify-ai-rag-central-foundation.mjs',
    'verify-ai-rag-runtime-report.mjs',
    'Report SHA256',
    'Summary SHA256',
  ]) {
    assertIncludes(evidenceRecorder, pattern, `provider-ready evidence recorder must include ${pattern}`);
  }

  const completionRunner = readText('scripts/complete-ai-rag-central-foundation.mjs');
  for (const pattern of [
    'verify:ai-rag-runtime:ready-precheck',
    'verify:ai-rag-runtime:ready',
    'verify:ai-rag-runtime-report',
    'record:ai-rag-provider-ready-evidence',
    'verify:ai-rag-central-foundation:complete',
    'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH',
    'AI_RAG_PROVIDER_READY_ENV_FILE',
    '--env-file',
    'loadProviderReadyEnv',
    'parseEnvFileText',
    '--use-existing-artifacts',
    '--dry-run',
    'central foundation report evidence check',
    '--docker-runtime',
    "buildDockerComposeArgs(options, ['up', '-d', '--build', 'server'])",
    "'--env-file'",
    "step.label === 'provider-ready runtime smoke'",
    'waitForRuntimeHealth',
    "buildDockerComposeArgs(options, ['down', '--remove-orphans'])",
    '--self-test',
  ]) {
    assertIncludes(completionRunner, pattern, `central completion runner must include ${pattern}`);
  }

  const runbook = readText('docs/common/guides/ai-rag-runtime-runbook.md');
  for (const pattern of [
    'Provider-Ready Smoke',
    'AI Index Worker Scheduler',
    'AI_INDEX_WORKER_ENABLED',
    'AZURE_USE_MANAGED_IDENTITY=true',
    'provider-ready workflow green',
    'verifyLegacyCommonRetrievalComparison',
    'complete:ai-rag-central-foundation',
    'record:ai-rag-provider-ready-evidence',
    '--provider-ready-summary',
    'parallel read/write -> common default -> legacy read disable -> archival/drop',
  ]) {
    assertIncludes(runbook, pattern, `runtime runbook must include ${pattern}`);
  }

  const centralVerifier = readText('scripts/verify-ai-rag-central-foundation.mjs');
  for (const pattern of [
    'verifyProviderReadyRuntimeReport',
    'verify-ai-rag-runtime-report.mjs',
    '--provider-ready-roadmap',
    '--provider-ready-handoff',
    'AI_RAG_PROVIDER_READY_ROADMAP_PATH',
    'AI_RAG_PROVIDER_READY_HANDOFF_PATH',
  ]) {
    assertIncludes(centralVerifier, pattern, `central foundation verifier must include ${pattern}`);
  }

  const roadmap = readText('docs/common/explanation/architecture/ai-rag-platform-roadmap.md');
  for (const pattern of [
    'Central Common Foundation View',
    'service rollout backlog',
    'Central common foundation progress',
    'provider-ready runtime smoke',
    'verify:ai-rag-central-foundation:complete',
    'AI_RAG_PROVIDER_READY_EVIDENCE:START',
  ]) {
    assertIncludes(roadmap, pattern, `roadmap must include ${pattern}`);
  }

  const handoff = readText('docs/common/explanation/architecture/ai-rag-platform-handoff.md');
  for (const pattern of [
    'AI_RAG_PROVIDER_READY_EVIDENCE:START',
    'Provider-ready evidence status:',
  ]) {
    assertIncludes(handoff, pattern, `handoff must include ${pattern}`);
  }

  const runtimeWorkflow = readText('.github/workflows/ai-rag-runtime.yml');
  for (const pattern of [
    'AZURE_USE_MANAGED_IDENTITY: ${{ vars.AZURE_USE_MANAGED_IDENTITY }}',
    'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH: output/ai-rag-provider-ready-evidence-${{ inputs.provider_mode }}.md',
    'Run provider-ready completion flow',
    'pnpm run complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run',
    'output/ai-rag-provider-ready-evidence-*.md',
    'AZURE_USE_MANAGED_IDENTITY=false',
  ]) {
    assertIncludes(runtimeWorkflow, pattern, `runtime workflow must include ${pattern}`);
  }

  const compose = readText('compose.yaml');
  for (const pattern of [
    'AZURE_OPENAI_ENDPOINT: ${AZURE_OPENAI_ENDPOINT:-}',
    'AZURE_OPENAI_EMBEDDING_DEPLOYMENT: ${AZURE_OPENAI_EMBEDDING_DEPLOYMENT:-}',
    'AZURE_OPENAI_API_KEY: ${AZURE_OPENAI_API_KEY:-}',
    'AZURE_USE_MANAGED_IDENTITY: ${AZURE_USE_MANAGED_IDENTITY:-false}',
    'AZURE_MANAGED_IDENTITY_CLIENT_ID: ${AZURE_MANAGED_IDENTITY_CLIENT_ID:-}',
  ]) {
    assertIncludes(compose, pattern, `compose server runtime must include ${pattern}`);
  }
}

function validateProviderReadyReport(report) {
  assertObject(report, 'provider-ready report');
  assertEquals(report.schemaVersion, 1, 'schemaVersion');
  assertEquals(report.status, 'passed', 'status');
  assertEquals(report.providerMode, 'ready', 'providerMode');

  assertEnabledSource(report.sourceStatus, 'sourceStatus');
  assertSourceCoverage(report.sourceCoverage);

  assertObject(report.retrieval, 'retrieval');
  assertNonEmptyString(report.retrieval.retrievalLogId, 'retrieval.retrievalLogId');
  assertEquals(report.retrieval.ragReady, true, 'retrieval.ragReady');
  assertNumberAtLeast(report.retrieval.contextItemCount, 1, 'retrieval.contextItemCount');

  assertObject(report.database, 'database');
  assertEnabledSource(report.database.source, 'database.source');
  assertObject(report.database.object, 'database.object');
  assertEquals(report.database.object.indexStatusCode, 'indexed', 'database.object.indexStatusCode');
  assertObject(report.database.embeddings, 'database.embeddings');
  assertNumberAtLeast(report.database.embeddings.activeCount, 1, 'database.embeddings.activeCount');

  assertObject(report.database.askAudit, 'database.askAudit');
  assertNumberAtLeast(report.database.askAudit.runSourceCount, 1, 'database.askAudit.runSourceCount');
  assertNumberAtLeast(report.database.askAudit.promptSourceCount, 1, 'database.askAudit.promptSourceCount');

  assertObject(report.database.legacyCommonComparison, 'database.legacyCommonComparison');
  assertNumberAtLeast(
    report.database.legacyCommonComparison.legacyChunkCount,
    1,
    'database.legacyCommonComparison.legacyChunkCount',
  );
  assertNumberAtLeast(
    report.database.legacyCommonComparison.commonResultCount,
    1,
    'database.legacyCommonComparison.commonResultCount',
  );
  assertNumberAtLeast(
    report.database.legacyCommonComparison.commonContextCount,
    1,
    'database.legacyCommonComparison.commonContextCount',
  );
  assertEquals(
    report.database.legacyCommonComparison.commonQueryNeedleMatched,
    true,
    'database.legacyCommonComparison.commonQueryNeedleMatched',
  );
}

function validateProviderReadySummary(summaryText, report) {
  assertIncludes(summaryText, '# AI/RAG Runtime Smoke Evidence', 'provider-ready summary must be a runtime smoke evidence summary');
  assertIncludes(summaryText, '| providerMode | ready |', 'provider-ready summary must record ready provider mode');
  assertIncludes(summaryText, '| retrieval.ragReady | true |', 'provider-ready summary must record ragReady true');
  assertIncludes(summaryText, '| database.embeddings.activeCount |', 'provider-ready summary must record embedding row count');
  assertIncludes(summaryText, '| askAudit.run/runSource/promptSource |', 'provider-ready summary must record Ask audit counts');
  assertIncludes(summaryText, '| legacyCommonComparison |', 'provider-ready summary must record legacy/common comparison');
  assertIncludes(summaryText, 'queryMatched=true', 'provider-ready summary must record legacy/common query match');

  if (typeof report.dmsPath === 'string' && report.dmsPath) {
    assertIncludes(summaryText, report.dmsPath, 'provider-ready summary must include the DMS fixture path');
  }
  if (typeof report.query === 'string' && report.query) {
    assertIncludes(summaryText, report.query, 'provider-ready summary must include the smoke query');
  }
  if (typeof report.retrieval?.retrievalLogId === 'string' && report.retrieval.retrievalLogId) {
    assertIncludes(summaryText, report.retrieval.retrievalLogId, 'provider-ready summary must include retrieval log id');
  }
}

function validateProviderReadyEvidenceRecord(reportDigest, summaryDigest, roadmapPath, handoffPath) {
  const roadmap = readPathText(resolveInputPath(roadmapPath), 'provider-ready roadmap evidence');
  const handoff = readPathText(resolveInputPath(handoffPath), 'provider-ready handoff evidence');

  for (const [label, content] of [
    ['roadmap', roadmap],
    ['handoff', handoff],
  ]) {
    assertIncludes(content, 'AI_RAG_PROVIDER_READY_EVIDENCE:START', `${label} must include provider-ready evidence block start`);
    assertIncludes(content, 'AI_RAG_PROVIDER_READY_EVIDENCE:END', `${label} must include provider-ready evidence block end`);
    assertIncludes(content, 'Provider-ready evidence status: recorded', `${label} must record provider-ready evidence status`);
    assertIncludes(content, `Report SHA256: \`${reportDigest}\``, `${label} must record provider-ready report digest`);
    assertIncludes(content, `Summary SHA256: \`${summaryDigest}\``, `${label} must record provider-ready summary digest`);
    assertIncludes(content, 'Provider mode: `ready`', `${label} must record ready provider mode`);
  }
}

function verifyProviderReadyRuntimeReport(reportPath, summaryPath) {
  execFileSync(
    process.execPath,
    [
      'scripts/verify-ai-rag-runtime-report.mjs',
      '--provider-mode=ready',
      `--path=${reportPath}`,
      `--summary-path=${summaryPath}`,
    ],
    { cwd: rootDir, stdio: 'inherit' },
  );
}

function assertEnabledSource(value, label) {
  assertObject(value, label);
  assertEquals(value.semanticSearchEnabled, true, `${label}.semanticSearchEnabled`);
  assertEquals(value.vectorSearchEnabled, true, `${label}.vectorSearchEnabled`);
  assertEquals(value.ragContextEnabled, true, `${label}.ragContextEnabled`);
}

function assertSourceCoverage(value) {
  assertObject(value, 'sourceCoverage');
  assertStringArrayEquals(value.sourceApps, EXPECTED_SOURCE_APPS, 'sourceCoverage.sourceApps');
  assertStringArrayEquals(value.registered, EXPECTED_REGISTERED_SOURCE_APPS, 'sourceCoverage.registered');
  assertStringArrayEquals(
    value.missingAdapters,
    EXPECTED_MISSING_ADAPTER_SOURCE_APPS,
    'sourceCoverage.missingAdapters',
  );
}

function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function readJsonWithText(relativePath) {
  const rawText = readPathText(relativePath, 'provider-ready report');
  return {
    value: JSON.parse(rawText),
    rawText,
  };
}

function readPathText(relativePath, label) {
  const absolutePath = path.resolve(relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing ${label} file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(rootDir, inputPath);
}

function assertIncludes(content, pattern, message) {
  if (!content.includes(pattern)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, pattern, message) {
  if (content.includes(pattern)) {
    throw new Error(message);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertNumberAtLeast(value, minimum, label) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < minimum) {
    throw new Error(`${label} must be a number >= ${minimum}, got ${String(value)}`);
  }
}

function assertEquals(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertStringArrayEquals(actual, expected, label) {
  if (!Array.isArray(actual)) {
    throw new Error(`${label} must be an array.`);
  }
  const normalizedActual = actual.map((item) => String(item));
  if (
    normalizedActual.length !== expected.length
    || normalizedActual.some((item, index) => item !== expected[index])
  ) {
    throw new Error(`${label} expected ${expected.join(', ')}, got ${normalizedActual.join(', ')}`);
  }
}

function pickString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] || fallback;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createSelfTestReadyReport() {
  return {
    schemaVersion: 1,
    status: 'passed',
    providerMode: 'ready',
    dmsPath: 'verify-ai-rag/runtime-smoke-self-test.md',
    query: 'AI RAG runtime smoke needle',
    sourceStatus: {
      sourceApp: 'dms',
      semanticSearchEnabled: true,
      vectorSearchEnabled: true,
      ragContextEnabled: true,
    },
    sourceCoverage: {
      sourceApps: [...EXPECTED_SOURCE_APPS],
      registered: [...EXPECTED_REGISTERED_SOURCE_APPS],
      missingAdapters: [...EXPECTED_MISSING_ADAPTER_SOURCE_APPS],
    },
    retrieval: {
      retrievalLogId: '1001',
      ragReady: true,
      contextItemCount: 1,
    },
    database: {
      source: {
        sourceApp: 'dms',
        semanticSearchEnabled: true,
        vectorSearchEnabled: true,
        ragContextEnabled: true,
      },
      object: {
        indexStatusCode: 'indexed',
      },
      embeddings: {
        activeCount: 1,
      },
      askAudit: {
        runSourceCount: 1,
        promptSourceCount: 1,
      },
      legacyCommonComparison: {
        legacyChunkCount: 1,
        commonResultCount: 1,
        commonContextCount: 1,
        commonQueryNeedleMatched: true,
      },
    },
  };
}

function createSelfTestReadySummary() {
  return [
    '# AI/RAG Runtime Smoke Evidence',
    '',
    '| Field | Value |',
    '| --- | --- |',
    '| providerMode | ready |',
    '| dmsPath | verify-ai-rag/runtime-smoke-self-test.md |',
    '| query | AI RAG runtime smoke needle |',
    '| retrieval.retrievalLogId | 1001 |',
    '| retrieval.ragReady | true |',
    '| database.embeddings.activeCount | 1 |',
    '| askAudit.run/runSource/promptSource | 1 / 1 / 1 |',
    '| legacyCommonComparison | legacyChunks=1, commonResults=1, commonContext=1, queryMatched=true |',
    '',
  ].join('\n');
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:ai-rag-central-foundation
  pnpm run verify:ai-rag-central-foundation:complete -- --provider-ready-report=<path.json> --provider-ready-summary=<path.md>

Options:
  --provider-ready-report=<path.json>  Provider-ready runtime smoke JSON artifact.
  --provider-ready-summary=<path.md>   Provider-ready runtime smoke Markdown summary artifact.
  --provider-ready-roadmap=<path.md>   Provider-ready roadmap evidence doc. Default: docs/common/.../ai-rag-platform-roadmap.md
  --provider-ready-handoff=<path.md>   Provider-ready handoff evidence doc. Default: docs/common/.../ai-rag-platform-handoff.md
  --require-provider-ready-report      Fail unless provider-ready report, summary, and docs evidence are supplied and valid.
  --self-test                          Validate the built-in provider-ready fixture.
  --help                               Show this help.
`);
}
