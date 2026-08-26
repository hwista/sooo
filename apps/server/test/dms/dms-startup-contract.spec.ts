import { jest } from '@jest/globals';
import {
  requireDmsControlPlaneSync,
  requireDmsGitInitialization,
} from '../../src/modules/dms/runtime/dms-startup-contract.js';

describe('DMS required startup contract', () => {
  it('rejects startup when Git initialization reports a failure', async () => {
    const initialize = jest.fn<() => Promise<{ success: false; error: string }>>()
      .mockResolvedValue({ success: false, error: 'origin mismatch' });

    await expect(requireDmsGitInitialization(initialize)).rejects.toThrow(
      'DMS Git initialization failed: origin mismatch',
    );
  });

  it('rejects startup when Git initialization throws', async () => {
    const initialize = jest.fn<() => Promise<never>>()
      .mockRejectedValue(new Error('Git executable unavailable'));

    await expect(requireDmsGitInitialization(initialize)).rejects.toThrow(
      'Git executable unavailable',
    );
  });

  it('returns the initialized Git mode only on success', async () => {
    await expect(requireDmsGitInitialization(async () => ({
      success: true,
      data: { isNew: false, mode: 'existing' },
    }))).resolves.toEqual({ isNew: false, mode: 'existing' });
  });

  it('rejects startup when the initial control-plane sync fails', async () => {
    const sync = jest.fn<() => Promise<void>>()
      .mockRejectedValue(new Error('control-plane unavailable'));

    await expect(requireDmsControlPlaneSync(sync)).rejects.toThrow(
      'control-plane unavailable',
    );
  });
});
