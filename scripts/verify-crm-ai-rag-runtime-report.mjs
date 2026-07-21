#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTITY_TYPES = ['opportunity', 'customer', 'activity'];
const SYNTHETIC_EVIDENCE_MARKERS = [
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

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  printTemplate: argv.includes('--template'),
  printSummary: argv.includes('--summary'),
  reportPath: pickString(readOption('path', 'CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', ''))
    ?? pickString(process.env.CRM_AI_RAG_REPORT_PATH),
  summaryPath: pickString(readOption('summary-path', 'CRM_AI_RAG_PROVIDER_READY_SUMMARY_PATH', '')),
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
      console.log('✓ CRM AI/RAG provider-ready runtime report self-test passed');
      process.exit(0);
    }

    validateConfig(config);
    const report = readReport(config.reportPath);
    const evidence = validateReport(report);
    const summary = formatReportSummary(report, evidence);
    writeSummary(config.summaryPath, summary);
    if (config.printSummary) {
      console.log(summary);
    }
    console.log('✓ CRM AI/RAG provider-ready runtime report verification passed');
  } catch (error) {
    console.error(`✗ CRM AI/RAG provider-ready runtime report verification failed: ${formatError(error)}`);
    process.exit(1);
  }
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('CRM_AI_RAG_PROVIDER_READY_REPORT_PATH, CRM_AI_RAG_REPORT_PATH, or --path=<path.json> is required.');
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
  assertEquals(report.providerMode, 'ready', 'providerMode');
  assertIsoDateString(report.startedAt, 'startedAt');
  assertIsoDateString(report.finishedAt, 'finishedAt');
  assertNumberAtLeast(report.durationMs, 0, 'durationMs');
  assertHttpUrl(report.baseUrl, 'baseUrl');
  assertNotPlaceholder(report.baseUrl, 'baseUrl');

  validateSourceStatus(report.sourceStatus?.before, 'sourceStatus.before');
  validateSourceStatus(report.sourceStatus?.after, 'sourceStatus.after');
  validateBackfill(report.backfill);
  validateJobRun(report.jobRun);

  const evidence = {};
  for (const entityType of ENTITY_TYPES) {
    const entity = report[entityType];
    validateEntity(entity, entityType);
    const retrieval = validateRetrieval(report.retrieval?.[entityType], entityType);
    const database = validateDatabase(report.database?.[entityType], entity, entityType, retrieval);
    evidence[entityType] = {
      id: entity.id,
      query: entity.query,
      retrievalLogId: retrieval.retrievalLogId,
      objectId: database.objectId,
      chunkCount: database.chunkCount,
      embeddingCount: database.embeddingCount,
      indexStatusCode: database.indexStatusCode,
    };
  }

  assertNotSyntheticEvidence(report, options);
  return evidence;
}

function validateEntity(entity, entityType) {
  assertObject(entity, entityType);
  assertNumericIdString(entity.id, `${entityType}.id`);
  assertNonEmptyString(entity.query, `${entityType}.query`);
  if (entityType !== 'activity') {
    assertNonEmptyString(entity.code, `${entityType}.code`);
    assertNonEmptyString(entity.name, `${entityType}.name`);
    return;
  }
  assertNumericIdString(entity.customerId, 'activity.customerId');
  assertNonEmptyString(entity.subject, 'activity.subject');
}

