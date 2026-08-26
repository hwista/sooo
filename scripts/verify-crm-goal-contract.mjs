#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveCrmSourcePrototypeRoot } from './crm-source-prototype-root.mjs';

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(['--structure-only', '--self-test']);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));
const structureOnly = args.has('--structure-only');
const selfTest = args.has('--self-test');
const failures = [];

const paths = {
  source: 'docs/crm/planning/source-parity-matrix.md',
  uiux: 'docs/crm/planning/source-uiux-parity-spec.md',
  operations: 'docs/crm/planning/launch-operations-prd.md',
  tests: 'docs/crm/planning/launch-operations-test-plan.md',
  handoff: 'docs/crm/planning/launch-operations-handoff.md',
  readme: 'docs/crm/README.md',
  backlog: 'docs/crm/planning/backlog.md',
  migrationPrd: 'docs/crm/planning/source-migration-prd.md',
  verificationContract: 'docs/crm/planning/demo-100-verification-contract.md',
  packageJson: 'package.json',
};

const expectedDdlSha256 = '7371cad44d811b8050ca28daa2fe32bfb8f1fb3b19f391616c7632ea2ea3fbd6';
const expectedPptxSha256 = '8d999ec75464fcb95ed83f55ece359cc8f34a9532c482ce69b649bf73e727fa6';

function fail(message) {
  failures.push(message);
}

function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function readJson(absolutePath, label) {
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`${label} must be valid JSON: ${error.message}`);
    return null;
  }
}

function rangeIds(prefix, first, last, width = 2) {
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const value = String(first + index).padStart(width, '0');
    return `${prefix}-${value}`;
  });
}

function parseTableRows(markdown, idPattern) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trimStart().startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells[0] && idPattern.test(cells[0])) {
      rows.push({ id: cells[0], cells, line });
    }
  }
  return rows;
}

function parseHeadingIds(markdown, prefix) {
  return [...markdown.matchAll(new RegExp(`^### (${prefix}-\\d{2})\\b`, 'gm'))].map((match) => match[1]);
}

function assertExactIds(label, actual, expected) {
  const unique = new Set(actual);
  if (unique.size !== actual.length) {
    fail(`${label} contains duplicate ids: ${actual.filter((id, index) => actual.indexOf(id) !== index).join(', ')}`);
  }
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    fail(`${label} must be exactly ${expected[0]}~${expected.at(-1)} in order; found [${actual.join(', ')}]`);
  }
}

function extractReferences(value) {
  return value.match(/\b(?:IMP|BT|EXT)-\d{2}\b/g) ?? [];
}

function validateReferences(label, mapping, knownIds) {
  for (const reference of extractReferences(mapping)) {
    if (!knownIds.has(reference)) {
      fail(`${label} references unknown id ${reference}`);
    }
  }
}

function includesReference(mapping, prefix) {
  return extractReferences(mapping).some((reference) => reference.startsWith(`${prefix}-`));
}

function isClosedStatus(status) {
  return /^완료(?:\/|$)/.test(status);
}

function percentage(numerator, denominator) {
  return ((numerator / denominator) * 100).toFixed(1);
}

