import type { GitInitializeResult, GitResult } from './git.service.js';

export async function requireDmsGitInitialization(
  initialize: () => Promise<GitResult<GitInitializeResult>>,
): Promise<GitInitializeResult> {
  const result = await initialize();
  if (!result.success) {
    const message = result.error || 'unknown Git initialization error';
    throw new Error(`DMS Git initialization failed: ${message}`);
  }
  return result.data;
}

export async function requireDmsControlPlaneSync(
  sync: () => Promise<void>,
): Promise<void> {
  await sync();
}
