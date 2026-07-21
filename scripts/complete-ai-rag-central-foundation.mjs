#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const rootDir = process.cwd();
const argv = process.argv.slice(2);

const DEFAULT_REPORT_PATH = 'output/ai-rag-runtime-smoke-ready.json';
const DEFAULT_SUMMARY_PATH = 'output/ai-rag-runtime-smoke-ready.md';
const DEFAULT_EVIDENCE_BLOCK_PATH = 'output/ai-rag-provider-ready-evidence-ready.md';
const DEFAULT_ROADMAP_PATH = 'docs/common/explanation/architecture/ai-rag-platform-roadmap.md';
const DEFAULT_HANDOFF_PATH = 'docs/common/explanation/architecture/ai-rag-platform-handoff.md';

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  useExistingArtifacts: argv.includes('--use-existing-artifacts'),
  dryRunEvidence: argv.includes('--dry-run') || argv.includes('--dry-run-evidence'),
  dockerRuntime: argv.includes('--docker-runtime'),
  dockerRuntimeCleanup: argv.includes('--docker-runtime-cleanup'),
  baseUrl: pickString(readOption(['base-url'], 'AI_RAG_SMOKE_BASE_URL', 'http://localhost:4000/api')),
  reportPath: pickString(readOption(['report', 'report-path'], 'AI_RAG_PROVIDER_READY_REPORT_PATH', process.env.AI_RAG_SMOKE_REPORT_PATH || DEFAULT_REPORT_PATH)),
  summaryPath: pickString(readOption(['summary', 'summary-path'], 'AI_RAG_PROVIDER_READY_SUMMARY_PATH', process.env.AI_RAG_SMOKE_SUMMARY_PATH || DEFAULT_SUMMARY_PATH)),
  evidenceBlockPath: pickString(readOption(['evidence-block-path'], 'AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH', DEFAULT_EVIDENCE_BLOCK_PATH)),
  roadmapPath: pickString(readOption(['roadmap'], 'AI_RAG_PROVIDER_READY_ROADMAP_PATH', DEFAULT_ROADMAP_PATH)),
  handoffPath: pickString(readOption(['handoff'], 'AI_RAG_PROVIDER_READY_HANDOFF_PATH', DEFAULT_HANDOFF_PATH)),
  workflowUrl: pickString(readOption(['workflow-url'], 'AI_RAG_PROVIDER_READY_WORKFLOW_URL', '')),
  envFilePath: pickString(readOption(['env-file'], 'AI_RAG_PROVIDER_READY_ENV_FILE', '')),
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
    throw new Error('--docker-runtime cannot be combined with --use-existing-artifacts because no live smoke will run.');
  }
  if (config.dockerRuntimeCleanup && !config.dockerRuntime) {
    throw new Error('--docker-runtime-cleanup requires --docker-runtime.');
  }
  const steps = buildCompletionSteps(config);
  for (const step of steps) {
    if (config.dockerRuntime && !dockerRuntimeStarted && step.label === 'provider-ready runtime smoke') {
      startDockerRuntime(config);
      dockerRuntimeStarted = true;
    }
    runStep(step);
  }

  if (config.dryRunEvidence) {
    console.log('[ok] AI/RAG central common foundation provider-ready evidence dry-run passed');
  } else {
    console.log('[ok] AI/RAG central common foundation provider-ready completion flow passed');
  }
} catch (error) {
  if (dockerRuntimeStarted) {
    dumpDockerRuntimeLogs(config);
  }
  console.error(`[error] AI/RAG central common foundation completion flow failed: ${formatError(error)}`);
  process.exitCode = 1;
} finally {
  if (dockerRuntimeStarted && config.dockerRuntimeCleanup) {
    stopDockerRuntime(config);
  }
}

function validateConfig(options) {
  if (!options.reportPath) {
    throw new Error('Provider-ready report path is required. Provide --report=<path> or AI_RAG_PROVIDER_READY_REPORT_PATH.');
  }
  if (!options.summaryPath) {
    throw new Error('Provider-ready summary path is required. Provide --summary=<path> or AI_RAG_PROVIDER_READY_SUMMARY_PATH.');
  }
  if (!options.evidenceBlockPath) {
    throw new Error('Provider-ready evidence block path is required. Provide --evidence-block-path=<path> or AI_RAG_PROVIDER_READY_EVIDENCE_BLOCK_PATH.');
  }
  if (!options.roadmapPath) {
    throw new Error('Provider-ready roadmap path is required. Provide --roadmap=<path> or AI_RAG_PROVIDER_READY_ROADMAP_PATH.');
  }
  if (!options.handoffPath) {
    throw new Error('Provider-ready handoff path is required. Provide --handoff=<path> or AI_RAG_PROVIDER_READY_HANDOFF_PATH.');
  }
}