function sha256File(absolutePath) {
  return createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function isRegularFile(absolutePath) {
  try {
    return fs.statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

function listRegularFiles(directory, relativeDirectory = '') {
  const result = [];
  const absoluteDirectory = path.join(directory, relativeDirectory);
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory.split(path.sep).join('/'), entry.name);
    if (entry.isDirectory()) {
      result.push(...listRegularFiles(directory, relativePath));
    } else if (entry.isFile()) {
      result.push(relativePath);
    }
  }
  return result.sort();
}

function resolveManifestPath(baseDirectory, relativePath, label) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '' || path.isAbsolute(relativePath)) {
    fail(`${label} must be a non-empty relative path`);
    return null;
  }
  const resolved = path.resolve(baseDirectory, relativePath);
  const relative = path.relative(baseDirectory, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} must stay inside the manifest directory`);
    return null;
  }
  return resolved;
}

function validateExistingEvidenceFile(baseDirectory, relativePath, label) {
  const resolved = resolveManifestPath(baseDirectory, relativePath, label);
  if (!resolved) return null;
  if (!isRegularFile(resolved)) {
    fail(`${label} does not resolve to a regular file`);
    return null;
  }
  if (fs.statSync(resolved).size === 0) {
    fail(`${label} must not be empty`);
  }
  return resolved;
}

function validateSha256(value, absolutePath, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value.toLowerCase())) {
    fail(`${label} must be a 64-character lowercase-compatible hex digest`);
    return;
  }
  if (absolutePath && sha256File(absolutePath) !== value.toLowerCase()) {
    fail(`${label} does not match the evidence file`);
  }
}

function validatePngEvidence(absolutePath, label, expectedWidth, expectedHeight) {
  if (!absolutePath) return;
  const content = fs.readFileSync(absolutePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (content.length < 24 || !content.subarray(0, 8).equals(signature) || content.toString('ascii', 12, 16) !== 'IHDR') {
    fail(`${label} must be a PNG with an IHDR header`);
    return;
  }
  const width = content.readUInt32BE(16);
  const height = content.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    fail(`${label} PNG dimensions must equal ${expectedWidth}x${expectedHeight}; found ${width}x${height}`);
  }
}

function validateRef01(uxRows, hashContract = {}) {
  const ddlSha256 = hashContract.ddlSha256 ?? expectedDdlSha256;
  const pptxSha256 = hashContract.pptxSha256 ?? expectedPptxSha256;
  const requiredEnv = [
    'CRM_SOURCE_PROTOTYPE_DIR',
    'CRM_SOURCE_DDL_PATH',
    'CRM_SOURCE_UIUX_MANIFEST',
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]?.trim());
  if (missingEnv.length > 0) {
    fail(`REF-01 missing required environment input(s): ${missingEnv.join(', ')}`);
    return;
  }

  const prototypeInputDirectory = path.resolve(process.env.CRM_SOURCE_PROTOTYPE_DIR);
  const ddlPath = path.resolve(process.env.CRM_SOURCE_DDL_PATH);
  const manifestPath = path.resolve(process.env.CRM_SOURCE_UIUX_MANIFEST);

  let prototypeDirectory = null;
  try {
    prototypeDirectory = resolveCrmSourcePrototypeRoot(prototypeInputDirectory).prototypeRoot;
  } catch (error) {
    fail(error.message);
  }
  if (!isRegularFile(ddlPath)) {
    fail('CRM_SOURCE_DDL_PATH must resolve to a regular file');
  } else if (sha256File(ddlPath) !== ddlSha256) {
    fail(`CRM_SOURCE_DDL_PATH SHA-256 must be ${ddlSha256}`);
  }
  if (!isRegularFile(manifestPath)) {
    fail('CRM_SOURCE_UIUX_MANIFEST must resolve to a regular JSON file');
    return;
  }

  const optionalPptx = process.env.CRM_SOURCE_PPTX_PATH?.trim();
  if (optionalPptx) {
    const pptxPath = path.resolve(optionalPptx);
    if (!isRegularFile(pptxPath)) {
      fail('CRM_SOURCE_PPTX_PATH must resolve to a regular file when provided');
    } else if (sha256File(pptxPath) !== pptxSha256) {
      fail(`CRM_SOURCE_PPTX_PATH SHA-256 must be ${pptxSha256}`);
    }
  }

  const manifest = readJson(manifestPath, 'CRM_SOURCE_UIUX_MANIFEST');
  if (!manifest || !prototypeDirectory) return;

  if (manifest.version !== 1) {
    fail('CRM_SOURCE_UIUX_MANIFEST.version must equal 1');
  }

  if (!Array.isArray(manifest.prototypeFiles) || manifest.prototypeFiles.length === 0) {
    fail('CRM_SOURCE_UIUX_MANIFEST.prototypeFiles must be a non-empty array');
  } else {
    const declaredFiles = new Map();
    for (const [index, entry] of manifest.prototypeFiles.entries()) {
      const label = `prototypeFiles[${index}]`;
      if (!entry || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
        fail(`${label} must contain path and sha256 strings`);
        continue;
      }
      const normalized = path.posix.normalize(entry.path.replaceAll('\\', '/'));
      if (normalized.startsWith('../') || normalized === '..' || path.posix.isAbsolute(normalized)) {
        fail(`${label}.path must stay inside the prototype directory`);
        continue;
      }
      if (declaredFiles.has(normalized)) {
        fail(`prototypeFiles contains duplicate path ${normalized}`);
        continue;
      }
      declaredFiles.set(normalized, entry.sha256.toLowerCase());
      const absoluteFile = path.join(prototypeDirectory, ...normalized.split('/'));
      if (!isRegularFile(absoluteFile)) {
        fail(`prototype manifest file is missing: ${normalized}`);
      } else if (!/^[a-f0-9]{64}$/.test(entry.sha256.toLowerCase())) {
        fail(`${label}.sha256 must be a 64-character lowercase-compatible hex digest`);
      } else if (sha256File(absoluteFile) !== entry.sha256.toLowerCase()) {
        fail(`prototype file hash mismatch: ${normalized}`);
      }
    }

    const actualFiles = listRegularFiles(prototypeDirectory);
    const declaredPaths = [...declaredFiles.keys()].sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(declaredPaths)) {
      const missing = actualFiles.filter((file) => !declaredFiles.has(file));
      const extra = declaredPaths.filter((file) => !actualFiles.includes(file));
      fail(`prototypeFiles must exactly cover the directory (unlisted: ${missing.join(', ') || 'none'}; absent: ${extra.join(', ') || 'none'})`);
    }
    for (const requiredFile of ['index.html', 'login.js', 'supabase_client.js']) {
      if (!declaredFiles.has(requiredFile)) {
        fail(`prototypeFiles must include ${requiredFile}`);
      }
    }
  }

  if (!Array.isArray(manifest.captures)) {
    fail('CRM_SOURCE_UIUX_MANIFEST.captures must be an array');
    return;
  }

  const expectedPages = new Map(uxRows.map((row) => [row.id, row.cells[1].replaceAll('`', '')]));
  const captureIds = manifest.captures.map((capture) => capture?.uxId).filter(Boolean);
  assertExactIds('REF-01 captures', captureIds, [...expectedPages.keys()]);
  const manifestDirectory = path.dirname(manifestPath);

  for (const [index, capture] of manifest.captures.entries()) {
    const label = `captures[${index}]`;
    if (!capture || typeof capture !== 'object') {
      fail(`${label} must be an object`);
      continue;
    }
    const expectedPage = expectedPages.get(capture.uxId);
    if (expectedPage && capture.sourcePage !== expectedPage) {
      fail(`${label}.sourcePage must equal ${expectedPage} for ${capture.uxId}`);
    }
    if (capture.viewport?.width !== 1440 || capture.viewport?.height !== 1000) {
      fail(`${label}.viewport must equal 1440x1000`);
    }
    for (const field of ['captureCommand', 'seedState', 'capturedAt']) {
      if (typeof capture[field] !== 'string' || capture[field].trim() === '') {
        fail(`${label}.${field} must be a non-empty string`);
      }
    }
    if (typeof capture.capturedAt === 'string' && Number.isNaN(Date.parse(capture.capturedAt))) {
      fail(`${label}.capturedAt must be an ISO-compatible timestamp`);
    }

    const screenshotPath = validateExistingEvidenceFile(manifestDirectory, capture.screenshot, `${label}.screenshot`);
    const domPath = validateExistingEvidenceFile(manifestDirectory, capture.domManifest, `${label}.domManifest`);
    const statePath = validateExistingEvidenceFile(manifestDirectory, capture.stateManifest, `${label}.stateManifest`);
    validatePngEvidence(screenshotPath, `${label}.screenshot`, 1440, 1000);
    validateSha256(capture.evidenceSha256?.screenshot, screenshotPath, `${label}.evidenceSha256.screenshot`);
    validateSha256(capture.evidenceSha256?.domManifest, domPath, `${label}.evidenceSha256.domManifest`);
    validateSha256(capture.evidenceSha256?.stateManifest, statePath, `${label}.evidenceSha256.stateManifest`);

    if (domPath) {
      const domManifest = readJson(domPath, `${label}.domManifest`);
      for (const field of ['sections', 'fields', 'columns', 'actions', 'labels']) {
        if (!Array.isArray(domManifest?.[field])) {
          fail(`${label}.domManifest.${field} must be an array`);
        }
      }
      if (typeof domManifest?.title !== 'string' || domManifest.title.trim() === '') {
        fail(`${label}.domManifest.title must be a non-empty string`);
      }
      if (domManifest?.sections?.length === 0) {
        fail(`${label}.domManifest.sections must not be empty`);
      }
      if (domManifest?.actions?.length === 0) {
        fail(`${label}.domManifest.actions must not be empty`);
      }
    }
    if (statePath) {
      const stateManifest = readJson(statePath, `${label}.stateManifest`);
      if (!Array.isArray(stateManifest?.states) || stateManifest.states.length === 0) {
        fail(`${label}.stateManifest.states must be a non-empty array`);
      } else {
        for (const [stateIndex, state] of stateManifest.states.entries()) {
          const stateLabel = `${label}.stateManifest.states[${stateIndex}]`;
          if (typeof state?.name !== 'string' || state.name.trim() === '') {
            fail(`${stateLabel}.name must be a non-empty string`);
          }
          if (state?.captured !== true) {
            fail(`${stateLabel}.captured must equal true`);
          }
          const stateScreenshot = validateExistingEvidenceFile(
            manifestDirectory,
            state?.screenshot,
            `${stateLabel}.screenshot`,
          );
          validatePngEvidence(stateScreenshot, `${stateLabel}.screenshot`, 1440, 1000);
          validateSha256(state?.screenshotSha256, stateScreenshot, `${stateLabel}.screenshotSha256`);
        }
      }
      if (!Array.isArray(stateManifest?.requiredForTargetComparison) || stateManifest.requiredForTargetComparison.length === 0) {
        fail(`${label}.stateManifest.requiredForTargetComparison must be a non-empty array`);
      } else {
        for (const [requirementIndex, requirement] of stateManifest.requiredForTargetComparison.entries()) {
          const requirementLabel = `${label}.stateManifest.requiredForTargetComparison[${requirementIndex}]`;
          for (const field of ['id', 'behavior']) {
            if (typeof requirement?.[field] !== 'string' || requirement[field].trim() === '') {
              fail(`${requirementLabel}.${field} must be a non-empty string`);
            }
          }
          if (!Array.isArray(requirement?.sourceAnchors) || requirement.sourceAnchors.length === 0) {
            fail(`${requirementLabel}.sourceAnchors must be a non-empty array`);
          } else {
            for (const [anchorIndex, sourceAnchor] of requirement.sourceAnchors.entries()) {
              if (typeof sourceAnchor !== 'string' || sourceAnchor.trim() === '') {
                fail(`${requirementLabel}.sourceAnchors[${anchorIndex}] must be a non-empty string`);
                continue;
              }
              const normalizedAnchor = path.posix.normalize(sourceAnchor.replaceAll('\\', '/'));
              const anchorPath = path.join(prototypeDirectory, ...normalizedAnchor.split('/'));
              if (normalizedAnchor.startsWith('../') || path.posix.isAbsolute(normalizedAnchor) || !isRegularFile(anchorPath)) {
                fail(`${requirementLabel}.sourceAnchors[${anchorIndex}] must resolve inside the prototype directory`);
              }
            }
          }
        }
      }
      if (Array.isArray(stateManifest?.states) && Array.isArray(stateManifest?.requiredForTargetComparison)) {
        assertExactIds(
          `${label}.stateManifest captured state coverage`,
          stateManifest.states.map((state) => state?.name),
          stateManifest.requiredForTargetComparison.map((requirement) => requirement?.id),
        );
      }
    }
  }

  for (const row of uxRows) {
    if (row.cells[5] === '누락') {
      fail(`${row.id} remains marked 누락 even though REF-01 inputs were supplied; update the evidence/status row before Phase 1 closure`);
    }
  }
}

