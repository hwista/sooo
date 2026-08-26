#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBaseUrl = (process.env.CRM_SECRET_AUDIT_API_URL || 'http://127.0.0.1:4105/api').replace(/\/$/, '');
const adminUrl = process.env.CRM_SECRET_AUDIT_ADMIN_URL;
const marker = 'crm-s10-secret-marker';

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  return {
    status: response.status,
    text,
    payload: text ? JSON.parse(text) : null,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

function assertMarkerAbsent(label, value) {
  assert.equal(JSON.stringify(value).includes(marker), false, `${label} exposed the synthetic credential marker`);
}

async function login(loginId, password, app = 'crm') {
  const result = await request(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ssoo-app': app },
    body: JSON.stringify({ loginId, password }),
  });
  assert.equal(result.status, 200, `${loginId} login failed with ${result.status}`);
  const token = result.payload?.data?.accessToken;
  assert.equal(typeof token, 'string', `${loginId} login did not return an access token`);
  return token;
}

const [adminToken, viewerToken] = await Promise.all([
  login('admin', process.env.CRM_SECRET_AUDIT_ADMIN_PASSWORD || 'admin123!', 'admin'),
  login('viewer.han', process.env.CRM_SECRET_AUDIT_VIEWER_PASSWORD || 'user123!', 'crm'),
]);
const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'x-ssoo-app': 'admin' };
const viewerHeaders = { Authorization: `Bearer ${viewerToken}`, 'x-ssoo-app': 'crm' };

const adminPaths = [
  '/crm/settings',
  '/crm/settings/history',
  '/crm/operations/readiness',
  '/crm/operations/launch-readiness',
  '/crm/operations/attempts?limit=100',
  '/dms/settings?includeRuntime=1',
  '/dms/settings/readiness',
];
for (const pathname of adminPaths) {
  const result = await request(`${apiBaseUrl}${pathname}`, { headers: adminHeaders });
  assert.equal(result.status, 200, `${pathname} returned ${result.status}: ${result.text.slice(0, 300)}`);
  assertMarkerAbsent(pathname, { body: result.payload, headers: result.headers });
}

const viewerSettings = await request(`${apiBaseUrl}/dms/settings?includeRuntime=1`, { headers: viewerHeaders });
assert.equal(viewerSettings.status, 200, `viewer DMS settings returned ${viewerSettings.status}`);
assert.equal(Object.hasOwn(viewerSettings.payload?.data?.config || {}, 'system'), false, 'viewer DMS settings exposed the system configuration');
const viewerReadiness = await request(`${apiBaseUrl}/dms/settings/readiness`, { headers: viewerHeaders });
assert.equal(viewerReadiness.status, 403, `viewer DMS readiness must be denied, got ${viewerReadiness.status}`);
assertMarkerAbsent('viewer settings/readiness', { settings: viewerSettings, readiness: viewerReadiness });

const invalidAttempt = await request(
  `${apiBaseUrl}/crm/operations/attempts/not-a-number?access_token=${marker}`,
  { headers: adminHeaders },
);
assert.equal(invalidAttempt.status, 400, `invalid attempt expected 400, got ${invalidAttempt.status}`);
assertMarkerAbsent('error response query masking', invalidAttempt);

const immutableDmsGit = await request(`${apiBaseUrl}/dms/settings`, {
  method: 'POST',
  headers: { ...adminHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    config: { system: { git: { bootstrapRemoteUrl: `https://operator:${marker}@git.example/repo.git` } } },
  }),
});
assert.equal(immutableDmsGit.status, 400, `immutable DMS Git update expected 400, got ${immutableDmsGit.status}`);
assertMarkerAbsent('DMS immutable setting error', immutableDmsGit);

const invalidAuthorization = await request(`${apiBaseUrl}/crm/operations/launch-readiness`, {
  headers: { Authorization: `Bearer ${marker}`, 'x-ssoo-app': 'crm' },
});
assert.equal(invalidAuthorization.status, 401, `invalid authorization expected 401, got ${invalidAuthorization.status}`);
assertMarkerAbsent('authorization failure', invalidAuthorization);

if (adminUrl) {
  const adminBridge = await request(adminUrl, { headers: adminHeaders });
  assert.equal(adminBridge.status, 200, `Admin readiness bridge returned ${adminBridge.status}`);
  assertMarkerAbsent('Admin readiness bridge', adminBridge);
}

for (const relativePath of [
  'docs/common/reference/api/openapi.json',
  'docs/dms/reference/api/openapi.json',
  'docs/crm/reference/api/openapi.json',
]) {
  const openApi = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
  assertMarkerAbsent(relativePath, openApi);
}

const staticContracts = {
  attempt: await fs.readFile(path.join(repoRoot, 'apps/server/src/modules/crm/operations/operation-attempt.service.ts'), 'utf8'),
  filter: await fs.readFile(path.join(repoRoot, 'apps/server/src/common/filters/http-exception.filter.ts'), 'utf8'),
  dmsLogger: await fs.readFile(path.join(repoRoot, 'apps/server/src/modules/dms/runtime/dms-logger.ts'), 'utf8'),
};
assert.match(staticContracts.attempt, /toSafeHttpException/, 'CRM attempt failure must throw only a sanitized HTTP exception');
assert.match(staticContracts.filter, /redactSecretsInText\(request\.url\)/, 'global error responses must redact sensitive query values');
assert.match(staticContracts.dmsLogger, /redactSecretsInValue\(context\)/, 'DMS structured logs must redact secret values');

console.log(JSON.stringify({
  ok: true,
  checkedAdminSurfaces: adminPaths.length + (adminUrl ? 1 : 0),
  viewerSystemConfig: 'hidden',
  viewerReadiness: '403',
  errorAndAuthorizationMarkerLeaks: 0,
  openApiMarkerLeaks: 0,
}, null, 2));

