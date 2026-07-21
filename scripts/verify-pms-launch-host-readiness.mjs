#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BYTES_PER_GIB = 1024 ** 3;
const argv = process.argv.slice(2);

const config = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  skipDocker: argv.includes('--skip-docker'),
  dockerCommand: readOption('docker-command', 'PMS_DOCKER_COMMAND', 'docker'),
  dockerConfigDir: readOption('docker-config', 'PMS_DOCKER_CONFIG', process.env.DOCKER_CONFIG || '/tmp/ssoo-docker-config'),
  minDockerFreeBytes: parseGiB(readOption('min-docker-free-gb', 'PMS_LAUNCH_MIN_DOCKER_FREE_GB', '10')),
  timeoutMs: parsePositiveInteger(readOption('timeout-ms', 'PMS_LAUNCH_DOCKER_TIMEOUT_MS', '15000'), 'timeout-ms'),
  reportPath: readOption('report-path', 'PMS_LAUNCH_HOST_REPORT_PATH', ''),
  diskPaths: readDiskPaths(),
};

try {
  if (config.help) {
    printUsage();
    process.exit(0);
  }

  if (config.selfTest) {
    runSelfTest();
    process.exit(0);
  }

  const report = buildReport(config);
  writeReport(config.reportPath, report);
  printSummary(report);

  const failures = collectFailures(report);
  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }

  console.log('[ok] PMS launch host readiness passed');
} catch (error) {
  console.error(`[error] PMS launch host readiness failed: ${formatError(error)}`);
  process.exitCode = 1;
}

function buildReport(options) {
  const startedAt = new Date().toISOString();
  const diskChecks = options.diskPaths.map((diskPath) => probeDiskPath(diskPath, options.minDockerFreeBytes));
  const dockerChecks = options.skipDocker ? [createSkippedDockerCheck()] : probeDocker(options);
  const finishedAt = new Date().toISOString();
  const checks = [...diskChecks, ...dockerChecks];
  const status = checks.some((check) => check.status === 'failed') ? 'failed' : 'passed';

  return {
    schemaVersion: 1,
    status,
    startedAt,
    finishedAt,
    minDockerFreeBytes: options.minDockerFreeBytes,
    minDockerFreeGiB: bytesToGiB(options.minDockerFreeBytes),
    diskChecks,
    docker: {
      command: options.dockerCommand,
      configDir: options.dockerConfigDir,
      skipped: options.skipDocker,
      timeoutMs: options.timeoutMs,
      checks: dockerChecks,
    },
    recommendations: buildRecommendations(diskChecks, dockerChecks, options),
  };
}

function probeDiskPath(targetPath, minFreeBytes) {
  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    return {
      kind: 'disk',
      path: targetPath,
      resolvedPath,
      status: 'skipped',
      message: 'path does not exist on this host',
    };
  }

  try {
    const stats = fs.statfsSync(resolvedPath);
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const status = freeBytes >= minFreeBytes ? 'passed' : 'failed';
    return {
      kind: 'disk',
      path: targetPath,
      resolvedPath,
      status,
      freeBytes,
      totalBytes,
      freeGiB: bytesToGiB(freeBytes),
      totalGiB: bytesToGiB(totalBytes),
      minFreeBytes,
      minFreeGiB: bytesToGiB(minFreeBytes),
      message: status === 'passed'
        ? `free space is at least ${formatBytes(minFreeBytes)}`
        : `free space is below ${formatBytes(minFreeBytes)}`,
    };
  } catch (error) {
    return {
      kind: 'disk',
      path: targetPath,
      resolvedPath,
      status: 'failed',
      message: `failed to inspect disk space: ${formatError(error)}`,
    };
  }
}

function probeDocker(options) {
  if (options.dockerConfigDir) {
    fs.mkdirSync(options.dockerConfigDir, { recursive: true });
  }

  return [
    runDockerCommand('docker --version', options, ['--version']),
    runDockerCommand('docker compose version', options, ['compose', 'version']),
  ];
}

