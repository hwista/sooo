import fs from 'fs';
import path from 'path';

function resolveThroughExistingAncestor(candidatePath: string): string {
  const unresolvedSegments: string[] = [];
  let existingPath = path.resolve(candidatePath);

  while (!fs.existsSync(existingPath)) {
    const parentPath = path.dirname(existingPath);
    if (parentPath === existingPath) {
      return path.resolve(candidatePath);
    }
    unresolvedSegments.unshift(path.basename(existingPath));
    existingPath = parentPath;
  }

  try {
    return path.resolve(fs.realpathSync.native(existingPath), ...unresolvedSegments);
  } catch {
    return path.resolve(candidatePath);
  }
}

function isContainedPath(rootDir: string, targetPath: string): boolean {
  const canonicalRoot = resolveThroughExistingAncestor(rootDir);
  const canonicalTarget = resolveThroughExistingAncestor(targetPath);
  const relativePath = path.relative(canonicalRoot, canonicalTarget);

  return relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  return inputPath
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/');
}

export function normalizeRelativePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  const sanitizedInput = normalizePath(inputPath.trim());
  if (!sanitizedInput) {
    return '';
  }

  return normalizePath(path.normalize(sanitizedInput).replace(/^[/\\]+/, ''));
}

export function resolveContainedPath(rootDir: string, inputPath: string): {
  targetPath: string;
  safeRelPath: string;
  valid: boolean;
} {
  const normalizedInput = normalizeRelativePath(inputPath);
  const targetPath = path.resolve(rootDir, normalizedInput);
  const relativePath = path.relative(rootDir, targetPath);
  const lexicallyContained = relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
  const valid = lexicallyContained && isContainedPath(rootDir, targetPath);

  return {
    targetPath,
    safeRelPath: normalizePath(relativePath),
    valid,
  };
}
