#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const options = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  template: argv.includes('--template'),
  inputOnly: argv.includes('--input-only'),
  packetPath: readOption('--packet', process.env.CRM_GO_LIVE_SELLER_INPUT_PATH || ''),
  envFile: readOption('--env-file', process.env.CRM_GO_LIVE_ENV_FILE || '.env.production'),
  evidencePath: readOption('--evidence', process.env.CRM_GO_LIVE_EVIDENCE_PATH || ''),
};

if (options.help) {
  printUsage();
} else if (options.template) {
  process.stdout.write(`${JSON.stringify(createTemplate(), null, 2)}\n`);
} else if (options.selfTest) {
  await runSelfTest();
  console.log('✓ CRM go-live verifier self-test passed');
} else {
  await runCli();
}

async function runCli() {
  const startedAt = new Date().toISOString();
  let reportPath = options.evidencePath ? path.resolve(options.evidencePath) : '';
  try {
    if (!options.packetPath) {
      throw new Error('CRM_GO_LIVE_SELLER_INPUT_PATH or --packet=<path.json> is required');
    }
    const envPath = path.resolve(options.envFile);
    const packetPath = path.resolve(options.packetPath);
    verifyProductionEnvironment(envPath);
    const fileEnv = readEnvFile(envPath);
    const packet = readJson(packetPath, 'seller input packet');
    const input = validatePacket(packet, packetPath);

    if (options.inputOnly) {
      console.log(JSON.stringify({
        status: 'PASS_INPUT_READY',
        deploymentId: input.deploymentId,
        approvedAt: input.approvedAt,
        sellerFieldCount: input.sellerFields.length,
        ciMimeType: input.ciMimeType,
        ciSize: input.ciSize,
        credentialsStored: false,
      }, null, 2));
      return;
    }

    if (!reportPath) {
      throw new Error('CRM_GO_LIVE_EVIDENCE_PATH or --evidence=<path.json> is required for live verification');
    }
    const config = buildLiveConfig(fileEnv, input);
    const result = await verifyLive(config);
    const report = {
      contract: 'CRM-S15-GO-LIVE-API',
      schemaVersion: 1,
      status: 'PASS_LIVE_API_READY',
      finalGoLive: false,
      browserRequired: true,
      startedAt,
      completedAt: new Date().toISOString(),
      deploymentId: input.deploymentId,
      releaseSha: config.releaseSha,
      credentialsStored: false,
      input: {
        packetSha256: sha256(fs.readFileSync(packetPath)),
        approvedAt: input.approvedAt,
        sellerFieldNames: input.sellerFields,
        ciSha256: input.ciSha256,
        ciMimeType: input.ciMimeType,
        ciSize: input.ciSize,
      },
      endpoints: result.endpoints,
      readiness: result.readiness,
      checks: result.checks,
    };
    writeJson(reportPath, report);
    console.log(JSON.stringify({
      status: report.status,
      contract: report.contract,
      deploymentId: report.deploymentId,
      checkCount: report.checks.length,
      evidencePath: path.relative(repoRoot, reportPath),
      credentialsStored: false,
    }, null, 2));
  } catch (error) {
    const message = sanitizeError(error);
    if (reportPath) {
      try {
        writeJson(reportPath, {
          contract: 'CRM-S15-GO-LIVE-API',
          schemaVersion: 1,
          status: 'FAIL',
          finalGoLive: false,
          browserRequired: true,
          startedAt,
          completedAt: new Date().toISOString(),
          credentialsStored: false,
          error: message,
        });
      } catch {
        // Preserve the original verifier error; evidence write failure is secondary.
      }
    }
    console.error(`✗ CRM go-live verification failed: ${message}`);
    process.exitCode = 1;
  }
}

