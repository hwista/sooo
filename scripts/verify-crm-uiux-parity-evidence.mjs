#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  assertRepositoryWorktreeIdentity,
  createRepositoryWorktreeIdentity,
  REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES,
} from './repository-worktree-identity.mjs';

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(['--self-test', '--require-all']);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));
const selfTest = args.has('--self-test');
const requireAll = args.has('--require-all');
const failures = [];

const uiuxSpecPath = path.join(rootDir, 'docs/crm/planning/source-uiux-parity-spec.md');
const allowedDifferenceClasses = new Set([
  'platform-required',
  'responsive-only',
  'source-bug-compatible',
]);

function fail(message) {
  failures.push(message);
}

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isRegularFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function parseUxRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trimStart().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (/^UX-\d{2}$/.test(cells[0] ?? '')) {
      rows.push({ id: cells[0], sourcePage: cells[1]?.replaceAll('`', ''), status: cells[5] });
    }
  }
  return rows;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} must be valid JSON: ${error.message}`);
    return null;
  }
}

function resolveEvidencePath(baseDirectory, relativePath, label) {
  if (typeof relativePath !== 'string' || relativePath.trim() === '' || path.isAbsolute(relativePath)) {
    fail(`${label} must be a non-empty relative path`);
    return null;
  }
  const resolved = path.resolve(baseDirectory, relativePath);
  const relative = path.relative(baseDirectory, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} must stay inside its manifest directory`);
    return null;
  }
  if (!isRegularFile(resolved) || fs.statSync(resolved).size === 0) {
    fail(`${label} must resolve to a non-empty regular file`);
    return null;
  }
  return resolved;
}

function validateSha256(value, filePath, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    fail(`${label} must be a lowercase SHA-256 digest`);
    return;
  }
  if (filePath && sha256File(filePath) !== value) {
    fail(`${label} does not match the evidence file`);
  }
}

function validatePng(filePath, label, expectedViewport = null) {
  if (!filePath) return;
  const content = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (content.length < 24 || !content.subarray(0, 8).equals(signature) || content.toString('ascii', 12, 16) !== 'IHDR') {
    fail(`${label} must be a PNG with an IHDR header`);
    return;
  }
  if (expectedViewport) {
    const width = content.readUInt32BE(16);
    const height = content.readUInt32BE(20);
    if (width !== expectedViewport.width || height !== expectedViewport.height) {
      fail(`${label} must be ${expectedViewport.width}x${expectedViewport.height}; found ${width}x${height}`);
    }
  }
}

function assertExactIds(label, actual, expected) {
  if (new Set(actual).size !== actual.length) {
    fail(`${label} contains duplicate ids`);
  }
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    fail(`${label} must equal [${expected.join(', ')}]; found [${actual.join(', ')}]`);
  }
}

function validateZeroArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
  } else if (value.length > 0) {
    fail(`${label} must be empty for completed UI/UX evidence`);
  }
}

function validateClassifiedDifferences(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
    return;
  }
  for (const [index, difference] of value.entries()) {
    const differenceLabel = `${label}[${index}]`;
    if (!allowedDifferenceClasses.has(difference?.classification)) {
      fail(`${differenceLabel}.classification must be platform-required, responsive-only, or source-bug-compatible`);
    }
    for (const field of ['area', 'rationale']) {
      if (typeof difference?.[field] !== 'string' || difference[field].trim() === '') {
        fail(`${differenceLabel}.${field} must be a non-empty string`);
      }
    }
  }
}

function validateBrowserGate(gate, label, viewport) {
  if (!gate || typeof gate !== 'object') {
    fail(`${label} must be an object`);
    return;
  }
  if (gate.viewport?.width !== viewport.width || gate.viewport?.height !== viewport.height) {
    fail(`${label}.viewport must equal ${viewport.width}x${viewport.height}`);
  }
  for (const field of ['pageErrors', 'consoleErrors', 'unexpectedHttpFailures']) {
    validateZeroArray(gate[field], `${label}.${field}`);
  }
  if (gate.documentOverflowPx !== 0) {
    fail(`${label}.documentOverflowPx must equal 0`);
  }
}