function runSelfTest(uxRows) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-goal-contract-'));
  const prototypeDirectory = path.join(temporaryRoot, 'prototype');
  const wrapperDirectory = path.join(temporaryRoot, 'prototype-wrapper');
  const wrappedPrototypeDirectory = path.join(wrapperDirectory, 'source-application');
  const evidenceDirectory = path.join(temporaryRoot, 'evidence');
  const ddlPath = path.join(temporaryRoot, 'Create Table script.txt');
  const manifestPath = path.join(evidenceDirectory, 'source-uiux-manifest.json');
  const envNames = [
    'CRM_SOURCE_PROTOTYPE_DIR',
    'CRM_SOURCE_DDL_PATH',
    'CRM_SOURCE_UIUX_MANIFEST',
    'CRM_SOURCE_PPTX_PATH',
  ];
  const previousEnv = new Map(envNames.map((name) => [name, process.env[name]]));

  try {
    fs.mkdirSync(prototypeDirectory, { recursive: true });
    fs.mkdirSync(evidenceDirectory, { recursive: true });
    fs.writeFileSync(path.join(prototypeDirectory, 'index.html'), '<!doctype html><title>CRM source fixture</title>\n');
    fs.writeFileSync(path.join(prototypeDirectory, 'login.js'), 'window.loginFixture = true;\n');
    fs.writeFileSync(path.join(prototypeDirectory, 'supabase_client.js'), 'window.supabaseFixture = true;\n');
    fs.writeFileSync(ddlPath, 'CREATE TABLE self_test (id bigint primary key);\n');

    const prototypeFiles = listRegularFiles(prototypeDirectory).map((relativePath) => ({
      path: relativePath,
      sha256: sha256File(path.join(prototypeDirectory, relativePath)),
    }));
    const captures = uxRows.map((row) => {
      const uxId = row.id;
      const sourcePage = row.cells[1].replaceAll('`', '');
      const screenshot = `${uxId}.png`;
      const domManifest = `${uxId}.dom.json`;
      const stateManifest = `${uxId}.states.json`;
      const pngHeader = Buffer.alloc(33);
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(pngHeader, 0);
      pngHeader.writeUInt32BE(13, 8);
      pngHeader.write('IHDR', 12, 'ascii');
      pngHeader.writeUInt32BE(1440, 16);
      pngHeader.writeUInt32BE(1000, 20);
      pngHeader[24] = 8;
      pngHeader[25] = 6;
      fs.writeFileSync(path.join(evidenceDirectory, screenshot), pngHeader);
      fs.writeFileSync(
        path.join(evidenceDirectory, domManifest),
        `${JSON.stringify({ title: sourcePage, sections: [sourcePage], fields: [], columns: [], actions: ['self-test'], labels: [] }, null, 2)}\n`,
      );
      fs.writeFileSync(
        path.join(evidenceDirectory, stateManifest),
        `${JSON.stringify({
          states: [{ name: 'baseline', captured: true, screenshot, screenshotSha256: sha256File(path.join(evidenceDirectory, screenshot)) }],
          requiredForTargetComparison: [{ id: 'baseline', behavior: 'self-test baseline', sourceAnchors: ['index.html'] }],
        }, null, 2)}\n`,
      );
      return {
        uxId,
        sourcePage,
        viewport: { width: 1440, height: 1000 },
        screenshot,
        domManifest,
        stateManifest,
        captureCommand: `self-test capture ${uxId}`,
        seedState: 'synthetic self-test only',
        capturedAt: '2026-08-18T00:00:00.000Z',
        evidenceSha256: {
          screenshot: sha256File(path.join(evidenceDirectory, screenshot)),
          domManifest: sha256File(path.join(evidenceDirectory, domManifest)),
          stateManifest: sha256File(path.join(evidenceDirectory, stateManifest)),
        },
      };
    });
    const manifest = { version: 1, prototypeFiles, captures };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    process.env.CRM_SOURCE_PROTOTYPE_DIR = prototypeDirectory;
    process.env.CRM_SOURCE_DDL_PATH = ddlPath;
    process.env.CRM_SOURCE_UIUX_MANIFEST = manifestPath;
    delete process.env.CRM_SOURCE_PPTX_PATH;

    const referenceReadyRows = uxRows.map((row) => ({
      ...row,
      cells: row.cells.map((cell, index) => (index === 5 ? '부분' : cell)),
    }));
    validateRef01(referenceReadyRows, { ddlSha256: sha256File(ddlPath) });
    if (failures.length > 0) {
      throw new Error(`positive REF-01 fixture was rejected: ${failures.join('; ')}`);
    }

    fs.mkdirSync(wrapperDirectory, { recursive: true });
    fs.cpSync(prototypeDirectory, wrappedPrototypeDirectory, { recursive: true });
    process.env.CRM_SOURCE_PROTOTYPE_DIR = wrapperDirectory;
    failures.length = 0;
    validateRef01(referenceReadyRows, { ddlSha256: sha256File(ddlPath) });
    if (failures.length > 0) {
      throw new Error(`single-wrapper REF-01 fixture was rejected: ${failures.join('; ')}`);
    }

    fs.writeFileSync(path.join(wrapperDirectory, 'unexpected-sibling.txt'), 'must remain fail-closed\n');
    failures.length = 0;
    validateRef01(referenceReadyRows, { ddlSha256: sha256File(ddlPath) });
    if (!failures.some((message) => message.includes('exactly one wrapper directory'))) {
      throw new Error(`ambiguous wrapper fixture was not rejected: ${failures.join('; ')}`);
    }

    process.env.CRM_SOURCE_PROTOTYPE_DIR = prototypeDirectory;
    manifest.prototypeFiles[0].sha256 = '0'.repeat(64);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    failures.length = 0;
    validateRef01(referenceReadyRows, { ddlSha256: sha256File(ddlPath) });
    if (!failures.some((message) => message.includes('prototype file hash mismatch'))) {
      throw new Error(`negative REF-01 fixture did not produce a hash mismatch: ${failures.join('; ')}`);
    }

    failures.length = 0;
    console.log('✓ CRM goal contract REF-01 direct/wrapper/fail-closed self-test passed');
  } finally {
    for (const [name, value] of previousEnv) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (unknownArgs.length > 0) {
  fail(`unknown argument(s): ${unknownArgs.join(', ')}`);
}

if (selfTest) {
  const selfTestUiux = readText(paths.uiux);
  const selfTestRows = parseTableRows(selfTestUiux, /^UX-\d{2}$/);
  assertExactIds('UI/UX denominator', selfTestRows.map((row) => row.id), rangeIds('UX', 1, 17));
  if (failures.length > 0) {
    throw new Error(`self-test prerequisite failed: ${failures.join('; ')}`);
  }
  runSelfTest(selfTestRows);
  process.exit(0);
}

const source = readText(paths.source);
const uiux = readText(paths.uiux);
const operations = readText(paths.operations);
const tests = readText(paths.tests);
const handoff = readText(paths.handoff);
const readme = readText(paths.readme);
const backlog = readText(paths.backlog);
const migrationPrd = readText(paths.migrationPrd);
const verificationContract = readText(paths.verificationContract);
const packageText = readText(paths.packageJson);

const sourceRows = parseTableRows(source, /^SRC-\d{2}$/);
const uxRows = parseTableRows(uiux, /^UX-\d{2}$/);
const operationRows = parseTableRows(operations, /^OPS-\d{2}$/);
const impIds = parseHeadingIds(handoff, 'IMP');
const btIds = parseHeadingIds(tests, 'BT');
const extIds = parseHeadingIds(operations, 'EXT');
const sliceRows = parseTableRows(handoff, /^S(?:[0-9]|1[0-5])$/);
const sliceIds = sliceRows.map((row) => row.id);

assertExactIds('source denominator', sourceRows.map((row) => row.id), rangeIds('SRC', 1, 28));
assertExactIds('UI/UX denominator', uxRows.map((row) => row.id), rangeIds('UX', 1, 17));
assertExactIds('operations denominator', operationRows.map((row) => row.id), rangeIds('OPS', 1, 18));
assertExactIds('implementation plan', impIds, rangeIds('IMP', 1, 17));
assertExactIds('browser/non-browser test plan', btIds, rangeIds('BT', 1, 27));
assertExactIds('external input plan', extIds, rangeIds('EXT', 1, 2));
assertExactIds('execution slices', sliceIds, Array.from({ length: 16 }, (_, index) => `S${index}`));

const knownIds = new Set([
  ...sourceRows.map((row) => row.id),
  ...uxRows.map((row) => row.id),
  ...operationRows.map((row) => row.id),
  ...impIds,
  ...btIds,
  ...extIds,
]);
const mappedImplementationAndTestIds = new Set();

for (const row of sourceRows) {
  if (row.cells.length !== 5) {
    fail(`${row.id} must have exactly 5 table cells`);
    continue;
  }
  const status = row.cells[2];
  const mapping = row.cells[4];
  validateReferences(row.id, mapping, knownIds);
  extractReferences(mapping).forEach((reference) => mappedImplementationAndTestIds.add(reference));
  if (!includesReference(mapping, 'BT')) {
    fail(`${row.id} must map to at least one BT id`);
  }
  if (/^(부분|누락|치환 검증|원천 모순)/.test(status) && !includesReference(mapping, 'IMP')) {
    fail(`${row.id} status ${status} must map to an IMP id`);
  }
}

for (const row of uxRows) {
  if (row.cells.length !== 7) {
    fail(`${row.id} must have exactly 7 table cells including explicit status`);
    continue;
  }
  const status = row.cells[5];
  const mapping = row.cells[6];
  if (!['완료', '부분', '누락', '치환 검증', '원천 모순'].includes(status)) {
    fail(`${row.id} has unsupported status ${status}`);
  }
  validateReferences(row.id, mapping, knownIds);
  extractReferences(mapping).forEach((reference) => mappedImplementationAndTestIds.add(reference));
  if (!mapping.includes('IMP-17') || !mapping.includes('BT-27')) {
    fail(`${row.id} must map to IMP-17 and BT-27`);
  }
}

for (const row of operationRows) {
  if (row.cells.length !== 6) {
    fail(`${row.id} must have exactly 6 table cells`);
    continue;
  }
  const status = row.cells[4];
  const mapping = row.cells[5];
  validateReferences(row.id, mapping, knownIds);
  extractReferences(mapping).forEach((reference) => mappedImplementationAndTestIds.add(reference));
  if (row.id === 'OPS-18') {
    if (!mapping.includes('EXT-01') || !mapping.includes('EXT-02')) {
      fail('OPS-18 must map to both EXT-01 and EXT-02');
    }
  } else {
    if (!includesReference(mapping, 'BT')) {
      fail(`${row.id} must map to at least one BT id`);
    }
    if (/^(부분|누락)/.test(status) && !includesReference(mapping, 'IMP')) {
      fail(`${row.id} status ${status} must map to an IMP id`);
    }
  }
}

for (const requiredId of [...impIds, ...btIds, ...extIds]) {
  if (!mappedImplementationAndTestIds.has(requiredId)) {
    fail(`${requiredId} is defined but not referenced by a denominator row`);
  }
}

for (const [relativePath, content] of [
  [paths.readme, readme],
  [paths.backlog, backlog],
  [paths.migrationPrd, migrationPrd],
]) {
  for (const retiredMarker of ['CRM-SRC-001~027', 'CRM-OPS-001~014']) {
    if (content.includes(retiredMarker)) {
      fail(`${relativePath} still contains retired denominator marker ${retiredMarker}`);
    }
  }
}

for (const requiredMarker of [
  'CRM_SOURCE_PROTOTYPE_DIR',
  'CRM_SOURCE_DDL_PATH',
  'CRM_SOURCE_UIUX_MANIFEST',
  'verify:crm-goal-contract:structure',
]) {
  if (!uiux.includes(requiredMarker)) {
    fail(`${paths.uiux} must document ${requiredMarker}`);
  }
}
if (!/^> 현재 단계: (?:Phase 2|Goal 완료)/m.test(handoff)) {
  fail(`${paths.handoff} must declare the current Phase 2 stage or the completed Goal state`);
}
if (!handoff.includes('(완료 SRC + 완료 UX) / 45')) {
  fail(`${paths.handoff} must define the strict demo progress denominator formula`);
}
if (!tests.includes('REF-01') || !tests.includes('SKIP`이 아니라 `FAIL')) {
  fail(`${paths.tests} must fail BT-27 when REF-01 is absent`);
}
for (const marker of [
  '(완료 SRC + 완료 UX) / 45',
  '문서상 폐쇄 원장',
  '현재 revision에 결합된 엄격 증명',
  'worktreeIdentity',
  'DDL 23개 table',
]) {
  if (!verificationContract.includes(marker)) {
    fail(`${paths.verificationContract} must document ${marker}`);
  }
}

let packageJson = null;
try {
  packageJson = JSON.parse(packageText);
} catch (error) {
  fail(`package.json must be valid JSON: ${error.message}`);
}
for (const [scriptName, expectedCommand] of [
  ['verify:crm-goal-contract', 'pnpm run verify:crm-goal-contract:observed'],
  ['verify:crm-goal-contract:raw', 'node scripts/verify-crm-goal-contract.mjs'],
  ['verify:crm-goal-contract:structure', 'node scripts/verify-crm-goal-contract.mjs --structure-only'],
  ['verify:crm-goal-contract:self-test', 'node scripts/verify-crm-goal-contract.mjs --self-test'],
  ['capture:crm-source-uiux', 'node scripts/capture-crm-source-uiux-reference.mjs'],
  [
    'verify:crm-goal-contract:observed',
    "bash scripts/run-observed-command.sh --command 'pnpm run verify:crm-goal-contract:raw' --verification-command-label 'pnpm run verify:crm-goal-contract:raw'",
  ],
]) {
  if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
    fail(`package.json script ${scriptName} must equal: ${expectedCommand}`);
  }
}