function verifyProductionEnvironment(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`production environment file does not exist: ${envPath}`);
  }
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'scripts', 'verify-production-compose-env.mjs'),
    '--env-file',
    envPath,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const summary = `${result.stdout || ''}\n${result.stderr || ''}`
      .split(/\r?\n/u)
      .filter((line) => line.trim())
      .slice(-12)
      .join(' | ');
    throw new Error(`production environment contract failed${summary ? `: ${summary}` : ''}`);
  }
}

function validatePacket(packet, packetPath) {
  assertObject(packet, 'packet');
  assertNoCredentialFields(packet);
  assertEqual(packet.schemaVersion, 1, 'schemaVersion');
  assertEqual(packet.status, 'approved', 'status');
  assertEqual(packet.environment, 'production', 'environment');
  assertText(packet.deploymentId, 'deploymentId', 120);
  assertNotPlaceholder(packet.deploymentId, 'deploymentId');
  assertIsoDate(packet.approvedAt, 'approvedAt');
  assertObject(packet.owner, 'owner');
  for (const field of ['businessOwner', 'technicalOwner', 'approvedBy']) {
    assertText(packet.owner[field], `owner.${field}`, 200);
    assertNotPlaceholder(packet.owner[field], `owner.${field}`);
  }

  assertObject(packet.sellerProfile, 'sellerProfile');
  const sellerLimits = {
    companyName: 200,
    ceoName: 120,
    businessRegistrationNo: 80,
    address: 500,
    tel: 80,
    email: 200,
  };
  for (const [field, limit] of Object.entries(sellerLimits)) {
    assertText(packet.sellerProfile[field], `sellerProfile.${field}`, limit);
    assertNotPlaceholder(packet.sellerProfile[field], `sellerProfile.${field}`);
  }
  for (const [field, limit] of Object.entries({ fax: 80, website: 200 })) {
    if (packet.sellerProfile[field] !== undefined && packet.sellerProfile[field] !== '') {
      assertText(packet.sellerProfile[field], `sellerProfile.${field}`, limit);
      assertNotPlaceholder(packet.sellerProfile[field], `sellerProfile.${field}`);
    }
  }
  if (!/^\S+@\S+\.\S+$/u.test(packet.sellerProfile.email)) {
    throw new Error('sellerProfile.email must be a valid email address');
  }
  if (packet.sellerProfile.website) {
    assertHttpsUrl(packet.sellerProfile.website, 'sellerProfile.website');
  }
  const registrationDigits = packet.sellerProfile.businessRegistrationNo.replace(/\D/gu, '');
  if (registrationDigits.length !== 10) {
    throw new Error('sellerProfile.businessRegistrationNo must contain exactly 10 digits');
  }

  assertObject(packet.ciAsset, 'ciAsset');
  assertText(packet.ciAsset.path, 'ciAsset.path', 1_000);
  assertNotPlaceholder(packet.ciAsset.path, 'ciAsset.path');
  assertSha256(packet.ciAsset.sha256, 'ciAsset.sha256');
  const ciPath = path.resolve(path.dirname(packetPath), packet.ciAsset.path);
  if (!fs.existsSync(ciPath) || !fs.statSync(ciPath).isFile()) {
    throw new Error('ciAsset.path must resolve to an existing regular file');
  }
  const ciBuffer = fs.readFileSync(ciPath);
  if (ciBuffer.length < 1 || ciBuffer.length > 5 * 1024 * 1024) {
    throw new Error('ciAsset must be between 1 byte and 5MB');
  }
  const detectedMimeType = detectImageMimeType(ciBuffer);
  if (!detectedMimeType) {
    throw new Error('ciAsset must be a PNG, JPEG, GIF, or WEBP image with a valid signature');
  }
  assertEqual(packet.ciAsset.mimeType, detectedMimeType, 'ciAsset.mimeType');
  assertEqual(packet.ciAsset.size, ciBuffer.length, 'ciAsset.size');
  assertEqual(packet.ciAsset.sha256, sha256(ciBuffer), 'ciAsset.sha256');

  const sellerFields = Object.keys(sellerLimits).filter((field) => packet.sellerProfile[field]);
  for (const field of ['fax', 'website']) {
    if (packet.sellerProfile[field]) sellerFields.push(field);
  }
  return {
    deploymentId: packet.deploymentId,
    approvedAt: packet.approvedAt,
    sellerProfile: Object.fromEntries(sellerFields.map((field) => [field, packet.sellerProfile[field].trim()])),
    sellerFields,
    ciPath,
    ciSha256: packet.ciAsset.sha256,
    ciMimeType: detectedMimeType,
    ciSize: ciBuffer.length,
  };
}

