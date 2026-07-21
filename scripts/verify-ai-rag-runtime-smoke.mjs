#!/usr/bin/env node

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const requireFromDatabasePackage = createRequire(new URL('../packages/database/package.json', import.meta.url));
const { PrismaClient } = requireFromDatabasePackage('@prisma/client');

process.env.DATABASE_URL ??= 'postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public';

const PLANNED_SOURCE_APPS = ['admin', 'crm', 'dms', 'pms', 'sns'];
const REGISTERED_SOURCE_APPS = ['crm', 'dms', 'pms', 'sns'];
const MISSING_ADAPTER_SOURCE_APPS = ['admin'];

const argv = process.argv.slice(2);
const defaultDmsPath = `verify-ai-rag/runtime-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
const dryRun = argv.includes('--dry-run');
const providerMode = readOption('provider-mode', 'AI_RAG_SMOKE_PROVIDER_MODE', 'unavailable');

const config = {
  help: argv.includes('--help'),
  dryRun,
  baseUrl: readOption('base-url', 'AI_RAG_SMOKE_BASE_URL', 'http://localhost:4000/api'),
  loginId: readOption('login-id', 'AI_RAG_SMOKE_LOGIN_ID', 'admin'),
  password: readOption('password', 'AI_RAG_SMOKE_PASSWORD', 'admin123!'),
  dmsPath: readOption('dms-path', 'AI_RAG_SMOKE_DMS_PATH', defaultDmsPath),
  query: readOption('query', 'AI_RAG_SMOKE_QUERY', 'AI RAG runtime smoke needle'),
  reportPath: pickString(readOption('report-path', 'AI_RAG_SMOKE_REPORT_PATH', '')),
  providerMode,
  checkProviderEnv: readBooleanOption(
    'check-provider-env',
    'AI_RAG_SMOKE_CHECK_PROVIDER_ENV',
    providerMode === 'ready' && !dryRun,
  ),
};

if (config.help) {
  printUsage();
  process.exit(0);
}

try {
  validateConfig(config);
} catch (error) {
  failConfig(error);
}

if (config.dryRun) {
  const providerEnvStatus = getProviderEnvStatus();
  console.log('AI/RAG runtime smoke dry-run');
  console.table({
    baseUrl: config.baseUrl,
    loginId: config.loginId,
    dmsPath: config.dmsPath,
    query: config.query,
    providerMode: config.providerMode,
    checkProviderEnv: config.checkProviderEnv,
    providerEnvReady: providerEnvStatus.ready,
    providerCredentialMode: providerEnvStatus.credentialMode ?? '(missing)',
    providerEnvMissing: providerEnvStatus.missing.join(', ') || '(none)',
    providerEnvPlaceholders: providerEnvStatus.placeholders.join(', ') || '(none)',
    providerEnvInvalid: providerEnvStatus.invalid.join(', ') || '(none)',
    databaseUrl: maskDatabaseUrl(process.env.DATABASE_URL),
    reportPath: config.reportPath ?? '(none)',
  });
  if (config.providerMode === 'ready' && config.checkProviderEnv) {
    try {
      assertProviderReadyEnv(providerEnvStatus);
    } catch (error) {
      failConfig(error);
    }
  }
  process.exit(0);
}

if (config.providerMode === 'ready' && config.checkProviderEnv) {
  try {
    assertProviderReadyEnv(getProviderEnvStatus());
  } catch (error) {
    failConfig(error);
  }
}

const prisma = new PrismaClient();

try {
  const report = await runSmoke(config);
  writeSmokeReport(config.reportPath, report);
  console.log('✓ AI/RAG runtime smoke verification passed');
} catch (error) {
  console.error(`✗ AI/RAG runtime smoke verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

