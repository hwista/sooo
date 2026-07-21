#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_REFLECTED_DOCUMENTS = [
  'docs/crm/README.md',
  'docs/crm/planning/backlog.md',
  'docs/crm/planning/source-migration-prd.md',
];
const SYNTHETIC_EVIDENCE_MARKERS = [
  'self-test',
  'protected CRM source self-test material',
  'text-extraction-self-test',
  'Reflected protected source decision',
];

const argv = process.argv.slice(2);
const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  printTemplate: argv.includes('--template'),
  printSummary: argv.includes('--summary'),
  templateSourcePath: pickString(readOption('template-source-path', 'CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH', '')),
  reportPath: pickString(readOption('path', 'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH', '')),
  summaryPath: pickString(readOption('summary-path', 'CRM_PROTECTED_SOURCE_REFLECTION_SUMMARY_PATH', '')),
};

if (isCliEntryPoint()) {
  try {
    if (config.help) {
      printUsage();
      process.exit(0);
    }

    if (config.printTemplate) {
      console.log(JSON.stringify(createTemplateReport(config.templateSourcePath), null, 2));
      process.exit(0);
    }

    if (config.selfTest) {
      assertSelfTest();
      console.log('✓ CRM protected source reflection report self-test passed');
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
    console.log('✓ CRM protected source reflection report verification passed');
  } catch (error) {
    console.error(`✗ CRM protected source reflection report verification failed: ${formatError(error)}`);
    process.exit(1);
  }
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH or --path=<path.json> is required.');
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
  assertEquals(report.sourceType, 'protected-crm-presentation', 'sourceType');
  assertNonEmptyString(report.sourceFilePath, 'sourceFilePath');
  assertNotPlaceholder(report.sourceFilePath, 'sourceFilePath');
  assertSha256(report.sourceSha256, 'sourceSha256');
  assertIsoDateString(report.unlockedAt, 'unlockedAt');
  assertIsoDateString(report.extractedAt, 'extractedAt');
  assertIsoDateString(report.reflectedAt, 'reflectedAt');
  validateSourceFile(report.sourceFilePath, report.sourceSha256);
  validateExtraction(report.extraction);
  validateCoverage(report.coverage);
  validateDecisions(report.decisions);
  assertNotSyntheticEvidence(report, options);

  return {
    sourceFilePath: report.sourceFilePath,
    sourceSha256: report.sourceSha256,
    reflectedAt: report.reflectedAt,
    reflectedDocumentPaths: report.coverage.reflectedDocumentPaths,
    decisionCount: report.decisions.length,
  };
}

function validateSourceFile(sourceFilePath, expectedSha256) {
  const absolutePath = path.resolve(sourceFilePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing protected source file: ${sourceFilePath}`);
  }

  const digest = crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
  if (digest !== expectedSha256) {
    throw new Error(`sourceSha256 mismatch for ${sourceFilePath}: expected ${expectedSha256}, got ${digest}`);
  }
}

function validateExtraction(extraction) {
  assertObject(extraction, 'extraction');
  assertNonEmptyString(extraction.method, 'extraction.method');
  assertEquals(extraction.textExtracted, true, 'extraction.textExtracted');
  assertNumberAtLeast(extraction.extractedCharacterCount, 1, 'extraction.extractedCharacterCount');

  const slideCount = Number(extraction.slideCount ?? extraction.pageCount);
  if (!Number.isFinite(slideCount) || slideCount < 1) {
    throw new Error('extraction.slideCount or extraction.pageCount must be a number >= 1.');
  }
}

function validateCoverage(coverage) {
  assertObject(coverage, 'coverage');
  assertEquals(coverage.protectedSourceReflected, true, 'coverage.protectedSourceReflected');
  assertNumberEquals(coverage.unresolvedCount, 0, 'coverage.unresolvedCount');
  assertNumberEquals(coverage.unmappedSourceItemCount, 0, 'coverage.unmappedSourceItemCount');

  if (!Array.isArray(coverage.reflectedDocumentPaths)) {
    throw new Error('coverage.reflectedDocumentPaths must be an array.');
  }
  for (const requiredPath of REQUIRED_REFLECTED_DOCUMENTS) {
    if (!coverage.reflectedDocumentPaths.includes(requiredPath)) {
      throw new Error(`coverage.reflectedDocumentPaths must include ${requiredPath}.`);
    }
  }
}

function validateDecisions(decisions) {
  if (!Array.isArray(decisions) || decisions.length < 1) {
    throw new Error('decisions must include at least one protected source reflection decision.');
  }

  const targetedDocs = new Set();
  for (const decision of decisions) {
    assertObject(decision, 'decision');
    assertNonEmptyString(decision.id, 'decision.id');
    assertNonEmptyString(decision.sourceRef, `decision.${decision.id}.sourceRef`);
    assertNonEmptyString(decision.summary, `decision.${decision.id}.summary`);
    if (!['reflected', 'not-applicable'].includes(decision.status)) {
      throw new Error(`decision.${decision.id}.status must be reflected or not-applicable.`);
    }
    if (!Array.isArray(decision.targetPaths) || decision.targetPaths.length < 1) {
      throw new Error(`decision.${decision.id}.targetPaths must contain at least one target path.`);
    }
    for (const targetPath of decision.targetPaths) {
      assertNonEmptyString(targetPath, `decision.${decision.id}.targetPath`);
      targetedDocs.add(targetPath);
    }
    if (decision.status === 'not-applicable') {
      assertNonEmptyString(decision.rationale, `decision.${decision.id}.rationale`);
    }
  }

  for (const requiredPath of REQUIRED_REFLECTED_DOCUMENTS) {
    if (!targetedDocs.has(requiredPath)) {
      throw new Error(`decisions must include a target for ${requiredPath}.`);
    }
  }
}

function formatReportSummary(report, evidence) {
  const decisions = Array.isArray(report.decisions)
    ? report.decisions.map((decision) => `${decision.id}:${decision.status}`).join(', ')
    : '(missing)';

  return [
    '# CRM Protected Source Reflection Evidence',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| status | ${escapeMarkdownCell(String(report.status))} |`,
    `| sourceType | ${escapeMarkdownCell(String(report.sourceType))} |`,
    `| sourceFilePath | ${escapeMarkdownCell(String(evidence.sourceFilePath))} |`,
    `| sourceSha256 | ${escapeMarkdownCell(String(evidence.sourceSha256))} |`,
    `| reflectedAt | ${escapeMarkdownCell(String(evidence.reflectedAt))} |`,
    `| reflectedDocumentPaths | ${escapeMarkdownCell(evidence.reflectedDocumentPaths.join(', '))} |`,
    `| decisionCount | ${escapeMarkdownCell(String(evidence.decisionCount))} |`,
    `| decisions | ${escapeMarkdownCell(decisions)} |`,
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
  console.log(`→ wrote CRM protected source reflection summary: ${summaryPath}`);
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-protected-source-'));
  const sourcePath = path.join(tempDir, 'protected-crm-source.txt');
  const validPath = path.join(tempDir, 'valid-report.json');
  const invalidPath = path.join(tempDir, 'invalid-report.json');
  const summaryPath = path.join(tempDir, 'summary.md');

  try {
    fs.writeFileSync(sourcePath, 'protected CRM source self-test material\n', 'utf-8');
    const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
    const validReport = createSelfTestReport(sourcePath, sourceSha256);
    fs.writeFileSync(validPath, `${JSON.stringify(validReport, null, 2)}\n`, 'utf-8');
    const evidence = validateReport(readReport(validPath), { allowSyntheticEvidence: true });
    writeSummary(summaryPath, formatReportSummary(validReport, evidence));
    const summary = fs.readFileSync(summaryPath, 'utf-8');
    assertIncludes(summary, 'CRM Protected Source Reflection Evidence', 'self-test summary title');
    assertIncludes(summary, 'decisionCount', 'self-test summary decision count');

    const invalidReport = {
      ...validReport,
      coverage: {
        ...validReport.coverage,
        unresolvedCount: 1,
      },
    };
    fs.writeFileSync(invalidPath, `${JSON.stringify(invalidReport, null, 2)}\n`, 'utf-8');
    assertThrows(() => validateReport(readReport(invalidPath), { allowSyntheticEvidence: true }), 'coverage.unresolvedCount');
    assertThrows(() => validateReport(createTemplateReport(sourcePath)), 'status');
    assertThrows(() => validateReport(validReport), 'synthetic');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function createTemplateReport(sourcePath) {
  const resolvedSourcePath = sourcePath ? path.resolve(sourcePath) : 'change-me-unlocked-protected-crm-source-path';
  const sourceExists = sourcePath ? fs.existsSync(resolvedSourcePath) : false;
  const sourceSha256 = sourceExists
    ? crypto.createHash('sha256').update(fs.readFileSync(resolvedSourcePath)).digest('hex')
    : 'change-me-lowercase-sha256';
  const reflectedAt = '2026-07-10T00:00:00.000Z';
  return {
    schemaVersion: 1,
    status: 'draft',
    templateNote: 'Replace draft fields with real protected source extraction and reflection decisions, remove unresolved documentation markers, then set status to passed.',
    sourceType: 'protected-crm-presentation',
    sourceFilePath: resolvedSourcePath,
    sourceSha256,
    unlockedAt: reflectedAt,
    extractedAt: reflectedAt,
    reflectedAt,
    extraction: {
      method: 'change-me-extraction-method',
      textExtracted: false,
      slideCount: 0,
      extractedCharacterCount: 0,
    },
    coverage: {
      protectedSourceReflected: false,
      unresolvedCount: 1,
      unmappedSourceItemCount: 1,
      reflectedDocumentPaths: [...REQUIRED_REFLECTED_DOCUMENTS],
    },
    decisions: REQUIRED_REFLECTED_DOCUMENTS.map((targetPath, index) => ({
      id: `change-me-protected-crm-source-${index + 1}`,
      sourceRef: 'change-me-slide-or-section',
      status: 'reflected',
      summary: `change-me-reflection-summary-for-${targetPath}`,
      targetPaths: [targetPath],
    })),
  };
}

function createSelfTestReport(sourceFilePath, sourceSha256) {
  const reflectedAt = '2026-07-10T00:00:00.000Z';
  return {
    schemaVersion: 1,
    status: 'passed',
    sourceType: 'protected-crm-presentation',
    sourceFilePath,
    sourceSha256,
    unlockedAt: reflectedAt,
    extractedAt: reflectedAt,
    reflectedAt,
    extraction: {
      method: 'text-extraction-self-test',
      textExtracted: true,
      slideCount: 3,
      extractedCharacterCount: 128,
    },
    coverage: {
      protectedSourceReflected: true,
      unresolvedCount: 0,
      unmappedSourceItemCount: 0,
      reflectedDocumentPaths: [...REQUIRED_REFLECTED_DOCUMENTS],
    },
    decisions: REQUIRED_REFLECTED_DOCUMENTS.map((targetPath, index) => ({
      id: `protected-crm-source-${index + 1}`,
      sourceRef: `slide-${index + 1}`,
      status: 'reflected',
      summary: `Reflected protected source decision ${index + 1}.`,
      targetPaths: [targetPath],
    })),
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

function assertIsoDateString(value, label) {
  assertNonEmptyString(value, label);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be an ISO date string.`);
  }
}

function assertSha256(value, label) {
  assertNonEmptyString(value, label);
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hex digest.`);
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
  pnpm run verify:crm-protected-source-reflection-report -- [options]

Options:
  --path=<path.json>          Protected source reflection report JSON
  --summary-path=<path.md>    Optional Markdown summary output
  --summary                   Print Markdown summary
  --template                  Print a draft JSON authoring template
  --template-source-path=<path>
                              Optional protected source file for template SHA-256
  --self-test                 Run local schema validation self-test

Environment:
  CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH
  CRM_PROTECTED_SOURCE_REFLECTION_SUMMARY_PATH
  CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH
`);
}