function validateSourceStatus(status, label) {
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

function validateBackfill(backfill) {
  assertObject(backfill, 'backfill');

  const opportunity = backfill.opportunity;
  assertObject(opportunity, 'backfill.opportunity');
  assertEquals(opportunity.sourceApp, 'crm', 'backfill.opportunity.sourceApp');
  assertEquals(opportunity.entityType, 'opportunity', 'backfill.opportunity.entityType');
  assertEquals(opportunity.jobType, 'backfill', 'backfill.opportunity.jobType');
  assertNumericIdString(opportunity.entityId, 'backfill.opportunity.entityId');
  assertNumericIdString(opportunity.jobId, 'backfill.opportunity.jobId');
  assertNumberAtLeast(opportunity.queuedCount, 1, 'backfill.opportunity.queuedCount');
  assertNumberEquals(opportunity.failedCount, 0, 'backfill.opportunity.failedCount');
  assertNonEmptyString(opportunity.reasonCode, 'backfill.opportunity.reasonCode');

  const customerActivity = backfill.customerActivity;
  assertObject(customerActivity, 'backfill.customerActivity');
  assertEquals(customerActivity.sourceApp, 'crm', 'backfill.customerActivity.sourceApp');
  assertEquals(customerActivity.jobType, 'backfill', 'backfill.customerActivity.jobType');
  assertStringArrayIncludes(customerActivity.entityTypes, 'customer', 'backfill.customerActivity.entityTypes');
  assertStringArrayIncludes(customerActivity.entityTypes, 'activity', 'backfill.customerActivity.entityTypes');
  assertNumberAtLeast(customerActivity.selectedCustomerCount, 1, 'backfill.customerActivity.selectedCustomerCount');
  assertNumberAtLeast(customerActivity.selectedActivityCount, 1, 'backfill.customerActivity.selectedActivityCount');
  assertNumberAtLeast(customerActivity.queuedCount, 2, 'backfill.customerActivity.queuedCount');
  assertNumberEquals(customerActivity.failedCount, 0, 'backfill.customerActivity.failedCount');
  assertNonEmptyString(customerActivity.reasonCode, 'backfill.customerActivity.reasonCode');
}

function validateJobRun(jobRun) {
  assertObject(jobRun, 'jobRun');
  assertNumberAtLeast(jobRun.attempts, 1, 'jobRun.attempts');
  if (!Array.isArray(jobRun.runs) || jobRun.runs.length < 1) {
    throw new Error('jobRun.runs must contain at least one run summary.');
  }
  if (!Array.isArray(jobRun.targetJobs) || jobRun.targetJobs.length < ENTITY_TYPES.length) {
    throw new Error(`jobRun.targetJobs must include ${ENTITY_TYPES.length} CRM entity jobs.`);
  }

  for (const entityType of ENTITY_TYPES) {
    const targetJob = jobRun.targetJobs.find((job) => job?.entityType === entityType);
    assertObject(targetJob, `jobRun.targetJobs.${entityType}`);
    assertNumericIdString(targetJob.jobId, `jobRun.targetJobs.${entityType}.jobId`);
    assertNumericIdString(targetJob.entityId, `jobRun.targetJobs.${entityType}.entityId`);
    assertEquals(targetJob.jobStatusCode, 'indexed', `jobRun.targetJobs.${entityType}.jobStatusCode`);
  }
}

function validateRetrieval(retrieval, entityType) {
  assertObject(retrieval, `retrieval.${entityType}`);
  assertNumericIdString(retrieval.retrievalLogId, `retrieval.${entityType}.retrievalLogId`);
  assertEquals(retrieval.ragReady, true, `retrieval.${entityType}.ragReady`);
  assertNumberAtLeast(retrieval.resultCount, 1, `retrieval.${entityType}.resultCount`);
  assertNumberAtLeast(retrieval.contextItemCount, 1, `retrieval.${entityType}.contextItemCount`);
  assertNumberAtLeast(retrieval.citationCount, 0, `retrieval.${entityType}.citationCount`);
  if (retrieval.total !== undefined) {
    assertNumberAtLeast(retrieval.total, 1, `retrieval.${entityType}.total`);
  }
  validateRetrievalCapabilities(retrieval.capabilities, `retrieval.${entityType}.capabilities`);
  return retrieval;
}

function validateRetrievalCapabilities(capabilities, label) {
  assertObject(capabilities, label);
  for (const key of ['semantic', 'vector', 'ragContext']) {
    assertEquals(capabilities[key], true, `${label}.${key}`);
  }
}

function validateDatabase(database, entity, entityType, retrieval) {
  assertObject(database, `database.${entityType}`);
  assertNumericIdString(database.objectId, `database.${entityType}.objectId`);
  assertEquals(database.indexStatusCode, 'indexed', `database.${entityType}.indexStatusCode`);
  assertNonEmptyString(database.targetPath, `database.${entityType}.targetPath`);
  assertNotPlaceholder(database.targetPath, `database.${entityType}.targetPath`);
  assertNumberAtLeast(database.chunkCount, 1, `database.${entityType}.chunkCount`);
  assertNumberAtLeast(database.queryChunkCount, 0, `database.${entityType}.queryChunkCount`);
  assertNumberAtLeast(database.stateChunkCount, 1, `database.${entityType}.stateChunkCount`);
  assertNumberAtLeast(database.indexedChunkCount, database.chunkCount, `database.${entityType}.indexedChunkCount`);
  assertNumberAtLeast(database.embeddingCount, database.chunkCount, `database.${entityType}.embeddingCount`);
  assertEquals(database.aclScope, 'policy', `database.${entityType}.aclScope`);

  const latestJob = database.latestJob;
  assertObject(latestJob, `database.${entityType}.latestJob`);
  assertNumericIdString(latestJob.jobId, `database.${entityType}.latestJob.jobId`);
  assertEquals(latestJob.jobStatusCode, 'indexed', `database.${entityType}.latestJob.jobStatusCode`);
  assertIsoDateString(latestJob.requestedAt, `database.${entityType}.latestJob.requestedAt`);
  assertNonEmptyString(latestJob.reasonCode, `database.${entityType}.latestJob.reasonCode`);

  const retrievalAudit = database.retrievalAudit;
  assertObject(retrievalAudit, `database.${entityType}.retrievalAudit`);
  assertEquals(retrievalAudit.retrievalLogId, retrieval.retrievalLogId, `database.${entityType}.retrievalAudit.retrievalLogId`);
  assertEquals(retrievalAudit.sourceApp, 'crm', `database.${entityType}.retrievalAudit.sourceApp`);
  assertEquals(retrievalAudit.queryText, entity.query, `database.${entityType}.retrievalAudit.queryText`);
  assertNumberAtLeast(retrievalAudit.resultCount, 1, `database.${entityType}.retrievalAudit.resultCount`);
  assertNumberAtLeast(retrievalAudit.contextCount, 1, `database.${entityType}.retrievalAudit.contextCount`);
  assertNumberAtLeast(retrievalAudit.itemCount, 1, `database.${entityType}.retrievalAudit.itemCount`);
  assertNumberAtLeast(retrievalAudit.contextItemCount, 1, `database.${entityType}.retrievalAudit.contextItemCount`);
  return database;
}

function formatReportSummary(report, evidence) {
  const rows = [
    ['status', report.status],
    ['providerMode', report.providerMode],
    ['baseUrl', report.baseUrl],
    ['startedAt', report.startedAt],
    ['finishedAt', report.finishedAt],
    ['durationMs', report.durationMs],
    ...ENTITY_TYPES.flatMap((entityType) => {
      const item = evidence[entityType];
      return [
        [`${entityType}.id`, item.id],
        [`${entityType}.query`, item.query],
        [`${entityType}.retrievalLogId`, item.retrievalLogId],
        [`${entityType}.objectId`, item.objectId],
        [`${entityType}.chunk/embedding`, `${item.chunkCount} / ${item.embeddingCount}`],
      ];
    }),
  ];

  return [
    '# CRM AI/RAG Provider-Ready Runtime Evidence',
    '',
    '| Field | Value |',
    '| --- | --- |',
    ...rows.map(([field, value]) => `| ${escapeMarkdownCell(String(field))} | ${escapeMarkdownCell(String(value))} |`),
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
  console.log(`→ wrote CRM AI/RAG provider-ready runtime summary: ${summaryPath}`);
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-ai-rag-report-'));
  const validPath = path.join(tempDir, 'valid-report.json');
  const invalidPath = path.join(tempDir, 'invalid-report.json');
  const summaryPath = path.join(tempDir, 'summary.md');
  try {
    const validReport = createSelfTestReport();
    fs.writeFileSync(validPath, `${JSON.stringify(validReport, null, 2)}\n`, 'utf-8');
    const evidence = validateReport(readReport(validPath), { allowSyntheticEvidence: true });
    writeSummary(summaryPath, formatReportSummary(validReport, evidence));
    const summary = fs.readFileSync(summaryPath, 'utf-8');
    assertIncludes(summary, 'CRM AI/RAG Provider-Ready Runtime Evidence', 'self-test summary title');
    assertIncludes(summary, 'opportunity.retrievalLogId', 'self-test summary opportunity retrieval');

    const invalidReport = {
      ...validReport,
      providerMode: 'unavailable',
    };
    fs.writeFileSync(invalidPath, `${JSON.stringify(invalidReport, null, 2)}\n`, 'utf-8');
    assertThrows(() => validateReport(readReport(invalidPath), { allowSyntheticEvidence: true }), 'providerMode');
    assertThrows(() => validateReport(createTemplateReport()), 'status');
    assertThrows(() => validateReport(validReport), 'synthetic');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function createTemplateReport() {
  const report = createSelfTestReport();
  return {
    ...report,
    status: 'draft',
    templateNote: 'Replace fixture ids, baseUrl, job, retrieval, database, and audit evidence with a real Azure-backed provider-ready CRM AI/RAG run, then set status to passed.',
    baseUrl: 'https://change-me.example/api',
    opportunity: {
      ...report.opportunity,
      id: 'change-me-opportunity-id',
      code: 'change-me-opportunity-code',
      name: 'change-me-opportunity-name',
      query: 'change-me-opportunity-query',
    },
    customer: {
      ...report.customer,
      id: 'change-me-customer-id',
      code: 'change-me-customer-code',
      name: 'change-me-customer-name',
      query: 'change-me-customer-query',
    },
    activity: {
      ...report.activity,
      id: 'change-me-activity-id',
      customerId: 'change-me-customer-id',
      subject: 'change-me-activity-subject',
      query: 'change-me-activity-query',
    },
    backfill: {
      opportunity: {
        ...report.backfill.opportunity,
        entityId: 'change-me-opportunity-id',
        jobId: 'change-me-opportunity-job-id',
        reasonCode: 'change-me-opportunity-backfill-reason',
      },
      customerActivity: {
        ...report.backfill.customerActivity,
        reasonCode: 'change-me-customer-activity-backfill-reason',
      },
    },
    jobRun: {
      ...report.jobRun,
      targetJobs: report.jobRun.targetJobs.map((job) => ({
        ...job,
        jobId: `change-me-${job.entityType}-job-id`,
        entityId: `change-me-${job.entityType}-entity-id`,
      })),
    },
    retrieval: Object.fromEntries(
      ENTITY_TYPES.map((entityType) => [
        entityType,
        {
          ...report.retrieval[entityType],
          retrievalLogId: `change-me-${entityType}-retrieval-log-id`,
        },
      ]),
    ),
    database: Object.fromEntries(
      ENTITY_TYPES.map((entityType) => [
        entityType,
        {
          ...report.database[entityType],
          objectId: `change-me-${entityType}-object-id`,
          targetPath: `change-me://crm-ai-object/${entityType}`,
          latestJob: {
            ...report.database[entityType].latestJob,
            jobId: `change-me-${entityType}-job-id`,
            reasonCode: `change-me-${entityType}-index-reason`,
          },
          retrievalAudit: {
            ...report.database[entityType].retrievalAudit,
            retrievalLogId: `change-me-${entityType}-retrieval-log-id`,
            queryText: `change-me-${entityType}-query`,
          },
        },
      ]),
    ),
  };
}

function createSelfTestReport() {
  const startedAt = '2026-07-10T00:00:00.000Z';
  const finishedAt = '2026-07-10T00:01:00.000Z';
  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt,
    finishedAt,
    durationMs: 60000,
    providerMode: 'ready',
    baseUrl: 'http://127.0.0.1:4000/api',
    opportunity: createEntity('opportunity', '1001', 'CRM-OPP-1001', 'Provider-ready opportunity', 'CRM opportunity query'),
    customer: createEntity('customer', '2001', 'CRM-CUS-2001', 'Provider-ready customer', 'CRM customer query'),
    activity: {
      id: '3001',
      code: 'CRM-ACT-3001',
      customerId: '2001',
      subject: 'Provider-ready activity',
      query: 'CRM activity query',
    },
    sourceStatus: {
      before: createSourceStatus(),
      after: createSourceStatus({ objectCount: 3 }),
    },
    backfill: {
      opportunity: {
        sourceApp: 'crm',
        entityType: 'opportunity',
        entityId: '1001',
        jobType: 'backfill',
        jobId: '9001',
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
      targetJobs: ENTITY_TYPES.map((entityType, index) => ({
        jobId: String(9001 + index),
        entityType,
        entityId: String(1001 + index),
        jobStatusCode: 'indexed',
      })),
    },
    retrieval: {
      opportunity: createRetrieval('7001'),
      customer: createRetrieval('7002'),
      activity: createRetrieval('7003'),
    },
    database: {
      opportunity: createDatabaseEvidence('8001', '7001', 'CRM opportunity query', '9001'),
      customer: createDatabaseEvidence('8002', '7002', 'CRM customer query', '9002'),
      activity: createDatabaseEvidence('8003', '7003', 'CRM activity query', '9003'),
    },
  };
}

function createEntity(entityType, id, code, name, query) {
  return {
    id,
    code,
    name,
    query,
    ...(entityType === 'opportunity' ? {} : {}),
  };
}

function createSourceStatus(overrides = {}) {
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
    ...overrides,
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

function assertNumericIdString(value, label) {
  const normalized = String(assertNonEmptyString(String(value), label));
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a numeric id string, got ${normalized}`);
  }
  return normalized;
}

function assertIsoDateString(value, label) {
  assertNonEmptyString(value, label);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be an ISO date string.`);
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

function assertStringArrayIncludes(value, expected, label) {
  if (!Array.isArray(value) || !value.includes(expected)) {
    throw new Error(`${label} must include ${expected}.`);
  }
}

function assertIncludes(value, pattern, label) {
  if (!value.includes(pattern)) {
    throw new Error(`${label} must include ${pattern}.`);
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
  pnpm run verify:crm-ai-rag-runtime-report -- [options]

Options:
  --path=<path.json>          CRM AI/RAG provider-ready runtime report JSON
  --summary-path=<path.md>    Optional Markdown summary output
  --summary                   Print Markdown summary
  --template                  Print a draft JSON authoring template
  --self-test                 Run local schema validation self-test

Environment:
  CRM_AI_RAG_PROVIDER_READY_REPORT_PATH
  CRM_AI_RAG_REPORT_PATH
  CRM_AI_RAG_PROVIDER_READY_SUMMARY_PATH
`);
}