async function runSmoke(options) {
  const smokeStartedAt = new Date();
  console.log(`→ login: ${options.loginId}`);
  const accessToken = await login(options);
  const headers = authHeaders(accessToken);

  console.log('→ verify: DMS source status bootstrap');
  await fetchSuccessData(`${options.baseUrl}/ai-index/status?sourceApp=dms`, headers, [200], '/ai-index/status');

  console.log(`→ prepare: DMS smoke document (${options.dmsPath})`);
  await saveSmokeDocument(options, headers);

  console.log('→ verify: DMS source status after content sync');
  const sourceStatus = await fetchSuccessData(
    `${options.baseUrl}/ai-index/status?sourceApp=dms`,
    headers,
    [200],
    '/ai-index/status after sync',
  );
  const dmsSourceStatus = assertDmsSourceStatus(sourceStatus, options.providerMode);

  console.log('→ verify: planned AI source coverage');
  const allSourceStatus = await fetchSuccessData(
    `${options.baseUrl}/ai-index/status`,
    headers,
    [200],
    '/ai-index/status planned source coverage',
  );
  const sourceCoverage = assertPlannedSourceCoverage(allSourceStatus, options.providerMode);

  console.log('→ run: common AI index pending jobs');
  const jobRun = await fetchSuccessData(
    `${options.baseUrl}/ai-index/jobs/run?limit=10`,
    headers,
    [200, 201],
    '/ai-index/jobs/run',
    { method: 'POST' },
  );

  console.log('→ verify: common retrieval query');
  const retrieval = await fetchSuccessData(
    `${options.baseUrl}/ai-index/retrieval/query`,
    authHeaders(accessToken, { 'Content-Type': 'application/json' }),
    [200, 201],
    '/ai-index/retrieval/query',
    {
      method: 'POST',
      body: JSON.stringify({
        query: options.query,
        sourceApp: 'dms',
        entityTypes: ['document'],
        limit: 5,
        contextLimit: 3,
        includeContext: true,
      }),
    },
  );

  console.log('→ verify: DMS Ask audit path');
  const ask = await requestJson(`${options.baseUrl}/dms/ask`, {
    method: 'POST',
    headers: authHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      query: options.query,
      activeDocPath: options.dmsPath,
      contextMode: 'doc',
      stream: false,
    }),
  });
  if (![200, 201, 500].includes(ask.response.status)) {
    throw new Error(`/dms/ask returned unexpected status ${ask.response.status}: ${JSON.stringify(ask.data)}`);
  }
  if (ask.response.status < 500) {
    assertSuccessEnvelope(ask.data, '/dms/ask');
  }

  console.log('→ verify: common AI database rows');
  const databaseReport = await verifyDatabaseRows(options, retrieval, ask.response.status, smokeStartedAt);
  const smokeFinishedAt = new Date();

  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt: smokeStartedAt.toISOString(),
    finishedAt: smokeFinishedAt.toISOString(),
    durationMs: smokeFinishedAt.getTime() - smokeStartedAt.getTime(),
    providerMode: options.providerMode,
    baseUrl: options.baseUrl,
    dmsPath: options.dmsPath,
    query: options.query,
    sourceStatus: {
      sourceApp: dmsSourceStatus.sourceApp,
      semanticSearchEnabled: dmsSourceStatus.semanticSearchEnabled,
      vectorSearchEnabled: dmsSourceStatus.vectorSearchEnabled,
      ragContextEnabled: dmsSourceStatus.ragContextEnabled,
    },
    sourceCoverage,
    jobRun: summarizeJobRun(jobRun),
    retrieval: summarizeRetrieval(retrieval),
    ask: {
      status: ask.response.status,
      success: ask.response.status < 500 && ask.data?.success === true,
    },
    database: databaseReport,
  };
}

function summarizeJobRun(jobRun) {
  if (Array.isArray(jobRun)) {
    return {
      shape: 'array',
      itemCount: jobRun.length,
    };
  }

  if (jobRun && typeof jobRun === 'object') {
    const summary = {};
    for (const key of ['processedCount', 'succeededCount', 'failedCount', 'skippedCount', 'total', 'limit']) {
      if (typeof jobRun[key] === 'number' || typeof jobRun[key] === 'string' || typeof jobRun[key] === 'boolean') {
        summary[key] = jobRun[key];
      }
    }
    return {
      shape: 'object',
      ...summary,
    };
  }

  return {
    shape: typeof jobRun,
  };
}

