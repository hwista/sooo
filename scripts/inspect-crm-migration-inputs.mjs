#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateReport as validateAccountingPaymentProviderReport } from './verify-crm-accounting-payment-provider-report.mjs';
import { validateReport as validateCrmAiRagRuntimeReport } from './verify-crm-ai-rag-runtime-report.mjs';
import { validateReport as validateProtectedSourceReflectionReport } from './verify-crm-protected-source-reflection-report.mjs';

const DEFAULT_CANDIDATE_ROOTS = [
  '.runtime/documents/_assets/attachments',
  '.runtime/documents/_assets/references',
  '.runtime/dms/documents/_assets/attachments',
  '.runtime/dms/documents/_assets/references',
];
const SIDECAR_ROOTS = ['.runtime/documents', '.runtime/dms/documents'];
const CANDIDATE_EXTENSIONS = new Set(['.pptx', '.ppt', '.docx', '.doc', '.pdf']);
const RMS_MARKERS = [
  'Microsoft Rights Label',
  'Encrypted-Rights-Data',
  'Microsoft.MSIPC.RequireRmsAwareApplication',
  'License-Acquisition-URL',
];

if (isCliEntryPoint()) {
  runCli();
}

export function inspectInputs({ rootDir, env }) {
  const sidecarIndex = collectSidecarSourceIndex(rootDir);
  const protectedSourceCandidates = collectProtectedSourceCandidates(rootDir, env, sidecarIndex);
  const protectedSourceCandidateSummary = summarizeProtectedSourceCandidates(protectedSourceCandidates);
  const reportChecks = inspectReportPaths(rootDir, env);
  const providerEnv = inspectProviderEnv(env);
  const requiredExternalInputs = buildRequiredExternalInputs(
    providerEnv,
    reportChecks,
    protectedSourceCandidates,
    protectedSourceCandidateSummary,
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    rootDir,
    providerEnv,
    reportChecks,
    protectedSourceCandidates,
    protectedSourceCandidateSummary,
    requiredExternalInputs,
    recommendedNextSteps: buildRecommendedNextSteps(providerEnv, reportChecks, protectedSourceCandidates),
  };
}

