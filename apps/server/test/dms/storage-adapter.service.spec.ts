import fs from 'fs';
import os from 'os';
import path from 'path';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { personalSettingsService } from '../../src/modules/dms/runtime/personal-settings.service.js';
import { storageAdapterService } from '../../src/modules/dms/storage/storage-adapter.service.js';

describe('DMS storage provider contract', () => {
  const ORIGINAL_ENV = { ...process.env };
  let tempRoot: string;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-storage-adapter-'));
    process.env.DMS_STORAGE_LOCAL_BASE_PATH = tempRoot;
    configService.invalidateCache();
    personalSettingsService.invalidateCache();
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
    configService.invalidateCache();
    personalSettingsService.invalidateCache();
  });

  it('routes an omitted provider to local and persists the expected output', () => {
    const saved = storageAdapterService.upload({
      fileName: 'contract.txt',
      content: 'local default contract',
      relativePath: 'verification',
    });

    expect(saved.provider).toBe('local');
    expect(saved.storageUri).toMatch(/^local:\/\//);
    expect(fs.readFileSync(path.join(tempRoot, saved.path), 'utf-8')).toBe('local default contract');
  });

  it('rejects the retired SharePoint provider', () => {
    expect(() => storageAdapterService.upload({
      fileName: 'retired.txt',
      content: 'must not be written',
      provider: 'sharepoint' as never,
    })).toThrow('지원하지 않는 저장소 provider');
  });

  it('normalizes a legacy personal SharePoint preference to system-default', () => {
    const settings = personalSettingsService.updateSettings({
      workspace: {
        preferredStorageProvider: 'sharepoint' as never,
      },
    });

    expect(settings.workspace.preferredStorageProvider).toBe('system-default');
  });
});
