#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const rootDir = process.cwd();
const argv = process.argv.slice(2);

const DEFAULT_REPORT_PATH = 'output/pms-ai-rag-runtime-ready.json';
const DEFAULT_SUMMARY_PATH = 'output/pms-ai-rag-runtime-ready.md';
const DEFAULT_EVIDENCE_BLOCK_PATH = 'output/pms-ai-rag-provider-ready-evidence-ready.md';
const DEFAULT_ROADMAP_PATH = 'docs/pms/planning/roadmap.md';
const DEFAULT_BACKLOG_PATH = 'docs/pms/planning/backlog.md';
const DEFAULT_CLOSE_BRIEF_PATH = 'docs/pms/planning/current-baseline-close-brief.md';

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  useExistingArtifacts: argv.includes('--use-existing-artifacts'),
  dryRunEvidence: argv.includes('--dry-run') || argv.includes('--dry-run-evidence'),
  dockerRuntime: argv.includes('--docker-runtime'),
  dockerRuntimeCleanup: argv.includes('--docker-runtime-cleanup'),
  baseUrl: pickString(readOption(['base-url'], 'PMS_AI_RAG_BASE_URL', 'http://localhost:4000/api')),
  reportPath: pickString(readOption(['report', 'report-path'], 'PMS_AI_RAG_PROVIDER_READY_REPORT_PATH', process.env.PMS_AI_RAG_REPORT_PATH || DEFAULT_REPORT_PATH)),
  summaryPath: pickString(readOption(['summary', 'summary-path'], 'PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH', process.env.PMS_AI_RAG_SUMMARY_PATH || DEFAULT_SUMMARY_PATH)),
  evidenceBlockPath: pickString(readOption(['evidence-block-path'], 'PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', DEFAULT_EVIDENCE_BLOCK_PATH)),
  roadmapPath: pickString(readOption(['roadmap'], 'PMS_AI_RAG_PROVIDER_READY_ROADMAP_PATH', DEFAULT_ROADMAP_PATH)),
  backlogPath: pickString(readOption(['backlog'], 'PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH', DEFAULT_BACKLOG_PATH)),
  closeBriefPath: pickString(readOption(['close-brief'], 'PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH', DEFAULT_CLOSE_BRIEF_PATH)),
  workflowUrl: pickString(readOption(['workflow-url'], 'PMS_AI_RAG_PROVIDER_READY_WORKFLOW_URL', '')),
  envFilePath: pickString(readOption(['env-file'], 'PMS_AI_RAG_PROVIDER_READY_ENV_FILE', '')),
  providerReadyEnv: {},
};

let dockerRuntimeStarted = false;

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    runSelfTest();
    process.exit(0);
  }

  validateConfig(config);
  config.providerReadyEnv = loadProviderReadyEnv(config.envFilePath);
  if (config.dockerRuntime && config.useExistingArtifacts) {
    throw new Error('--docker-runtime cannot be combined with --use-existing-artifacts because no live PMS runtime evidence will run.');
  }
  if (config.dockerRuntimeCleanup && !config.dockerRuntime) {
    throw new Error('--docker-runtime-cleanup requires --docker-runtime.');
  }

  for (const step of buildCompletionSteps(config)) {
    if (config.dockerRuntime && !dockerRuntimeStarted && step.label === 'PMS provider-ready runtime evidence') {
      startDockerRuntime(config);
      dockerRuntimeStarted = true;
    }
    runStep(step);
  }

  if (config.dryRunEvidence) {
    console.log('[ok] PMS AI/RAG provider-ready evidence dry-run flow passed');
  } else {
    console.log('[ok] PMS AI/RAG provider-ready completion flow passed');
  }
} catch (error) {
  if (dockerRuntimeStarted) {
    dumpDockerRuntimeLogs(config);
  }
  console.error(`[error] PMS AI/RAG provider-ready completion flow failed: ${formatError(error)}`);
  process.exitCode = 1;
} finally {
  if (dockerRuntimeStarted && config.dockerRuntimeCleanup) {
    stopDockerRuntime(config);
  }
}

