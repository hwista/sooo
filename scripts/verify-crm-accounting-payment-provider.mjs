#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_EVIDENCE_STEPS = [
  'accounting-voucher',
  'payment-request',
  'payment-execution',
  'external-system-sync',
];

const DEFAULT_EXECUTION_PATH = '/crm/accounting-payment/executions';
const argv = process.argv.slice(2);

const providerMode = readOption('provider-mode', 'CRM_ACCOUNTING_PAYMENT_PROVIDER_MODE', 'unavailable');
const config = {
  help: argv.includes('--help'),
  dryRun: argv.includes('--dry-run'),
  providerMode,
  checkProviderEnv: readBooleanOption(
    'check-provider-env',
    'CRM_ACCOUNTING_PAYMENT_CHECK_PROVIDER_ENV',
    providerMode === 'ready',
  ),
  reportPath: pickString(readOption('report-path', 'CRM_ACCOUNTING_PAYMENT_PROVIDER_REPORT_PATH', '')),
};

if (config.help) {
  printUsage();
  process.exit(0);
}

try {
  validateConfig(config);
} catch (error) {
  failConfig(error);
}

const providerEnvStatus = getProviderEnvStatus();
const report = buildReport(config, providerEnvStatus);

if (config.dryRun) {
  console.log('CRM accounting/payment provider dry-run');
  printStatusTable(config, providerEnvStatus);
  writeReport(config.reportPath, report);
  if (config.providerMode === 'ready' && config.checkProviderEnv) {
    try {
      assertProviderReadyEnv(providerEnvStatus);
    } catch (error) {
      failConfig(error);
    }
  }
  process.exit(0);
}

printStatusTable(config, providerEnvStatus);
writeReport(config.reportPath, report);

if (config.providerMode === 'ready' && config.checkProviderEnv) {
  try {
    assertProviderReadyEnv(providerEnvStatus);
  } catch (error) {
    failConfig(error);
  }
}

console.log('✓ CRM accounting/payment provider environment verification passed');

function getProviderEnvStatus() {
  const directUrl = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_URL);
  const baseUrl = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL);
  const executionPath = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH) ?? DEFAULT_EXECUTION_PATH;
  const token = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_TOKEN);
  const tenant = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_TENANT);
  const timeout = resolveTimeoutMs();
  const missing = [];
  const placeholders = [];
  const invalid = [];

  const endpoint = resolveEndpointUrl(directUrl, baseUrl, executionPath);
  if (!endpoint.url) {
    missing.push('CRM_ACCOUNTING_PAYMENT_API_URL or CRM_ACCOUNTING_PAYMENT_API_BASE_URL');
  } else {
    if (isPlaceholderConfigValue(endpoint.url)) {
      placeholders.push(endpoint.source);
    }
    validateHttpUrl(endpoint.url, endpoint.source, invalid);
  }

  if (directUrl && baseUrl) {
    invalid.push('CRM_ACCOUNTING_PAYMENT_API_URL and CRM_ACCOUNTING_PAYMENT_API_BASE_URL are both set; direct URL wins, unset one to avoid ambiguity');
  }

  if (isPlaceholderConfigValue(executionPath)) {
    placeholders.push('CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH');
  }
  if (token && isPlaceholderConfigValue(token)) {
    placeholders.push('CRM_ACCOUNTING_PAYMENT_API_TOKEN');
  }
  if (tenant && isPlaceholderConfigValue(tenant)) {
    placeholders.push('CRM_ACCOUNTING_PAYMENT_API_TENANT');
  }
  if (timeout.invalid) {
    invalid.push('CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS must be a number');
  }

  return {
    ready: missing.length === 0 && placeholders.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    invalid,
    endpointUrl: endpoint.url,
    endpointSource: endpoint.source,
    executionPath,
    tokenConfigured: Boolean(token),
    tenantConfigured: Boolean(tenant),
    credentialMode: token ? (tenant ? 'bearer-token+tenant' : 'bearer-token') : 'endpoint-only',
    timeoutMs: timeout.value,
    timeoutClamped: timeout.clamped,
    requiredEvidenceSteps: REQUIRED_EVIDENCE_STEPS,
  };
}

function resolveEndpointUrl(directUrl, baseUrl, executionPath) {
  if (directUrl) {
    return {
      source: 'CRM_ACCOUNTING_PAYMENT_API_URL',
      url: directUrl,
    };
  }

  if (!baseUrl) {
    return {
      source: undefined,
      url: undefined,
    };
  }

  return {
    source: 'CRM_ACCOUNTING_PAYMENT_API_BASE_URL',
    url: `${baseUrl.replace(/\/+$/, '')}/${executionPath.replace(/^\/+/, '')}`,
  };
}

function resolveTimeoutMs() {
  const rawValue = pickString(process.env.CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS);
  if (!rawValue) {
    return {
      value: 10000,
      clamped: false,
      invalid: false,
    };
  }

  const raw = Number(rawValue);
  if (!Number.isFinite(raw)) {
    return {
      value: 10000,
      clamped: false,
      invalid: true,
    };
  }

  const rounded = Math.round(raw);
  const value = Math.min(Math.max(rounded, 1000), 60000);
  return {
    value,
    clamped: value !== rounded,
    invalid: false,
  };
}