function summarizeRetrieval(retrieval) {
  return {
    retrievalLogId: typeof retrieval?.retrievalLogId === 'string' ? retrieval.retrievalLogId : undefined,
    total: Number.isFinite(Number(retrieval?.total)) ? Number(retrieval.total) : undefined,
    ranker: typeof retrieval?.ranker === 'string' ? retrieval.ranker : undefined,
    ragReady: retrieval?.ragReady === true,
    resultCount: Array.isArray(retrieval?.results) ? retrieval.results.length : 0,
    contextItemCount: Array.isArray(retrieval?.contextItems) ? retrieval.contextItems.length : 0,
    citationCount: Array.isArray(retrieval?.citations) ? retrieval.citations.length : 0,
    capabilities: retrieval?.capabilities && typeof retrieval.capabilities === 'object'
      ? retrieval.capabilities
      : undefined,
  };
}

function writeSmokeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }

  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`→ wrote AI/RAG runtime smoke report: ${reportPath}`);
}

async function saveSmokeDocument(options, headers) {
  const content = [
    '# AI RAG Runtime Smoke',
    '',
    `${options.query} confirms DMS common AI projection, chunking, retrieval, and audit wiring.`,
    '',
    'This document is maintained by the AI/RAG runtime smoke script.',
  ].join('\n');

  const payload = {
    path: options.dmsPath,
    content,
    metadata: {
      title: 'AI RAG Runtime Smoke',
      author: 'ai-rag-runtime-smoke',
      lastModifiedBy: 'ai-rag-runtime-smoke',
      visibility: { scope: 'organization' },
      acl: {
        owners: [],
        editors: [],
        viewers: [],
      },
      tags: ['ai-rag-runtime-smoke'],
    },
  };

  const { response, data } = await requestJson(`${options.baseUrl}/dms/content`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  assertStatusOneOf(response, [200, 502], '/dms/content smoke document save', data);
  if (response.status === 200) {
    assertSuccessEnvelope(data, '/dms/content smoke document save');
    const savedPath = data.data?.savedPath;
    if (typeof savedPath !== 'string' || savedPath !== options.dmsPath) {
      throw new Error(`/dms/content savedPath mismatch: ${String(savedPath)}`);
    }
    return;
  }

  const message = data?.error?.message;
  if (typeof message !== 'string' || !message.includes('검색 인덱스 동기화에 실패했습니다')) {
    throw new Error(`/dms/content returned unexpected 502: ${JSON.stringify(data)}`);
  }
}

async function verifyDatabaseRows(options, retrieval, askStatus, smokeStartedAt) {
  const sourceRows = await prisma.$queryRawUnsafe(
    `
    SELECT source_app_code, semantic_search_enabled, vector_search_enabled, rag_context_enabled, metadata_jsonb
      FROM common.cm_ai_source_m
     WHERE source_app_code = 'dms'
     ORDER BY updated_at DESC
     LIMIT 1
    `,
  );
  const source = firstRow(sourceRows, 'common.cm_ai_source_m dms source');
  const providerReady = options.providerMode === 'ready';
  assertBooleanEquals(source.semantic_search_enabled, providerReady, 'semantic_search_enabled');
  assertBooleanEquals(source.vector_search_enabled, providerReady, 'vector_search_enabled');
  assertBooleanEquals(source.rag_context_enabled, providerReady, 'rag_context_enabled');

  const objectRows = await prisma.$queryRawUnsafe(
    `
    SELECT o.ai_object_id, o.context_eligible, st.index_status_code, st.metadata_jsonb
      FROM common.cm_ai_object_m o
      LEFT JOIN common.cm_ai_index_state_m st
        ON st.ai_object_id = o.ai_object_id
       AND st.is_active = true
     WHERE o.source_app_code = 'dms'
       AND o.entity_type_code = 'document'
       AND o.entity_id = $1
     ORDER BY o.updated_at DESC
     LIMIT 1
    `,
    options.dmsPath,
  );
  const object = firstRow(objectRows, 'common.cm_ai_object_m smoke object');
  assertBooleanEquals(object.context_eligible, true, 'DMS smoke object context_eligible');

  const chunkRows = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*)::int AS chunk_count
      FROM common.cm_ai_chunk_m
     WHERE ai_object_id = $1
       AND is_active = true
    `,
    object.ai_object_id,
  );
  const chunkCount = Number(firstRow(chunkRows, 'common.cm_ai_chunk_m count').chunk_count);
  if (!Number.isFinite(chunkCount) || chunkCount < 1) {
    throw new Error(`Expected at least one active AI chunk, got ${chunkCount}`);
  }

  const embeddingRows = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*)::int AS embedding_count
      FROM common.cm_ai_embedding_m e
      JOIN common.cm_ai_chunk_m c
        ON c.ai_chunk_id = e.ai_chunk_id
     WHERE c.ai_object_id = $1
       AND c.is_active = true
       AND e.is_active = true
    `,
    object.ai_object_id,
  );
  const embeddingCount = Number(firstRow(embeddingRows, 'common.cm_ai_embedding_m count').embedding_count);
  let legacyCommonComparison;

  if (options.providerMode === 'ready') {
    if (object.index_status_code !== 'indexed') {
      throw new Error(`Provider ready mode expected indexed state, got ${String(object.index_status_code)}`);
    }
    if (embeddingCount < 1) {
      throw new Error('Provider ready mode expected active common embeddings.');
    }
    if (!retrieval?.retrievalLogId || !Array.isArray(retrieval.contextItems) || retrieval.contextItems.length < 1) {
      throw new Error('Provider ready mode expected retrievalLogId and contextItems.');
    }
    legacyCommonComparison = await verifyLegacyCommonRetrievalComparison(options, retrieval);
  } else {
    if (embeddingCount !== 0) {
      throw new Error(`Provider unavailable mode expected no active common embeddings, got ${embeddingCount}`);
    }
    if (object.index_status_code !== 'stale') {
      throw new Error(`Provider unavailable mode expected stale state, got ${String(object.index_status_code)}`);
    }
  }

  const retrievalAudit = await verifyRetrievalAuditRows(options, retrieval);
  const askAudit = await verifyAskAuditRows(askStatus, smokeStartedAt, options.providerMode === 'ready');

  return {
    source: {
      sourceApp: source.source_app_code,
      semanticSearchEnabled: source.semantic_search_enabled,
      vectorSearchEnabled: source.vector_search_enabled,
      ragContextEnabled: source.rag_context_enabled,
    },
    object: {
      objectId: object.ai_object_id.toString(),
      contextEligible: object.context_eligible,
      indexStatusCode: object.index_status_code,
    },
    chunks: {
      activeCount: chunkCount,
    },
    embeddings: {
      activeCount: embeddingCount,
    },
    retrievalAudit,
    askAudit,
    legacyCommonComparison,
  };
}

