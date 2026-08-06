import path from 'path';
import {
  simpleGit,
  type SimpleGit,
  type SimpleGitOptions,
} from 'simple-git';

type DmsGitOptions = Pick<SimpleGitOptions, 'baseDir' | 'config'>;

/**
 * Build a DMS-scoped Git client configuration.
 *
 * The document working tree is bind-mounted in production, so its host owner
 * can differ from the container user. Trust only the resolved document root
 * for each command instead of changing the container's global Git config.
 */
export function buildDmsGitOptions(rootPath: string): DmsGitOptions {
  const resolvedRoot = path.resolve(rootPath);

  return {
    baseDir: resolvedRoot,
    config: [`safe.directory=${resolvedRoot}`],
  };
}

export function createDmsGitClient(rootPath: string): SimpleGit {
  return simpleGit(buildDmsGitOptions(rootPath));
}