function validateHttpUrl(value, source, invalid) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      invalid.push(`${source} must use http(s)`);
    }
  } catch {
    invalid.push(`${source} must be an absolute http(s) URL`);
  }
}

function buildReport(options, status) {
  return {
    schemaVersion: 1,
    status: status.ready ? 'ready' : 'not-ready',
    providerMode: options.providerMode,
    checkProviderEnv: options.checkProviderEnv,
    providerEnvReady: status.ready,
    endpoint: {
      source: status.endpointSource,
      urlMasked: maskEndpointUrl(status.endpointUrl),
      executionPath: status.executionPath,
    },
    credentialMode: status.credentialMode,
    tokenConfigured: status.tokenConfigured,
    tenantConfigured: status.tenantConfigured,
    timeoutMs: status.timeoutMs,
    timeoutClamped: status.timeoutClamped,
    requiredEvidenceSteps: status.requiredEvidenceSteps,
    missing: status.missing,
    placeholders: status.placeholders,
    invalid: status.invalid,
  };
}

function printStatusTable(options, status) {
  console.table({
    providerMode: options.providerMode,
    checkProviderEnv: options.checkProviderEnv,
    providerEnvReady: status.ready,
    endpointSource: status.endpointSource ?? '(missing)',
    endpointUrl: maskEndpointUrl(status.endpointUrl),
    credentialMode: status.credentialMode,
    tokenConfigured: status.tokenConfigured,
    tenantConfigured: status.tenantConfigured,
    timeoutMs: status.timeoutMs,
    timeoutClamped: status.timeoutClamped,
    requiredEvidenceSteps: status.requiredEvidenceSteps.join(', '),
    providerEnvMissing: status.missing.join(', ') || '(none)',
    providerEnvPlaceholders: status.placeholders.join(', ') || '(none)',
    providerEnvInvalid: status.invalid.join('; ') || '(none)',
    reportPath: options.reportPath ?? '(none)',
  });
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }

  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`→ wrote CRM accounting/payment provider report: ${reportPath}`);
}

function validateConfig(options) {
  if (!['unavailable', 'ready'].includes(options.providerMode)) {
    throw new Error(`CRM_ACCOUNTING_PAYMENT_PROVIDER_MODE must be unavailable or ready, got ${options.providerMode}`);
  }
}

function assertProviderReadyEnv(status) {
  if (status.ready) {
    return;
  }

  const details = [
    status.missing.length > 0 ? `missing=${status.missing.join(', ')}` : undefined,
    status.placeholders.length > 0 ? `placeholders=${status.placeholders.join(', ')}` : undefined,
    status.invalid.length > 0 ? `invalid=${status.invalid.join('; ')}` : undefined,
  ].filter(Boolean).join('; ');

  throw new Error(
    `CRM accounting/payment provider-ready evidence requires a configured external ERP/API endpoint. ${details}. `
    + 'Set CRM_ACCOUNTING_PAYMENT_CHECK_PROVIDER_ENV=false only when this runner intentionally differs from the server environment.',
  );
}

function failConfig(error) {
  console.error(`✗ CRM accounting/payment provider configuration invalid: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((value) => value.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] ?? fallback;
}

function readBooleanOption(name, envName, fallback) {
  if (argv.includes(`--${name}`)) {
    return true;
  }
  if (argv.includes(`--no-${name}`)) {
    return false;
  }

  const rawValue = pickString(process.env[envName]);
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPlaceholderConfigValue(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('<') && normalized.endsWith('>')) {
    return true;
  }

  return ['placeholder', 'change-me', 'your-'].some((marker) => normalized.includes(marker));
}

function maskEndpointUrl(value) {
  if (!value) {
    return '(unset)';
  }

  try {
    const url = new URL(value);
    if (url.username) {
      url.username = '***';
    }
    if (url.password) {
      url.password = '***';
    }
    if (url.search) {
      url.search = '?***';
    }
    return url.toString();
  } catch {
    return '(invalid configured url)';
  }
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:crm-accounting-payment-provider -- [options]

Options:
  --dry-run
  --provider-mode=<mode>       unavailable | ready. Default: CRM_ACCOUNTING_PAYMENT_PROVIDER_MODE or unavailable
  --check-provider-env         Validate CRM_ACCOUNTING_PAYMENT_API_URL or CRM_ACCOUNTING_PAYMENT_API_BASE_URL for ready mode
  --no-check-provider-env      Skip provider env validation
  --report-path=<path.json>    Optional JSON report output

Environment:
  CRM_ACCOUNTING_PAYMENT_API_URL
  CRM_ACCOUNTING_PAYMENT_API_BASE_URL
  CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH
  CRM_ACCOUNTING_PAYMENT_API_TOKEN
  CRM_ACCOUNTING_PAYMENT_API_TENANT
  CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS
`);
}