async function verifyLegacyCommonRetrievalComparison(options, retrieval) {
  const legacyRows = await prisma.$queryRawUnsafe(
    `
    SELECT
      COUNT(*)::int AS chunk_count,
      (COUNT(*) FILTER (WHERE chunk_text ILIKE $2))::int AS query_chunk_count
      FROM dms_document_embeddings
     WHERE file_path = $1
    `,
    options.dmsPath,
    `%${options.query}%`,
  );
  const legacy = firstRow(legacyRows, 'dms_document_embeddings legacy comparison');
  const legacyChunkCount = Number(legacy.chunk_count);
  const legacyQueryChunkCount = Number(legacy.query_chunk_count);
  if (!Number.isFinite(legacyChunkCount) || legacyChunkCount < 1) {
    throw new Error('Provider ready mode expected legacy dms_document_embeddings rows for the smoke document.');
  }
  if (!Number.isFinite(legacyQueryChunkCount) || legacyQueryChunkCount < 1) {
    throw new Error('Provider ready mode expected a legacy DMS embedding chunk containing the smoke query.');
  }

  const resultMatches = getCommonRetrievalDocumentMatches(retrieval?.results, options.dmsPath);
  if (resultMatches.length < 1) {
    throw new Error('Provider ready mode expected common retrieval results to include the smoke DMS document.');
  }

  const contextMatches = getCommonRetrievalDocumentMatches(retrieval?.contextItems, options.dmsPath);
  if (contextMatches.length < 1) {
    throw new Error('Provider ready mode expected common retrieval context to include the smoke DMS document.');
  }

  const commonMatches = [...resultMatches, ...contextMatches];
  const commonNeedleMatch = commonMatches.some((item) => retrievalItemIncludesQuery(item, options.query));
  if (!commonNeedleMatch) {
    throw new Error('Provider ready mode expected common retrieval text to include the smoke query.');
  }

  console.log(
    `✓ legacy/common retrieval comparison: legacy_chunks=${legacyChunkCount}, `
    + `legacy_query_chunks=${legacyQueryChunkCount}, common_results=${resultMatches.length}, `
    + `common_context=${contextMatches.length}`,
  );

  return {
    legacyChunkCount,
    legacyQueryChunkCount,
    commonResultCount: resultMatches.length,
    commonContextCount: contextMatches.length,
    commonQueryNeedleMatched: true,
  };
}

