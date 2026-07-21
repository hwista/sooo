#!/usr/bin/env node
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const rootDir = process.cwd();
const argv = process.argv.slice(2);
const evidenceStart = '<!-- AI_RAG_PROVIDER_READY_EVIDENCE:START -->';
const evidenceEnd = '<!-- AI_RAG_PROVIDER_READY_EVIDENCE:END -->';

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  dryRun: argv.includes('--dry-run'),
  reportPath: pickString(readOption('report', 'AI_RAG_PROVIDER_READY_REPORT_PATH', '')),
  summaryPath: pickString(readOption('summary', 'AI_RAG_PROVIDER_READY_SUMMARY_PATH', '')),
  evidenceBlockPath: pickString(readOption('evidence-block-path', 'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', '')),
  roadmapPath: pickString(readOption(
    'roadmap',
    'AI_RAG_PROVIDER_READY_ROADMAP_PATH',
    'docs/common/explanation/architecture/ai-rag-platform-roadmap.md',
  )),
  handoffPath: pickString(readOption(
    'handoff',
    'AI_RAG_PROVIDER_READY_HANDOFF_PATH',
    'docs/common/explanation/architecture/ai-rag-platform-handoff.md',
  )),
  workflowUrl: pickString(readOption('workflow-url', 'AI_RAG_PROVIDER_READY_WORKFLOW_URL', '')),
  recordedAt: pickString(readOption('recorded-at', 'AI_RAG_PROVIDER_READY_RECORDED_AT', new Date().toISOString())),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    assertReplaceBlock();
    assertEvidenceBlockWrite();
    assertProviderReadyFlow();
    console.log('[ok] AI/RAG provider-ready evidence recorder self-test passed');
    process.exit(0);
  }

  validateConfig(config);
  verifyArtifacts(config.reportPath, config.summaryPath);

  const reportText = readPathText(config.reportPath, 'provider-ready report');
  const summaryText = readPathText(config.summaryPath, 'provider-ready summary');
  const report = JSON.parse(reportText);
  const evidenceBlock = buildEvidenceBlock({
    report,
    reportPath: displayPath(config.reportPath),
    reportDigest: sha256(reportText),
    summaryPath: displayPath(config.summaryPath),
    summaryDigest: sha256(summaryText),
    workflowUrl: config.workflowUrl || '(not supplied)',
    recordedAt: config.recordedAt,
  });

  if (config.evidenceBlockPath) {
    writePathText(config.evidenceBlockPath, `${evidenceBlock.trimEnd()}\n`);
    console.log(`[ok] wrote provider-ready evidence block: ${displayPath(config.evidenceBlockPath)}`);
  }

  for (const target of [config.roadmapPath, config.handoffPath]) {
    const current = readPathText(resolveInputPath(target), target);
    const next = replaceEvidenceBlock(current, evidenceBlock, target);
    if (config.dryRun) {
      console.log(`[dry-run] would update ${displayPath(target)}`);
    } else {
      writePathText(target, next);
      console.log(`[ok] updated ${displayPath(target)}`);
    }
  }

  if (!config.dryRun) {
    verifyRecordedEvidence(config.reportPath, config.summaryPath, config.roadmapPath, config.handoffPath);
  }

  if (config.dryRun) {
    console.log(evidenceBlock);
  }
} catch (error) {
  console.error(`[error] AI/RAG provider-ready evidence recording failed: ${formatError(error)}`);
  process.exit(1);
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('Provider-ready report is required. Provide --report=<path> or AI_RAG_PROVIDER_READY_REPORT_PATH.');
  }
  if (!options.summaryPath) {
    throw new Error('Provider-ready summary is required. Provide --summary=<path> or AI_RAG_PROVIDER_READY_SUMMARY_PATH.');
  }
  if (!options.recordedAt) {
    throw new Error('recordedAt is required.');
  }
}

function verifyArtifacts(reportPath, summaryPath) {
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

  execFileSync(
    process.execPath,
    [
      'scripts/verify-ai-rag-central-foundation.mjs',
      `--provider-ready-report=${reportPath}`,
      `--provider-ready-summary=${summaryPath}`,
    ],
    { cwd: rootDir, stdio: 'inherit' },
  );
}

