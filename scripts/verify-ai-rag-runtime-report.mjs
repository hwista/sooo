#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const EXPECTED_PLANNED_SOURCE_APPS = ['admin', 'crm', 'dms', 'pms', 'sns'];
const EXPECTED_REGISTERED_SOURCE_APPS = ['crm', 'dms', 'pms', 'sns'];
const EXPECTED_MISSING_ADAPTER_SOURCE_APPS = ['admin'];

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  printSummary: argv.includes('--summary'),
  reportPath: pickString(readOption('path', 'AI_RAG_SMOKE_REPORT_PATH', '')),
  summaryPath: pickString(readOption('summary-path', 'AI_RAG_SMOKE_SUMMARY_PATH', '')),
  providerMode: pickString(readOption('provider-mode', 'AI_RAG_SMOKE_PROVIDER_MODE', '')),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    const readyReport = createSelfTestReport('ready');
    const unavailableReport = createSelfTestReport('unavailable');
    validateReport(readyReport, 'ready');
    validateReport(unavailableReport, 'unavailable');
    assertSelfTestSummary(formatReportSummary(readyReport), 'legacyCommonComparison');
    assertSelfTestSummary(formatReportSummary(readyReport), 'sourceCoverage.missingAdapters');
    assertSelfTestSummary(formatReportSummary(unavailableReport), 'providerMode');
    console.log('✓ AI/RAG runtime smoke report self-test passed');
    process.exit(0);
  }

  validateConfig(config);
  const report = readReport(config.reportPath);
  validateReport(report, config.providerMode);
  const summary = formatReportSummary(report);
  writeSummaryReport(config.summaryPath, summary);
  if (config.printSummary) {
    console.log(summary);
  }
  console.log('✓ AI/RAG runtime smoke report verification passed');
} catch (error) {
  console.error(`✗ AI/RAG runtime smoke report verification failed: ${formatError(error)}`);
  process.exit(1);
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('AI_RAG_SMOKE_REPORT_PATH or --path=<path.json> is required.');
  }
  if (options.providerMode && !['ready', 'unavailable'].includes(options.providerMode)) {
    throw new Error(`AI_RAG_SMOKE_PROVIDER_MODE / --provider-mode must be ready or unavailable, got ${options.providerMode}`);
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

function writeSummaryReport(summaryPath, summary) {
  if (!summaryPath) {
    return;
  }

  const absolutePath = path.resolve(summaryPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${summary.trimEnd()}\n`, 'utf-8');
  console.log(`→ wrote AI/RAG runtime smoke summary: ${summaryPath}`);
}

function validateReport(report, expectedProviderMode = '') {
  assertObject(report, 'report');
  assertEquals(report.schemaVersion, 1, 'schemaVersion');
  assertEquals(report.status, 'passed', 'status');

  const providerMode = assertProviderMode(report.providerMode, 'providerMode');
  if (expectedProviderMode) {
    assertEquals(providerMode, expectedProviderMode, 'providerMode');
  }
  const providerReady = providerMode === 'ready';

  assertNonEmptyString(report.startedAt, 'startedAt');
  assertNonEmptyString(report.finishedAt, 'finishedAt');
  assertNumberAtLeast(report.durationMs, 0, 'durationMs');
  assertNonEmptyString(report.baseUrl, 'baseUrl');
  assertMarkdownPath(report.dmsPath, 'dmsPath');
  assertNonEmptyString(report.query, 'query');

  validateSourceCapabilities(report.sourceStatus, providerReady, 'sourceStatus');
  assertEquals(report.sourceStatus.sourceApp, 'dms', 'sourceStatus.sourceApp');
  validateSourceCoverage(report.sourceCoverage, providerReady);

  validateJobRun(report.jobRun);
  validateRetrieval(report.retrieval, providerReady);
  validateAsk(report.ask);
  validateDatabase(report.database, report, providerReady);
}

function formatReportSummary(report) {
  const providerReady = report.providerMode === 'ready';
  const legacyCommonComparison = report.database?.legacyCommonComparison;
  const retrievalAudit = report.database?.retrievalAudit ?? {};
  const askAudit = report.database?.askAudit ?? {};

  const rows = [
    ['schemaVersion', report.schemaVersion],
    ['status', report.status],
    ['providerMode', report.providerMode],
    ['startedAt', report.startedAt],
    ['finishedAt', report.finishedAt],
    ['durationMs', report.durationMs],
    ['dmsPath', report.dmsPath],
    ['query', report.query],
    ['source.semantic/vector/ragContext', formatCapabilityTriple(report.sourceStatus, 'source')],
    ['sourceCoverage.registered', formatSourceAppList(report.sourceCoverage?.registered)],
    ['sourceCoverage.missingAdapters', formatSourceAppList(report.sourceCoverage?.missingAdapters)],
    ['retrieval.retrievalLogId', report.retrieval?.retrievalLogId ?? '(none)'],
    ['retrieval.ragReady', report.retrieval?.ragReady],
    ['retrieval.ranker', report.retrieval?.ranker ?? '(unknown)'],
    ['retrieval.total/result/context/citation', [
      report.retrieval?.total ?? '(unknown)',
      report.retrieval?.resultCount ?? 0,
      report.retrieval?.contextItemCount ?? 0,
      report.retrieval?.citationCount ?? 0,
    ].join(' / ')],
    ['database.object.indexStatusCode', report.database?.object?.indexStatusCode],
    ['database.chunks.activeCount', report.database?.chunks?.activeCount],
    ['database.embeddings.activeCount', report.database?.embeddings?.activeCount],
    ['retrievalAudit.result/context/item/contextItem', [
      retrievalAudit.resultCount ?? '(n/a)',
      retrievalAudit.contextCount ?? '(n/a)',
      retrievalAudit.itemCount ?? retrievalAudit.logCount ?? '(n/a)',
      retrievalAudit.contextItemCount ?? '(n/a)',
    ].join(' / ')],
    ['ask.status/success', `${report.ask?.status ?? '(unknown)'} / ${String(report.ask?.success)}`],
    ['askAudit.run/runSource/promptSource', [
      askAudit.runCount ?? '(n/a)',
      askAudit.runSourceCount ?? '(n/a)',
      askAudit.promptSourceCount ?? '(n/a)',
    ].join(' / ')],
    ['legacyCommonComparison', providerReady ? formatLegacyComparison(legacyCommonComparison) : '(not required)'],
  ];

  return [
    '# AI/RAG Runtime Smoke Evidence',
    '',
    '| Field | Value |',
    '| --- | --- |',
    ...rows.map(([field, value]) => `| ${escapeMarkdownCell(field)} | ${escapeMarkdownCell(String(value))} |`),
    '',
  ].join('\n');
}

function formatCapabilityTriple(value, mode) {
  if (mode === 'source') {
    return [
      String(value?.semanticSearchEnabled),
      String(value?.vectorSearchEnabled),
      String(value?.ragContextEnabled),
    ].join(' / ');
  }

  return [
    String(value?.semantic),
    String(value?.vector),
    String(value?.ragContext),
  ].join(' / ');
}

function formatLegacyComparison(value) {
  if (!value || typeof value !== 'object') {
    return '(missing)';
  }

  return [
    `legacyChunks=${value.legacyChunkCount}`,
    `legacyQueryChunks=${value.legacyQueryChunkCount}`,
    `commonResults=${value.commonResultCount}`,
    `commonContext=${value.commonContextCount}`,
    `queryMatched=${String(value.commonQueryNeedleMatched)}`,
  ].join(', ');
}

function escapeMarkdownCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function validateJobRun(jobRun) {
  assertObject(jobRun, 'jobRun');
  assertNonEmptyString(jobRun.shape, 'jobRun.shape');
}

function validateRetrieval(retrieval, providerReady) {
  assertObject(retrieval, 'retrieval');
  assertNumberAtLeast(retrieval.resultCount, 0, 'retrieval.resultCount');
  assertNumberAtLeast(retrieval.contextItemCount, 0, 'retrieval.contextItemCount');
  assertNumberAtLeast(retrieval.citationCount, 0, 'retrieval.citationCount');

  if (retrieval.total !== undefined) {
    assertNumberAtLeast(retrieval.total, 0, 'retrieval.total');
  }

  if (providerReady) {
    assertNonEmptyString(retrieval.retrievalLogId, 'retrieval.retrievalLogId');
    assertEquals(retrieval.ragReady, true, 'retrieval.ragReady');
    assertNumberAtLeast(retrieval.contextItemCount, 1, 'retrieval.contextItemCount');
    validateRetrievalCapabilities(retrieval.capabilities, true, 'retrieval.capabilities');
  }
}

function validateAsk(ask) {
  assertObject(ask, 'ask');
  assertNumberAtLeast(ask.status, 100, 'ask.status');
  if (typeof ask.success !== 'boolean') {
    throw new Error(`ask.success must be boolean, got ${typeof ask.success}`);
  }
}

function validateDatabase(database, report, providerReady) {
  assertObject(database, 'database');
  validateSourceCapabilities(database.source, providerReady, 'database.source');
  assertEquals(database.source.sourceApp, 'dms', 'database.source.sourceApp');

  assertObject(database.object, 'database.object');
  assertNonEmptyString(database.object.objectId, 'database.object.objectId');
  assertEquals(database.object.contextEligible, true, 'database.object.contextEligible');
  assertEquals(database.object.indexStatusCode, providerReady ? 'indexed' : 'stale', 'database.object.indexStatusCode');

  assertObject(database.chunks, 'database.chunks');
  assertNumberAtLeast(database.chunks.activeCount, 1, 'database.chunks.activeCount');

  assertObject(database.embeddings, 'database.embeddings');
  if (providerReady) {
    assertNumberAtLeast(database.embeddings.activeCount, 1, 'database.embeddings.activeCount');
  } else {
    assertEquals(database.embeddings.activeCount, 0, 'database.embeddings.activeCount');
  }

  validateRetrievalAudit(database.retrievalAudit, report);
  validateAskAudit(database.askAudit, report, providerReady);

  if (providerReady) {
    validateLegacyCommonComparison(database.legacyCommonComparison);
  } else if (database.legacyCommonComparison !== undefined) {
    assertNullish(database.legacyCommonComparison, 'database.legacyCommonComparison');
  }
}

function validateSourceCoverage(sourceCoverage, providerReady) {
  assertObject(sourceCoverage, 'sourceCoverage');
  assertNumberAtLeast(sourceCoverage.totalCount, EXPECTED_PLANNED_SOURCE_APPS.length, 'sourceCoverage.totalCount');
  assertStringArrayEquals(sourceCoverage.sourceApps, EXPECTED_PLANNED_SOURCE_APPS, 'sourceCoverage.sourceApps');
  assertStringArrayEquals(sourceCoverage.registered, EXPECTED_REGISTERED_SOURCE_APPS, 'sourceCoverage.registered');
  assertStringArrayEquals(
    sourceCoverage.missingAdapters,
    EXPECTED_MISSING_ADAPTER_SOURCE_APPS,
    'sourceCoverage.missingAdapters',
  );

  if (!Array.isArray(sourceCoverage.statuses)) {
    throw new Error('sourceCoverage.statuses must be an array.');
  }
  for (const sourceApp of EXPECTED_PLANNED_SOURCE_APPS) {
    const status = sourceCoverage.statuses.find((item) => item?.sourceApp === sourceApp);
    assertObject(status, `sourceCoverage.statuses.${sourceApp}`);
    if (EXPECTED_REGISTERED_SOURCE_APPS.includes(sourceApp)) {
      assertEquals(status.registered, true, `sourceCoverage.statuses.${sourceApp}.registered`);
      assertEquals(status.registrationStatus, 'registered', `sourceCoverage.statuses.${sourceApp}.registrationStatus`);
      validateSourceCapabilities(status, providerReady, `sourceCoverage.statuses.${sourceApp}`);
    } else {
      assertEquals(status.registered, false, `sourceCoverage.statuses.${sourceApp}.registered`);
      assertEquals(
        status.registrationStatus,
        'missing_adapter',
        `sourceCoverage.statuses.${sourceApp}.registrationStatus`,
      );
      validateSourceCapabilities(status, false, `sourceCoverage.statuses.${sourceApp}`);
    }
  }
}

function validateRetrievalAudit(retrievalAudit, report) {
  assertObject(retrievalAudit, 'database.retrievalAudit');
  if (report.retrieval.retrievalLogId !== undefined) {
    assertEquals(
      retrievalAudit.retrievalLogId,
      report.retrieval.retrievalLogId,
      'database.retrievalAudit.retrievalLogId',
    );
    assertEquals(retrievalAudit.sourceApp, 'dms', 'database.retrievalAudit.sourceApp');
    assertEquals(retrievalAudit.queryText, report.query, 'database.retrievalAudit.queryText');
    assertNumberAtLeast(retrievalAudit.resultCount, 0, 'database.retrievalAudit.resultCount');
    assertNumberAtLeast(retrievalAudit.itemCount, 0, 'database.retrievalAudit.itemCount');
    assertEquals(retrievalAudit.itemCount, retrievalAudit.resultCount, 'database.retrievalAudit.itemCount');
    assertNumberAtLeast(retrievalAudit.contextCount, 0, 'database.retrievalAudit.contextCount');
    assertNumberAtLeast(retrievalAudit.contextItemCount, 0, 'database.retrievalAudit.contextItemCount');
  } else {
    assertEquals(retrievalAudit.queryText, report.query, 'database.retrievalAudit.queryText');
    assertNumberAtLeast(retrievalAudit.logCount, 1, 'database.retrievalAudit.logCount');
  }
}

function validateAskAudit(askAudit, report, providerReady) {
  assertObject(askAudit, 'database.askAudit');
  assertEquals(askAudit.askStatus, report.ask.status, 'database.askAudit.askStatus');
  assertEquals(askAudit.requireRunSource, providerReady, 'database.askAudit.requireRunSource');
  assertNumberAtLeast(askAudit.runCount, 0, 'database.askAudit.runCount');
  assertNumberAtLeast(askAudit.runSourceCount, 0, 'database.askAudit.runSourceCount');
  assertNumberAtLeast(askAudit.promptSourceCount, 0, 'database.askAudit.promptSourceCount');

  if (providerReady) {
    assertNumberAtLeast(askAudit.runSourceCount, 1, 'database.askAudit.runSourceCount');
    assertNumberAtLeast(askAudit.promptSourceCount, 1, 'database.askAudit.promptSourceCount');
  }
}

function validateLegacyCommonComparison(legacyCommonComparison) {
  assertObject(legacyCommonComparison, 'database.legacyCommonComparison');
  assertNumberAtLeast(legacyCommonComparison.legacyChunkCount, 1, 'database.legacyCommonComparison.legacyChunkCount');
  assertNumberAtLeast(
    legacyCommonComparison.legacyQueryChunkCount,
    1,
    'database.legacyCommonComparison.legacyQueryChunkCount',
  );
  assertNumberAtLeast(legacyCommonComparison.commonResultCount, 1, 'database.legacyCommonComparison.commonResultCount');
  assertNumberAtLeast(
    legacyCommonComparison.commonContextCount,
    1,
    'database.legacyCommonComparison.commonContextCount',
  );
  assertEquals(
    legacyCommonComparison.commonQueryNeedleMatched,
    true,
    'database.legacyCommonComparison.commonQueryNeedleMatched',
  );
}

function validateSourceCapabilities(value, expectedEnabled, label) {
  assertObject(value, label);
  assertEquals(value.semanticSearchEnabled, expectedEnabled, `${label}.semanticSearchEnabled`);
  assertEquals(value.vectorSearchEnabled, expectedEnabled, `${label}.vectorSearchEnabled`);
  assertEquals(value.ragContextEnabled, expectedEnabled, `${label}.ragContextEnabled`);
}

function validateRetrievalCapabilities(value, expectedEnabled, label) {
  assertObject(value, label);
  assertEquals(value.semantic, expectedEnabled, `${label}.semantic`);
  assertEquals(value.vector, expectedEnabled, `${label}.vector`);
  assertEquals(value.ragContext, expectedEnabled, `${label}.ragContext`);
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertProviderMode(value, label) {
  if (!['ready', 'unavailable'].includes(value)) {
    throw new Error(`${label} must be ready or unavailable, got ${String(value)}`);
  }
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertMarkdownPath(value, label) {
  assertNonEmptyString(value, label);
  if (!value.endsWith('.md')) {
    throw new Error(`${label} must end with .md, got ${value}`);
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

function assertNullish(value, label) {
  if (value !== null && value !== undefined) {
    throw new Error(`${label} must be null or undefined in provider-unavailable mode.`);
  }
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] || fallback;
}

function pickString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function assertSelfTestSummary(summary, expectedNeedle) {
  if (!summary.includes(expectedNeedle)) {
    throw new Error(`Self-test summary must include ${expectedNeedle}`);
  }
}

function formatSourceAppList(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : '(none)';
}

function createSelfTestReport(providerMode) {
  const providerReady = providerMode === 'ready';
  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt: '2026-07-02T00:00:00.000Z',
    finishedAt: '2026-07-02T00:00:01.000Z',
    durationMs: 1000,
    providerMode,
    baseUrl: 'http://127.0.0.1:4000/api',
    dmsPath: 'verify-ai-rag/runtime-smoke-self-test.md',
    query: 'AI RAG runtime smoke needle',
    sourceStatus: createSourceCapabilities(providerReady, { sourceApp: 'dms' }),
    sourceCoverage: createSelfTestSourceCoverage(providerReady),
    jobRun: { shape: 'object', processedCount: 1 },
    retrieval: {
      retrievalLogId: providerReady ? '1001' : undefined,
      total: providerReady ? 1 : 0,
      ranker: providerReady ? 'vector' : 'keyword',
      ragReady: providerReady,
      resultCount: providerReady ? 1 : 0,
      contextItemCount: providerReady ? 1 : 0,
      citationCount: 0,
      capabilities: providerReady ? createRetrievalCapabilities(true) : undefined,
    },
    ask: {
      status: providerReady ? 200 : 500,
      success: providerReady,
    },
    database: {
      source: createSourceCapabilities(providerReady, { sourceApp: 'dms' }),
      object: {
        objectId: '2001',
        contextEligible: true,
        indexStatusCode: providerReady ? 'indexed' : 'stale',
      },
      chunks: {
        activeCount: 1,
      },
      embeddings: {
        activeCount: providerReady ? 1 : 0,
      },
      retrievalAudit: providerReady
        ? {
            retrievalLogId: '1001',
            sourceApp: 'dms',
            queryText: 'AI RAG runtime smoke needle',
            resultCount: 1,
            contextCount: 1,
            itemCount: 1,
            contextItemCount: 1,
          }
        : {
            retrievalLogId: undefined,
            queryText: 'AI RAG runtime smoke needle',
            logCount: 1,
          },
      askAudit: {
        askStatus: providerReady ? 200 : 500,
        requireRunSource: providerReady,
        runCount: providerReady ? 1 : 0,
        runSourceCount: providerReady ? 1 : 0,
        promptSourceCount: providerReady ? 1 : 0,
      },
      legacyCommonComparison: providerReady
        ? {
            legacyChunkCount: 1,
            legacyQueryChunkCount: 1,
            commonResultCount: 1,
            commonContextCount: 1,
            commonQueryNeedleMatched: true,
          }
        : undefined,
    },
  };
}

function createSelfTestSourceCoverage(providerReady) {
  return {
    totalCount: EXPECTED_PLANNED_SOURCE_APPS.length,
    sourceApps: [...EXPECTED_PLANNED_SOURCE_APPS],
    registered: [...EXPECTED_REGISTERED_SOURCE_APPS],
    missingAdapters: [...EXPECTED_MISSING_ADAPTER_SOURCE_APPS],
    statuses: EXPECTED_PLANNED_SOURCE_APPS.map((sourceApp) => {
      if (EXPECTED_REGISTERED_SOURCE_APPS.includes(sourceApp)) {
        return createSourceCapabilities(providerReady, {
          sourceApp,
          label: sourceApp.toUpperCase(),
          registered: true,
          registrationStatus: 'registered',
          sourceKind: sourceApp === 'dms' ? 'file' : 'domain',
          objectCount: sourceApp === 'dms' ? 1 : 0,
        });
      }

      return createSourceCapabilities(false, {
        sourceApp,
        label: sourceApp.toUpperCase(),
        registered: false,
        registrationStatus: 'missing_adapter',
        sourceKind: sourceApp === 'admin' ? 'system' : 'domain',
        objectCount: 0,
      });
    }),
  };
}

function createSourceCapabilities(enabled, extra = undefined) {
  return {
    ...(extra ?? {}),
    semanticSearchEnabled: enabled,
    vectorSearchEnabled: enabled,
    ragContextEnabled: enabled,
  };
}

function createRetrievalCapabilities(enabled) {
  return {
    keyword: enabled,
    metadata: enabled,
    semantic: enabled,
    vector: enabled,
    ragContext: enabled,
  };
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:ai-rag-runtime-report -- --provider-mode=<ready|unavailable> --path=<path.json>

Options:
  --path=<path.json>              Default: AI_RAG_SMOKE_REPORT_PATH
  --summary                       Print a Markdown evidence summary after verification
  --summary-path=<path.md>        Default: AI_RAG_SMOKE_SUMMARY_PATH or no summary file
  --provider-mode=<mode>          Default: AI_RAG_SMOKE_PROVIDER_MODE or report providerMode only
  --self-test                     Validate in-memory ready/unavailable fixture reports
  --help                          Show this help
`);
}