function getSourceRequirements(sourceManifest, sourceDirectory) {
  const result = new Map();
  for (const capture of sourceManifest?.captures ?? []) {
    const statePath = resolveEvidencePath(sourceDirectory, capture?.stateManifest, `${capture?.uxId ?? 'unknown'}.sourceStateManifest`);
    const stateManifest = statePath ? readJson(statePath, `${capture?.uxId ?? 'unknown'}.sourceStateManifest`) : null;
    const requirements = Array.isArray(stateManifest?.requiredForTargetComparison)
      ? stateManifest.requiredForTargetComparison.map((entry) => entry?.id).filter(Boolean)
      : [];
    const capturedStates = new Map(
      (Array.isArray(stateManifest?.states) ? stateManifest.states : [])
        .map((entry) => [entry?.name, entry]),
    );
    result.set(capture?.uxId, {
      sourcePage: capture?.sourcePage,
      requirements,
      capturedStates,
    });
  }
  return result;
}

function validateManifest({ targetManifestPath, sourceManifestPath, uxRows, currentWorktreeIdentity, forceAll = false }) {
  if (!isRegularFile(sourceManifestPath)) {
    fail('CRM_SOURCE_UIUX_MANIFEST must resolve to the REF-01 source manifest');
    return;
  }
  if (!isRegularFile(targetManifestPath)) {
    fail('CRM_TARGET_UIUX_MANIFEST must resolve to a target parity evidence manifest');
    return;
  }

  const sourceManifest = readJson(sourceManifestPath, 'CRM_SOURCE_UIUX_MANIFEST');
  const targetManifest = readJson(targetManifestPath, 'CRM_TARGET_UIUX_MANIFEST');
  if (!sourceManifest || !targetManifest) return;

  if (targetManifest.version !== 2) {
    fail('CRM_TARGET_UIUX_MANIFEST.version must equal 2');
  }
  try {
    assertRepositoryWorktreeIdentity(
      targetManifest.worktreeIdentity,
      currentWorktreeIdentity,
      'CRM_TARGET_UIUX_MANIFEST.worktreeIdentity',
    );
  } catch (error) {
    fail(error.message);
  }
  if (targetManifest.sourceManifestSha256 !== sha256File(sourceManifestPath)) {
    fail('CRM_TARGET_UIUX_MANIFEST.sourceManifestSha256 must match the supplied REF-01 manifest');
  }
  if (typeof targetManifest.generatedAt !== 'string' || Number.isNaN(Date.parse(targetManifest.generatedAt))) {
    fail('CRM_TARGET_UIUX_MANIFEST.generatedAt must be an ISO-compatible timestamp');
  }

  const sourceDirectory = path.dirname(sourceManifestPath);
  const targetDirectory = path.dirname(targetManifestPath);
  const sourceRequirements = getSourceRequirements(sourceManifest, sourceDirectory);
  const expectedUxIds = uxRows.map((row) => row.id);
  const targetCaptures = Array.isArray(targetManifest.captures) ? targetManifest.captures : [];
  assertExactIds('target UI/UX captures', targetCaptures.map((entry) => entry?.uxId), expectedUxIds);

  const documentedComplete = new Set(uxRows.filter((row) => row.status === '완료').map((row) => row.id));
  if (forceAll && documentedComplete.size !== expectedUxIds.length) {
    fail(`--require-all requires all 17 UX rows to be documented 완료; found ${documentedComplete.size}`);
  }

  for (const [captureIndex, capture] of targetCaptures.entries()) {
    const label = `captures[${captureIndex}]`;
    const row = uxRows.find((entry) => entry.id === capture?.uxId);
    const source = sourceRequirements.get(capture?.uxId);
    const mustBeComplete = forceAll || documentedComplete.has(capture?.uxId);
    if (!row || !source) {
      fail(`${label}.uxId must reference a source UX row and REF-01 capture`);
      continue;
    }
    if (capture.sourcePage !== row.sourcePage || capture.sourcePage !== source.sourcePage) {
      fail(`${label}.sourcePage must equal ${row.sourcePage}`);
    }
    if (!['partial', 'complete'].includes(capture.status)) {
      fail(`${label}.status must be partial or complete`);
    }
    if (mustBeComplete && capture.status !== 'complete') {
      fail(`${capture.uxId} is documented 완료 but target evidence status is not complete`);
    }
    if (!mustBeComplete && capture.status === 'complete') {
      fail(`${capture.uxId} target evidence is complete but the canonical UX row is not 완료`);
    }
    for (const field of ['ownerSurface', 'targetUrl', 'capturedAt']) {
      if (typeof capture[field] !== 'string' || capture[field].trim() === '') {
        fail(`${label}.${field} must be a non-empty string`);
      }
    }
    if (typeof capture.capturedAt === 'string' && Number.isNaN(Date.parse(capture.capturedAt))) {
      fail(`${label}.capturedAt must be an ISO-compatible timestamp`);
    }

    if (!mustBeComplete) continue;

    const structure = capture.structureDiff;
    if (!structure || typeof structure !== 'object') {
      fail(`${label}.structureDiff must be an object`);
    } else {
      for (const field of [
        'missingSections', 'missingFields', 'missingColumns', 'missingActions', 'missingLabels',
        'renamedMeaning', 'reorderedWorkflow', 'defaultBehaviorDifferences', 'unclassified', 'defects',
      ]) {
        validateZeroArray(structure[field], `${label}.structureDiff.${field}`);
      }
      validateClassifiedDifferences(structure.classifiedDifferences, `${label}.structureDiff.classifiedDifferences`);
    }

    assertExactIds(
      `${capture.uxId} target states`,
      (Array.isArray(capture.states) ? capture.states : []).map((state) => state?.id),
      source.requirements,
    );
    const sourceScreenshots = new Set();
    const desktopScreenshots = new Set();
    const mobileScreenshots = new Set();
    for (const [stateIndex, state] of (capture.states ?? []).entries()) {
      const stateLabel = `${label}.states[${stateIndex}]`;
      const sourceState = source.capturedStates.get(state?.id);
      if (!sourceState?.captured) {
        fail(`${stateLabel} has no same-state source capture named ${state?.id} in REF-01`);
      }
      if (sourceState?.screenshot !== state?.sourceScreenshot) {
        fail(`${stateLabel}.sourceScreenshot must equal the REF-01 screenshot for state ${state?.id}`);
      }
      const sourceScreenshot = resolveEvidencePath(sourceDirectory, state?.sourceScreenshot, `${stateLabel}.sourceScreenshot`);
      const desktopScreenshot = resolveEvidencePath(targetDirectory, state?.targetDesktopScreenshot, `${stateLabel}.targetDesktopScreenshot`);
      const mobileScreenshot = resolveEvidencePath(targetDirectory, state?.targetMobileScreenshot, `${stateLabel}.targetMobileScreenshot`);
      const differenceScreenshot = resolveEvidencePath(targetDirectory, state?.differenceScreenshot, `${stateLabel}.differenceScreenshot`);
      validatePng(sourceScreenshot, `${stateLabel}.sourceScreenshot`, { width: 1440, height: 1000 });
      validatePng(desktopScreenshot, `${stateLabel}.targetDesktopScreenshot`, { width: 1440, height: 1000 });
      validatePng(mobileScreenshot, `${stateLabel}.targetMobileScreenshot`, { width: 390, height: 844 });
      validatePng(differenceScreenshot, `${stateLabel}.differenceScreenshot`);
      validateSha256(state?.evidenceSha256?.source, sourceScreenshot, `${stateLabel}.evidenceSha256.source`);
      validateSha256(state?.evidenceSha256?.targetDesktop, desktopScreenshot, `${stateLabel}.evidenceSha256.targetDesktop`);
      validateSha256(state?.evidenceSha256?.targetMobile, mobileScreenshot, `${stateLabel}.evidenceSha256.targetMobile`);
      validateSha256(state?.evidenceSha256?.difference, differenceScreenshot, `${stateLabel}.evidenceSha256.difference`);
      sourceScreenshots.add(state?.sourceScreenshot);
      desktopScreenshots.add(state?.targetDesktopScreenshot);
      mobileScreenshots.add(state?.targetMobileScreenshot);
      if (state?.interactionVerified !== true) {
        fail(`${stateLabel}.interactionVerified must equal true`);
      }
      if (!['overlay', 'perceptual-diff'].includes(state?.visualMethod)) {
        fail(`${stateLabel}.visualMethod must be overlay or perceptual-diff`);
      }
      validateZeroArray(state?.unclassifiedDifferences, `${stateLabel}.unclassifiedDifferences`);
      validateZeroArray(state?.defects, `${stateLabel}.defects`);
      validateClassifiedDifferences(state?.classifiedDifferences, `${stateLabel}.classifiedDifferences`);
      validateBrowserGate(state?.desktopBrowserGate, `${stateLabel}.desktopBrowserGate`, { width: 1440, height: 1000 });
      validateBrowserGate(state?.mobileBrowserGate, `${stateLabel}.mobileBrowserGate`, { width: 390, height: 844 });
    }
    const stateCount = source.requirements.length;
    if (sourceScreenshots.size !== stateCount || desktopScreenshots.size !== stateCount || mobileScreenshots.size !== stateCount) {
      fail(`${capture.uxId} completed evidence must use a distinct source, desktop, and mobile screenshot for every required state`);
    }
  }
}

