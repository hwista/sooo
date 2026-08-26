#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import {
  createDmsGoLiveGatePlan,
  DMS_GO_LIVE_CURRENT_DOC_MARKERS,
  DMS_GO_LIVE_REQUIRED_ASSETS,
  DMS_GO_LIVE_TRACK_IDS,
} from './dms-go-live-contract.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');

const fixture = {
  localRuntimeDir: '/tmp/dms-launch-contract/runtime',
  localPostgresPort: '55439',
  localServerPort: '24001',
  localDmsPort: '23003',
  localAdminPort: '23000',
  localSmtpPort: '22525',
  localServerUrl: 'http://127.0.0.1:24001',
  localDmsUrl: 'http://127.0.0.1:23003',
  localAdminUrl: 'http://127.0.0.1:23000',
  runId: 'contract-self-test',
  evidenceDir: 'output/dms-go-live/contract-self-test',
};

const gatePlan = createDmsGoLiveGatePlan(fixture);
const trackIds = gatePlan.map((track) => track.id);
assert(
  JSON.stringify(trackIds) === JSON.stringify(DMS_GO_LIVE_TRACK_IDS),
  `launch tracks must remain canonical: ${DMS_GO_LIVE_TRACK_IDS.join(', ')}`,
);

const stepIds = gatePlan.flatMap((track) => track.steps.map(([stepId]) => stepId));
assert(new Set(stepIds).size === stepIds.length, 'go-live gate step IDs must be unique');
for (const requiredStep of [
  'launch-contract',
  'launch-types',
  'playwright-stack-contract',
  'production-security-audit',
  'prisma-deepmerge-security',
  'remote-release-state',
  'backup-restore',
  'isolated-operational-browser',
  'production-browser',
]) {
  assert(stepIds.includes(requiredStep), `required launch step is missing: ${requiredStep}`);
}

for (const requiredPath of DMS_GO_LIVE_REQUIRED_ASSETS) {
  assert(fs.existsSync(path.join(repoRoot, requiredPath)), `required launch asset is missing: ${requiredPath}`);
}

for (const doc of DMS_GO_LIVE_CURRENT_DOC_MARKERS) {
  const source = read(doc.path);
  for (const marker of doc.markers) {
    assert(source.includes(marker), `current launch doc marker is missing: ${doc.path} -> ${marker}`);
  }
  assert(!source.includes('네 트랙 통합 gate'), `current launch doc still declares four tracks: ${doc.path}`);
}

const sharedHelperSpecs = [
  'automation/tests/e2e/admin-operational-readiness.spec.ts',
  'automation/tests/e2e/dms-operational-settings.spec.ts',
  'automation/tests/e2e/dms-production-readiness.spec.ts',
  'automation/tests/e2e/dms-launch-smoke.spec.ts',
  'automation/tests/e2e/flows/ws015-markdown-fixes.spec.ts',
  'automation/tests/e2e/flows/ws019-inline-file-selection.spec.ts',
];
for (const specPath of sharedHelperSpecs) {
  const source = read(specPath);
  assert(source.includes('support/launch-browser'), `launch auth/evidence helper is not used: ${specPath}`);
  assert(!source.includes('function collectBrowserFailures('), `duplicate failure collector is forbidden: ${specPath}`);
}

assert(read('automation/playwright.config.ts').includes('PLAYWRIGHT_OUTPUT_DIR'), 'Playwright output directory must be run-scoped');
assert(read('automation/scripts/playwright/start-dms-e2e-stack.sh').includes('PLAYWRIGHT_RUN_ID'), 'Playwright runtime must be run-scoped');
for (const marker of ['PLAYWRIGHT_RUN_ID', 'PLAYWRIGHT_OUTPUT_DIR']) {
  assert(read('scripts/dms-go-live-contract.mjs').includes(marker), `go-live plan must pass ${marker}`);
}

const goLiveSource = read('scripts/run-dms-go-live-gate.mjs');
for (const marker of ['--resume', 'checkpoint.json', 'atomicWriteJson', 'worktreeFingerprint', 'planHash']) {
  assert(goLiveSource.includes(marker), `go-live interruption contract marker is missing: ${marker}`);
}

console.log(`[ok] DMS launch contract verified: ${trackIds.length} tracks, ${stepIds.length} unique steps`);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
