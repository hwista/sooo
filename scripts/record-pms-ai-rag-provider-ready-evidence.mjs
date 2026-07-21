#!/usr/bin/env node
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const rootDir = process.cwd();
const argv = process.argv.slice(2);
const entityTypes = ['project', 'task', 'projectMember', 'projectStatus'];
const evidenceStart = '<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START -->';
const evidenceEnd = '<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:END -->';

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  dryRun: argv.includes('--dry-run'),
  reportPath: pickString(readOption(['report', 'report-path'], 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', process.env.PMS_AI_RAG_REPORT_PATH || '')),
  summaryPath: pickString(readOption(['summary', 'summary-path'], 'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH', process.env.PMS_AI_RAG_SUMMARY_PATH || '')),
  evidenceBlockPath: pickString(readOption(['evidence-block-path'], 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', 'output/pms-ai-rag-provider-ready-evidence-ready.md')),
  roadmapPath: pickString(readOption(['roadmap'], 'PMS_AI_RAG_PROVIDER_READY_ROADMAP_PATH', 'docs/pms/planning/roadmap.md')),
  backlogPath: pickString(readOption(['backlog'], 'PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH', 'docs/pms/planning/backlog.md')),
  closeBriefPath: pickString(readOption(['close-brief'], 'PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH', 'docs/pms/planning/current-baseline-close-brief.md')),
  workflowUrl: pickString(readOption(['workflow-url'], 'PMS_AI_RAG_PROVIDER_READY_WORKFLOW_URL', '')),
  recordedAt: pickString(readOption(['recorded-at'], 'PMS_AI_RAG_PROVIDER_READY_RECORDED_AT', new Date().toISOString())),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    assertReplaceBlock();
    assertProviderReadyFlow();
    console.log('[ok] PMS AI/RAG provider-ready evidence recorder self-test passed');
    process.exit(0);
  }

  recordEvidence(config);
} catch (error) {
  console.error(`[error] PMS AI/RAG provider-ready evidence recording failed: ${formatError(error)}`);
  process.exit(1);
}

function recordEvidence(options) {
  validateConfig(options);
  verifyArtifacts(options.reportPath, options.summaryPath);

  const reportText = readPathText(options.reportPath, 'PMS provider-ready report');
  const summaryText = readPathText(options.summaryPath, 'PMS provider-ready summary');
  const report = JSON.parse(reportText);
  const reportDigest = sha256(reportText);
  const summaryDigest = sha256(summaryText);
  const evidenceBlock = buildEvidenceBlock({
    report,
    reportPath: displayPath(options.reportPath),
    reportDigest,
    summaryPath: displayPath(options.summaryPath),
    summaryDigest,
    workflowUrl: options.workflowUrl || '(not supplied)',
    recordedAt: options.recordedAt,
  });

  if (options.evidenceBlockPath) {
    writePathText(options.evidenceBlockPath, `${evidenceBlock.trimEnd()}\n`);
    console.log(`[ok] wrote PMS provider-ready evidence block: ${displayPath(options.evidenceBlockPath)}`);
  }

  const targets = [
    options.roadmapPath,
    options.backlogPath,
    options.closeBriefPath,
  ];
  for (const target of targets) {
    const current = readPathText(target, target);
    const next = replaceEvidenceBlock(current, evidenceBlock, target);
    if (options.dryRun) {
      console.log(`[dry-run] would update ${displayPath(target)}`);
    } else {
      writePathText(target, next);
      console.log(`[ok] updated ${displayPath(target)}`);
    }
  }

  if (options.dryRun) {
    console.log(evidenceBlock);
    return;
  }

  verifyRecordedEvidence({ targets, reportDigest, summaryDigest });
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('PMS provider-ready report is required. Provide --report=<path> or PMS_AI_RAG_PROVIDER_READY_REPORT_PATH.');
  }
  if (!options.summaryPath) {
    throw new Error('PMS provider-ready summary is required. Provide --summary=<path> or PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH.');
  }
  if (!options.roadmapPath || !options.backlogPath || !options.closeBriefPath) {
    throw new Error('PMS provider-ready evidence docs are required.');
  }
}

function verifyArtifacts(reportPath, summaryPath) {
  execFileSync(
    process.execPath,
    [
      'scripts/verify-pms-ai-rag-runtime-report.mjs',
      `--path=${reportPath}`,
      `--summary-path=${summaryPath}`,
    ],
    { cwd: rootDir, stdio: 'inherit' },
  );
}

function buildEvidenceBlock(options) {
  const rows = entityTypes.map((entityType) => {
    const entity = options.report[entityType] ?? {};
    const retrieval = options.report.retrieval?.[entityType] ?? {};
    const database = options.report.database?.[entityType] ?? {};
    return `- ${entityType}: id=\`${String(entity.id ?? '(unknown)')}\`, retrievalLog=\`${String(retrieval.retrievalLogId ?? '(unknown)')}\`, object=\`${String(database.objectId ?? '(unknown)')}\`, chunks=\`${String(database.chunkCount ?? '(unknown)')}\`, embeddings=\`${String(database.embeddingCount ?? '(unknown)')}\`, ragReady=\`${String(retrieval.ragReady)}\``;
  });

  const sourceStatus = options.report.sourceStatus?.after ?? {};
  const targetJobCount = Array.isArray(options.report.jobRun?.targetJobs)
    ? options.report.jobRun.targetJobs.length
    : '(unknown)';

  return [
    evidenceStart,
    'Provider-ready evidence status: recorded',
    '',
    `- Recorded at: \`${options.recordedAt}\``,
    `- Workflow: ${options.workflowUrl}`,
    `- Report: \`${options.reportPath}\``,
    `- Report SHA256: \`${options.reportDigest}\``,
    `- Summary: \`${options.summaryPath}\``,
    `- Summary SHA256: \`${options.summaryDigest}\``,
    '- Provider mode: `ready`',
    `- Base URL: \`${String(options.report.baseUrl ?? '(unknown)')}\``,
    `- Source status: registered=\`${String(sourceStatus.registered)}\`, vector=\`${String(sourceStatus.vectorSearchEnabled)}\`, ragContext=\`${String(sourceStatus.ragContextEnabled)}\``,
    `- Job run: attempts=\`${String(options.report.jobRun?.attempts ?? '(unknown)')}\`, targetJobs=\`${String(targetJobCount)}\``,
    ...rows,
    evidenceEnd,
  ].join('\n');
}

function replaceEvidenceBlock(content, block, label) {
  const startIndex = content.indexOf(evidenceStart);
  const endIndex = content.indexOf(evidenceEnd);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`${label} must contain PMS provider-ready evidence markers.`);
  }

  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex + evidenceEnd.length);
  return `${before}${block}${after}`;
}

