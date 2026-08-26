#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';

const argv = process.argv.slice(2);
const cli = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
};

if (cli.help) {
  printUsage();
  process.exit(0);
}

if (cli.selfTest) {
  await runSelfTest();
  process.exit(0);
}

const startedAt = new Date().toISOString();
let reportPath = '';
let report = {
  schemaVersion: 1,
  status: 'failed',
  startedAt,
  finishedAt: null,
  checks: [],
};

try {
  const config = loadConfig();
  reportPath = config.reportPath;
  report = await verifyPublicEndpoints(config, report);
  report.status = 'passed';
  report.finishedAt = new Date().toISOString();
  writeReport(reportPath, report);
  console.log(`[ok] DMS public endpoint readiness passed${reportPath ? `; evidence=${reportPath}` : ''}`);
} catch (error) {
  report.status = 'failed';
  report.finishedAt = new Date().toISOString();
  report.error = sanitizeError(error);
  if (reportPath) {
    try {
      writeReport(reportPath, report);
    } catch (writeError) {
      console.error(`[error] failed to write endpoint evidence: ${sanitizeError(writeError)}`);
    }
  }
  console.error(`[error] DMS public endpoint readiness failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
}

async function verifyPublicEndpoints(config, initialReport) {
  const checks = [];
  const urls = [config.apiUrl, config.dmsUrl, config.adminUrl];
  for (const url of urls) validatePublicUrl(url, config.allowHttp);

  if (!config.allowHttp) {
    for (const origin of new Set(urls.map((value) => new URL(value).origin))) {
      const tlsResult = await inspectTls(origin, config);
      checks.push({ kind: 'tls', target: safeTarget(origin), status: 'passed', ...tlsResult });
    }
  }

  const liveness = await requestJson(joinUrl(config.apiUrl, 'health'), { ca: config.ca });
  assertStatus(liveness, 200, 'API liveness');
  if (liveness.json?.success !== true || liveness.json?.data?.status !== 'ok') {
    throw new Error('API liveness response does not contain success=true and data.status=ok');
  }
  assertReleaseSha(liveness, config.releaseSha, 'API liveness');
  assertApiSecurityHeaders(liveness, config.allowHttp);
  checks.push({ kind: 'api-liveness', target: safeTarget(liveness.url), status: 'passed', httpStatus: 200 });

  const readiness = await requestJson(joinUrl(config.apiUrl, 'health/readiness'), { ca: config.ca });
  assertStatus(readiness, 200, 'API readiness');
  if (
    readiness.json?.success !== true
    || readiness.json?.data?.status !== 'ready'
    || readiness.json?.data?.database !== 'ready'
  ) {
    throw new Error('API readiness response does not prove database=ready');
  }
  assertReleaseSha(readiness, config.releaseSha, 'API readiness');
  assertApiSecurityHeaders(readiness, config.allowHttp);
  checks.push({ kind: 'api-readiness', target: safeTarget(readiness.url), status: 'passed', httpStatus: 200 });

  for (const [kind, appUrl] of [['dms-web', config.dmsUrl], ['admin-web', config.adminUrl]]) {
    const response = await requestText(joinUrl(appUrl, 'login'), { ca: config.ca });
    assertStatus(response, 200, `${kind} login page`);
    assertWebSecurityHeaders(response, config.allowHttp);
    assertHeader(response, 'x-ssoo-release-sha', new RegExp(`^${config.releaseSha}$`, 'u'));
    if (!/<!doctype html|<html/iu.test(response.body)) {
      throw new Error(`${kind} login page did not return HTML`);
    }
    checks.push({ kind, target: safeTarget(response.url), status: 'passed', httpStatus: 200 });
  }

  let accessToken = '';
  try {
    const login = await requestJson(joinUrl(config.apiUrl, 'auth/login'), {
      ca: config.ca,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: new URL(config.dmsUrl).origin,
        'x-ssoo-app': 'dms',
      },
      body: JSON.stringify({ loginId: config.loginId, password: config.password }),
    });
    assertStatus(login, 200, 'admin login');
    accessToken = login.json?.data?.accessToken;
    if (typeof accessToken !== 'string' || accessToken.length < 20) {
      throw new Error('admin login did not return an access token');
    }
    assertSecureSessionCookie(login, config);
    checks.push({ kind: 'admin-login-cookie', target: safeTarget(login.url), status: 'passed', httpStatus: 200 });

    const dmsReadiness = await requestJson(joinUrl(config.apiUrl, 'dms/settings/readiness'), {
      ca: config.ca,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assertStatus(dmsReadiness, 200, 'DMS aggregate readiness');
    const readinessData = dmsReadiness.json?.data;
    if (dmsReadiness.json?.success !== true || readinessData?.status !== 'ready') {
      throw new Error(`DMS aggregate readiness is not ready (status=${readinessData?.status || 'missing'})`);
    }
    assertDmsReadinessChecks(readinessData?.checks);
    checks.push({
      kind: 'dms-aggregate-readiness',
      target: safeTarget(dmsReadiness.url),
      status: 'passed',
      httpStatus: 200,
      checks: readinessData.checks.map((check) => ({ key: check.key, status: check.status })),
    });
  } finally {
    if (accessToken) {
      const logout = await requestJson(joinUrl(config.apiUrl, 'auth/logout'), {
        ca: config.ca,
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      assertStatus(logout, 200, 'verification session logout');
      checks.push({ kind: 'verification-session-logout', target: safeTarget(logout.url), status: 'passed', httpStatus: 200 });
    }
  }

  return {
    ...initialReport,
    endpoints: {
      api: safeTarget(config.apiUrl),
      dms: safeTarget(config.dmsUrl),
      admin: safeTarget(config.adminUrl),
    },
    checks,
  };
}

function loadConfig() {
  const envPath = path.resolve(process.env.DMS_GO_LIVE_ENV_FILE || '.env.production');
  if (!fs.existsSync(envPath)) {
    throw new Error(`production environment file does not exist: ${envPath}`);
  }
  const fileEnv = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  const config = {
    apiUrl: process.env.DMS_GO_LIVE_API_URL || fileEnv.AUTH_PUBLIC_API_BASE_URL || '',
    dmsUrl: process.env.DMS_GO_LIVE_DMS_URL || fileEnv.NEXT_PUBLIC_DMS_APP_URL || '',
    adminUrl: process.env.DMS_GO_LIVE_ADMIN_URL || fileEnv.NEXT_PUBLIC_ADMIN_APP_URL || '',
    loginId: process.env.DMS_GO_LIVE_ADMIN_LOGIN_ID || '',
    password: process.env.DMS_GO_LIVE_ADMIN_PASSWORD || '',
    allowHttp: /^(1|true)$/iu.test(process.env.DMS_GO_LIVE_ALLOW_HTTP || ''),
    minTlsDays: parsePositiveNumber(process.env.DMS_GO_LIVE_MIN_TLS_DAYS || '14', 'DMS_GO_LIVE_MIN_TLS_DAYS'),
    ca: readCa(process.env.SSOO_TLS_CA_CERT_FILE || fileEnv.SSOO_TLS_CA_CERT_FILE || ''),
    reportPath: process.env.DMS_GO_LIVE_ENDPOINT_EVIDENCE_PATH
      ? path.resolve(process.env.DMS_GO_LIVE_ENDPOINT_EVIDENCE_PATH)
      : '',
    releaseSha: fileEnv.SSOO_RELEASE_SHA || '',
  };
  const missing = [
    ['DMS_GO_LIVE_API_URL or AUTH_PUBLIC_API_BASE_URL', config.apiUrl],
    ['DMS_GO_LIVE_DMS_URL or NEXT_PUBLIC_DMS_APP_URL', config.dmsUrl],
    ['DMS_GO_LIVE_ADMIN_URL or NEXT_PUBLIC_ADMIN_APP_URL', config.adminUrl],
    ['DMS_GO_LIVE_ADMIN_LOGIN_ID', config.loginId],
    ['DMS_GO_LIVE_ADMIN_PASSWORD', config.password],
    ['SSOO_RELEASE_SHA', config.releaseSha],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`required environment is missing: ${missing.join(', ')}`);
  if (!/^[0-9a-f]{40}$/u.test(config.releaseSha)) {
    throw new Error('SSOO_RELEASE_SHA must be a lowercase 40-character commit SHA');
  }
  return config;
}

function validatePublicUrl(value, allowHttp) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('go-live endpoint must be an absolute URL');
  }
  if (url.username || url.password) throw new Error('go-live endpoint must not embed credentials');
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    throw new Error('go-live endpoint must use HTTPS');
  }
  if (!allowHttp && isLocalHostname(url.hostname)) {
    throw new Error('go-live endpoint must use a non-local hostname');
  }
}

async function inspectTls(origin, config) {
  const url = new URL(origin);
  const port = Number(url.port || 443);
  const result = await new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: url.hostname,
      port,
      servername: url.hostname,
      rejectUnauthorized: true,
      ...(config.ca ? { ca: config.ca } : {}),
    });
    const timeout = setTimeout(() => socket.destroy(new Error('TLS probe timed out')), 15_000);
    socket.once('secureConnect', () => {
      clearTimeout(timeout);
      const certificate = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      socket.end();
      resolve({ certificate, protocol });
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  const validTo = new Date(result.certificate.valid_to);
  const daysRemaining = (validTo.getTime() - Date.now()) / 86_400_000;
  if (!Number.isFinite(daysRemaining) || daysRemaining < config.minTlsDays) {
    throw new Error(`TLS certificate for ${safeTarget(origin)} has fewer than ${config.minTlsDays} days remaining`);
  }
  if (!['TLSv1.2', 'TLSv1.3'].includes(result.protocol)) {
    throw new Error(`TLS protocol is below 1.2 for ${safeTarget(origin)}`);
  }
  return {
    protocol: result.protocol,
    validTo: validTo.toISOString(),
    daysRemaining: Number(daysRemaining.toFixed(1)),
  };
}

async function requestJson(url, options = {}) {
  const response = await requestText(url, options);
  try {
    response.json = JSON.parse(response.body);
  } catch {
    response.json = null;
  }
  return response;
}

function requestText(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const request = transport.request(parsed, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15_000,
      ...(parsed.protocol === 'https:' && options.ca ? { ca: options.ca } : {}),
    }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) {
          request.destroy(new Error('response exceeded 2 MiB limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({
        url,
        status: response.statusCode || 0,
        headers: normalizeHeaders(response.rawHeaders),
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.once('timeout', () => request.destroy(new Error('request timed out')));
    request.once('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function normalizeHeaders(rawHeaders) {
  const headers = {};
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const key = rawHeaders[index].toLowerCase();
    const value = rawHeaders[index + 1];
    headers[key] = [...(headers[key] || []), value];
  }
  return headers;
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} returned HTTP ${response.status}; expected ${expected}`);
  }
}