function validateConfig(options) {
  if (!options.baseUrl || !/^https?:\/\//.test(options.baseUrl)) {
    throw new Error('PMS provider-ready base URL must be an absolute http(s) URL.');
  }
  if (!options.reportPath) {
    throw new Error('PMS provider-ready report path is required. Provide --report=<path> or PMS_AI_RAG_PROVIDER_READY_REPORT_PATH.');
  }
  if (!options.summaryPath) {
    throw new Error('PMS provider-ready summary path is required. Provide --summary=<path> or PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH.');
  }
  if (!options.evidenceBlockPath) {
    throw new Error('PMS provider-ready evidence block path is required. Provide --evidence-block-path=<path> or PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH.');
  }
  if (!options.roadmapPath || !options.backlogPath || !options.closeBriefPath) {
    throw new Error('PMS provider-ready evidence doc paths are required.');
  }
}

function buildCompletionSteps(options) {
  const steps = [];
  const runtimeEnv = buildRuntimeEnv(options);

  if (!options.useExistingArtifacts) {
    steps.push({
      label: 'PMS provider-ready environment precheck',
      command: 'pnpm',
      args: ['run', 'verify:pms-ai-rag-runtime:ready-precheck'],
      env: runtimeEnv,
    });
    steps.push({
      label: 'PMS provider-ready runtime evidence',
      command: 'pnpm',
      args: ['run', 'verify:pms-ai-rag-runtime:ready'],
      env: runtimeEnv,
    });
  }

  steps.push({
    label: 'PMS provider-ready runtime report verification',
    command: 'pnpm',
    args: [
      'run',
      'verify:pms-ai-rag-runtime-report',
      '--',
      `--path=${options.reportPath}`,
      `--summary-path=${options.summaryPath}`,
    ],
    env: runtimeEnv,
  });
  steps.push({
    label: 'PMS provider-ready evidence recording',
    command: 'pnpm',
    args: [
      'run',
      'record:pms-ai-rag-provider-ready-evidence',
      '--',
      `--report=${options.reportPath}`,
      `--summary=${options.summaryPath}`,
      `--evidence-block-path=${options.evidenceBlockPath}`,
      `--roadmap=${options.roadmapPath}`,
      `--backlog=${options.backlogPath}`,
      `--close-brief=${options.closeBriefPath}`,
      ...optionalArg('--workflow-url', options.workflowUrl),
      ...booleanArg('--dry-run', options.dryRunEvidence),
    ],
    env: runtimeEnv,
  });

  return steps;
}

function buildRuntimeEnv(options) {
  return {
    ...(options.providerReadyEnv || {}),
    ...process.env,
    PMS_AI_RAG_BASE_URL: options.baseUrl,
    PMS_AI_RAG_PROVIDER_MODE: 'ready',
    PMS_AI_RAG_CHECK_PROVIDER_ENV: 'true',
    PMS_AI_RAG_REPORT_PATH: options.reportPath,
    PMS_AI_RAG_PROVIDER_READY_REPORT_PATH: options.reportPath,
    PMS_AI_RAG_SUMMARY_PATH: options.summaryPath,
    PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH: options.summaryPath,
  };
}

function runStep(step) {
  console.log(`\n[pms-ai-rag-ready] ${step.label}`);
  console.log(`[pms-ai-rag-ready] ${step.command} ${step.args.join(' ')}`);
  execFileSync(step.command, step.args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: step.env || process.env,
  });
}

function startDockerRuntime(options) {
  runProcess('start Docker runtime', 'docker', buildDockerComposeArgs(options, ['up', '-d', '--build', 'server']));
  waitForRuntimeHealth(getHealthUrl(options.baseUrl));
}

function stopDockerRuntime(options) {
  runProcess('stop Docker runtime', 'docker', buildDockerComposeArgs(options, ['down', '--remove-orphans']), {
    allowFailure: true,
  });
}

function dumpDockerRuntimeLogs(options) {
  runProcess('dump Docker runtime logs', 'docker', buildDockerComposeArgs(options, ['logs', 'server', 'db-init', 'postgres']), {
    allowFailure: true,
  });
}

function buildDockerComposeArgs(options, args) {
  const envFileArgs = options.envFilePath ? ['--env-file', options.envFilePath] : [];
  return ['compose', ...envFileArgs, '-f', 'compose.yaml', '-f', 'compose.local.yaml', ...args];
}

