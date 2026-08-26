import fs from 'node:fs';
import path from 'node:path';

export const CRM_SOURCE_PROTOTYPE_ENTRY_FILES = Object.freeze([
  'index.html',
  'login.js',
  'supabase_client.js',
]);

function isDirectory(directory) {
  return fs.statSync(directory, { throwIfNoEntry: false })?.isDirectory() === true;
}

function containsEntryFiles(directory) {
  return CRM_SOURCE_PROTOTYPE_ENTRY_FILES.every((fileName) => (
    fs.statSync(path.join(directory, fileName), { throwIfNoEntry: false })?.isFile() === true
  ));
}

export function resolveCrmSourcePrototypeRoot(inputDirectory) {
  const inputRoot = path.resolve(inputDirectory);
  if (!isDirectory(inputRoot)) {
    throw new Error('CRM_SOURCE_PROTOTYPE_DIR must resolve to a directory');
  }
  if (containsEntryFiles(inputRoot)) {
    return { inputRoot, prototypeRoot: inputRoot, resolution: 'direct' };
  }

  const entries = fs.readdirSync(inputRoot, { withFileTypes: true });
  if (entries.length === 1 && entries[0].isDirectory()) {
    const nestedRoot = path.join(inputRoot, entries[0].name);
    if (containsEntryFiles(nestedRoot)) {
      return { inputRoot, prototypeRoot: nestedRoot, resolution: 'single-wrapper' };
    }
  }

  throw new Error(
    `CRM_SOURCE_PROTOTYPE_DIR must contain ${CRM_SOURCE_PROTOTYPE_ENTRY_FILES.join(', ')} directly `
    + 'or contain exactly one wrapper directory with those files and no sibling entries',
  );
}
