import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBaseUrl = (process.env.CRM_READINESS_API_URL || 'http://127.0.0.1:4105/api').replace(/\/$/, '');
const adminUrl = process.env.CRM_READINESS_ADMIN_URL || 'http://127.0.0.1:3110/api/launch-readiness';
const crmWebUrl = process.env.CRM_READINESS_CRM_WEB_URL || 'http://127.0.0.1:3105/api/crm/operations/launch-readiness';
const dmsWebUrl = process.env.CRM_READINESS_DMS_WEB_URL || 'http://127.0.0.1:3113/api/settings?includeRuntime=1';
const unavailableAdminUrl = process.env.CRM_READINESS_UNAVAILABLE_ADMIN_URL;

async function readJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const payload = await response.json().catch(() => null);
  assert.equal(response.ok, true, `${url} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

const login = await readJson(`${apiBaseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-ssoo-app': 'admin' },
  body: JSON.stringify({
    loginId: process.env.CRM_READINESS_ADMIN_LOGIN_ID || 'admin',
    password: process.env.CRM_READINESS_ADMIN_PASSWORD || 'admin123!',
  }),
});
const token = login?.data?.accessToken;
assert.equal(typeof token, 'string', 'admin login did not return an access token');
const headers = { Authorization: `Bearer ${token}` };

const [crmOwnerResponse, dmsOwnerResponse, adminResponse, crmWebResponse, dmsWebResponse] = await Promise.all([
  readJson(`${apiBaseUrl}/crm/operations/launch-readiness`, { headers }),
  readJson(`${apiBaseUrl}/dms/settings/readiness`, { headers }),
  readJson(adminUrl, { headers }),
  readJson(crmWebUrl, { headers }),
  readJson(dmsWebUrl, { headers }),
]);

const crmOwner = crmOwnerResponse?.data;
const dmsOwner = dmsOwnerResponse?.data;
const adminServices = adminResponse?.data?.services;
const adminCrm = adminServices?.find((service) => service.owner === 'crm');
const adminDms = adminServices?.find((service) => service.owner === 'dms');
const crmWeb = crmWebResponse?.data;
const dmsWeb = dmsWebResponse?.runtime?.readiness;
const exactFields = [
  'snapshotId',
  'checkedAt',
  'expiresAt',
  'refreshWindowSeconds',
  'source',
  'status',
  'reason',
  'blockerCount',
  'degradedCount',
  'totalCount',
  'ownerHref',
];

function assertSameSnapshot(label, owner, consumer) {
  assert.ok(owner && consumer, `${label} snapshot response is missing`);
  for (const field of exactFields) {
    assert.deepEqual(consumer[field], owner[field], `${label}.${field} differs from owner snapshot`);
  }
  assert.equal(owner.refreshWindowSeconds, 5, `${label} refresh window must be 5 seconds`);
  assert.equal(Date.parse(owner.expiresAt) - Date.parse(owner.checkedAt), 30_000, `${label} max age must be 30 seconds`);
  if (owner.status === 'unknown') {
    assert.equal(owner.blockerCount, null, `${label} unknown blockerCount must be null`);
    assert.equal(owner.degradedCount, null, `${label} unknown degradedCount must be null`);
  }
}

assertSameSnapshot('CRM Admin bridge', crmOwner, adminCrm);
assertSameSnapshot('CRM owner web', crmOwner, crmWeb);
assertSameSnapshot('DMS Admin bridge', dmsOwner, adminDms);
assertSameSnapshot('DMS owner web', dmsOwner, dmsWeb);

const contractPath = path.join(repoRoot, 'apps/web/admin/src/app/api/launch-readiness/readinessContract.ts');
const contractSource = await fs.readFile(contractPath, 'utf8');
const contractJs = ts.transpileModule(contractSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const contractModule = await import(`data:text/javascript;base64,${Buffer.from(contractJs).toString('base64')}`);
const normalizeOwnerSnapshot = contractModule.normalizeOwnerSnapshot;
assert.equal(typeof normalizeOwnerSnapshot, 'function', 'Admin readiness normalizer export is missing');

const now = Date.parse('2026-08-19T00:01:00.000Z');
const fresh = {
  owner: 'crm',
  snapshotId: 'crm-contract-test',
  checkedAt: '2026-08-19T00:00:45.000Z',
  expiresAt: '2026-08-19T00:01:15.000Z',
  refreshWindowSeconds: 5,
  source: 'crm.operations.live-probe',
  status: 'ready',
  reason: 'fresh owner reason',
  blockerCount: 0,
  degradedCount: 0,
  totalCount: 17,
  ownerHref: '/operations',
};
assert.deepEqual(normalizeOwnerSnapshot('crm', fresh, now), fresh, 'fresh owner snapshot must pass through unchanged');
const stale = normalizeOwnerSnapshot('crm', { ...fresh, expiresAt: '2026-08-19T00:00:59.999Z' }, now);
assert.equal(stale.status, 'unknown', 'stale snapshot must become unknown');
assert.equal(stale.source, 'admin.bridge.stale', 'stale snapshot source must identify the bridge decision');
assert.equal(stale.blockerCount, null, 'stale blockerCount must not fall back to zero');
assert.equal(stale.degradedCount, null, 'stale degradedCount must not fall back to zero');
const malformed = normalizeOwnerSnapshot('crm', { ...fresh, snapshotId: null }, now);
assert.equal(malformed.status, 'unknown', 'malformed snapshot must become unknown');
assert.equal(malformed.blockerCount, null, 'malformed blockerCount must not fall back to zero');

if (unavailableAdminUrl) {
  const unavailableResponse = await readJson(unavailableAdminUrl, { headers });
  for (const service of unavailableResponse?.data?.services || []) {
    assert.equal(service.status, 'unknown', `${service.owner} unavailable upstream must be unknown`);
    assert.equal(service.source, 'admin.bridge.unavailable', `${service.owner} unavailable source is incorrect`);
    assert.equal(service.blockerCount, null, `${service.owner} unavailable blockerCount must be null`);
    assert.equal(service.degradedCount, null, `${service.owner} unavailable degradedCount must be null`);
    assert.equal(service.totalCount, null, `${service.owner} unavailable totalCount must be null`);
  }
  assert.equal(unavailableResponse?.data?.services?.length, 2, 'unavailable Admin bridge must retain both owner cards');
}

console.log(JSON.stringify({
  ok: true,
  refreshWindowSeconds: 5,
  maxAgeSeconds: 30,
  crm: {
    snapshotId: crmOwner.snapshotId,
    status: crmOwner.status,
    blockerCount: crmOwner.blockerCount,
    degradedCount: crmOwner.degradedCount,
  },
  dms: {
    snapshotId: dmsOwner.snapshotId,
    status: dmsOwner.status,
    blockerCount: dmsOwner.blockerCount,
    degradedCount: dmsOwner.degradedCount,
  },
  staleAndMalformedFallback: 'unknown/null',
  unavailableUpstreamFallback: unavailableAdminUrl ? 'unknown/null' : 'not-requested',
}, null, 2));