function buildCompletionSteps(options) {
  const steps = [];
  const smokeEnv = {
    ...(options.providerReadyEnv || {}),
    ...process.env,
    AI_RAG_SMOKE_BASE_URL: options.baseUrl,
    AI_RAG_SMOKE_PROVIDER_MODE: 'ready',
    AI_RAG_SMOKE_REPORT_PATH: options.reportPath,
  };

  if (!options.useExistingArtifacts) {
    steps.push({
      label: 'provider-ready environment precheck',
      command: 'pnpm',
      args: ['run', 'verify:ai-rag-runtime:ready-precheck'],
      env: smokeEnv,
    });
    steps.push({
      label: 'provider-ready runtime smoke',
      command: 'pnpm',
      args: ['run', 'verify:ai-rag-runtime:ready'],
      env: smokeEnv,
    });
  }

  steps.push({
    label: 'provider-ready runtime report verification',
    command: 'pnpm',
    args: [
      'run',
      'verify:ai-rag-runtime-report',
      '--',
      '--provider-mode=ready',
      `--path=${options.reportPath}`,
      `--summary-path=${options.summaryPath}`,
    ],
  });
  steps.push({
    label: 'provider-ready evidence recording',
    command: 'pnpm',
    args: [
      'run',
      'record:ai-rag-provider-ready-evidence',
      '--',
      `--report=${options.reportPath}`,
      `--summary=${options.summaryPath}`,
      `--evidence-block-path=${options.evidenceBlockPath}`,
      `--roadmap=${options.roadmapPath}`,
      `--handoff=${options.handoffPath}`,
      ...optionalArg('--workflow-url', options.workflowUrl),
      ...booleanArg('--dry-run', options.dryRunEvidence),
    ],
  });
  if (options.dryRunEvidence) {
    steps.push({
      label: 'central foundation report evidence check',
      command: 'pnpm',
      args: [
        'run',
        'verify:ai-rag-central-foundation',
        '--',
        `--provider-ready-report=${options.reportPath}`,
        `--provider-ready-summary=${options.summaryPath}`,
      ],
    });
  } else {
    steps.push({
      label: 'central foundation completion gate',
      command: 'pnpm',
      args: [
        'run',
        'verify:ai-rag-central-foundation:complete',
        '--',
        `--provider-ready-report=${options.reportPath}`,
        `--provider-ready-summary=${options.summaryPath}`,
        `--provider-ready-roadmap=${options.roadmapPath}`,
        `--provider-ready-handoff=${options.handoffPath}`,
      ],
    });
  }

  return steps;
}