function verifyRecordedEvidence(reportPath, summaryPath, roadmapPath, handoffPath) {
  execFileSync(
    process.execPath,
    [
      'scripts/verify-ai-rag-central-foundation.mjs',
      '--require-provider-ready-report',
      `--provider-ready-report=${reportPath}`,
      `--provider-ready-summary=${summaryPath}`,
      `--provider-ready-roadmap=${roadmapPath}`,
      `--provider-ready-handoff=${handoffPath}`,
    ],
    { cwd: rootDir, stdio: 'inherit' },
  );
}

function buildEvidenceBlock(options) {
  const legacyComparison = options.report.database?.legacyCommonComparison ?? {};
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
    `- DMS fixture: \`${options.report.dmsPath ?? '(unknown)'}\``,
    `- Retrieval log: \`${options.report.retrieval?.retrievalLogId ?? '(unknown)'}\``,
    `- RAG ready: \`${String(options.report.retrieval?.ragReady)}\``,
    `- Embeddings active: \`${String(options.report.database?.embeddings?.activeCount ?? '(unknown)')}\``,
    `- Ask run-source audit: runSource=\`${String(options.report.database?.askAudit?.runSourceCount ?? '(unknown)')}\`, promptSource=\`${String(options.report.database?.askAudit?.promptSourceCount ?? '(unknown)')}\``,
    `- Legacy/common comparison: legacyChunks=\`${String(legacyComparison.legacyChunkCount ?? '(unknown)')}\`, commonResults=\`${String(legacyComparison.commonResultCount ?? '(unknown)')}\`, commonContext=\`${String(legacyComparison.commonContextCount ?? '(unknown)')}\`, queryMatched=\`${String(legacyComparison.commonQueryNeedleMatched)}\``,
    evidenceEnd,
  ].join('\n');
}

function replaceEvidenceBlock(content, block, label) {
  const startIndex = content.indexOf(evidenceStart);
  const endIndex = content.indexOf(evidenceEnd);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`${label} must contain provider-ready evidence markers.`);
  }

  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex + evidenceEnd.length);
  return `${before}${block}${after}`;
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

