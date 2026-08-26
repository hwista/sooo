import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { SettingsService } from '../../src/modules/dms/settings/settings.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { gitService } from '../../src/modules/dms/runtime/git.service.js';
import { personalSettingsService } from '../../src/modules/dms/runtime/personal-settings.service.js';

describe('SettingsService runtime readiness', () => {
  let rootDir: string;
  let markdownRoot: string;
  let ingestRoot: string;
  let localStorageRoot: string;
  let nasStorageRoot: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-readiness-'));
    markdownRoot = path.join(rootDir, 'documents');
    ingestRoot = path.join(rootDir, 'ingest');
    localStorageRoot = path.join(rootDir, 'storage');
    nasStorageRoot = path.join(rootDir, 'nas-disabled');
    fs.mkdirSync(path.join(markdownRoot, '_templates'), { recursive: true });
    fs.mkdirSync(ingestRoot, { recursive: true });
    fs.mkdirSync(localStorageRoot, { recursive: true });

    const binding = (resolvedPath: string) => ({
      appRoot: rootDir,
      configuredPath: resolvedPath,
      effectiveInput: resolvedPath,
      resolvedPath,
      relativeToAppRoot: false,
      source: 'env' as const,
      envVar: 'TEST_RUNTIME_PATH',
    });
    jest.spyOn(configService, 'getDocumentRootBinding').mockReturnValue(binding(markdownRoot));
    jest.spyOn(configService, 'getIngestQueueBinding').mockReturnValue(binding(ingestRoot));
    jest.spyOn(configService, 'getStorageRootBinding').mockImplementation((provider) => (
      binding(provider === 'local' ? localStorageRoot : nasStorageRoot)
    ));
    jest.spyOn(configService, 'getTemplateDir').mockReturnValue(path.join(markdownRoot, '_templates'));
    jest.spyOn(configService, 'getGitBootstrapBinding').mockReturnValue({
      instanceEnv: 'local-test',
      bootstrapBranch: 'master',
    });
    jest.spyOn(configService, 'getAutoInit').mockReturnValue(true);
    jest.spyOn(configService, 'getPersistenceStatus').mockReturnValue({ initialized: true, ready: true });
    jest.spyOn(personalSettingsService, 'getPersistenceStatus').mockReturnValue({ initialized: true, ready: true });
    const currentConfig = configService.getConfig();
    jest.spyOn(configService, 'getConfig').mockReturnValue({
      ...currentConfig,
      storage: {
        ...currentConfig.storage,
        defaultProvider: 'local',
        local: { ...currentConfig.storage.local, enabled: true },
        nas: { ...currentConfig.storage.nas, enabled: false },
      },
    });
    jest.spyOn(gitService, 'getRepositoryBindingStatus').mockResolvedValue({
      success: true,
      data: {
        instanceEnv: 'local-test',
        appRoot: rootDir,
        configuredRootInput: markdownRoot,
        configuredRoot: markdownRoot,
        configuredRootExists: true,
        configuredRootRelativeToAppRoot: false,
        actualGitRoot: markdownRoot,
        rootRelation: 'exact',
        rootMismatch: false,
        state: 'ready',
        bindingSeverity: 'ok',
        actualRemoteMatchesExpected: null,
        gitAvailable: true,
        isRepository: true,
        hasGitMetadata: true,
        visibleEntryCount: 1,
        branch: 'master',
        remoteName: 'origin',
        syncState: 'local-only',
        parityStatus: {
          remote: 'origin',
          verified: true,
          canTreatLocalAsCanonical: true,
        },
        bootstrapBranch: 'master',
        autoInit: true,
        reconcileRequired: false,
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  function createService() {
    const db = {
      client: {
        $queryRawUnsafe: jest.fn<() => Promise<unknown>>().mockResolvedValue([{ '?column?': 1 }]),
      },
    } as unknown as ConstructorParameters<typeof SettingsService>[0];
    const controlPlane = {
      getStatus: jest.fn().mockReturnValue({
        state: 'ready',
        lastSuccessAt: '2026-08-11T00:00:00.000Z',
      }),
    } as unknown as ConstructorParameters<typeof SettingsService>[1];
    return new SettingsService(db, controlPlane);
  }

  it('reports ready only when DB, persistence, Git, control-plane, and required paths pass', async () => {
    const readiness = await createService().getReadiness();

    expect(readiness.status).toBe('ready');
    expect(readiness.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'database', status: 'ready' }),
      expect.objectContaining({ key: 'control-plane', status: 'ready' }),
      expect.objectContaining({ key: 'ingest-queue', status: 'ready' }),
      expect.objectContaining({ key: 'storage-nas', status: 'ready' }),
    ]));
    expect(fs.readdirSync(markdownRoot)).toEqual(['_templates']);
  });

  it('blocks readiness when a required runtime path is absent', async () => {
    fs.rmSync(ingestRoot, { recursive: true, force: true });

    const readiness = await createService().getReadiness();

    expect(readiness.status).toBe('blocked');
    expect(readiness.checks).toContainEqual(expect.objectContaining({
      key: 'ingest-queue',
      status: 'blocked',
    }));
  });
});
