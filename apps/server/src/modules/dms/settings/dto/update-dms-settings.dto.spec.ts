import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDmsSettingsDto } from './update-dms-settings.dto.js';

const validateBody = (body: unknown) => validate(
  plainToInstance(UpdateDmsSettingsDto, body),
  { whitelist: true, forbidNonWhitelisted: true },
);

describe('UpdateDmsSettingsDto', () => {
  it('accepts a valid deep partial update', async () => {
    await expect(validateBody({
      action: 'update',
      config: {
        system: {
          storage: {
            defaultProvider: 'nas',
            nas: { enabled: true, basePath: '/mnt/dms' },
          },
        },
        personal: {
          viewer: { defaultZoom: 125 },
        },
      },
    })).resolves.toHaveLength(0);
  });

  it('rejects invalid bounds and unknown nested settings', async () => {
    const errors = await validateBody({
      action: 'update',
      config: {
        system: {
          ingest: { maxConcurrentJobs: 0 },
          unsupportedRuntimeMutation: true,
        },
      },
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('keeps the legacy updateGitPath action available for the controller-specific error', async () => {
    await expect(validateBody({ action: 'updateGitPath' })).resolves.toHaveLength(0);
  });
});