function runDockerCommand(label, options, commandArgs) {
  const args = options.dockerConfigDir
    ? ['--config', options.dockerConfigDir, ...commandArgs]
    : commandArgs;
  const result = spawnSync(options.dockerCommand, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(options.dockerConfigDir ? { DOCKER_CONFIG: options.dockerConfigDir } : {}),
    },
    encoding: 'utf-8',
    timeout: options.timeoutMs,
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  const output = [stdout, stderr].filter(Boolean).join('\n');
  const failed = Boolean(result.error) || result.status !== 0;

  return {
    kind: 'docker',
    label,
    command: options.dockerCommand,
    args,
    status: failed ? 'failed' : 'passed',
    exitCode: result.status,
    signal: result.signal,
    output: truncate(output, 1200),
    message: failed
      ? `Docker command failed: ${formatError(result.error) || output || `exit ${result.status}`}`
      : output || 'Docker command completed',
  };
}

function createSkippedDockerCheck() {
  return {
    kind: 'docker',
    label: 'docker checks',
    status: 'skipped',
    message: 'Docker checks skipped by --skip-docker',
  };
}

function collectFailures(report) {
  return [
    ...report.diskChecks,
    ...report.docker.checks,
  ]
    .filter((check) => check.status === 'failed')
    .map((check) => `${check.kind}:${check.path || check.label} - ${check.message}`);
}

function buildRecommendations(diskChecks, dockerChecks, options) {
  const recommendations = [];
  for (const check of diskChecks) {
    if (check.status === 'failed' && typeof check.freeBytes === 'number') {
      recommendations.push(
        `Free at least ${formatBytes(options.minDockerFreeBytes - check.freeBytes)} more on ${check.path} before Docker rebuild.`,
      );
    }
  }

  if (dockerChecks.some((check) => check.status === 'failed')) {
    recommendations.push('Restart Docker Desktop/WSL or repair the Docker CLI before running docker compose up -d --build.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Host has enough preflight signal for a PMS Docker rebuild attempt.');
  }

  return recommendations;
}

function printSummary(report) {
  console.log(`PMS launch host readiness: ${report.status}`);
  console.log(`Minimum Docker rebuild free space: ${formatBytes(report.minDockerFreeBytes)}`);

  for (const check of report.diskChecks) {
    if (check.status === 'skipped') {
      console.log(`- disk ${check.path}: skipped (${check.message})`);
      continue;
    }
    const space = typeof check.freeBytes === 'number'
      ? `${formatBytes(check.freeBytes)} free of ${formatBytes(check.totalBytes)}`
      : check.message;
    console.log(`- disk ${check.path}: ${check.status} (${space})`);
  }

  for (const check of report.docker.checks) {
    console.log(`- ${check.label}: ${check.status} (${firstLine(check.message)})`);
  }

  for (const recommendation of report.recommendations) {
    console.log(`- recommendation: ${recommendation}`);
  }
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }
  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
}

function runSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-pms-launch-host-'));
  const selfTestReport = buildReport({
    ...config,
    selfTest: false,
    skipDocker: true,
    minDockerFreeBytes: 0,
    reportPath: '',
    diskPaths: [tempDir, path.join(tempDir, 'missing')],
  });
  assertEquals(selfTestReport.status, 'passed', 'self-test report status');
  assertEquals(selfTestReport.diskChecks[0].status, 'passed', 'self-test existing disk check');
  assertEquals(selfTestReport.diskChecks[1].status, 'skipped', 'self-test missing disk check');
  assertEquals(selfTestReport.docker.checks[0].status, 'skipped', 'self-test skipped docker check');

  const failingDiskCheck = evaluateDiskThreshold({
    path: '/mnt/c',
    freeBytes: 1 * BYTES_PER_GIB,
    totalBytes: 500 * BYTES_PER_GIB,
  }, 10 * BYTES_PER_GIB);
  assertEquals(failingDiskCheck.status, 'failed', 'self-test low disk status');
  assertIncludes(failingDiskCheck.message, 'below', 'self-test low disk message');

  const passingCommand = evaluateCommandResult('docker compose version', {
    status: 0,
    stdout: 'Docker Compose version v2.30.0',
    stderr: '',
  });
  assertEquals(passingCommand.status, 'passed', 'self-test docker pass');

  const failingCommand = evaluateCommandResult('docker --version', {
    status: null,
    stdout: '',
    stderr: '',
    error: new Error('Input/output error'),
  });
  assertEquals(failingCommand.status, 'failed', 'self-test docker failure');
  assertIncludes(failingCommand.message, 'Input/output error', 'self-test docker failure message');

  console.log('[ok] PMS launch host readiness self-test passed');
}