function waitForRuntimeHealth(healthUrl) {
  console.log(`[pms-ai-rag-ready] wait for runtime health: ${healthUrl}`);
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      execFileSync('curl', ['-fsS', healthUrl], {
        cwd: rootDir,
        stdio: 'ignore',
        env: buildRuntimeEnv(config),
      });
      console.log(`[pms-ai-rag-ready] runtime health passed after attempt ${attempt}`);
      return;
    } catch {
      sleepSync(2000);
    }
  }
  throw new Error(`Docker runtime health check did not pass: ${healthUrl}`);
}

function getHealthUrl(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/health`;
}

function runProcess(label, command, args, options = {}) {
  console.log(`\n[pms-ai-rag-ready] ${label}`);
  console.log(`[pms-ai-rag-ready] ${command} ${args.join(' ')}`);
  try {
    execFileSync(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      env: buildRuntimeEnv(config),
    });
  } catch (error) {
    if (options.allowFailure) {
      console.log(`[pms-ai-rag-ready] ignored ${label} failure: ${formatError(error)}`);
      return;
    }
    throw error;
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function loadProviderReadyEnv(envFilePath) {
  if (!envFilePath) {
    return {};
  }
  const absolutePath = path.resolve(envFilePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`PMS provider-ready env file not found: ${envFilePath}`);
  }
  return parseEnvFileText(fs.readFileSync(absolutePath, 'utf-8'));
}

function parseEnvFileText(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const normalized = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripEnvValue(normalized.slice(separatorIndex + 1).trim());
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      result[key] = value;
    }
  }
  return result;
}

function stripEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function runSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-pms-ai-rag-ready-'));
  const envFilePath = path.join(tempDir, 'provider-ready.env');
  fs.writeFileSync(envFilePath, [
    'AZURE_OPENAI_ENDPOINT=https://example.openai.azure.com/',
    'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small',
    'AZURE_OPENAI_API_KEY=test-key',
    '',
  ].join('\n'), 'utf-8');

  const selfTestConfig = {
    ...config,
    selfTest: false,
    useExistingArtifacts: false,
    dryRunEvidence: false,
    dockerRuntime: true,
    dockerRuntimeCleanup: true,
    baseUrl: 'http://localhost:4000/api',
    reportPath: path.join(tempDir, 'pms-ready.json'),
    summaryPath: path.join(tempDir, 'pms-ready.md'),
    evidenceBlockPath: path.join(tempDir, 'pms-ready-evidence.md'),
    roadmapPath: path.join(tempDir, 'roadmap.md'),
    backlogPath: path.join(tempDir, 'backlog.md'),
    closeBriefPath: path.join(tempDir, 'close-brief.md'),
    workflowUrl: 'https://example.invalid/actions/runs/pms-self-test',
    envFilePath,
    providerReadyEnv: loadProviderReadyEnv(envFilePath),
  };

  const steps = buildCompletionSteps(selfTestConfig);
  assertEquals(steps.length, 4, 'self-test step count');
  assertStep(steps[0], 'PMS provider-ready environment precheck', 'verify:pms-ai-rag-runtime:ready-precheck');
  assertStep(steps[1], 'PMS provider-ready runtime evidence', 'verify:pms-ai-rag-runtime:ready');
  assertStep(steps[2], 'PMS provider-ready runtime report verification', 'verify:pms-ai-rag-runtime-report');
  assertStep(steps[3], 'PMS provider-ready evidence recording', 'record:pms-ai-rag-provider-ready-evidence');
  assertEquals(steps[1].env.PMS_AI_RAG_PROVIDER_MODE, 'ready', 'provider mode env');
  assertEquals(steps[1].env.PMS_AI_RAG_PROVIDER_READY_REPORT_PATH, selfTestConfig.reportPath, 'provider report env');
  assertEquals(steps[1].env.PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH, selfTestConfig.summaryPath, 'provider summary env');
  assertEquals(steps[1].env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT, 'text-embedding-3-small', 'provider env file load');
  assertIncludes(steps[3].args.join(' '), `--evidence-block-path=${selfTestConfig.evidenceBlockPath}`, 'evidence block args');

  const composeArgs = buildDockerComposeArgs(selfTestConfig, ['up', '-d', '--build', 'server']);
  assertIncludes(composeArgs.join(' '), `--env-file ${envFilePath}`, 'docker compose env file args');

  const artifactOnlySteps = buildCompletionSteps({
    ...selfTestConfig,
    useExistingArtifacts: true,
    dockerRuntime: false,
    dockerRuntimeCleanup: false,
  });
  assertEquals(artifactOnlySteps.length, 2, 'artifact-only self-test step count');
  assertStep(artifactOnlySteps[0], 'PMS provider-ready runtime report verification', 'verify:pms-ai-rag-runtime-report');
  assertStep(artifactOnlySteps[1], 'PMS provider-ready evidence recording', 'record:pms-ai-rag-provider-ready-evidence');

  const dryRunSteps = buildCompletionSteps({
    ...selfTestConfig,
    useExistingArtifacts: true,
    dockerRuntime: false,
    dockerRuntimeCleanup: false,
    dryRunEvidence: true,
  });
  assertIncludes(dryRunSteps[dryRunSteps.length - 1].args.join(' '), '--dry-run', 'dry-run evidence args');

  runDependencySelfTest('PMS runtime report verifier', ['scripts/verify-pms-ai-rag-runtime-report.mjs', '--self-test']);
  runDependencySelfTest('PMS provider-ready evidence recorder', ['scripts/record-pms-ai-rag-provider-ready-evidence.mjs', '--self-test']);

  console.log('[ok] PMS AI/RAG provider-ready completion runner self-test passed');
}

function assertStep(step, expectedLabel, expectedScript) {
  assertEquals(step.label, expectedLabel, `${expectedLabel} label`);
  assertIncludes(step.args.join(' '), expectedScript, `${expectedLabel} command`);
}

function assertEquals(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(value, pattern, label) {
  if (!String(value).includes(pattern)) {
    throw new Error(`${label} missing ${pattern}`);
  }
}

function runDependencySelfTest(label, args) {
  console.log(`[pms-ai-rag-ready:self-test] ${label}`);
  execFileSync(process.execPath, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
}

function optionalArg(name, value) {
  return value ? [`${name}=${value}`] : [];
}

function booleanArg(name, enabled) {
  return enabled ? [name] : [];
}

function readOption(names, envName, fallback) {
  const aliases = Array.isArray(names) ? names : [names];
  for (const name of aliases) {
    const prefix = `--${name}=`;
    const argument = argv.find((entry) => entry.startsWith(prefix));
    if (argument) {
      return argument.slice(prefix.length);
    }
  }
  return process.env[envName] || fallback;
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log(`Usage: pnpm run complete:pms-ai-rag-provider-ready -- [options]

Runs the PMS provider-ready AI/RAG evidence closeout sequence:
  1. verify:pms-ai-rag-runtime:ready-precheck
  2. verify:pms-ai-rag-runtime:ready
  3. verify:pms-ai-rag-runtime-report
  4. record:pms-ai-rag-provider-ready-evidence

Options:
  --report=<path.json>        Provider-ready PMS runtime evidence JSON output.
  --summary=<path.md>         Provider-ready PMS Markdown summary output.
  --evidence-block-path=<path.md>
                               Provider-ready evidence block artifact output.
  --roadmap=<path.md>         PMS roadmap evidence doc target.
  --backlog=<path.md>         PMS backlog evidence doc target.
  --close-brief=<path.md>     PMS current baseline close brief evidence doc target.
  --workflow-url=<url>        Optional workflow run URL to record.
  --base-url=<url>            PMS API base URL. Default: http://localhost:4000/api
  --env-file=<path>           Optional Azure/provider-ready env file for scripts and Docker Compose.
  --docker-runtime            Start docker compose server before live evidence execution.
  --docker-runtime-cleanup    Stop docker compose stack after the run.
  --use-existing-artifacts    Skip live evidence generation and verify existing report/summary paths.
  --dry-run                   Generate evidence block without updating PMS planning docs.
  --dry-run-evidence          Alias for --dry-run.
  --self-test                 Validate the runner wiring without live provider calls.
  --help                      Show this message.

Environment:
  PMS_AI_RAG_PROVIDER_READY_REPORT_PATH
  PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH
  PMS_AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH
  PMS_AI_RAG_PROVIDER_READY_ROADMAP_PATH
  PMS_AI_RAG_PROVIDER_READY_BACKLOG_PATH
  PMS_AI_RAG_PROVIDER_READY_CLOSE_BRIEF_PATH
  PMS_AI_RAG_PROVIDER_READY_ENV_FILE
  PMS_AI_RAG_BASE_URL

Provider-ready execution still requires real Azure OpenAI embedding configuration.`);
}