function getCommonRetrievalDocumentMatches(items, dmsPath) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => (
    item?.sourceApp === 'dms'
    && item?.entityType === 'document'
    && item?.entityId === dmsPath
  ));
}

function retrievalItemIncludesQuery(item, query) {
  const text = [
    item?.chunkText,
    item?.text,
    item?.excerpt,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0).join('\n');

  return normalizeComparableText(text).includes(normalizeComparableText(query));
}

function normalizeComparableText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function verifyRetrievalAuditRows(options, retrieval) {
  if (retrieval?.retrievalLogId) {
    const retrievalLogId = parseBigIntId(retrieval.retrievalLogId, 'retrieval.retrievalLogId');
    const retrievalAuditRows = await prisma.$queryRawUnsafe(
      `
      SELECT
        log.ai_retrieval_log_id,
        log.source_app_code,
        log.query_text,
        log.result_count,
        log.context_count,
        COUNT(item.ai_retrieval_log_item_id)::int AS item_count,
        COUNT(item.ai_retrieval_log_item_id) FILTER (WHERE item.included_in_context = true)::int AS context_item_count
      FROM common.cm_ai_retrieval_log_m log
      LEFT JOIN common.cm_ai_retrieval_log_item_m item
        ON item.ai_retrieval_log_id = log.ai_retrieval_log_id
      WHERE log.ai_retrieval_log_id = $1
      GROUP BY log.ai_retrieval_log_id, log.source_app_code, log.query_text, log.result_count, log.context_count
      `,
      retrievalLogId,
    );
    const audit = firstRow(retrievalAuditRows, 'common.cm_ai_retrieval_log_m retrievalLogId audit');
    if (audit.source_app_code !== 'dms') {
      throw new Error(`Expected retrieval log source_app_code dms, got ${String(audit.source_app_code)}`);
    }
    if (audit.query_text !== options.query) {
      throw new Error(`Expected retrieval log query_text ${options.query}, got ${String(audit.query_text)}`);
    }
    const resultCount = Number(audit.result_count);
    const itemCount = Number(audit.item_count);
    if (resultCount !== itemCount) {
      throw new Error(`Expected retrieval log item count ${resultCount}, got ${itemCount}`);
    }
    if (Array.isArray(retrieval.contextItems) && retrieval.contextItems.length > 0) {
      const contextCount = Number(audit.context_count);
      const contextItemCount = Number(audit.context_item_count);
      if (contextCount !== retrieval.contextItems.length || contextItemCount < 1) {
        throw new Error(
          `Expected retrieval log context item audit for ${retrieval.contextItems.length} context items, `
          + `got context_count=${contextCount}, context_item_count=${contextItemCount}`,
        );
      }
    }
    return {
      retrievalLogId: retrieval.retrievalLogId,
      sourceApp: audit.source_app_code,
      queryText: audit.query_text,
      resultCount,
      contextCount: Number(audit.context_count),
      itemCount,
      contextItemCount: Number(audit.context_item_count),
    };
  }

  const retrievalLogRows = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*)::int AS log_count
      FROM common.cm_ai_retrieval_log_m
     WHERE source_app_code = 'dms'
       AND query_text = $1
    `,
    options.query,
  );
  const retrievalLogCount = Number(firstRow(retrievalLogRows, 'common.cm_ai_retrieval_log_m count').log_count);
  if (retrievalLogCount < 1) {
    throw new Error('Expected at least one retrieval log row for the smoke query.');
  }

  return {
    retrievalLogId: undefined,
    queryText: options.query,
    logCount: retrievalLogCount,
  };
}

async function verifyAskAuditRows(askStatus, smokeStartedAt, requireRunSource) {
  const runRows = await prisma.$queryRawUnsafe(
    `
    SELECT
      COUNT(DISTINCT run.ai_run_id)::int AS run_count,
      COUNT(source.ai_run_source_id)::int AS run_source_count,
      COUNT(source.ai_run_source_id) FILTER (WHERE source.included_in_prompt = true)::int AS prompt_source_count
      FROM common.cm_ai_run_m run
      JOIN common.cm_ai_conversation_m conversation
        ON conversation.ai_conversation_id = run.ai_conversation_id
      LEFT JOIN common.cm_ai_run_source_r source
        ON source.ai_run_id = run.ai_run_id
     WHERE conversation.source_app_code = 'dms'
       AND run.created_at >= $1
    `,
    smokeStartedAt,
  );
  const runAudit = firstRow(runRows, 'common.cm_ai_run_m count');
  const runCount = Number(runAudit.run_count);
  if (askStatus < 500 && runCount < 1) {
    throw new Error('Expected at least one DMS Ask run audit row for the smoke request.');
  }
  if (askStatus < 500 && requireRunSource) {
    const runSourceCount = Number(runAudit.run_source_count);
    const promptSourceCount = Number(runAudit.prompt_source_count);
    if (runSourceCount < 1 || promptSourceCount < 1) {
      throw new Error(
        `Provider ready mode expected DMS Ask run-source audit rows, `
        + `got run_source_count=${runSourceCount}, prompt_source_count=${promptSourceCount}`,
      );
    }
  }

  return {
    askStatus,
    requireRunSource,
    runCount,
    runSourceCount: Number(runAudit.run_source_count),
    promptSourceCount: Number(runAudit.prompt_source_count),
  };
}

function assertDmsSourceStatus(data, providerMode) {
  const rows = Array.isArray(data) ? data : [];
  const dms = rows.find((row) => row?.sourceApp === 'dms');
  if (!dms) {
    throw new Error('/ai-index/status did not return DMS source status.');
  }

  const expected = providerMode === 'ready';
  assertBooleanEquals(dms.semanticSearchEnabled, expected, 'status.semanticSearchEnabled');
  assertBooleanEquals(dms.vectorSearchEnabled, expected, 'status.vectorSearchEnabled');
  assertBooleanEquals(dms.ragContextEnabled, expected, 'status.ragContextEnabled');
  return dms;
}

function assertPlannedSourceCoverage(data, providerMode) {
  const rows = Array.isArray(data) ? data : [];
  const statusBySource = new Map(rows.map((row) => [row?.sourceApp, row]));

  for (const sourceApp of PLANNED_SOURCE_APPS) {
    if (!statusBySource.has(sourceApp)) {
      throw new Error(`/ai-index/status did not return planned source ${sourceApp}.`);
    }
  }

  for (const sourceApp of REGISTERED_SOURCE_APPS) {
    const status = statusBySource.get(sourceApp);
    assertRegisteredSourceCapabilities(status, sourceApp, providerMode);
  }
  assertDmsSourceStatus([statusBySource.get('dms')], providerMode);

  for (const sourceApp of MISSING_ADAPTER_SOURCE_APPS) {
    const status = statusBySource.get(sourceApp);
    if (status.registered !== false || status.registrationStatus !== 'missing_adapter') {
      throw new Error(
        `/ai-index/status expected ${sourceApp} to be missing_adapter, got ${JSON.stringify({
          registered: status.registered,
          registrationStatus: status.registrationStatus,
        })}`,
      );
    }
    assertBooleanEquals(status.indexingEnabled, false, `${sourceApp}.indexingEnabled`);
    assertBooleanEquals(status.semanticSearchEnabled, false, `${sourceApp}.semanticSearchEnabled`);
    assertBooleanEquals(status.vectorSearchEnabled, false, `${sourceApp}.vectorSearchEnabled`);
    assertBooleanEquals(status.ragContextEnabled, false, `${sourceApp}.ragContextEnabled`);
  }

  return {
    totalCount: PLANNED_SOURCE_APPS.length,
    sourceApps: [...PLANNED_SOURCE_APPS],
    registered: [...REGISTERED_SOURCE_APPS],
    missingAdapters: [...MISSING_ADAPTER_SOURCE_APPS],
    statuses: PLANNED_SOURCE_APPS.map((sourceApp) => summarizeSourceCoverageStatus(statusBySource.get(sourceApp))),
  };
}

function assertRegisteredSourceCapabilities(status, sourceApp, providerMode) {
  if (status.registered !== true || status.registrationStatus !== 'registered') {
    throw new Error(
      `/ai-index/status expected ${sourceApp} to be registered, got ${JSON.stringify({
        registered: status.registered,
        registrationStatus: status.registrationStatus,
      })}`,
    );
  }
  assertBooleanEquals(status.indexingEnabled, true, `${sourceApp}.indexingEnabled`);
  assertBooleanEquals(status.keywordSearchEnabled, true, `${sourceApp}.keywordSearchEnabled`);
  assertBooleanEquals(status.metadataSearchEnabled, true, `${sourceApp}.metadataSearchEnabled`);
  assertBooleanEquals(status.semanticSearchEnabled, providerMode === 'ready', `${sourceApp}.semanticSearchEnabled`);
  assertBooleanEquals(status.vectorSearchEnabled, providerMode === 'ready', `${sourceApp}.vectorSearchEnabled`);
  assertBooleanEquals(status.ragContextEnabled, providerMode === 'ready', `${sourceApp}.ragContextEnabled`);
}

function summarizeSourceCoverageStatus(status) {
  return {
    sourceApp: status.sourceApp,
    label: status.label,
    registered: status.registered === true,
    registrationStatus: status.registrationStatus,
    sourceKind: status.sourceKind,
    semanticSearchEnabled: status.semanticSearchEnabled === true,
    vectorSearchEnabled: status.vectorSearchEnabled === true,
    ragContextEnabled: status.ragContextEnabled === true,
    objectCount: Number.isFinite(Number(status.objectCount)) ? Number(status.objectCount) : undefined,
  };
}

async function login(options) {
  const { response, data } = await requestJson(`${options.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ssoo-app': 'dms',
    },
    body: JSON.stringify({
      loginId: options.loginId,
      password: options.password,
    }),
  });

  assertStatus(response, 200, '/auth/login', data);
  const accessToken = data?.data?.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('/auth/login response did not include data.accessToken.');
  }
  return accessToken;
}

