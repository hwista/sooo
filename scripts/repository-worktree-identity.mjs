import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPOSITORY_WORKTREE_IDENTITY_SCHEMA_VERSION = 1;
export const REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES = Object.freeze([
  '.runtime/',
  'docs/crm/evidence/',
  'output/',
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const HEAD_PATTERN = /^[a-f0-9]{40}$/u;

export function createRepositoryWorktreeIdentity({ repoRoot = process.cwd() } = {}) {
  const absoluteRepoRoot = path.resolve(repoRoot);
  const head = runGit(absoluteRepoRoot, ['rev-parse', 'HEAD']).toString('utf8').trim();
  if (!HEAD_PATTERN.test(head)) {
    throw new Error(`repository HEAD must be a lowercase 40-character SHA, got ${JSON.stringify(head)}`);
  }

  const paths = runGit(absoluteRepoRoot, [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(normalizeRepositoryPath)
    .filter((relativePath) => !isExcluded(relativePath))
    .sort(compareUtf8);

  const records = paths.map((relativePath) => createRecord(absoluteRepoRoot, relativePath));
  const fingerprint = sha256(Buffer.from(`${JSON.stringify(records)}\n`, 'utf8'));

  return {
    schemaVersion: REPOSITORY_WORKTREE_IDENTITY_SCHEMA_VERSION,
    algorithm: 'sha256',
    scope: 'git-tracked-and-untracked-working-files',
    head,
    fingerprint,
    fileCount: records.length,
    excludedPrefixes: [...REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES],
  };
}

export function assertRepositoryWorktreeIdentity(actual, expected, label = 'worktreeIdentity') {
  assertIdentityShape(actual, label);
  assertIdentityShape(expected, 'currentWorktreeIdentity');
  for (const field of [
    'schemaVersion',
    'algorithm',
    'scope',
    'head',
    'fingerprint',
    'fileCount',
  ]) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}.${field} does not match the current repository worktree`);
    }
  }
  if (JSON.stringify(actual.excludedPrefixes) !== JSON.stringify(expected.excludedPrefixes)) {
    throw new Error(`${label}.excludedPrefixes does not match the current repository worktree contract`);
  }
}

export function sameRepositoryWorktreeIdentity(left, right) {
  try {
    assertRepositoryWorktreeIdentity(left, right);
    return true;
  } catch {
    return false;
  }
}

function createRecord(repoRoot, relativePath) {
  const absolutePath = path.resolve(repoRoot, ...relativePath.split('/'));
  const containedPath = path.relative(repoRoot, absolutePath);
  if (containedPath.startsWith('..') || path.isAbsolute(containedPath)) {
    throw new Error(`repository path escapes the worktree: ${relativePath}`);
  }

  let stat;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { path: relativePath, type: 'missing', executable: false, size: 0, sha256: sha256(Buffer.alloc(0)) };
    }
    throw error;
  }

  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(absolutePath, 'utf8');
    return {
      path: relativePath,
      type: 'symlink',
      executable: false,
      size: Buffer.byteLength(target),
      sha256: sha256(Buffer.from(target, 'utf8')),
    };
  }
  if (stat.isFile()) {
    return {
      path: relativePath,
      type: 'file',
      executable: (stat.mode & 0o111) !== 0,
      size: stat.size,
      sha256: sha256(fs.readFileSync(absolutePath)),
    };
  }

  throw new Error(`repository path must be a file, symlink, or missing tracked file: ${relativePath}`);
}

function assertIdentityShape(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  if (value.schemaVersion !== REPOSITORY_WORKTREE_IDENTITY_SCHEMA_VERSION) {
    throw new Error(`${label}.schemaVersion must equal ${REPOSITORY_WORKTREE_IDENTITY_SCHEMA_VERSION}`);
  }
  if (value.algorithm !== 'sha256') {
    throw new Error(`${label}.algorithm must equal sha256`);
  }
  if (value.scope !== 'git-tracked-and-untracked-working-files') {
    throw new Error(`${label}.scope is invalid`);
  }
  if (!HEAD_PATTERN.test(value.head ?? '')) {
    throw new Error(`${label}.head must be a lowercase 40-character SHA`);
  }
  if (!SHA256_PATTERN.test(value.fingerprint ?? '')) {
    throw new Error(`${label}.fingerprint must be a lowercase SHA-256 digest`);
  }
  if (!Number.isSafeInteger(value.fileCount) || value.fileCount <= 0) {
    throw new Error(`${label}.fileCount must be a positive safe integer`);
  }
  if (
    !Array.isArray(value.excludedPrefixes)
    || value.excludedPrefixes.length !== REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES.length
    || value.excludedPrefixes.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error(`${label}.excludedPrefixes is invalid`);
  }
}

function runGit(repoRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = (result.stderr ?? Buffer.alloc(0)).toString('utf8').trim();
    const spawnError = result.error instanceof Error ? result.error.message : '';
    throw new Error(
      `git ${args.join(' ')} failed in ${repoRoot} (status ${String(result.status)})`
        + `${detail || spawnError ? `: ${detail || spawnError}` : ''}`,
    );
  }
  return result.stdout ?? Buffer.alloc(0);
}

function normalizeRepositoryPath(value) {
  const normalized = path.posix.normalize(value.replaceAll('\\', '/'));
  if (
    normalized === '.'
    || normalized === '..'
    || normalized.startsWith('../')
    || path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`invalid repository path from git ls-files: ${value}`);
  }
  return normalized;
}

function isExcluded(relativePath) {
  return REPOSITORY_WORKTREE_IDENTITY_EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function compareUtf8(left, right) {
  return Buffer.from(left, 'utf8').compare(Buffer.from(right, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function runSelfTest() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-worktree-identity-'));
  try {
    runGit(temporaryRoot, ['init', '--quiet']);
    runGit(temporaryRoot, ['config', 'user.email', 'worktree-identity@example.invalid']);
    runGit(temporaryRoot, ['config', 'user.name', 'Worktree Identity Self Test']);
    fs.writeFileSync(path.join(temporaryRoot, 'tracked.txt'), 'first\n');
    runGit(temporaryRoot, ['add', 'tracked.txt']);
    runGit(temporaryRoot, ['commit', '--quiet', '-m', 'self-test baseline']);
    fs.writeFileSync(path.join(temporaryRoot, 'untracked.txt'), 'untracked\n');

    const baseline = createRepositoryWorktreeIdentity({ repoRoot: temporaryRoot });
    fs.writeFileSync(path.join(temporaryRoot, 'tracked.txt'), 'second\n');
    const changed = createRepositoryWorktreeIdentity({ repoRoot: temporaryRoot });
    if (baseline.fingerprint === changed.fingerprint) {
      throw new Error('same-status tracked content change did not change the worktree fingerprint');
    }
    let staleRejected = false;
    try {
      assertRepositoryWorktreeIdentity(baseline, changed, 'staleFixture');
    } catch {
      staleRejected = true;
    }
    if (!staleRejected) throw new Error('stale worktree identity was accepted');

    fs.writeFileSync(path.join(temporaryRoot, 'tracked.txt'), 'first\n');
    const restored = createRepositoryWorktreeIdentity({ repoRoot: temporaryRoot });
    assertRepositoryWorktreeIdentity(restored, baseline, 'restoredFixture');

    const excludedEvidenceDirectory = path.join(temporaryRoot, 'docs', 'crm', 'evidence');
    fs.mkdirSync(excludedEvidenceDirectory, { recursive: true });
    fs.writeFileSync(path.join(excludedEvidenceDirectory, 'generated.json'), '{"generated":true}\n');
    const evidenceWritten = createRepositoryWorktreeIdentity({ repoRoot: temporaryRoot });
    assertRepositoryWorktreeIdentity(evidenceWritten, baseline, 'excludedEvidenceFixture');

    console.log('✓ repository worktree identity content/stale/exclusion self-test passed');
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
  } else {
    console.log(JSON.stringify(createRepositoryWorktreeIdentity(), null, 2));
  }
}