function inspectProviderEnv(env) {
  const accountingUrl = pickString(env.CRM_ACCOUNTING_PAYMENT_API_URL);
  const accountingBaseUrl = pickString(env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL);
  const azureEndpoint = pickString(env.AZURE_OPENAI_ENDPOINT);
  const azureEmbeddingDeployment = pickString(env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
  const azureApiKey = pickString(env.AZURE_OPENAI_API_KEY);
  const azureTenantId = pickString(env.AZURE_TENANT_ID);
  const azureClientId = pickString(env.AZURE_CLIENT_ID);
  const azureClientSecret = pickString(env.AZURE_CLIENT_SECRET);
  const azureManagedIdentity = String(env.AZURE_USE_MANAGED_IDENTITY ?? '').toLowerCase() === 'true';

  return {
    accountingPaymentProvider: {
      ready: Boolean(accountingUrl || accountingBaseUrl),
      mode: accountingUrl ? 'direct-url' : accountingBaseUrl ? 'base-url' : 'missing',
      missing: accountingUrl || accountingBaseUrl ? [] : ['CRM_ACCOUNTING_PAYMENT_API_URL or CRM_ACCOUNTING_PAYMENT_API_BASE_URL'],
    },
    crmAiRagProvider: {
      ready: Boolean(
        azureEndpoint
          && azureEmbeddingDeployment
          && (azureApiKey || (azureTenantId && azureClientId && azureClientSecret) || azureManagedIdentity),
      ),
      credentialMode: azureApiKey
        ? 'api-key'
        : azureTenantId && azureClientId && azureClientSecret
          ? 'entra-service-principal'
          : azureManagedIdentity
            ? 'managed-identity'
            : 'missing',
      missing: [
        ...(!azureEndpoint ? ['AZURE_OPENAI_ENDPOINT'] : []),
        ...(!azureEmbeddingDeployment ? ['AZURE_OPENAI_EMBEDDING_DEPLOYMENT'] : []),
        ...(!(azureApiKey || (azureTenantId && azureClientId && azureClientSecret) || azureManagedIdentity)
          ? ['AZURE_OPENAI_API_KEY or Entra credential or explicit AZURE_USE_MANAGED_IDENTITY=true']
          : []),
      ],
    },
  };
}

function inspectReportPaths(rootDir, env) {
  return [
    inspectReportPath({
      id: 'accounting-payment-provider-execution',
      envNames: ['CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH'],
      verifyScript: 'verify:crm-accounting-payment-provider-report',
      completionCheckId: 'crm-accounting-payment-provider-execution-report',
      env,
      rootDir,
      validateReport: validateAccountingPaymentProviderReport,
    }),
    inspectReportPath({
      id: 'crm-ai-rag-provider-ready-runtime',
      envNames: ['CRM_AI_RAG_PROVIDER_READY_REPORT_PATH', 'CRM_AI_RAG_REPORT_PATH'],
      verifyScript: 'verify:crm-ai-rag-runtime-report',
      completionCheckId: 'crm-ai-rag-provider-ready-runtime-report',
      env,
      rootDir,
      validateReport: validateCrmAiRagRuntimeReport,
    }),
    inspectReportPath({
      id: 'crm-protected-source-reflection',
      envNames: ['CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH'],
      verifyScript: 'verify:crm-protected-source-reflection-report',
      completionCheckId: 'crm-protected-source-reflection-report',
      env,
      rootDir,
      validateReport: validateProtectedSourceReflectionReport,
    }),
  ];
}

function inspectReportPath({ id, envNames, verifyScript, completionCheckId, env, rootDir, validateReport }) {
  const envName = envNames.find((name) => pickString(env[name]));
  const rawPath = envName ? pickString(env[envName]) : '';
  if (!rawPath) {
    return {
      id,
      status: 'missing',
      envNames,
      missing: envNames.join(' or '),
      verifyScript,
      verificationCommand: `pnpm run ${verifyScript} -- --path=<report.json>`,
      completionCheckId,
    };
  }

  const absolutePath = toAbsolutePath(rootDir, rawPath);
  if (!fs.existsSync(absolutePath)) {
    return {
      id,
      status: 'missing-file',
      envName,
      path: rawPath,
      absolutePath,
      verifyScript,
      verificationCommand: `pnpm run ${verifyScript} -- --path=${rawPath}`,
      completionCheckId,
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    validateReport(parsed);
    return {
      id,
      status: 'passed',
      envName,
      path: rawPath,
      absolutePath,
      verifyScript,
      verificationCommand: `pnpm run ${verifyScript} -- --path=${rawPath}`,
      completionCheckId,
    };
  } catch (error) {
    return {
      id,
      status: 'invalid',
      envName,
      path: rawPath,
      absolutePath,
      reason: formatError(error),
      verifyScript,
      verificationCommand: `pnpm run ${verifyScript} -- --path=${rawPath}`,
      completionCheckId,
    };
  }
}

function collectProtectedSourceCandidates(rootDir, env, sidecarIndex) {
  const candidatePaths = new Set();
  for (const envName of [
    'CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH',
    'CRM_PROTECTED_SOURCE_PATH',
    'CRM_PROTECTED_SOURCE_REFLECTION_SOURCE_PATH',
  ]) {
    const value = pickString(env[envName]);
    if (value) {
      candidatePaths.add(toAbsolutePath(rootDir, value));
    }
  }

  for (const relativeRoot of DEFAULT_CANDIDATE_ROOTS) {
    const absoluteRoot = path.join(rootDir, relativeRoot);
    for (const filePath of listFiles(absoluteRoot)) {
      if (CANDIDATE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        candidatePaths.add(filePath);
      }
    }
  }

  return [...candidatePaths]
    .sort()
    .map((filePath) => inspectCandidateFile(rootDir, filePath, sidecarIndex))
    .filter(Boolean);
}

function inspectCandidateFile(rootDir, filePath, sidecarIndex) {
  if (!fs.existsSync(filePath)) {
    return {
      path: path.relative(rootDir, filePath),
      status: 'missing-file',
    };
  }

  const buffer = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const signature = detectSignature(buffer);
  const sidecarSources = sidecarIndex.get(path.normalize(filePath)) ?? [];

  return {
    path: path.relative(rootDir, filePath),
    size: buffer.length,
    sha256,
    signature,
    status: determineCandidateStatus(buffer, signature),
    sidecarSources,
  };
}

function detectSignature(buffer) {
  if (buffer.length === 0) {
    return {
      format: 'empty',
      ooxmlLike: false,
      cfbLike: false,
      rmsProtected: false,
    };
  }

  const cfbLike = buffer.length >= 8
    && buffer[0] === 0xd0
    && buffer[1] === 0xcf
    && buffer[2] === 0x11
    && buffer[3] === 0xe0
    && buffer[4] === 0xa1
    && buffer[5] === 0xb1
    && buffer[6] === 0x1a
    && buffer[7] === 0xe1;
  const startsWithZip = buffer.length >= 4
    && buffer[0] === 0x50
    && buffer[1] === 0x4b;
  const text = buffer.toString('utf-8');
  const ooxmlLike = startsWithZip || text.includes('[Content_Types].xml') || text.includes('ppt/slides/');
  const rmsProtected = RMS_MARKERS.some((marker) => text.includes(marker) || buffer.includes(Buffer.from(marker, 'utf16le')));

  return {
    format: cfbLike ? 'compound-file-binary' : ooxmlLike ? 'office-open-xml' : 'unknown-binary',
    ooxmlLike,
    cfbLike,
    rmsProtected,
  };
}

function determineCandidateStatus(buffer, signature) {
  if (buffer.length === 0) {
    return 'empty';
  }
  if (signature.rmsProtected) {
    return 'blocked-rms-protected';
  }
  if (signature.ooxmlLike) {
    return 'candidate-ooxml';
  }
  return 'unknown-binary';
}

function collectSidecarSourceIndex(rootDir) {
  const index = new Map();
  for (const relativeRoot of SIDECAR_ROOTS) {
    const absoluteRoot = path.join(rootDir, relativeRoot);
    for (const filePath of listFiles(absoluteRoot)) {
      if (!filePath.endsWith('.sidecar.json')) {
        continue;
      }
      const sidecar = readJsonSafe(filePath);
      if (!sidecar || !Array.isArray(sidecar.sourceFiles)) {
        continue;
      }
      for (const sourceFile of sidecar.sourceFiles) {
        if (!sourceFile?.path) {
          continue;
        }
        const sourcePath = resolveSidecarSourcePath(rootDir, absoluteRoot, sourceFile.path);
        const normalized = path.normalize(sourcePath);
        const values = index.get(normalized) ?? [];
        values.push({
          sidecarPath: path.relative(rootDir, filePath),
          title: sidecar.title ?? '',
          name: sourceFile.name ?? '',
          origin: sourceFile.origin ?? '',
          status: sourceFile.status ?? '',
          declaredSize: sourceFile.size ?? null,
        });
        index.set(normalized, values);
      }
    }
  }
  return index;
}

function resolveSidecarSourcePath(rootDir, sidecarRoot, sourcePath) {
  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }
  if (sourcePath.startsWith('_assets/')) {
    return path.join(sidecarRoot, sourcePath);
  }
  return path.join(rootDir, sourcePath);
}

function buildRecommendedNextSteps(providerEnv, reportChecks, protectedSourceCandidates) {
  const steps = [];
  if (!providerEnv.accountingPaymentProvider.ready) {
    steps.push('Set CRM_ACCOUNTING_PAYMENT_API_URL or CRM_ACCOUNTING_PAYMENT_API_BASE_URL for provider-ready accounting/payment precheck.');
  }
  if (!providerEnv.crmAiRagProvider.ready) {
    steps.push('Set the SSOO common AI/RAG embedding provider environment for CRM AI/RAG provider-ready precheck; the current verifier reads AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT, and one supported credential mode.');
  }
  for (const report of reportChecks) {
    if (report.status !== 'passed') {
      steps.push(`Provide a passed ${report.id} report (${report.envNames?.join(' or ') ?? report.envName}).`);
    }
  }
  const protectedCandidate = protectedSourceCandidates.find((candidate) => candidate.status === 'blocked-rms-protected')
    ?? protectedSourceCandidates.find((candidate) => candidate.status === 'candidate-ooxml');
  if (protectedCandidate) {
    steps.push(`If this is the CRM protected source, unlock and extract it, then run prepare:crm-migration-evidence with --protected-source-path=${protectedCandidate.path}.`);
  } else {
    steps.push('Provide the unlocked protected CRM source file path or CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH.');
  }
  return steps;
}

function buildRequiredExternalInputs(providerEnv, reportChecks, protectedSourceCandidates, protectedSourceCandidateSummary) {
  const inputs = [];
  if (!providerEnv.accountingPaymentProvider.ready) {
    inputs.push({
      id: 'accounting-payment-provider-env',
      status: 'missing',
      kind: 'environment',
      required: ['CRM_ACCOUNTING_PAYMENT_API_URL or CRM_ACCOUNTING_PAYMENT_API_BASE_URL'],
      completionCheckId: 'crm-accounting-payment-provider-ready',
      verificationCommand: 'pnpm run verify:crm-accounting-payment-provider:ready-precheck',
      description: 'External accounting/payment provider endpoint for provider-ready ERP/API execution.',
    });
  }
  if (!providerEnv.crmAiRagProvider.ready) {
    inputs.push({
      id: 'crm-ai-rag-provider-env',
      status: 'missing',
      kind: 'environment',
      required: [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
        'AZURE_OPENAI_API_KEY or Entra credential or explicit AZURE_USE_MANAGED_IDENTITY=true',
      ],
      completionCheckId: 'crm-ai-rag-provider-ready',
      verificationCommand: 'pnpm run verify:crm-ai-rag-runtime:ready-precheck',
      description: 'SSOO common AI/RAG embedding provider-ready environment for CRM AI/RAG evidence. The current verifier reads Azure OpenAI endpoint/deployment credential variables.',
    });
  }
  for (const report of reportChecks) {
    if (report.status === 'passed') {
      continue;
    }
    inputs.push({
      id: `${report.id}-report`,
      status: report.status,
      kind: 'report',
      required: report.envNames ?? [report.envName],
      completionCheckId: report.completionCheckId,
      verificationCommand: report.verificationCommand,
      description: `Passed ${report.id} report path for completion verification.`,
    });
  }

  const protectedCandidate = selectPreferredProtectedSourceCandidate(protectedSourceCandidates);
  if (protectedCandidate) {
    inputs.push({
      id: 'protected-source-unlock-and-reflection',
      status: 'candidate-found',
      kind: 'protected-source',
      required: ['CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH'],
      candidatePath: protectedCandidate.path,
      candidateSha256: protectedCandidate.sha256,
      duplicatePaths: findDuplicateCandidatePaths(protectedSourceCandidateSummary, protectedCandidate),
      completionCheckId: 'crm-protected-source-reflection-report',
      verificationCommand: 'pnpm run verify:crm-protected-source-reflection-report -- --path=<report.json>',
      description: 'Unlock/extract the protected CRM source candidate, reflect it into CRM docs, and provide a passed reflection report.',
    });
  } else {
    inputs.push({
      id: 'protected-source-unlock-and-reflection',
      status: 'missing',
      kind: 'protected-source',
      required: [
        'CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH or CRM_PROTECTED_SOURCE_PATH',
        'CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH',
      ],
      completionCheckId: 'crm-protected-source-reflection-report',
      verificationCommand: 'pnpm run verify:crm-protected-source-reflection-report -- --path=<report.json>',
      description: 'Unlocked protected CRM source file and passed reflection report.',
    });
  }

  return inputs;
}

function summarizeProtectedSourceCandidates(candidates) {
  const byStatus = {};
  const byDigest = new Map();
  for (const candidate of candidates) {
    byStatus[candidate.status] = (byStatus[candidate.status] ?? 0) + 1;
    if (!candidate.sha256) {
      continue;
    }
    const values = byDigest.get(candidate.sha256) ?? [];
    values.push(candidate);
    byDigest.set(candidate.sha256, values);
  }

  const duplicateGroups = [...byDigest.entries()]
    .filter(([, values]) => values.length > 1 && values.some((candidate) => candidate.status !== 'empty' && candidate.status !== 'missing-file'))
    .map(([sha256, values]) => {
      const sorted = [...values].sort(compareProtectedSourceCandidatePriority);
      return {
        sha256,
        primaryPath: sorted[0].path,
        paths: sorted.map((candidate) => candidate.path),
        statuses: uniqueStrings(sorted.map((candidate) => candidate.status)),
        sidecarSourceNames: uniqueStrings(sorted.flatMap((candidate) => candidate.sidecarSources.map((source) => source.name).filter(Boolean))),
      };
    });

  return {
    total: candidates.length,
    byStatus,
    uniqueSha256Count: byDigest.size,
    duplicateGroupCount: duplicateGroups.length,
    duplicateGroups,
  };
}

function selectPreferredProtectedSourceCandidate(candidates) {
  const sorted = candidates
    .filter((candidate) => candidate.status !== 'empty' && candidate.status !== 'missing-file')
    .sort(compareProtectedSourceCandidatePriority);
  return sorted[0];
}

function findDuplicateCandidatePaths(summary, candidate) {
  const duplicateGroup = summary.duplicateGroups.find((group) => group.sha256 === candidate.sha256);
  return duplicateGroup ? duplicateGroup.paths.filter((item) => item !== candidate.path) : [];
}

function compareProtectedSourceCandidatePriority(left, right) {
  return candidatePriority(left) - candidatePriority(right)
    || left.path.localeCompare(right.path);
}

function candidatePriority(candidate) {
  const statusPriority = {
    'blocked-rms-protected': 0,
    'candidate-ooxml': 10,
    'unknown-binary': 20,
    empty: 30,
    'missing-file': 40,
  }[candidate.status] ?? 50;
  const pathPriority = candidate.path.includes('.runtime/dms/documents/_assets/attachments/')
    ? 0
    : candidate.path.includes('.runtime/documents/_assets/attachments/')
      ? 1
      : candidate.path.includes('.runtime/dms/documents/_assets/references/')
        ? 2
        : candidate.path.includes('.runtime/documents/_assets/references/')
          ? 3
          : 4;
  return statusPriority + pathPriority;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

export function formatSummary(report, { markdown }) {
  const lines = markdown
    ? ['# CRM Migration Input Inspection', '']
    : ['CRM migration input inspection', ''];
  const bullet = markdown ? '- ' : '- ';

  lines.push(`${bullet}rootDir: ${report.rootDir}`);
  lines.push(`${bullet}accounting/payment provider: ${formatReady(report.providerEnv.accountingPaymentProvider)}`);
  lines.push(`${bullet}CRM AI/RAG provider: ${formatReady(report.providerEnv.crmAiRagProvider)}`);
  lines.push(`${bullet}protected source candidate digests: ${report.protectedSourceCandidateSummary.uniqueSha256Count}, duplicate groups: ${report.protectedSourceCandidateSummary.duplicateGroupCount}`);
  lines.push('');
  lines.push(markdown ? '## Reports' : 'Reports');
  for (const item of report.reportChecks) {
    lines.push(`${bullet}${item.id}: ${item.status}${item.reason ? ` (${item.reason})` : ''}`);
  }
  lines.push('');
  lines.push(markdown ? '## Protected Source Candidates' : 'Protected source candidates');
  if (report.protectedSourceCandidates.length === 0) {
    lines.push(`${bullet}(none found)`);
  } else {
    for (const item of report.protectedSourceCandidates) {
      const sourceNames = item.sidecarSources.map((source) => source.name).filter(Boolean).join(', ');
      lines.push(`${bullet}${item.path}: ${item.status}, sha256=${item.sha256}${sourceNames ? `, source=${sourceNames}` : ''}`);
    }
  }
  if (report.protectedSourceCandidateSummary.duplicateGroups.length > 0) {
    lines.push('');
    lines.push(markdown ? '## Duplicate Protected Source Candidate Groups' : 'Duplicate protected source candidate groups');
    for (const group of report.protectedSourceCandidateSummary.duplicateGroups) {
      lines.push(`${bullet}${group.sha256}: primary=${group.primaryPath}, duplicates=${group.paths.length - 1}`);
    }
  }
  lines.push('');
  lines.push(markdown ? '## Required External Inputs' : 'Required external inputs');
  for (const input of report.requiredExternalInputs) {
    const required = Array.isArray(input.required) && input.required.length > 0 ? `, required=${input.required.join(' | ')}` : '';
    const candidate = input.candidatePath ? `, candidate=${input.candidatePath}` : '';
    const completionCheck = input.completionCheckId ? `, completionCheck=${input.completionCheckId}` : '';
    const verifyCommand = input.verificationCommand ? `, verify=${input.verificationCommand}` : '';
    lines.push(`${bullet}${input.id}: ${input.status}${required}${candidate}${completionCheck}${verifyCommand}`);
  }
  lines.push('');
  lines.push(markdown ? '## Recommended Next Steps' : 'Recommended next steps');
  for (const step of report.recommendedNextSteps) {
    lines.push(`${bullet}${step}`);
  }

  return `${lines.join('\n')}\n`;
}

function formatReady(value) {
  const missing = Array.isArray(value.missing) && value.missing.length > 0
    ? `, missing=${value.missing.join(', ')}`
    : '';
  const mode = value.mode ?? value.credentialMode ?? 'unknown';
  return `${value.ready ? 'ready' : 'missing'} (${mode}${missing})`;
}

function listFiles(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }
  const files = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
      continue;
    }
    if (stat.isFile()) {
      files.push(current);
    }
  }
  return files;
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function toAbsolutePath(rootDir, value) {
  return path.isAbsolute(value) ? value : path.join(rootDir, value);
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readOption(argv, name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((value) => value.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] ?? fallback;
}

function readCliConfig(argv) {
  return {
    help: argv.includes('--help'),
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    selfTest: argv.includes('--self-test'),
    rootDir: path.resolve(readOption(argv, 'root-dir', 'CRM_MIGRATION_INPUT_ROOT_DIR', process.cwd())),
  };
}

function runCli() {
  const config = readCliConfig(process.argv.slice(2));
  try {
    if (config.help) {
      printUsage();
      process.exit(0);
    }

    if (config.selfTest) {
      assertSelfTest();
      console.log('OK CRM migration input inspection self-test passed');
      process.exit(0);
    }

    const report = inspectInputs({ rootDir: config.rootDir, env: process.env });
    if (config.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatSummary(report, { markdown: config.markdown }));
    }
  } catch (error) {
    console.error(`FAIL CRM migration input inspection failed: ${formatError(error)}`);
    process.exit(1);
  }
}