function assertReleaseSha(response, expected, label) {
  if (response.json?.data?.releaseSha !== expected) {
    throw new Error(`${label} release SHA does not match SSOO_RELEASE_SHA`);
  }
}

function assertApiSecurityHeaders(response, allowHttp) {
  assertHeader(response, 'x-content-type-options', /^nosniff$/iu);
  assertHeader(response, 'referrer-policy', /.+/u);
  if (!allowHttp) assertHsts(response);
}

function assertWebSecurityHeaders(response, allowHttp) {
  assertHeader(response, 'content-security-policy', /frame-ancestors\s+'none'/iu);
  assertHeader(response, 'x-content-type-options', /^nosniff$/iu);
  assertHeader(response, 'referrer-policy', /strict-origin-when-cross-origin/iu);
  assertHeader(response, 'x-frame-options', /^DENY$/iu);
  assertHeader(response, 'permissions-policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/iu);
  if (!allowHttp) assertHsts(response);
}

function assertHsts(response) {
  const hsts = headerValue(response, 'strict-transport-security');
  const maxAge = Number(hsts.match(/max-age=(\d+)/iu)?.[1] || 0);
  if (maxAge < 15_552_000) {
    throw new Error(`${safeTarget(response.url)} must return HSTS max-age of at least 15552000`);
  }
}

function assertHeader(response, name, pattern) {
  const value = headerValue(response, name);
  if (!pattern.test(value)) {
    throw new Error(`${safeTarget(response.url)} has invalid or missing ${name}`);
  }
}

function assertSecureSessionCookie(response, config) {
  const cookies = response.headers['set-cookie'] || [];
  const sessionCookie = cookies.find((cookie) => /ssoo-session=/iu.test(cookie)) || cookies[0] || '';
  for (const marker of [/HttpOnly/iu, /Secure/iu, /SameSite=(Lax|Strict|None)/iu]) {
    if (!marker.test(sessionCookie)) throw new Error('login session cookie is missing HttpOnly, Secure, or SameSite');
  }
  const dmsHost = new URL(config.dmsUrl).hostname;
  const adminHost = new URL(config.adminUrl).hostname;
  if (dmsHost !== adminHost && !/Domain=[^;]+/iu.test(sessionCookie)) {
    throw new Error('cross-app session cookie must declare a shared Domain');
  }
}

function assertDmsReadinessChecks(checks) {
  const required = new Set([
    'database',
    'settings-persistence',
    'git-binding',
    'control-plane',
    'markdown-root',
    'ingest-queue',
    'storage-local',
    'storage-nas',
    'template-root',
  ]);
  if (!Array.isArray(checks)) throw new Error('DMS readiness checks are missing');
  for (const check of checks) {
    if (check?.status !== 'ready') {
      throw new Error(`DMS readiness check is not ready: ${check?.key || 'unknown'}`);
    }
    required.delete(check.key);
  }
  if (required.size > 0) throw new Error(`DMS readiness checks are incomplete: ${[...required].join(', ')}`);
}

function headerValue(response, name) {
  return (response.headers[name.toLowerCase()] || []).join(', ');
}

function joinUrl(base, suffix) {
  return new URL(suffix.replace(/^\//u, ''), `${base.replace(/\/+$/u, '')}/`).toString();
}

function safeTarget(value) {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

function parseEnvFile(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.replace(/^export\s+/u, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, '').trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function readCa(filePath) {
  if (!filePath) return undefined;
  const absolutePath = path.resolve(filePath);
  return fs.readFileSync(absolutePath);
}

function writeReport(filePath, value) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function parsePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number`);
  return parsed;
}

function isLocalHostname(hostname) {
  return hostname === 'localhost'
    || hostname === '0.0.0.0'
    || hostname === '::1'
    || /^127\./u.test(hostname)
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.invalid');
}

function sanitizeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/(password|token|secret)=([^\s&]+)/giu, '$1=***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~-]+/giu, '$1***');
}

async function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-dms-endpoint-self-test-'));
  const server = http.createServer((request, response) => {
    const headers = {
      'content-type': request.url?.startsWith('/api/') ? 'application/json' : 'text/html',
      'content-security-policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'DENY',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'x-ssoo-release-sha': 'a'.repeat(40),
    };
    if (request.url === '/api/health') {
      response.writeHead(200, headers).end(JSON.stringify({ success: true, data: { status: 'ok', releaseSha: 'a'.repeat(40) } }));
    } else if (request.url === '/api/health/readiness') {
      response.writeHead(200, headers).end(JSON.stringify({ success: true, data: { status: 'ready', database: 'ready', releaseSha: 'a'.repeat(40) } }));
    } else if (request.url === '/api/auth/login') {
      response.writeHead(200, { ...headers, 'set-cookie': 'ssoo-session=fixture; HttpOnly; Secure; SameSite=Lax' })
        .end(JSON.stringify({ success: true, data: { accessToken: 'fixture-access-token-with-safe-length' } }));
    } else if (request.url === '/api/dms/settings/readiness') {
      const keys = ['database', 'settings-persistence', 'git-binding', 'control-plane', 'markdown-root', 'ingest-queue', 'storage-local', 'storage-nas', 'template-root'];
      response.writeHead(200, headers).end(JSON.stringify({
        success: true,
        data: { status: 'ready', checks: keys.map((key) => ({ key, status: 'ready' })) },
      }));
    } else if (request.url === '/api/auth/logout') {
      response.writeHead(200, headers).end(JSON.stringify({ success: true, data: { loggedOut: true } }));
    } else {
      response.writeHead(200, headers).end('<!doctype html><html><body>login</body></html>');
    }
  });

  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    const result = await verifyPublicEndpoints({
      apiUrl: `${origin}/api`,
      dmsUrl: origin,
      adminUrl: origin,
      loginId: 'admin',
      password: 'not-recorded',
      allowHttp: true,
      minTlsDays: 14,
      ca: undefined,
      reportPath: path.join(tempRoot, 'evidence.json'),
      releaseSha: 'a'.repeat(40),
    }, { schemaVersion: 1, status: 'failed', startedAt: new Date().toISOString(), finishedAt: null, checks: [] });
    if (result.checks.length !== 7) throw new Error(`self-test expected 7 checks, received ${result.checks.length}`);
    console.log('[ok] DMS public endpoint verifier self-test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function printUsage() {
  console.log(`Usage: pnpm run verify:dms-public-endpoints

Verifies the deployed HTTPS/TLS surface, API liveness and DB readiness, Admin/DMS web security
headers, secure shared session cookie, and the authenticated nine-check DMS aggregate readiness.

Environment:
  DMS_GO_LIVE_ENV_FILE                 Production env file (default: .env.production)
  DMS_GO_LIVE_API_URL                  Public API base; AUTH_PUBLIC_API_BASE_URL fallback
  DMS_GO_LIVE_DMS_URL                  Public DMS origin; NEXT_PUBLIC_DMS_APP_URL fallback
  DMS_GO_LIVE_ADMIN_URL                Public Admin origin; NEXT_PUBLIC_ADMIN_APP_URL fallback
  DMS_GO_LIVE_ADMIN_LOGIN_ID           Dedicated launch-verification admin login
  DMS_GO_LIVE_ADMIN_PASSWORD           Dedicated launch-verification admin password
  DMS_GO_LIVE_MIN_TLS_DAYS             Minimum certificate validity remaining (default: 14)
  DMS_GO_LIVE_ENDPOINT_EVIDENCE_PATH   Optional JSON evidence path
  SSOO_TLS_CA_CERT_FILE                Optional approved PEM CA

Local-only verification may set DMS_GO_LIVE_ALLOW_HTTP=1. This bypass is rejected by the
production environment verifier and must never be used for a public Go decision.

Options:
  --self-test                           Run an isolated local HTTP fixture
  --help                                Show this help`);
}