function buildLiveConfig(fileEnv, input) {
  const config = {
    apiUrl: fileEnv.AUTH_PUBLIC_API_BASE_URL || '',
    crmUrl: fileEnv.NEXT_PUBLIC_CRM_APP_URL || '',
    adminUrl: fileEnv.NEXT_PUBLIC_ADMIN_APP_URL || '',
    dmsUrl: fileEnv.NEXT_PUBLIC_DMS_APP_URL || '',
    releaseSha: fileEnv.SSOO_RELEASE_SHA || '',
    loginId: process.env.CRM_GO_LIVE_ADMIN_LOGIN_ID || '',
    password: process.env.CRM_GO_LIVE_ADMIN_PASSWORD || '',
    allowHttp: /^(1|true)$/iu.test(process.env.CRM_GO_LIVE_ALLOW_HTTP || ''),
    input,
  };
  for (const [name, value] of Object.entries({
    AUTH_PUBLIC_API_BASE_URL: config.apiUrl,
    NEXT_PUBLIC_CRM_APP_URL: config.crmUrl,
    NEXT_PUBLIC_ADMIN_APP_URL: config.adminUrl,
    NEXT_PUBLIC_DMS_APP_URL: config.dmsUrl,
  })) {
    validatePublicUrl(value, name, config.allowHttp);
  }
  if (!/^[0-9a-f]{40}$/u.test(config.releaseSha)) {
    throw new Error('SSOO_RELEASE_SHA must be a lowercase 40-character commit SHA');
  }
  if (!config.loginId || !config.password) {
    throw new Error('CRM_GO_LIVE_ADMIN_LOGIN_ID and CRM_GO_LIVE_ADMIN_PASSWORD must be injected at runtime');
  }
  return config;
}