function verifyRecordedEvidence(options) {
  for (const target of options.targets) {
    const content = readPathText(target, target);
    for (const pattern of [
      'Provider-ready evidence status: recorded',
      `Report SHA256: \`${options.reportDigest}\``,
      `Summary SHA256: \`${options.summaryDigest}\``,
      'Provider mode: `ready`',
      'projectMember:',
      'projectStatus:',
    ]) {
      if (!content.includes(pattern)) {
        throw new Error(`${target} missing recorded PMS provider-ready evidence pattern: ${pattern}`);
      }
    }
  }
}

function assertReplaceBlock() {
  const current = [
    'before',
    evidenceStart,
    'Provider-ready evidence status: pending',
    evidenceEnd,
    'after',
  ].join('\n');
  const block = [evidenceStart, 'Provider-ready evidence status: recorded', evidenceEnd].join('\n');
  const next = replaceEvidenceBlock(current, block, 'self-test');
  if (!next.includes('before') || !next.includes('after') || !next.includes('recorded') || next.includes('pending')) {
    throw new Error('replaceEvidenceBlock self-test failed.');
  }
}

function assertProviderReadyFlow() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-pms-ai-rag-ready-flow-'));
  const reportPath = path.join(tempDir, 'pms-ready-report.json');
  const summaryPath = path.join(tempDir, 'pms-ready-summary.md');
  const evidenceBlockPath = path.join(tempDir, 'pms-ready-evidence.md');
  const roadmapPath = path.join(tempDir, 'roadmap.md');
  const backlogPath = path.join(tempDir, 'backlog.md');
  const closeBriefPath = path.join(tempDir, 'close-brief.md');

  try {
    writePathText(reportPath, `${JSON.stringify(createSelfTestReport(), null, 2)}\n`);
    for (const target of [roadmapPath, backlogPath, closeBriefPath]) {
      writePathText(target, createSelfTestEvidenceDoc());
    }

    recordEvidence({
      reportPath,
      summaryPath,
      evidenceBlockPath,
      roadmapPath,
      backlogPath,
      closeBriefPath,
      workflowUrl: 'https://example.invalid/actions/runs/pms-self-test',
      recordedAt: '2026-07-13T00:00:00.000Z',
      dryRun: false,
    });

    const evidence = readPathText(evidenceBlockPath, 'self-test PMS provider-ready evidence block');
    for (const pattern of [
      'Provider-ready evidence status: recorded',
      'Report SHA256:',
      'Summary SHA256:',
      'Provider mode: `ready`',
      'projectMember:',
      'projectStatus:',
      'ragReady=`true`',
    ]) {
      if (!evidence.includes(pattern)) {
        throw new Error(`PMS provider-ready flow self-test missing ${pattern}`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createSelfTestEvidenceDoc() {
  return [
    '# self-test',
    '',
    evidenceStart,
    'Provider-ready evidence status: pending',
    '',
    '- Current blocking item: no verified Azure-backed PMS provider-ready runtime report artifact has been recorded.',
    evidenceEnd,
    '',
  ].join('\n');
}

function createSelfTestReport() {
  const startedAt = '2026-07-13T00:00:00.000Z';
  const finishedAt = '2026-07-13T00:01:00.000Z';
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

function readPathText(inputPath, label) {
  const absolutePath = resolveInputPath(inputPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing ${label}: ${inputPath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function writePathText(inputPath, text) {
  const absolutePath = resolveInputPath(inputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, 'utf-8');
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(rootDir, inputPath);
}

function displayPath(inputPath) {
  const absolutePath = resolveInputPath(inputPath);
  const relativePath = path.relative(rootDir, absolutePath);
  return relativePath && !relativePath.startsWith('..') ? relativePath : absolutePath;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function readOption(names, envName, fallback) {
  for (const name of names) {
    const prefix = `--${name}=`;
    const argument = argv.find((entry) => entry.startsWith(prefix));
    if (argument) {
      return argument.slice(prefix.length);
    }
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

function printUsage() {
  console.log(`Usage: pnpm run record:pms-ai-rag-provider-ready-evidence -- [options]

Verifies and records a passed PMS provider-ready AI/RAG runtime report.

Options:
  --report=<path.json>             PMS provider-ready runtime JSON report.
  --summary=<path.md>              PMS provider-ready Markdown summary.
  --evidence-block-path=<path.md>  Evidence block artifact output.
  --roadmap=<path.md>              PMS roadmap evidence doc target.
  --backlog=<path.md>              PMS backlog evidence doc target.
  --close-brief=<path.md>          PMS current baseline close brief evidence doc target.
  --workflow-url=<url>             Optional workflow run URL to record.
  --dry-run                        Write/print the block artifact without changing PMS docs.
  --self-test                      Run recorder self-tests.
  --help                           Show this message.

Environment:
  PMS_AI_RAG_PROVIDER_READY_REPORT_PATH
  PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH
  PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH
  PMS_AI_RAG_PROVIDER_READY_ROADMAP_PATH
  PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH
  PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH`);
}