function assertEvidenceBlockWrite() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-ai-rag-evidence-'));
  const outputPath = path.join(tempDir, 'evidence.md');
  try {
    const block = [evidenceStart, 'Provider-ready evidence status: recorded', evidenceEnd].join('\n');
    writePathText(outputPath, `${block}\n`);
    const written = readPathText(outputPath, 'self-test evidence block');
    if (!written.includes('Provider-ready evidence status: recorded')) {
      throw new Error('evidence block write self-test failed.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function assertProviderReadyFlow() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-ai-rag-ready-flow-'));
  const reportPath = path.join(tempDir, 'ready-report.json');
  const summaryPath = path.join(tempDir, 'ready-summary.md');
  const evidenceBlockPath = path.join(tempDir, 'ready-evidence.md');
  const roadmapPath = path.join(tempDir, 'roadmap.md');
  const handoffPath = path.join(tempDir, 'handoff.md');

  try {
    const reportText = `${JSON.stringify(createSelfTestReadyReport(), null, 2)}\n`;
    writePathText(reportPath, reportText);
    verifyArtifacts(reportPath, summaryPath);
    writePathText(roadmapPath, createSelfTestEvidenceDoc('roadmap'));
    writePathText(handoffPath, createSelfTestEvidenceDoc('handoff'));

    const summaryText = readPathText(summaryPath, 'self-test provider-ready summary');
    const report = JSON.parse(reportText);
    const evidenceBlock = buildEvidenceBlock({
      report,
      reportPath,
      reportDigest: sha256(reportText),
      summaryPath,
      summaryDigest: sha256(summaryText),
      workflowUrl: 'https://example.invalid/actions/runs/self-test',
      recordedAt: '2026-07-03T00:00:00.000Z',
    });
    writePathText(evidenceBlockPath, `${evidenceBlock}\n`);

    const written = readPathText(evidenceBlockPath, 'self-test provider-ready evidence block');
    for (const pattern of [
      'Provider-ready evidence status: recorded',
      'Report SHA256:',
      'Summary SHA256:',
      'Provider mode: `ready`',
      'RAG ready: `true`',
      'queryMatched=`true`',
    ]) {
      if (!written.includes(pattern)) {
        throw new Error(`provider-ready flow self-test missing ${pattern}`);
      }
    }

    for (const target of [roadmapPath, handoffPath]) {
      const current = readPathText(target, 'self-test provider-ready evidence doc');
      writePathText(target, replaceEvidenceBlock(current, evidenceBlock, target));
    }
    verifyRecordedEvidence(reportPath, summaryPath, roadmapPath, handoffPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createSelfTestEvidenceDoc(label) {
  return [
    `# Self-test ${label}`,
    '',
    evidenceStart,
    'Provider-ready evidence status: pending',
    evidenceEnd,
    '',
  ].join('\n');
}

function createSelfTestReadyReport() {
  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt: '2026-07-03T00:00:00.000Z',
    finishedAt: '2026-07-03T00:00:01.000Z',
    durationMs: 1000,
    providerMode: 'ready',
    baseUrl: 'http://127.0.0.1:4000/api',
    dmsPath: 'verify-ai-rag/runtime-smoke-self-test.md',
    query: 'AI RAG runtime smoke needle',
    sourceStatus: createSourceCapabilities(true, { sourceApp: 'dms' }),
    sourceCoverage: createSelfTestSourceCoverage(),
    jobRun: { shape: 'object', processedCount: 1 },
    retrieval: {
      retrievalLogId: '1001',
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
    },
    ask: {
      status: 200,
      success: true,
    },
    database: {
      source: createSourceCapabilities(true, { sourceApp: 'dms' }),
      object: {
        objectId: '2001',
        contextEligible: true,
        indexStatusCode: 'indexed',
      },
      chunks: {
        activeCount: 1,
      },
      embeddings: {
        activeCount: 1,
      },
      retrievalAudit: {
        retrievalLogId: '1001',
        sourceApp: 'dms',
        queryText: 'AI RAG runtime smoke needle',
        resultCount: 1,
        contextCount: 1,
        itemCount: 1,
        contextItemCount: 1,
      },
      askAudit: {
        askStatus: 200,
        requireRunSource: true,
        runCount: 1,
        runSourceCount: 1,
        promptSourceCount: 1,
      },
      legacyCommonComparison: {
        legacyChunkCount: 1,
        legacyQueryChunkCount: 1,
        commonResultCount: 1,
        commonContextCount: 1,
        commonQueryNeedleMatched: true,
      },
    },
  };
}

function createSelfTestSourceCoverage() {
  const sourceApps = ['admin', 'crm', 'dms', 'pms', 'sns'];
  const registered = ['crm', 'dms', 'pms', 'sns'];
  const missingAdapters = ['admin'];

  return {
    totalCount: sourceApps.length,
    sourceApps,
    registered,
    missingAdapters,
    statuses: sourceApps.map((sourceApp) => {
      if (registered.includes(sourceApp)) {
        return createSourceCapabilities(true, {
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
        sourceKind: 'system',
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

function readPathText(filePath, label) {
  const absolutePath = resolveInputPath(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing ${label} file: ${filePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function writePathText(filePath, value) {
  const absolutePath = resolveInputPath(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value, 'utf-8');
}

function displayPath(filePath) {
  const absolutePath = resolveInputPath(filePath);
  const relativePath = path.relative(rootDir, absolutePath);
  return relativePath.startsWith('..') ? absolutePath : relativePath.replace(/\\/g, '/');
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(rootDir, inputPath);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

function printUsage() {
  console.log(`
Usage:
  pnpm run record:ai-rag-provider-ready-evidence -- --report=<path.json> --summary=<path.md>

Options:
  --report=<path.json>       Provider-ready runtime smoke JSON artifact.
  --summary=<path.md>        Provider-ready runtime smoke Markdown summary artifact.
  --workflow-url=<url>       Optional workflow run URL to record.
  --evidence-block-path=<md> Optional output path for the generated evidence block.
  --roadmap=<path.md>        Optional roadmap evidence doc target.
  --handoff=<path.md>        Optional handoff evidence doc target.
  --recorded-at=<iso-time>   Optional timestamp override. Defaults to current time.
  --dry-run                  Validate and print the evidence block without writing docs.
  --self-test                Validate recorder block replacement behavior.
  --help                     Show this help.
`);
}
