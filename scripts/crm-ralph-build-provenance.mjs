import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const CRM_RALPH_BUILD_TARGETS = Object.freeze(['server', 'web', 'admin', 'dms']);

const WEB_APP_BY_TARGET = Object.freeze({
  web: 'crm',
  admin: 'admin',
  dms: 'dms',
});

export function createCrmRalphBuildArtifact({
  repoRoot,
  target,
  publicApiUrl = 'http://127.0.0.1:4105/api',
  publicWebSocketUrl = 'http://127.0.0.1:4105',
} = {}) {
  assertTarget(target);
  const relativePaths = target === 'server'
    ? collectFiles(repoRoot, 'apps/server/dist')
    : collectNextRuntimeFiles(repoRoot, WEB_APP_BY_TARGET[target]);
  const records = relativePaths.map((relativePath) => createFileRecord(repoRoot, relativePath));
  const artifact = {
    algorithm: 'sha256',
    fingerprint: sha256(Buffer.from(`${JSON.stringify(records)}\n`, 'utf8')),
    fileCount: records.length,
    files: records,
  };
  if (target !== 'server') {
    artifact.compiledPublicRuntime = inspectCompiledPublicRuntime({
      repoRoot,
      target,
      publicApiUrl,
      publicWebSocketUrl,
      relativePaths,
    });
  }
  return artifact;
}

export function assertCrmRalphBuildArtifact(actual, expected, label = 'buildArtifact') {
  assertArtifactShape(actual, label);
  assertArtifactShape(expected, 'currentBuildArtifact');
  for (const field of ['algorithm', 'fingerprint', 'fileCount']) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}.${field} does not match the current production build artifact`);
    }
  }
  if (JSON.stringify(actual.compiledPublicRuntime ?? null) !== JSON.stringify(expected.compiledPublicRuntime ?? null)) {
    throw new Error(`${label}.compiledPublicRuntime does not match the current production build artifact`);
  }
}

export function readCrmRalphBuildReport({ repoRoot, runId, reportPath } = {}) {
  const selectedPath = reportPath || path.join(repoRoot, 'output', 'playwright', 'crm-ralph', `${runId}-build-report.json`);
  const absolutePath = path.isAbsolute(selectedPath) ? selectedPath : path.resolve(repoRoot, selectedPath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    throw new Error(`CRM Ralph build report is missing: ${path.relative(repoRoot, absolutePath)}`);
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`CRM Ralph build report must be valid JSON: ${formatError(error)}`);
  }
  if (report.schemaVersion !== 1 || report.scope !== 'crm-ralph-production-builds' || report.status !== 'passed') {
    throw new Error('CRM Ralph build report must be a passed schema 1 production-build report');
  }
  if (report.runId !== runId) {
    throw new Error(`CRM Ralph build report runId must equal ${runId}`);
  }
  return { absolutePath, report };
}

function inspectCompiledPublicRuntime({ repoRoot, target, publicApiUrl, publicWebSocketUrl, relativePaths }) {
  const requiredValues = [{ name: 'NEXT_PUBLIC_API_URL', value: publicApiUrl }];
  if (target === 'dms') requiredValues.push({ name: 'NEXT_PUBLIC_WS_URL', value: publicWebSocketUrl });
  const searchableFiles = relativePaths.filter((relativePath) => /\.(?:js|json)$/u.test(relativePath));
  const values = requiredValues.map(({ name, value }) => {
    const containingFiles = [];
    for (const relativePath of searchableFiles) {
      const content = fs.readFileSync(path.join(repoRoot, relativePath));
      if (content.includes(Buffer.from(value, 'utf8'))) containingFiles.push(relativePath);
    }
    if (containingFiles.length === 0) {
      throw new Error(`CRM Ralph ${target} build does not contain compiled ${name}=${value}`);
    }
    return {
      name,
      value,
      containingFileCount: containingFiles.length,
      containingFiles,
    };
  });
  return { values };
}

function collectNextRuntimeFiles(repoRoot, appName) {
  const root = `apps/web/${appName}/.next`;
  const requiredFiles = [
    `${root}/BUILD_ID`,
    `${root}/build-manifest.json`,
    `${root}/app-build-manifest.json`,
    `${root}/required-server-files.json`,
    `${root}/server/app-paths-manifest.json`,
    `${root}/server/middleware-manifest.json`,
  ];
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      throw new Error(`CRM Ralph production build artifact is missing: ${relativePath}`);
    }
  }
  const runtimeFiles = [
    ...requiredFiles,
    ...collectFiles(repoRoot, `${root}/static`),
    ...collectFiles(repoRoot, `${root}/server`),
  ];
  return [...new Set(runtimeFiles)].sort(compareUtf8);
}

function collectFiles(repoRoot, relativeDirectory) {
  const absoluteDirectory = path.join(repoRoot, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory) || !fs.statSync(absoluteDirectory).isDirectory()) {
    throw new Error(`CRM Ralph build directory is missing: ${relativeDirectory}`);
  }
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => compareUtf8(left.name, right.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(path.relative(repoRoot, absolutePath).split(path.sep).join('/'));
    }
  };
  visit(absoluteDirectory);
  if (files.length === 0) throw new Error(`CRM Ralph build directory is empty: ${relativeDirectory}`);
  return files.sort(compareUtf8);
}

function createFileRecord(repoRoot, relativePath) {
  const content = fs.readFileSync(path.join(repoRoot, relativePath));
  return { path: relativePath, size: content.length, sha256: sha256(content) };
}

function assertArtifactShape(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (value.algorithm !== 'sha256') throw new Error(`${label}.algorithm must equal sha256`);
  if (!/^[a-f0-9]{64}$/u.test(value.fingerprint ?? '')) throw new Error(`${label}.fingerprint must be a SHA-256 digest`);
  if (!Number.isSafeInteger(value.fileCount) || value.fileCount <= 0) throw new Error(`${label}.fileCount must be positive`);
  if (!Array.isArray(value.files) || value.files.length !== value.fileCount) throw new Error(`${label}.files must match fileCount`);
}

function assertTarget(target) {
  if (!CRM_RALPH_BUILD_TARGETS.includes(target)) {
    throw new Error(`Unknown CRM Ralph build target ${String(target)}`);
  }
}

function compareUtf8(left, right) {
  return Buffer.from(left, 'utf8').compare(Buffer.from(right, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
