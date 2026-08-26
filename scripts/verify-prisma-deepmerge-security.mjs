#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const databasePackage = path.join(repoRoot, 'packages/database/package.json');
const requireFromDatabase = createRequire(databasePackage);
const prismaPackage = requireFromDatabase.resolve('prisma/package.json');
const requireFromPrisma = createRequire(prismaPackage);
const prismaConfigEntry = requireFromPrisma.resolve('@prisma/config');
const requireFromPrismaConfig = createRequire(prismaConfigEntry);
const deepmergeEntry = requireFromPrismaConfig.resolve('deepmerge-ts');
const deepmergePackagePath = findPackageJson(deepmergeEntry);
const deepmergePackage = JSON.parse(fs.readFileSync(deepmergePackagePath, 'utf8'));

const major = Number(String(deepmergePackage.version).split('.')[0]);
assert(Number.isInteger(major) && major >= 8, `deepmerge-ts must resolve to the patched major 8+, received ${deepmergePackage.version}`);

const deepmergeModule = await import(pathToFileURL(deepmergeEntry).href);
assert(typeof deepmergeModule.deepmerge === 'function', 'deepmerge-ts deepmerge export is unavailable');

const cyclic = { name: 'root' };
cyclic.self = cyclic;
const cyclicResult = deepmergeModule.deepmerge(cyclic);
assert(cyclicResult?.name === 'root', 'cyclic merge lost scalar configuration');
assert(cyclicResult.self === cyclicResult, 'cyclic merge did not preserve the self reference safely');

const configResult = deepmergeModule.deepmerge(
  { datasource: { url: 'postgresql://first.invalid/db' }, featureFlags: ['base'] },
  { generator: { provider: 'prisma-client-js' }, featureFlags: ['launch'] },
);
assert(configResult.datasource?.url === 'postgresql://first.invalid/db', 'standard object merge lost datasource config');
assert(configResult.generator?.provider === 'prisma-client-js', 'standard object merge lost generator config');

const prismaValidate = spawnSync(
  'pnpm',
  ['--filter', '@ssoo/database', 'exec', 'prisma', 'validate', '--schema', 'prisma/schema.prisma'],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ssoo:contract@127.0.0.1:5432/ssoo_contract?schema=public',
    },
    stdio: 'inherit',
  },
);
assert(!prismaValidate.error && prismaValidate.status === 0, 'Prisma validate failed with the patched deepmerge-ts resolution');

console.log(`[ok] Prisma/deepmerge security contract passed with deepmerge-ts ${deepmergePackage.version}`);

function findPackageJson(entryPath) {
  let current = path.dirname(entryPath);
  while (current !== path.dirname(current)) {
    const candidate = path.join(current, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  throw new Error(`package.json not found for ${entryPath}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
