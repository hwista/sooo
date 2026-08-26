import { jest } from '@jest/globals';
import {
  personalSettingsService,
  resolvePreferredStorageProvider,
} from '../../src/modules/dms/runtime/personal-settings.service.js';

describe('DmsPersonalSettingsService persistence', () => {
  beforeEach(() => {
    personalSettingsService.invalidateCache();
  });

  it('keeps the existing cache when a DB write fails', async () => {
    const cachedBeforeUpdate = personalSettingsService.getSettings('42');
    const dbClient = {
      dmsConfig: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            configId: 9n,
            configData: {
              identity: {
                displayName: 'Persisted author',
                email: 'persisted@example.com',
              },
            },
          })
          .mockResolvedValueOnce({ configId: 9n }),
        update: jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('database unavailable')),
        create: jest.fn(),
      },
    };
    await personalSettingsService.initFromDb(dbClient as never);

    await expect(personalSettingsService.updateSettingsForUser('42', {
      identity: { displayName: 'Unsaved author' },
    })).rejects.toThrow(/persistence failed/);

    expect(personalSettingsService.getSettings('42')).toBe(cachedBeforeUpdate);
    expect(personalSettingsService.getSettings('42').identity.displayName).not.toBe('Unsaved author');
  });

  it('does not attempt a write when the DB read needed for a safe merge fails', async () => {
    const update = jest.fn();
    const create = jest.fn();
    const dbClient = {
      dmsConfig: {
        findFirst: jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('read unavailable')),
        update,
        create,
      },
    };
    await personalSettingsService.initFromDb(dbClient as never);

    await expect(personalSettingsService.updateSettingsForUser('42', {
      viewer: { defaultZoom: 125 },
    })).rejects.toThrow('read unavailable');

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('routes personal storage preferences while preserving system-default fallback', () => {
    expect(resolvePreferredStorageProvider('local')).toBe('local');
    expect(resolvePreferredStorageProvider('nas')).toBe('nas');
    expect(resolvePreferredStorageProvider('system-default')).toBeUndefined();
  });
});