function writePngHeader(filePath, width, height) {
  const pngHeader = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(pngHeader, 0);
  pngHeader.writeUInt32BE(13, 8);
  pngHeader.write('IHDR', 12, 'ascii');
  pngHeader.writeUInt32BE(width, 16);
  pngHeader.writeUInt32BE(height, 20);
  pngHeader[24] = 8;
  pngHeader[25] = 6;
  fs.writeFileSync(filePath, pngHeader);
}

function runSelfTest() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-uiux-parity-'));
  try {
    const sourceDirectory = path.join(temporaryRoot, 'source');
    const targetDirectory = path.join(temporaryRoot, 'target');
    fs.mkdirSync(sourceDirectory, { recursive: true });
    fs.mkdirSync(targetDirectory, { recursive: true });
    const uxRows = [{ id: 'UX-01', sourcePage: 'dashboard', status: '완료' }];
    const sourceScreenshot = 'ux-01-seeded-summary.png';
    writePngHeader(path.join(sourceDirectory, sourceScreenshot), 1440, 1000);
    fs.writeFileSync(path.join(sourceDirectory, 'ux-01.states.json'), `${JSON.stringify({
      states: [{ name: 'seeded-summary', captured: true, screenshot: sourceScreenshot }],
      requiredForTargetComparison: [{ id: 'seeded-summary' }],
    })}\n`);
    const sourceManifestPath = path.join(sourceDirectory, 'source.json');
    fs.writeFileSync(sourceManifestPath, `${JSON.stringify({
      version: 1,
      captures: [{ uxId: 'UX-01', sourcePage: 'dashboard', stateManifest: 'ux-01.states.json' }],
    })}\n`);
    for (const [name, width, height] of [
      ['desktop.png', 1440, 1000], ['mobile.png', 390, 844], ['difference.png', 1440, 1000],
    ]) {
      writePngHeader(path.join(targetDirectory, name), width, height);
    }
    const hash = (directory, name) => sha256File(path.join(directory, name));
    const emptyBrowser = (width, height) => ({
      viewport: { width, height }, pageErrors: [], consoleErrors: [], unexpectedHttpFailures: [], documentOverflowPx: 0,
    });
    const targetManifestPath = path.join(targetDirectory, 'target.json');
    const worktreeIdentity = {
      schemaVersion: 1,
      algorithm: 'sha256',
      scope: 'git-tracked-and-untracked-working-files',
      head: 'a'.repeat(40),
      fingerprint: 'b'.repeat(64),
      fileCount: 1,
      excludedPrefixes: [...REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES],
    };
    const targetManifest = {
      version: 2,
      sourceManifestSha256: sha256File(sourceManifestPath),
      worktreeIdentity: structuredClone(worktreeIdentity),
      generatedAt: '2026-08-20T00:00:00.000Z',
      captures: [{
        uxId: 'UX-01', sourcePage: 'dashboard', status: 'complete', ownerSurface: 'CRM /', targetUrl: 'http://127.0.0.1:3105/', capturedAt: '2026-08-20T00:00:00.000Z',
        structureDiff: {
          missingSections: [], missingFields: [], missingColumns: [], missingActions: [], missingLabels: [],
          renamedMeaning: [], reorderedWorkflow: [], defaultBehaviorDifferences: [], unclassified: [], defects: [], classifiedDifferences: [],
        },
        states: [{
          id: 'seeded-summary', sourceScreenshot, targetDesktopScreenshot: 'desktop.png', targetMobileScreenshot: 'mobile.png', differenceScreenshot: 'difference.png',
          evidenceSha256: {
            source: hash(sourceDirectory, sourceScreenshot), targetDesktop: hash(targetDirectory, 'desktop.png'),
            targetMobile: hash(targetDirectory, 'mobile.png'), difference: hash(targetDirectory, 'difference.png'),
          },
          interactionVerified: true, visualMethod: 'overlay', unclassifiedDifferences: [], defects: [], classifiedDifferences: [],
          desktopBrowserGate: emptyBrowser(1440, 1000), mobileBrowserGate: emptyBrowser(390, 844),
        }],
      }],
    };
    fs.writeFileSync(targetManifestPath, `${JSON.stringify(targetManifest, null, 2)}\n`);

    validateManifest({ targetManifestPath, sourceManifestPath, uxRows, currentWorktreeIdentity: worktreeIdentity, forceAll: false });
    if (failures.length > 0) throw new Error(`positive fixture failed: ${failures.join('; ')}`);

    targetManifest.captures[0].states[0].defects.push('synthetic defect');
    fs.writeFileSync(targetManifestPath, `${JSON.stringify(targetManifest, null, 2)}\n`);
    failures.length = 0;
    validateManifest({ targetManifestPath, sourceManifestPath, uxRows, currentWorktreeIdentity: worktreeIdentity, forceAll: false });
    if (!failures.some((message) => message.includes('.defects must be empty'))) {
      throw new Error(`defect fixture was not rejected: ${failures.join('; ')}`);
    }

    targetManifest.captures[0].states[0].defects.length = 0;
    targetManifest.worktreeIdentity.fingerprint = 'c'.repeat(64);
    fs.writeFileSync(targetManifestPath, `${JSON.stringify(targetManifest, null, 2)}\n`);
    failures.length = 0;
    validateManifest({ targetManifestPath, sourceManifestPath, uxRows, currentWorktreeIdentity: worktreeIdentity, forceAll: false });
    if (!failures.some((message) => message.includes('does not match the current repository worktree'))) {
      throw new Error(`stale worktree fixture was not rejected: ${failures.join('; ')}`);
    }

    console.log('✓ CRM UI/UX parity evidence positive/negative self-test passed');
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (unknownArgs.length > 0) {
  fail(`unknown argument(s): ${unknownArgs.join(', ')}`);
}

if (selfTest) {
  runSelfTest();
  process.exit(0);
}

const uxRows = parseUxRows(fs.readFileSync(uiuxSpecPath, 'utf8'));
const expectedUxIds = Array.from({ length: 17 }, (_, index) => `UX-${String(index + 1).padStart(2, '0')}`);
assertExactIds('canonical UX rows', uxRows.map((row) => row.id), expectedUxIds);
const completedIds = uxRows.filter((row) => row.status === '완료').map((row) => row.id);
const targetManifestInput = process.env.CRM_TARGET_UIUX_MANIFEST?.trim();
const sourceManifestInput = process.env.CRM_SOURCE_UIUX_MANIFEST?.trim();

if (!targetManifestInput) {
  if (completedIds.length > 0 || requireAll) {
    fail(`CRM_TARGET_UIUX_MANIFEST is required because ${requireAll ? '--require-all was requested' : `${completedIds.length} UX row(s) are documented 완료`}`);
  } else {
    console.log('CRM UI/UX parity evidence: 0/17 complete; target manifest is not yet required');
  }
} else if (!sourceManifestInput) {
  fail('CRM_SOURCE_UIUX_MANIFEST is required whenever CRM_TARGET_UIUX_MANIFEST is supplied');
} else {
  validateManifest({
    targetManifestPath: path.resolve(targetManifestInput),
    sourceManifestPath: path.resolve(sourceManifestInput),
    uxRows,
    currentWorktreeIdentity: createRepositoryWorktreeIdentity({ repoRoot: rootDir }),
    forceAll: requireAll,
  });
}

if (failures.length > 0) {
  console.error(`CRM UI/UX parity evidence verification failed with ${failures.length} issue(s):`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log(`✓ CRM UI/UX parity evidence contract passed (${completedIds.length}/17 canonical UX rows complete)`);