function isCliEntryPoint() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function assertSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-input-inspection-'));
  try {
    const protectedDir = path.join(tempDir, '.runtime/documents/_assets/attachments');
    const sidecarDir = path.join(tempDir, '.runtime/documents/drafts');
    fs.mkdirSync(protectedDir, { recursive: true });
    fs.mkdirSync(sidecarDir, { recursive: true });
    const protectedPath = path.join(protectedDir, 'protected.pptx');
    fs.writeFileSync(protectedPath, Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.from('Microsoft Rights Label Encrypted-Rights-Data', 'utf-8'),
    ]));
    const duplicateDir = path.join(tempDir, '.runtime/dms/documents/_assets/attachments');
    fs.mkdirSync(duplicateDir, { recursive: true });
    fs.copyFileSync(protectedPath, path.join(duplicateDir, 'protected-copy.pptx'));
    fs.writeFileSync(path.join(sidecarDir, 'source.sidecar.json'), `${JSON.stringify({
      title: 'CRM protected source',
      sourceFiles: [
        {
          name: 'CRM protected source.pptx',
          path: '_assets/attachments/protected.pptx',
          origin: 'attachment',
          status: 'published',
          size: 256,
        },
      ],
    }, null, 2)}\n`, 'utf-8');

    const report = inspectInputs({
      rootDir: tempDir,
      env: {
        CRM_ACCOUNTING_PAYMENT_API_URL: 'https://accounting.example.test/api',
        AZURE_OPENAI_ENDPOINT: 'https://azure.example.test',
        AZURE_OPENAI_EMBEDDING_DEPLOYMENT: 'embedding',
        AZURE_OPENAI_API_KEY: 'test-key',
      },
    });
    if (!report.providerEnv.accountingPaymentProvider.ready || !report.providerEnv.crmAiRagProvider.ready) {
      throw new Error('self-test provider env must be ready.');
    }
    const protectedCandidate = report.protectedSourceCandidates.find((item) => item.path.endsWith('protected.pptx'));
    if (!protectedCandidate || protectedCandidate.status !== 'blocked-rms-protected') {
      throw new Error('self-test must detect the RMS protected source candidate.');
    }
    if (protectedCandidate.sidecarSources[0]?.name !== 'CRM protected source.pptx') {
      throw new Error('self-test must attach sidecar source metadata.');
    }
    if (report.protectedSourceCandidateSummary.duplicateGroupCount !== 1) {
      throw new Error('self-test must group duplicate protected source candidate digests.');
    }
    if (!report.requiredExternalInputs.some((item) => item.id === 'protected-source-unlock-and-reflection')) {
      throw new Error('self-test must include protected source required external input.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log(`
Usage:
  pnpm run inspect:crm-migration-inputs -- [options]

Options:
  --json                     Print full JSON inspection report
  --markdown                 Print Markdown summary
  --root-dir=<dir>           Repository/runtime root to inspect
  --self-test                Run local inspection self-test

Environment:
  CRM_MIGRATION_INPUT_ROOT_DIR
  CRM_ACCOUNTING_PAYMENT_API_URL
  CRM_ACCOUNTING_PAYMENT_API_BASE_URL
  CRM_ACCOUNTING_PAYMENT_PROVIDER_EXECUTION_REPORT_PATH
  CRM_AI_RAG_PROVIDER_READY_REPORT_PATH
  CRM_AI_RAG_REPORT_PATH
  CRM_PROTECTED_SOURCE_REFLECTION_REPORT_PATH
  CRM_PROTECTED_SOURCE_TEMPLATE_SOURCE_PATH
`);
}
