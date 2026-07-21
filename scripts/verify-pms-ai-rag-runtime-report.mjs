#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTITY_TYPES = ['project', 'task', 'projectMember', 'projectStatus'];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  printTemplate: argv.includes('--template'),
  printSummary: argv.includes('--summary'),
  reportPath: pickString(readOption('path', 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', ''))
    ?? pickString(process.env.PMS_AI_RAG_REPORT_PATH),
  summaryPath: pickString(readOption('summary-path', 'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH', '')),
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
      console.log('✓ PMS AI/RAG provider-ready runtime report self-test passed');
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
    console.log('✓ PMS AI/RAG provider-ready runtime report verification passed');
  } catch (error) {
    console.error(`✗ PMS AI/RAG provider-ready runtime report verification failed: ${formatError(error)}`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`Usage: pnpm verify:pms-ai-rag-runtime-report [options]

Verifies that a PMS AI/RAG runtime evidence JSON report proves provider-ready vector/RAG behavior.

Options:
  --path=<file>          Provider-ready PMS AI/RAG runtime report JSON path.
  --summary-path=<file>  Optional Markdown summary output path.
  --summary             Print the Markdown summary to stdout after verification.
  --template            Print a fill-in JSON template.
  --self-test           Run verifier self-tests.
  --help                Show this message.

Environment:
  PMS_AI_RAG_PROVIDER_READY_REPORT_PATH  Primary report path.
  PMS_AI_RAG_REPORT_PATH                 Backward-compatible report path.
  PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH Optional Markdown summary path.`);
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('PMS_AI_RAG_PROVIDER_READY_REPORT_PATH, PMS_AI_RAG_REPORT_PATH, or --path=<path.json> is required.');
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

export function validateReport(report) {
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

  return evidence;
}

function validateEntity(entity, entityType) {
  assertObject(entity, entityType);
  assertNonEmptyString(entity.query, `${entityType}.query`);

  if (entityType === 'project') {
    assertNumericIdString(entity.id, 'project.id');
    assertNonEmptyString(entity.name, 'project.name');
    return;
  }

  if (entityType === 'task') {
    assertNumericIdString(entity.id, 'task.id');
    assertNumericIdString(entity.projectId, 'task.projectId');
    assertNonEmptyString(entity.name, 'task.name');
    return;
  }

  if (entityType === 'projectMember') {
    assertCompoundIdString(entity.id, 'projectMember.id');
    assertNumericIdString(entity.projectId, 'projectMember.projectId');
    assertNumericIdString(entity.userId, 'projectMember.userId');
    assertNonEmptyString(entity.roleCode, 'projectMember.roleCode');
    assertNonEmptyString(entity.name, 'projectMember.name');
    return;
  }

  assertEquals(entityType, 'projectStatus', 'entityType');
  assertCompoundIdString(entity.id, 'projectStatus.id');
  assertNumericIdString(entity.projectId, 'projectStatus.projectId');
  assertNonEmptyString(entity.statusCode, 'projectStatus.statusCode');
}

function validateSourceStatus(status, label) {
  assertObject(status, label);
  assertEquals(status.sourceApp, 'pms', `${label}.sourceApp`);
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
  validateBatchBackfill(backfill.project, 'project');
  validateBatchBackfill(backfill.task, 'task');
  validateQueuedBackfill(backfill.projectMember, 'projectMember');
  validateQueuedBackfill(backfill.projectStatus, 'projectStatus');
}

function validateBatchBackfill(backfill, entityType) {
  assertObject(backfill, `backfill.${entityType}`);
  assertEquals(backfill.sourceApp, 'pms', `backfill.${entityType}.sourceApp`);
  assertEquals(backfill.entityType, entityType, `backfill.${entityType}.entityType`);
  assertEquals(backfill.jobType, 'backfill', `backfill.${entityType}.jobType`);
  assertOptionalNumberAtLeast(backfill.selectedCount, 1, `backfill.${entityType}.selectedCount`);
  assertNumberAtLeast(backfill.queuedCount, 1, `backfill.${entityType}.queuedCount`);
  assertNumberEquals(backfill.failedCount, 0, `backfill.${entityType}.failedCount`);
  assertNonEmptyString(backfill.reasonCode, `backfill.${entityType}.reasonCode`);
}

function validateQueuedBackfill(backfill, entityType) {
  assertObject(backfill, `backfill.${entityType}`);
  assertEquals(backfill.sourceApp, 'pms', `backfill.${entityType}.sourceApp`);
  assertEquals(backfill.entityType, entityType, `backfill.${entityType}.entityType`);
  assertCompoundIdString(backfill.entityId, `backfill.${entityType}.entityId`);
  assertEquals(backfill.jobType, 'backfill', `backfill.${entityType}.jobType`);
  assertNumericIdString(backfill.jobId, `backfill.${entityType}.jobId`);
  assertNumberAtLeast(backfill.queuedCount, 1, `backfill.${entityType}.queuedCount`);
  assertNumberEquals(backfill.failedCount, 0, `backfill.${entityType}.failedCount`);
  assertNonEmptyString(backfill.reasonCode, `backfill.${entityType}.reasonCode`);
}

function validateJobRun(jobRun) {
  assertObject(jobRun, 'jobRun');
  assertNumberAtLeast(jobRun.attempts, 1, 'jobRun.attempts');
  if (!Array.isArray(jobRun.runs) || jobRun.runs.length < 1) {
    throw new Error('jobRun.runs must contain at least one run summary.');
  }
  if (!Array.isArray(jobRun.targetJobs) || jobRun.targetJobs.length < ENTITY_TYPES.length) {
    throw new Error(`jobRun.targetJobs must include ${ENTITY_TYPES.length} PMS entity jobs.`);
  }

  for (const entityType of ENTITY_TYPES) {
    const targetJob = jobRun.targetJobs.find((job) => job?.entityType === entityType);
    assertObject(targetJob, `jobRun.targetJobs.${entityType}`);
    assertNumericIdString(targetJob.jobId, `jobRun.targetJobs.${entityType}.jobId`);
    assertNonEmptyString(targetJob.entityId, `jobRun.targetJobs.${entityType}.entityId`);
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
  assertEquals(database.targetPath, '/project/detail', `database.${entityType}.targetPath`);
  assertNumberAtLeast(database.chunkCount, 1, `database.${entityType}.chunkCount`);
  assertNumberAtLeast(database.queryChunkCount, 0, `database.${entityType}.queryChunkCount`);
  assertNumberAtLeast(database.stateChunkCount, 1, `database.${entityType}.stateChunkCount`);
  assertNumberAtLeast(database.indexedChunkCount, database.chunkCount, `database.${entityType}.indexedChunkCount`);
  assertNumberAtLeast(database.embeddingCount, database.chunkCount, `database.${entityType}.embeddingCount`);
  assertEquals(database.aclScope, 'acl', `database.${entityType}.aclScope`);

  const latestJob = database.latestJob;
  assertObject(latestJob, `database.${entityType}.latestJob`);
  assertNumericIdString(latestJob.jobId, `database.${entityType}.latestJob.jobId`);
  assertEquals(latestJob.jobStatusCode, 'indexed', `database.${entityType}.latestJob.jobStatusCode`);
  assertIsoDateString(latestJob.requestedAt, `database.${entityType}.latestJob.requestedAt`);
  assertNonEmptyString(latestJob.reasonCode, `database.${entityType}.latestJob.reasonCode`);

  const retrievalAudit = database.retrievalAudit;
  assertObject(retrievalAudit, `database.${entityType}.retrievalAudit`);
  assertEquals(retrievalAudit.retrievalLogId, retrieval.retrievalLogId, `database.${entityType}.retrievalAudit.retrievalLogId`);
  assertEquals(retrievalAudit.sourceApp, 'pms', `database.${entityType}.retrievalAudit.sourceApp`);
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
    '# PMS AI/RAG Provider-Ready Runtime Evidence',
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
  console.log(`→ wrote PMS AI/RAG provider-ready runtime summary: ${summaryPath}`);
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-pms-ai-rag-report-'));
  const validPath = path.join(tempDir, 'valid-report.json');
  const invalidPath = path.join(tempDir, 'invalid-report.json');
  const summaryPath = path.join(tempDir, 'summary.md');
  try {
    const validReport = createSelfTestReport();
    fs.writeFileSync(validPath, `${JSON.stringify(validReport, null, 2)}\n`, 'utf-8');
    const evidence = validateReport(readReport(validPath));
    writeSummary(summaryPath, formatReportSummary(validReport, evidence));
    const summary = fs.readFileSync(summaryPath, 'utf-8');
    assertIncludes(summary, 'PMS AI/RAG Provider-Ready Runtime Evidence', 'self-test summary title');
    assertIncludes(summary, 'projectMember.retrievalLogId', 'self-test summary projectMember retrieval');

    const invalidReport = {
      ...validReport,
      providerMode: 'unavailable',
    };
    fs.writeFileSync(invalidPath, `${JSON.stringify(invalidReport, null, 2)}\n`, 'utf-8');
    assertThrows(() => validateReport(readReport(invalidPath)), 'providerMode');
    assertThrows(() => validateReport(createTemplateReport()), 'status');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function createTemplateReport() {
  const report = createSelfTestReport();
  return {
    ...report,
    status: 'draft',
    templateNote: 'Replace fixture ids, baseUrl, job, retrieval, database, and audit evidence with a real Azure-backed provider-ready PMS AI/RAG run, then set status to passed.',
    baseUrl: 'https://change-me.example/api',
    project: {
      ...report.project,
      id: 'change-me-project-id',
      name: 'change-me-project-name',
      query: 'change-me-project-query',
    },
    task: {
      ...report.task,
      id: 'change-me-task-id',
      projectId: 'change-me-project-id',
      name: 'change-me-task-name',
      query: 'change-me-task-query',
    },
    projectMember: {
      ...report.projectMember,
      id: 'change-me-project-member-id',
      projectId: 'change-me-project-id',
      userId: 'change-me-user-id',
      roleCode: 'change-me-role-code',
      name: 'change-me-project-member-name',
      query: 'change-me-project-member-query',
    },
    projectStatus: {
      ...report.projectStatus,
      id: 'change-me-project-status-id',
      projectId: 'change-me-project-id',
      statusCode: 'change-me-status-code',
      query: 'change-me-project-status-query',
    },
    backfill: {
      project: {
        ...report.backfill.project,
        reasonCode: 'change-me-project-backfill-reason',
      },
      task: {
        ...report.backfill.task,
        reasonCode: 'change-me-task-backfill-reason',
      },
      projectMember: {
        ...report.backfill.projectMember,
        entityId: 'change-me-project-member-id',
        jobId: 'change-me-project-member-job-id',
        reasonCode: 'change-me-project-member-backfill-reason',
      },
      projectStatus: {
        ...report.backfill.projectStatus,
        entityId: 'change-me-project-status-id',
        jobId: 'change-me-project-status-job-id',
        reasonCode: 'change-me-project-status-backfill-reason',
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
    project: {
      id: '1001',
      name: 'Provider-ready PMS project',
      query: 'PMS project query',
    },
    task: {
      id: '2001',
      projectId: '1001',
      name: 'Provider-ready PMS task',
      query: 'PMS task query',
    },
    projectMember: {
      id: '1001:3001:pm',
      projectId: '1001',
      userId: '3001',
      roleCode: 'pm',
      name: 'Provider-ready PMS member',
      query: 'PMS member query',
    },
    projectStatus: {
      id: '1001:execution',
      projectId: '1001',
      statusCode: 'execution',
      query: 'PMS status query',
    },
    sourceStatus: {
      before: createSourceStatus(),
      after: createSourceStatus({ objectCount: 4 }),
    },
    backfill: {
      project: createBatchBackfill('project', 'pms_provider_ready_evidence_project'),
      task: createBatchBackfill('task', 'pms_provider_ready_evidence_task'),
      projectMember: createQueuedBackfill('projectMember', '1001:3001:pm', '9003', 'pms_provider_ready_evidence_project_member'),
      projectStatus: createQueuedBackfill('projectStatus', '1001:execution', '9004', 'pms_provider_ready_evidence_project_status'),
    },
    jobRun: {
      attempts: 1,
      runs: [{ attempt: 1, shape: 'object', processedCount: 4 }],
      targetJobs: [
        createTargetJob('project', '1001', '9001'),
        createTargetJob('task', '2001', '9002'),
        createTargetJob('projectMember', '1001:3001:pm', '9003'),
        createTargetJob('projectStatus', '1001:execution', '9004'),
      ],
    },
    retrieval: {
      project: createRetrieval('7001'),
      task: createRetrieval('7002'),
      projectMember: createRetrieval('7003'),
      projectStatus: createRetrieval('7004'),
    },
    database: {
      project: createDatabaseEvidence('8001', '7001', 'PMS project query', '9001'),
      task: createDatabaseEvidence('8002', '7002', 'PMS task query', '9002'),
      projectMember: createDatabaseEvidence('8003', '7003', 'PMS member query', '9003'),
      projectStatus: createDatabaseEvidence('8004', '7004', 'PMS status query', '9004'),
    },
  };
}

function createSourceStatus(overrides = {}) {
  return {
    sourceApp: 'pms',
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
      requestedAt: '2026-07-10T00:00:00.000Z',
      finishedAt: '2026-07-10T00:00:30.000Z',
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

function assertOptionalNumberAtLeast(value, minimum, label) {
  if (value === undefined || value === null) {
    return;
  }
  assertNumberAtLeast(value, minimum, label);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function assertNumericIdString(value, label) {
  const normalized = assertNonEmptyString(String(value), label);
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a numeric id string, got ${normalized}`);
  }
  return normalized;
}

function assertCompoundIdString(value, label) {
  const normalized = assertNonEmptyString(String(value), label);
  if (normalized.includes('change-me') || normalized.includes('placeholder')) {
    throw new Error(`${label} must not be a placeholder.`);
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
  const explicit = argv.find((arg) => arg.startsWith(prefix));
  if (explicit) {
    return explicit.slice(prefix.length);
  }
  return process.env[envName] ?? fallback;
}

function escapeMarkdownCell(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isCliEntryPoint() {
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