if (!structureOnly) {
  validateRef01(uxRows);
}

const sourceClosed = sourceRows.filter((row) => isClosedStatus(row.cells[2])).length;
const uxClosed = uxRows.filter((row) => isClosedStatus(row.cells[5])).length;
const operationsClosed = operationRows
  .filter((row) => row.id !== 'OPS-18')
  .filter((row) => isClosedStatus(row.cells[4])).length;

if (!structureOnly) {
  const uiuxEvidenceVerification = spawnSync(
    process.execPath,
    [path.join(rootDir, 'scripts/verify-crm-uiux-parity-evidence.mjs')],
    { cwd: rootDir, env: process.env, encoding: 'utf8' },
  );
  if (uiuxEvidenceVerification.status !== 0) {
    fail(`CRM target UI/UX evidence gate failed: ${(uiuxEvidenceVerification.stderr || uiuxEvidenceVerification.stdout).trim()}`);
  } else if (uiuxEvidenceVerification.stdout.trim()) {
    console.log(uiuxEvidenceVerification.stdout.trim());
  }
}

console.log('CRM goal contract ledger (documented current status; final completion requires fresh evidence)');
console.log(`- demo source functionality: ${sourceClosed}/28 (${percentage(sourceClosed, 28)}%)`);
console.log(`- source UI/UX fidelity: ${uxClosed}/17 (${percentage(uxClosed, 17)}%)`);
console.log(`- strict demo parity: ${sourceClosed + uxClosed}/45 (${percentage(sourceClosed + uxClosed, 45)}%)`);
console.log(`- operations maturity: ${operationsClosed}/17 (${percentage(operationsClosed, 17)}%)`);
console.log('- external deployment inputs: separate EXT-01~02 gate (never averaged into implementation)');

if (structureOnly) {
  console.log('REF-01: skipped by --structure-only; this result is diagnostic-only and cannot close Phase 1');
}

if (failures.length > 0) {
  console.error(`\nCRM goal contract verification failed with ${failures.length} issue(s):`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log(structureOnly
  ? '✓ CRM goal contract structure verification passed'
  : '✓ CRM Phase 1 goal contract and REF-01 verification passed');