async function verifyLive(config, requestFn = request) {
  const checks = [];
  const endpoints = {
    api: safeTarget(config.apiUrl),
    crm: safeTarget(config.crmUrl),
    admin: safeTarget(config.adminUrl),
    dms: safeTarget(config.dmsUrl),
  };

  const health = await requestFn(joinUrl(config.apiUrl, 'health'));
  assertStatus(health, 200, 'API health');
  assertRelease(health, config.releaseSha, 'API health');
  const healthBody = parseJson(health, 'API health');
  if (healthBody?.success !== true || healthBody?.data?.status !== 'ok') {
    throw new Error('API health did not return success=true and status=ok');
  }
  checks.push(check('api-health', health));

  const readiness = await requestFn(joinUrl(config.apiUrl, 'health/readiness'));
  assertStatus(readiness, 200, 'API readiness');
  assertRelease(readiness, config.releaseSha, 'API readiness');
  const readinessBody = parseJson(readiness, 'API readiness');
  if (readinessBody?.success !== true || readinessBody?.data?.status !== 'ready' || readinessBody?.data?.database !== 'ready') {
    throw new Error('API readiness did not prove status=ready and database=ready');
  }
  checks.push(check('api-readiness', readiness));

  for (const [id, baseUrl] of [['crm-web', config.crmUrl], ['admin-web', config.adminUrl], ['dms-web', config.dmsUrl]]) {
    const page = await requestFn(joinUrl(baseUrl, 'login'));
    assertStatus(page, 200, `${id} login page`);
    assertRelease(page, config.releaseSha, `${id} login page`);
    if (!/<!doctype html|<html/iu.test(page.body.toString('utf8'))) {
      throw new Error(`${id} login page did not return HTML`);
    }
    checks.push(check(id, page));
  }

  let accessToken = '';
  try {
    const login = await requestFn(joinUrl(config.apiUrl, 'auth/login'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: new URL(config.crmUrl).origin,
        'x-ssoo-app': 'crm',
      },
      body: JSON.stringify({ loginId: config.loginId, password: config.password }),
    });
    assertStatus(login, 200, 'CRM admin login');
    const loginBody = parseJson(login, 'CRM admin login');
    accessToken = loginBody?.data?.accessToken;
    if (typeof accessToken !== 'string' || accessToken.length < 20) {
      throw new Error('CRM admin login did not return an access token');
    }
    checks.push(check('crm-admin-login', login));
    const authHeaders = { authorization: `Bearer ${accessToken}` };

    const profileResponse = await requestFn(joinUrl(config.apiUrl, 'crm/quote-seller-profile'), { headers: authHeaders });
    assertStatus(profileResponse, 200, 'seller profile');
    const profileBody = parseJson(profileResponse, 'seller profile');
    if (profileBody?.success !== true || !profileBody.data) {
      throw new Error('seller profile response is missing data');
    }
    for (const [field, expected] of Object.entries(config.input.sellerProfile)) {
      if (profileBody.data[field]?.trim?.() !== expected) {
        throw new Error(`live seller profile does not match approved field ${field}`);
      }
    }
    if (profileBody.data.ciStatus !== 'configured' || !profileBody.data.ciStorageRef) {
      throw new Error('live seller profile CI is not configured');
    }
    checks.push(check('seller-profile-exact', profileResponse, { verifiedFieldCount: config.input.sellerFields.length }));

    const ciResponse = await requestFn(joinUrl(config.apiUrl, 'crm/quote-seller-profile/ci'), { headers: authHeaders });
    assertStatus(ciResponse, 200, 'seller CI');
    const liveCiMimeType = String(ciResponse.headers.get('content-type') || '').split(';')[0].trim();
    if (liveCiMimeType !== config.input.ciMimeType) throw new Error('live seller CI MIME type does not match approved input');
    if (ciResponse.body.length !== config.input.ciSize) throw new Error('live seller CI size does not match approved input');
    if (sha256(ciResponse.body) !== config.input.ciSha256) throw new Error('live seller CI hash does not match approved input');
    checks.push(check('seller-ci-exact', ciResponse, { sha256: config.input.ciSha256, size: config.input.ciSize, mimeType: liveCiMimeType }));

    const ownerResponse = await requestFn(joinUrl(config.apiUrl, 'crm/operations/launch-readiness'), { headers: authHeaders });
    assertStatus(ownerResponse, 200, 'CRM owner readiness');
    const ownerBody = parseJson(ownerResponse, 'CRM owner readiness');
    const owner = ownerBody?.data;
    assertReadySnapshot(owner, 'crm', 'CRM owner readiness');
    checks.push(check('crm-owner-readiness', ownerResponse, { snapshotId: owner.snapshotId }));

    const bridgeResponse = await requestFn(joinUrl(config.adminUrl, 'api/launch-readiness'), { headers: authHeaders });
    assertStatus(bridgeResponse, 200, 'Admin readiness bridge');
    const bridgeBody = parseJson(bridgeResponse, 'Admin readiness bridge');
    const services = bridgeBody?.data?.services;
    if (!Array.isArray(services)) throw new Error('Admin readiness bridge services are missing');
    const bridgeCrm = services.find((service) => service.owner === 'crm');
    const bridgeDms = services.find((service) => service.owner === 'dms');
    assertReadySnapshot(bridgeCrm, 'crm', 'Admin CRM readiness');
    assertReadySnapshot(bridgeDms, 'dms', 'Admin DMS readiness');
    if (bridgeCrm.snapshotId !== owner.snapshotId || bridgeCrm.checkedAt !== owner.checkedAt) {
      throw new Error('Admin CRM readiness does not preserve the owner snapshot identity');
    }
    checks.push(check('admin-readiness-bridge', bridgeResponse, {
      crmSnapshotId: bridgeCrm.snapshotId,
      dmsSnapshotId: bridgeDms.snapshotId,
    }));

    return {
      endpoints,
      readiness: {
        crm: summarizeSnapshot(bridgeCrm),
        dms: summarizeSnapshot(bridgeDms),
      },
      checks,
    };
  } finally {
    if (accessToken) {
      const logout = await requestFn(joinUrl(config.apiUrl, 'auth/logout'), {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      assertStatus(logout, 200, 'verification session logout');
      checks.push(check('verification-session-logout', logout));
    }
  }
}

function assertReadySnapshot(snapshot, owner, label) {
  if (!snapshot || snapshot.owner !== owner || snapshot.status !== 'ready') {
    throw new Error(`${label} must be ready`);
  }
  if (!snapshot.snapshotId || !snapshot.checkedAt || !snapshot.expiresAt) {
    throw new Error(`${label} snapshot identity is incomplete`);
  }
  if (snapshot.blockerCount !== 0 || snapshot.degradedCount !== 0) {
    throw new Error(`${label} must have blockerCount=0 and degradedCount=0`);
  }
  if (Date.parse(snapshot.expiresAt) <= Date.now()) {
    throw new Error(`${label} snapshot is expired`);
  }
}

function summarizeSnapshot(snapshot) {
  return {
    owner: snapshot.owner,
    snapshotId: snapshot.snapshotId,
    checkedAt: snapshot.checkedAt,
    expiresAt: snapshot.expiresAt,
    source: snapshot.source,
    status: snapshot.status,
    blockerCount: snapshot.blockerCount,
    degradedCount: snapshot.degradedCount,
    totalCount: snapshot.totalCount,
  };
}

async function request(url, init = {}) {
  let response;
  try {
    response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new Error(`request failed for ${safeTarget(url)}: ${sanitizeError(error)}`);
  }
  return {
    url: response.url,
    status: response.status,
    headers: response.headers,
    body: Buffer.from(await response.arrayBuffer()),
  };
}

function parseJson(response, label) {
  try {
    return JSON.parse(response.body.toString('utf8'));
  } catch {
    throw new Error(`${label} did not return JSON`);
  }
}

function check(kind, response, details = {}) {
  return { kind, target: safeTarget(response.url), status: 'passed', httpStatus: response.status, ...details };
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} returned HTTP ${response.status}, expected ${expected}`);
}

function assertRelease(response, releaseSha, label) {
  if (response.headers.get('x-ssoo-release-sha') !== releaseSha) {
    throw new Error(`${label} release identity does not match SSOO_RELEASE_SHA`);
  }
}

function validatePublicUrl(value, label, allowHttp) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL`);
  }
  if (parsed.username || parsed.password) throw new Error(`${label} must not embed credentials`);
  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    throw new Error(`${label} must use HTTPS`);
  }
  if (!allowHttp && /^(localhost|127\.0\.0\.1|::1)$/u.test(parsed.hostname)) {
    throw new Error(`${label} must use a non-local production hostname`);
  }
}

function assertHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error(`${label} must be an HTTPS URL without embedded credentials`);
  }
}

function detectImageMimeType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return '';
}

function assertNoCredentialFields(value, location = 'packet') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialFields(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/(password|secret|token|credential|api[_-]?key|connection[_-]?string)/iu.test(key)) {
      throw new Error(`${location}.${key} is forbidden; credentials must be injected at runtime`);
    }
    assertNoCredentialFields(child, `${location}.${key}`);
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`environment file does not exist: ${filePath}`);
  const result = {};
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/u).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.replace(/^export\s+/u, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) return;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, '').trimEnd();
    }
    result[match[1]] = value;
  });
  return result;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} does not exist: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function readOption(name, fallback) {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function assertText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  if (value.trim().length > maxLength) throw new Error(`${label} must be at most ${maxLength} characters`);
}

function assertNotPlaceholder(value, label) {
  if (/(change[-_ ]?me|replace[-_ ]?with|example\.invalid|todo|샘플|미설정)/iu.test(value)) {
    throw new Error(`${label} must not contain a placeholder value`);
  }
}

function assertIsoDate(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be an ISO date-time`);
}

function assertSha256(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} must equal ${expected}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function joinUrl(base, child) {
  return `${base.replace(/\/+$/u, '')}/${child.replace(/^\/+|\/+$/gu, '')}`;
}

function safeTarget(value) {
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/u, '');
  } catch {
    return '(invalid-url)';
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function sanitizeError(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/giu, 'Bearer [REDACTED]')
    .replace(/(password|secret|token|credential|api[_-]?key)=([^\s&]+)/giu, '$1=[REDACTED]');
}

function createTemplate() {
  return {
    schemaVersion: 1,
    status: 'draft',
    environment: 'production',
    deploymentId: 'replace-with-change-ticket-or-release-id',
    approvedAt: 'replace-with-ISO-date-time',
    owner: {
      businessOwner: 'replace-with-business-owner',
      technicalOwner: 'replace-with-technical-owner',
      approvedBy: 'replace-with-approver',
    },
    sellerProfile: {
      companyName: 'replace-with-legal-company-name',
      ceoName: 'replace-with-legal-representative-name',
      businessRegistrationNo: '000-00-00000',
      address: 'replace-with-registered-address',
      tel: 'replace-with-representative-phone',
      fax: '',
      website: '',
      email: 'replace-with-representative-email',
    },
    ciAsset: {
      path: 'replace-with-packet-relative-or-absolute-image-path',
      sha256: 'replace-with-lowercase-sha256',
      mimeType: 'image/png',
      size: 0,
    },
  };
}

async function runSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-go-live-'));
  const ciPath = path.join(tempDir, 'ci.png');
  const packetPath = path.join(tempDir, 'seller-input.json');
  const ciBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('crm-go-live-self-test'),
  ]);
  fs.writeFileSync(ciPath, ciBuffer);
  const packet = {
    schemaVersion: 1,
    status: 'approved',
    environment: 'production',
    deploymentId: 'S15-SELF-TEST-001',
    approvedAt: new Date().toISOString(),
    owner: { businessOwner: 'Business Owner', technicalOwner: 'Technical Owner', approvedBy: 'Launch Approver' },
    sellerProfile: {
      companyName: 'SSOO 주식회사',
      ceoName: '홍길동',
      businessRegistrationNo: '123-45-67890',
      address: '서울특별시 중구 세종대로 1',
      tel: '02-1234-5678',
      email: 'sales@ssoo.test',
    },
    ciAsset: { path: 'ci.png', sha256: sha256(ciBuffer), mimeType: 'image/png', size: ciBuffer.length },
  };
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  const input = validatePacket(packet, packetPath);
  assertThrows(() => validatePacket({ ...packet, status: 'draft' }, packetPath), 'status');
  assertThrows(() => validatePacket({ ...packet, ciAsset: { ...packet.ciAsset, sha256: '0'.repeat(64) } }, packetPath), 'ciAsset.sha256');
  assertThrows(() => validatePacket({ ...packet, apiToken: 'must-not-be-stored' }, packetPath), 'credentials must be injected');

  const releaseSha = '1234567890abcdef1234567890abcdef12345678';
  const snapshot = {
    owner: 'crm',
    snapshotId: 'crm-self-test',
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
    refreshWindowSeconds: 5,
    source: 'crm.operations.live-probe',
    status: 'ready',
    reason: 'ready',
    blockerCount: 0,
    degradedCount: 0,
    totalCount: 8,
    ownerHref: '/operations',
  };
  const dmsSnapshot = { ...snapshot, owner: 'dms', snapshotId: 'dms-self-test', source: 'dms.settings.live-probe', ownerHref: '/settings/operations/git' };
  try {
    const base = 'http://127.0.0.1:31999';
    const mockRequest = async (url, init = {}) => {
      const pathname = new URL(url).pathname;
      const method = init.method || 'GET';
      const json = (body, status = 200) => mockResponse(url, status, JSON.stringify(body), releaseSha, 'application/json');
      if (pathname === '/api/health') return json({ success: true, data: { status: 'ok' } });
      if (pathname === '/api/health/readiness') return json({ success: true, data: { status: 'ready', database: 'ready' } });
      if (pathname === '/api/auth/login' && method === 'POST') return json({ success: true, data: { accessToken: 'self-test-access-token-with-sufficient-length' } });
      if (pathname === '/api/auth/logout' && method === 'POST') return json({ success: true, data: true });
      if (pathname === '/api/crm/quote-seller-profile') return json({ success: true, data: { ...packet.sellerProfile, ciStatus: 'configured', ciStorageRef: 'local://crm/company-ci/ci.png' } });
      if (pathname === '/api/crm/quote-seller-profile/ci') return mockResponse(url, 200, ciBuffer, releaseSha, 'image/png');
      if (pathname === '/api/crm/operations/launch-readiness') return json({ success: true, data: snapshot });
      if (pathname === '/admin/api/launch-readiness') return json({ success: true, data: { services: [snapshot, dmsSnapshot] } });
      if (['/crm/login', '/admin/login', '/dms/login'].includes(pathname)) {
        return mockResponse(url, 200, '<!doctype html><html><body>login</body></html>', releaseSha, 'text/html');
      }
      return json({ success: false }, 404);
    };
    const result = await verifyLive({
      apiUrl: `${base}/api`,
      crmUrl: `${base}/crm`,
      adminUrl: `${base}/admin`,
      dmsUrl: `${base}/dms`,
      releaseSha,
      loginId: 'self-test-admin',
      password: 'self-test-password',
      allowHttp: true,
      input,
    }, mockRequest);
    if (result.checks.length !== 11) throw new Error(`self-test expected 11 checks, got ${result.checks.length}`);
    assertThrows(() => assertReadySnapshot({ ...snapshot, status: 'degraded', degradedCount: 1 }, 'crm', 'fixture'), 'must be ready');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function mockResponse(url, status, body, releaseSha, contentType) {
  return {
    url,
    status,
    headers: new Headers({ 'content-type': contentType, 'x-ssoo-release-sha': releaseSha }),
    body: Buffer.isBuffer(body) ? body : Buffer.from(body),
  };
}

function assertThrows(callback, expectedMessage) {
  try {
    callback();
  } catch (error) {
    if (sanitizeError(error).includes(expectedMessage)) return;
    throw new Error(`negative fixture failed with an unexpected error: ${sanitizeError(error)}`);
  }
  throw new Error(`negative fixture did not fail: ${expectedMessage}`);
}

function printUsage() {
  console.log(`Usage: node scripts/verify-crm-go-live.mjs [options]

Options:
  --template                 Print a draft seller/CI input packet
  --packet <path>            Approved seller/CI input packet
  --env-file <path>          Production environment file (default: .env.production)
  --input-only               Validate production env and external input without network access
  --evidence <path>          Write sanitized live verification evidence (required for live mode)
  --self-test                Run isolated positive and negative fixtures
  --help                     Show this help

Live mode additionally requires CRM_GO_LIVE_ADMIN_LOGIN_ID and CRM_GO_LIVE_ADMIN_PASSWORD
as process-injected secrets. Credentials are never read from the packet or written to evidence.`);
}