async function fetchSuccessData(url, headers, expectedStatuses, label, options = {}) {
  const { response, data } = await requestJson(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });
  assertStatusOneOf(response, expectedStatuses, label, data);
  assertSuccessEnvelope(data, label);
  return data.data;
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { response, data };
}

function authHeaders(accessToken, extraHeaders = undefined) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(extraHeaders ?? {}),
  };
}

function assertSuccessEnvelope(data, label) {
  if (!data || typeof data !== 'object' || data.success !== true || !('data' in data)) {
    throw new Error(`${label} response is not a success envelope: ${JSON.stringify(data)}`);
  }
}

function assertStatus(response, expectedStatus, label, data = undefined) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned ${response.status}, expected ${expectedStatus}${formatResponseBody(data)}`);
  }
}

function assertStatusOneOf(response, expectedStatuses, label, data = undefined) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${label} returned ${response.status}, expected one of ${expectedStatuses.join(', ')}${formatResponseBody(data)}`,
    );
  }
}

function formatResponseBody(data) {
  if (data === undefined || data === null) return '';
  const serialized = JSON.stringify(data);
  return `: ${serialized.length > 1000 ? `${serialized.slice(0, 1000)}...` : serialized}`;
}

function assertBooleanEquals(value, expected, label) {
  if (value !== expected) {
    throw new Error(`${label} expected ${String(expected)}, got ${String(value)}`);
  }
}

