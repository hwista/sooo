#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const options = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  githubRemote: process.env.WORKSPACE_RELEASE_GITHUB_REMOTE || 'origin',
  githubBranch: process.env.WORKSPACE_RELEASE_GITHUB_BRANCH || 'main',
  gitlabBranch: process.env.WORKSPACE_RELEASE_GITLAB_BRANCH || process.env.WORKSPACE_GITLAB_BRANCH || 'development',
  gitlabUrl: process.env.WORKSPACE_RELEASE_GITLAB_URL || process.env.WORKSPACE_GITLAB_URL || '',
  markerKey: process.env.WORKSPACE_RELEASE_MARKER_KEY || 'codex.gitlabLastPublished',
  reportPath: process.env.WORKSPACE_RELEASE_EVIDENCE_PATH || '',
};

if (options.help) {
  printUsage();
  process.exit(0);
}

if (options.selfTest) {
  runSelfTest();
  process.exit(0);
}

try {
  const report = verifyReleaseState(options);
  if (options.reportPath) writeReport(options.reportPath, report);
  console.log(
    `[ok] workspace release state passed; commit=${report.commit}, `
      + `GitHub=${options.githubRemote}/${options.githubBranch}, GitLab=${options.gitlabBranch}`,
  );
} catch (error) {
  console.error(`[error] workspace release state failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
}

function verifyReleaseState(config) {
  assertSafeRef(config.githubBranch, 'GitHub branch');
  assertSafeRef(config.gitlabBranch, 'GitLab branch');

  const worktree = git(['status', '--porcelain=v1', '--untracked-files=all']);
  if (worktree.trim()) {
    throw new Error('worktree is dirty; every verified file must be committed before release verification');
  }

  const localHead = git(['rev-parse', 'HEAD']).trim();
  const localBranch = git(['branch', '--show-current']).trim();
  if (!/^[0-9a-f]{40}$/u.test(localHead)) throw new Error('unable to resolve local HEAD');
  if (!localBranch) throw new Error('detached HEAD is not a valid release state');

  const githubUrl = git(['remote', 'get-url', config.githubRemote]).trim();
  const gitlabUrl = config.gitlabUrl || readOptionalGitRemote('gitlab');
  if (!githubUrl) throw new Error(`GitHub remote does not exist: ${config.githubRemote}`);
  if (!gitlabUrl) throw new Error('GitLab workspace URL is not configured');

  const githubHead = readRemoteHead(githubUrl, config.githubBranch, []);
  const gitlabAuthArgs = buildGitlabAuthArgs();
  const gitlabHead = readRemoteHead(gitlabUrl, config.gitlabBranch, gitlabAuthArgs);
  const marker = git(['config', '--local', '--get', config.markerKey], { acceptedExitCodes: [0, 1] }).trim();

  const assessment = assessReleaseState({
    localHead,
    githubHead,
    gitlabHead,
    marker,
  });
  if (assessment.issues.length > 0) {
    throw new Error(assessment.issues.join('; '));
  }

  return {
    schemaVersion: 1,
    status: 'passed',
    verifiedAt: new Date().toISOString(),
    commit: localHead,
    localBranch,
    worktree: 'clean',
    github: {
      remote: config.githubRemote,
      url: redactUrl(githubUrl),
      branch: config.githubBranch,
      commit: githubHead,
    },
    gitlab: {
      url: redactUrl(gitlabUrl),
      branch: config.gitlabBranch,
      commit: gitlabHead,
    },
    publishMarker: {
      key: config.markerKey,
      commit: marker,
    },
  };
}

function assessReleaseState({ localHead, githubHead, gitlabHead, marker }) {
  const issues = [];
  if (!githubHead) issues.push('GitHub release branch does not exist');
  if (!gitlabHead) issues.push('GitLab workspace branch does not exist');
  if (localHead !== githubHead) issues.push('GitHub release branch does not equal local HEAD');
  if (localHead !== gitlabHead) issues.push('GitLab workspace branch does not equal local HEAD');
  if (localHead !== marker) issues.push('workspace publish marker does not equal local HEAD');
  return { issues };
}

function readRemoteHead(url, branch, extraGitArgs) {
  const output = git([
    ...extraGitArgs,
    'ls-remote',
    '--heads',
    url,
    `refs/heads/${branch}`,
  ]).trim();
  if (!output) return '';
  const [commit, ref, ...extra] = output.split(/\s+/u);
  if (extra.length > 0 || ref !== `refs/heads/${branch}` || !/^[0-9a-f]{40}$/u.test(commit)) {
    throw new Error(`unexpected remote response for refs/heads/${branch}`);
  }
  return commit;
}

function buildGitlabAuthArgs() {
  const user = process.env.GL_USER || git(['config', '--local', '--get', 'codex.gitlabUser'], { acceptedExitCodes: [0, 1] }).trim();
  const token = process.env.GL_TOKEN || git(['config', '--local', '--get', 'codex.gitlabToken'], { acceptedExitCodes: [0, 1] }).trim();
  if (!user || !token) {
    throw new Error('GL_USER/GL_TOKEN or local codex.gitlabUser/codex.gitlabToken are required');
  }
  const auth = Buffer.from(`${user}:${token}`, 'utf8').toString('base64');
  return ['-c', `http.extraHeader=Authorization: Basic ${auth}`];
}

function readOptionalGitRemote(name) {
  return git(['remote', 'get-url', name], { acceptedExitCodes: [0, 2] }).trim();
}

function git(args, executionOptions = {}) {
  const acceptedExitCodes = executionOptions.acceptedExitCodes || [0];
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || !acceptedExitCodes.includes(result.status ?? 1)) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`git ${safeGitOperation(args)} failed: ${sanitizeError(result.error?.message || stderr || `exit ${result.status}`)}`);
  }
  return result.stdout || '';
}

function safeGitOperation(args) {
  if (args.includes('ls-remote')) return 'ls-remote';
  return args.slice(0, 2).join(' ');
}

function assertSafeRef(value, label) {
  if (!value || value.startsWith('-') || /[\s~^:?*\[\\]/u.test(value) || value.includes('..')) {
    throw new Error(`${label} is not a safe Git ref name`);
  }
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return value.replace(/^(https?:\/\/)[^@/]+@/iu, '$1');
  }
}

function writeReport(filePath, report) {
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function sanitizeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/(Authorization:\s*Basic\s+)[A-Za-z0-9+/=]+/giu, '$1***')
    .replace(/(https?:\/\/)[^/@\s]+@/giu, '$1***@')
    .replace(/(token|password|secret)=([^\s&]+)/giu, '$1=***');
}

function runSelfTest() {
  const commit = 'a'.repeat(40);
  const passing = assessReleaseState({
    localHead: commit,
    githubHead: commit,
    gitlabHead: commit,
    marker: commit,
  });
  if (passing.issues.length !== 0) throw new Error('self-test passing state was rejected');

  const failing = assessReleaseState({
    localHead: commit,
    githubHead: 'b'.repeat(40),
    gitlabHead: '',
    marker: 'c'.repeat(40),
  });
  if (failing.issues.length !== 4) {
    throw new Error(`self-test expected four independent failures, received ${failing.issues.length}`);
  }
  console.log('[ok] workspace release state verifier self-test passed');
}

function printUsage() {
  console.log(`Usage: pnpm run verify:workspace-release-state

Fail-closed release proof for the committed monorepo artifact. The command requires a clean
worktree and exact commit equality across local HEAD, GitHub release branch, GitLab workspace
branch, and the workspace publish marker.

Environment:
  WORKSPACE_RELEASE_GITHUB_REMOTE    GitHub remote name (default: origin)
  WORKSPACE_RELEASE_GITHUB_BRANCH    GitHub release branch (default: main)
  WORKSPACE_RELEASE_GITLAB_URL       GitLab workspace URL (gitlab remote fallback)
  WORKSPACE_RELEASE_GITLAB_BRANCH    GitLab workspace branch (default: development)
  WORKSPACE_RELEASE_MARKER_KEY       Local publish marker (default: codex.gitlabLastPublished)
  WORKSPACE_RELEASE_EVIDENCE_PATH    Optional JSON evidence path
  GL_USER / GL_TOKEN                 GitLab credentials (local git config fallback)

Options:
  --self-test                         Run deterministic state assessment tests
  --help                              Show this help`);
}