function runStep(step) {
  console.log(`\n[ai-rag-complete] ${step.label}`);
  console.log(`[ai-rag-complete] ${step.command} ${step.args.join(' ')}`);
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
  runProcess('stop Docker runtime', 'docker', buildDockerComposeArgs(options, ['down', '--remove-orphans']), { allowFailure: true });
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
  console.log(`[ai-rag-complete] wait for runtime health: ${healthUrl}`);
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      execFileSync('curl', ['-fsS', healthUrl], {
        cwd: rootDir,
        stdio: 'ignore',
        env: process.env,
      });
      console.log(`[ai-rag-complete] runtime health passed after attempt ${attempt}`);
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
  console.log(`\n[ai-rag-complete] ${label}`);
  console.log(`[ai-rag-complete] ${command} ${args.join(' ')}`);
  try {
    execFileSync(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    if (options.allowFailure) {
      console.log(`[ai-rag-complete] ignored ${label} failure: ${formatError(error)}`);
      return;
    }
    throw error;
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runSelfTest() {
  const fixtureConfig = {
    ...config,
    selfTest: false,
    useExistingArtifacts: false,
    dryRunEvidence: false,
    dockerRuntime: false,
    dockerRuntimeCleanup: false,
    baseUrl: 'http://127.0.0.1:4000/api',
    reportPath: 'output/self-test-ready.json',
    summaryPath: 'output/self-test-ready.md',
    evidenceBlockPath: 'output/self-test-evidence.md',
    roadmapPath: 'docs/common/explanation/architecture/ai-rag-platform-roadmap.md',
    handoffPath: 'docs/common/explanation/architecture/ai-rag-platform-handoff.md',
    workflowUrl: 'https://example.invalid/actions/runs/self-test',
    envFilePath: '',
    providerReadyEnv: {},
  };

  const liveSteps = buildCompletionSteps(fixtureConfig);
  assertStep(liveSteps, 'provider-ready environment precheck', 'verify:ai-rag-runtime:ready-precheck');
  assertStep(liveSteps, 'provider-ready runtime smoke', 'verify:ai-rag-runtime:ready');
  assertStep(liveSteps, 'provider-ready runtime report verification', 'verify:ai-rag-runtime-report');
  assertStep(liveSteps, 'provider-ready evidence recording', 'record:ai-rag-provider-ready-evidence');
  assertStep(liveSteps, 'central foundation completion gate', 'verify:ai-rag-central-foundation:complete');
  const smokeStep = liveSteps.find((step) => step.label === 'provider-ready runtime smoke');
  if (smokeStep?.env?.AI_RAG_SMOKE_REPORT_PATH !== fixtureConfig.reportPath) {
    throw new Error('runtime smoke step must pass AI_RAG_SMOKE_REPORT_PATH.');
  }
  if (smokeStep?.env?.AI_RAG_SMOKE_BASE_URL !== fixtureConfig.baseUrl) {
    throw new Error('runtime smoke step must pass AI_RAG_SMOKE_BASE_URL.');
  }
  if (getHealthUrl(fixtureConfig.baseUrl) !== 'http://127.0.0.1:4000/api/health') {
    throw new Error('Docker runtime health URL self-test failed.');
  }
  const envFixtureSteps = buildCompletionSteps({
    ...fixtureConfig,
    providerReadyEnv: parseEnvFileText([
      'AZURE_OPENAI_ENDPOINT=https://example.openai.azure.com/',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=embedding-prod',
      'AZURE_OPENAI_API_KEY=redacted-key',
    ].join('\n')),
  });
  const envFixturePrecheck = assertStep(
    envFixtureSteps,
    'provider-ready environment precheck',
    'verify:ai-rag-runtime:ready-precheck',
  );
  if (envFixturePrecheck.env.AZURE_OPENAI_ENDPOINT !== 'https://example.openai.azure.com/') {
    throw new Error('completion runner env-file support must pass Azure endpoint to ready precheck.');
  }
  const composeArgs = buildDockerComposeArgs({ envFilePath: '.env.provider-ready' }, ['up', '-d', '--build', 'server']);
  if (composeArgs.join(' ') !== 'compose --env-file .env.provider-ready -f compose.yaml -f compose.local.yaml up -d --build server') {
    throw new Error('completion runner Docker env-file args self-test failed.');
  }

  const artifactOnlySteps = buildCompletionSteps({ ...fixtureConfig, useExistingArtifacts: true });
  if (artifactOnlySteps.some((step) => step.label === 'provider-ready runtime smoke')) {
    throw new Error('--use-existing-artifacts must not include the live runtime smoke step.');
  }
  assertStep(artifactOnlySteps, 'provider-ready runtime report verification', 'verify:ai-rag-runtime-report');
  assertStep(artifactOnlySteps, 'provider-ready evidence recording', 'record:ai-rag-provider-ready-evidence');
  assertStep(artifactOnlySteps, 'central foundation completion gate', 'verify:ai-rag-central-foundation:complete');

  const dryRunSteps = buildCompletionSteps({
    ...fixtureConfig,
    useExistingArtifacts: true,
    dryRunEvidence: true,
  });
  const dryRunEvidenceStep = assertStep(
    dryRunSteps,
    'provider-ready evidence recording',
    'record:ai-rag-provider-ready-evidence',
  );
  if (!dryRunEvidenceStep.args.includes('--dry-run')) {
    throw new Error('--dry-run evidence runner must pass --dry-run to the evidence recorder.');
  }
  assertStep(dryRunSteps, 'central foundation report evidence check', 'verify:ai-rag-central-foundation');
  if (dryRunSteps.some((step) => step.label === 'central foundation completion gate')) {
    throw new Error('--dry-run evidence runner must not claim central completion gate success.');
  }

  runDependencySelfTest('runtime report verifier', ['scripts/verify-ai-rag-runtime-report.mjs', '--self-test']);
  runDependencySelfTest('central foundation verifier', ['scripts/verify-ai-rag-central-foundation.mjs', '--self-test']);
  runDependencySelfTest('provider-ready evidence recorder', ['scripts/record-ai-rag-provider-ready-evidence.mjs', '--self-test']);
  console.log('[ok] AI/RAG central foundation completion runner self-test passed');
}

function assertStep(steps, label, expectedArgument) {
  const step = steps.find((entry) => entry.label === label);
  if (!step) {
    throw new Error(`completion runner self-test missing step: ${label}`);
  }
  if (!step.args.includes(expectedArgument)) {
    throw new Error(`completion runner step ${label} must call ${expectedArgument}`);
  }
  return step;
}

function runDependencySelfTest(label, args) {
  console.log(`[ai-rag-complete:self-test] ${label}`);
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

function loadProviderReadyEnv(envFilePath) {
  if (!envFilePath) {
    return {};
  }
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Provider-ready env file does not exist: ${envFilePath}`);
  }
  return parseEnvFileText(fs.readFileSync(envFilePath, 'utf-8'));
}

function parseEnvFileText(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }
    result[parsed.key] = parsed.value;
  }
  return result;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
  const separatorIndex = normalized.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }
  const key = normalized.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }
  const rawValue = normalized.slice(separatorIndex + 1).trim();
  return { key, value: parseEnvValue(rawValue) };
}

function parseEnvValue(rawValue) {
  if (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) {
    return rawValue
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  if (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2) {
    return rawValue.slice(1, -1);
  }
  return rawValue.replace(/\s+#.*$/, '').trim();
}

function pickString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function readOption(names, envName, fallback) {
  for (const name of names) {
    const prefix = `--${name}=`;
    const argument = argv.find((entry) => entry.startsWith(prefix));
    if (argument) {
      return argument.slice(prefix.length);
    }
  }
  return process.env[envName] || fallback;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log(`
Usage:
  pnpm run complete:ai-rag-central-foundation
  pnpm run complete:ai-rag-central-foundation -- --use-existing-artifacts --report=<path.json> --summary=<path.md>

Options:
  --report=<path.json>             Provider-ready runtime smoke JSON report. Default: ${DEFAULT_REPORT_PATH}
  --summary=<path.md>              Provider-ready Markdown summary. Default: ${DEFAULT_SUMMARY_PATH}
  --evidence-block-path=<path.md>  Evidence block artifact path. Default: ${DEFAULT_EVIDENCE_BLOCK_PATH}
  --roadmap=<path.md>              Roadmap evidence doc target. Default: ${DEFAULT_ROADMAP_PATH}
  --handoff=<path.md>              Handoff evidence doc target. Default: ${DEFAULT_HANDOFF_PATH}
  --workflow-url=<url>             Optional workflow run URL to record.
  --base-url=<url>                 Runtime API base URL. Default: http://localhost:4000/api
  --env-file=<path>                Optional provider-ready env file for smoke runner and Docker Compose interpolation.
  --docker-runtime                 Start Docker server runtime and wait for /health before live smoke.
  --docker-runtime-cleanup         Stop Docker runtime after the flow. Requires --docker-runtime.
  --use-existing-artifacts         Skip live runtime smoke and verify/record supplied provider-ready artifacts.
  --dry-run                        Generate evidence block without updating roadmap/handoff docs, then validate report/summary evidence only.
  --dry-run-evidence               Alias for --dry-run.
  --self-test                      Validate command sequencing and dependency self-tests without live provider calls.
  --help                           Show this help.

Default behavior runs the live provider-ready sequence:
  verify:ai-rag-runtime:ready-precheck
  verify:ai-rag-runtime:ready
  verify:ai-rag-runtime-report
  record:ai-rag-provider-ready-evidence
  verify:ai-rag-central-foundation:complete
`);
}