function firstRow(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Missing row: ${label}`);
  }
  return rows[0];
}

function parseBigIntId(value, label) {
  const normalized = typeof value === 'bigint' ? value.toString() : String(value);
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a numeric id, got ${normalized}`);
  }
  return BigInt(normalized);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] || fallback;
}

function readBooleanOption(name, envName, fallback) {
  if (argv.includes(`--${name}`)) {
    return true;
  }

  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  const rawValue = argument ? argument.slice(prefix.length) : process.env[envName];
  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`${envName} / --${name} must be true or false, got ${rawValue}`);
}

function validateConfig(options) {
  if (!['unavailable', 'ready'].includes(options.providerMode)) {
    throw new Error(`AI_RAG_SMOKE_PROVIDER_MODE must be unavailable or ready, got ${options.providerMode}`);
  }
  if (!options.baseUrl.startsWith('http://') && !options.baseUrl.startsWith('https://')) {
    throw new Error(`AI_RAG_SMOKE_BASE_URL must be an absolute http(s) URL, got ${options.baseUrl}`);
  }
  if (!options.dmsPath.endsWith('.md')) {
    throw new Error(`AI_RAG_SMOKE_DMS_PATH must be a markdown path, got ${options.dmsPath}`);
  }
}

function getProviderEnvStatus() {
  const endpoint = pickString(process.env.AZURE_OPENAI_ENDPOINT);
  const embeddingDeployment = pickString(process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
  const chatDeployment = pickString(process.env.AZURE_OPENAI_CHAT_DEPLOYMENT)
    ?? pickString(process.env.AZURE_OPENAI_DEPLOYMENT)
    ?? 'gpt-4o-mini';
  const apiKey = pickString(process.env.AZURE_OPENAI_API_KEY);
  const hasEntraCredential = Boolean(
    pickString(process.env.AZURE_TENANT_ID)
      && pickString(process.env.AZURE_CLIENT_ID)
      && pickString(process.env.AZURE_CLIENT_SECRET),
  );
  const managedIdentitySetting = readOptionalBooleanEnv('AZURE_USE_MANAGED_IDENTITY');
  const managedIdentityEnabled = managedIdentitySetting.value === true;

  const missing = [];
  const placeholders = [];
  const invalid = [];

  if (managedIdentitySetting.invalid) {
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
  } else if (managedIdentityEnabled) {
    credentialMode = 'managed-identity';
  } else {
    missing.push('AZURE_OPENAI_API_KEY or Entra credential or explicit AZURE_USE_MANAGED_IDENTITY=true');
  }

  return {
    ready: missing.length === 0 && placeholders.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    invalid,
    credentialMode,
    endpointConfigured: Boolean(endpoint),
    embeddingDeploymentConfigured: Boolean(embeddingDeployment),
    chatDeploymentConfigured: Boolean(chatDeployment),
  };
}

function assertProviderReadyEnv(status) {
  if (status.ready) {
    return;
  }

  const details = [
    status.missing.length > 0 ? `missing=${status.missing.join(', ')}` : undefined,
    status.placeholders.length > 0 ? `placeholders=${status.placeholders.join(', ')}` : undefined,
    status.invalid.length > 0 ? `invalid=${status.invalid.join(', ')}` : undefined,
  ].filter(Boolean).join('; ');

  throw new Error(
    `Provider-ready smoke requires Azure OpenAI embedding environment. ${details}. `
    + 'Set AI_RAG_SMOKE_CHECK_PROVIDER_ENV=false only when the smoke runner environment intentionally differs from the server environment.',
  );
}

function failConfig(error) {
  console.error(`✗ AI/RAG runtime smoke configuration invalid: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

function looksLikeJwtToken(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
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

function maskDatabaseUrl(value) {
  if (!value) return '(unset)';
  return value.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:ai-rag-runtime -- [options]

Options:
  --dry-run
  --base-url=<url>          Default: AI_RAG_SMOKE_BASE_URL or http://localhost:4000/api
  --login-id=<id>           Default: AI_RAG_SMOKE_LOGIN_ID or admin
  --password=<password>     Default: AI_RAG_SMOKE_PASSWORD or admin123!
  --dms-path=<path.md>      Default: AI_RAG_SMOKE_DMS_PATH or a unique verify-ai-rag/runtime-smoke-*.md path
  --query=<text>            Default: AI_RAG_SMOKE_QUERY or "AI RAG runtime smoke needle"
  --report-path=<path.json>  Default: AI_RAG_SMOKE_REPORT_PATH or no report file
  --provider-mode=<mode>    unavailable | ready. Default: AI_RAG_SMOKE_PROVIDER_MODE or unavailable
  --check-provider-env[=bool]
                            In ready mode, validate AZURE_OPENAI_* env before runtime calls.
                            Default: true for ready live runs, false for dry-runs.
`);
}
