import { jest } from '@jest/globals';
import { gitService } from '../../src/modules/dms/runtime/git.service.js';

describe('GitService idempotent scoped commit', () => {
  it('TC-DMS-GIT-02 reuses the path commit when a retry has no new staged change', async () => {
    const raw = jest.fn<(args: string[]) => Promise<string>>(async (args) => {
      if (args[0] === 'ls-files') return 'ingest/already-committed.md\n';
      if (args[0] === 'diff') return '';
      if (args[0] === 'log') return 'abc123existingcommit\n';
      if (args[0] === 'add') return '';
      throw new Error(`unexpected git command: ${args.join(' ')}`);
    });
    const commit = jest.fn<() => Promise<never>>();
    const internals = gitService as unknown as {
      initialized: boolean;
      git: { raw: typeof raw; commit: typeof commit };
    };
    const previousInitialized = internals.initialized;
    const previousGit = internals.git;
    internals.initialized = true;
    internals.git = { raw, commit };

    try {
      await expect(gitService.commitFiles(
        ['ingest/already-committed.md'],
        'feat(dms): retry publish',
        'operator',
      )).resolves.toEqual({
        success: true,
        data: { hash: 'abc123existingcommit' },
      });
      expect(commit).not.toHaveBeenCalled();
      expect(raw).toHaveBeenCalledWith([
        'diff',
        '--cached',
        '--name-only',
        '--',
        'ingest/already-committed.md',
      ]);
    } finally {
      internals.initialized = previousInitialized;
      internals.git = previousGit;
    }
  });
});