function evaluateDiskThreshold(check, minFreeBytes) {
  const status = check.freeBytes >= minFreeBytes ? 'passed' : 'failed';
  return {
    kind: 'disk',
    path: check.path,
    status,
    freeBytes: check.freeBytes,
    totalBytes: check.totalBytes,
    minFreeBytes,
    message: status === 'passed'
      ? `free space is at least ${formatBytes(minFreeBytes)}`
      : `free space is below ${formatBytes(minFreeBytes)}`,
  };
}

function evaluateCommandResult(label, result) {
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  const failed = Boolean(result.error) || result.status !== 0;
  return {
    kind: 'docker',
    label,
    status: failed ? 'failed' : 'passed',
    exitCode: result.status,
    output,
    message: failed
      ? `Docker command failed: ${formatError(result.error) || output || `exit ${result.status}`}`
      : output || 'Docker command completed',
  };
}

function readDiskPaths() {
  const cliPaths = argv
    .filter((entry) => entry.startsWith('--disk-path='))
    .map((entry) => entry.slice('--disk-path='.length))
    .filter(Boolean);
  const envPaths = (process.env.PMS_LAUNCH_DISK_PATHS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const paths = [...cliPaths, ...envPaths];
  if (paths.length > 0) {
    return unique(paths);
  }
  return unique([process.cwd(), '/mnt/c', '/Docker/host']);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] || fallback;
}

function parseGiB(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid GiB value: ${value}`);
  }
  return parsed * BYTES_PER_GIB;
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function unique(values) {
  return Array.from(new Set(values));
}

function bytesToGiB(bytes) {
  return Number((bytes / BYTES_PER_GIB).toFixed(3));
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) {
    return 'unknown';
  }
  return `${(bytes / BYTES_PER_GIB).toFixed(2)} GiB`;
}

function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

function firstLine(value) {
  return String(value || '').split(/\r?\n/)[0];
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

function formatError(error) {
  return error instanceof Error ? error.message : String(error || '');
}

function printUsage() {
  console.log(`Usage: pnpm run verify:pms-launch-host [options]

Checks whether the current host is ready to attempt PMS Docker rebuild and runtime verification.

Options:
  --disk-path=<path>          Disk path to check. Repeatable. Defaults to cwd, /mnt/c, /Docker/host.
  --min-docker-free-gb=<n>    Minimum free space per checked disk. Default: 10.
  --docker-command=<command>  Docker CLI command. Default: docker.
  --docker-config=<path>      Docker config dir. Default: /tmp/ssoo-docker-config or DOCKER_CONFIG.
  --timeout-ms=<ms>           Docker command timeout. Default: 15000.
  --report-path=<file>        Optional JSON report output path.
  --skip-docker               Check disk only.
  --self-test                 Run deterministic self-tests.
  --help                      Show this message.

Environment:
  PMS_LAUNCH_DISK_PATHS             Comma-separated disk paths.
  PMS_LAUNCH_MIN_DOCKER_FREE_GB     Minimum free space in GiB.
  PMS_DOCKER_COMMAND                Docker CLI command.
  PMS_DOCKER_CONFIG                 Docker config dir.
  PMS_LAUNCH_DOCKER_TIMEOUT_MS      Docker command timeout.
  PMS_LAUNCH_HOST_REPORT_PATH       Optional JSON report output path.`);
}
