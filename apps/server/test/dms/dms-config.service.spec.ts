import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

describe('DmsConfigService (singleton)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DMS_INSTANCE_ENV;
    delete process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL;
    delete process.env.DMS_GIT_BOOTSTRAP_BRANCH;
    delete process.env.DMS_GIT_PROD_REMOTE_URL;
    delete process.env.DMS_GIT_DEV_REMOTE_URL;
    delete process.env.DMS_GIT_PUBLISH_IGNORED_PATH_PREFIXES;
    delete process.env.DMS_STORAGE_LOCAL_BASE_PATH;
    delete process.env.DMS_STORAGE_NAS_BASE_PATH;
    configService.invalidateCache();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
    configService.invalidateCache();
    jest.restoreAllMocks();
  });

  describe('getConfig defaults', () => {
    it('produces a normalized DmsConfig with required sections', () => {
      const cfg = configService.getConfig();
      expect(cfg).toBeDefined();
      expect(cfg.git).toBeDefined();
      expect(typeof cfg.git.repositoryPath).toBe('string');
      expect(cfg.git.repositoryPath.length).toBeGreaterThan(0);
      expect(cfg.storage).toBeDefined();
      expect(cfg.storage.defaultProvider).toBe('local');
      expect(cfg.storage.local.enabled).toBe(true);
      expect(cfg.storage.nas.enabled).toBe(false);
      expect(cfg.storage).not.toHaveProperty('sharepoint');
      expect(cfg.m365).not.toHaveProperty('sharepoint');
    });

    it('caches the resolved config across calls', () => {
      const a = configService.getConfig();
      const b = configService.getConfig();
      expect(a).toBe(b);
    });

    it('invalidateCache forces re-resolution', () => {
      const a = configService.getConfig();
      configService.invalidateCache();
      const b = configService.getConfig();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('git role contract', () => {
    it('requires DMS_INSTANCE_ENV before resolving the bootstrap binding', () => {
      expect(() => configService.getGitBootstrapBinding()).toThrow(/DMS_INSTANCE_ENV/);
    });

    it('uses the prod document repo by default for prod instances', () => {
      process.env.DMS_INSTANCE_ENV = 'prod';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'prod',
        bootstrapRemoteUrl: 'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
        bootstrapBranch: 'master',
      });
    });

    it('uses the dev document repo by default for dev instances', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'dev',
        bootstrapRemoteUrl: 'git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git',
        bootstrapBranch: 'master',
      });
    });

    it('allows local-test instances to stay remote-empty', () => {
      process.env.DMS_INSTANCE_ENV = 'local-test';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'local-test',
        bootstrapRemoteUrl: undefined,
        bootstrapBranch: 'master',
      });
    });

    it('accepts role-specific remote overrides', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';
      process.env.DMS_GIT_DEV_REMOTE_URL = 'ssh://git@10.125.31.72/LSITC_WEB/LSWIKI_DOC_DEV_ALT.git';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'dev',
        bootstrapRemoteUrl: 'ssh://git@10.125.31.72/LSITC_WEB/LSWIKI_DOC_DEV_ALT.git',
        bootstrapBranch: 'master',
      });
    });

    it('rejects explicit bootstrap remotes that do not match the role contract', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = 'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git';

      expect(() => configService.assertGitBootstrapContract()).toThrow(/DMS git role contract invalid/);
    });

    it('treats a blank bootstrap remote env as an explicit cleanup override', async () => {
      await configService.updateConfig({
        git: {
          bootstrapRemoteUrl: 'http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
        },
      });
      process.env.DMS_INSTANCE_ENV = 'local-test';
      process.env.DMS_GIT_BOOTSTRAP_REMOTE_URL = '   ';

      expect(configService.getGitBootstrapBinding()).toEqual({
        instanceEnv: 'local-test',
        bootstrapRemoteUrl: undefined,
        bootstrapBranch: 'master',
      });
    });

    it('lets an explicit branch override win over the default', () => {
      process.env.DMS_INSTANCE_ENV = 'dev';
      process.env.DMS_GIT_BOOTSTRAP_BRANCH = 'release';

      expect(configService.getGitBootstrapBinding().bootstrapBranch).toBe('release');
    });
  });

  describe('runtime paths', () => {
    it('getDocDir returns a non-empty absolute path', () => {
      const dir = configService.getDocDir();
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    });

    it('getTemplateDir is a child of getDocDir + _templates', () => {
      const tmpl = configService.getTemplateDir();
      const root = configService.getDocDir();
      expect(tmpl.startsWith(root)).toBe(true);
      expect(tmpl.endsWith('_templates')).toBe(true);
    });

    it('validates that the local default storage root is readable and writable', () => {
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-dms-storage-'));
      process.env.DMS_STORAGE_LOCAL_BASE_PATH = tempRoot;

      try {
        expect(configService.assertStorageRuntimeContract()).toEqual({
          provider: 'local',
          resolvedPath: tempRoot,
          source: 'env',
        });
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });

    it('fails closed when the default storage root cannot be used as a directory', () => {
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-dms-storage-'));
      const filePath = path.join(tempRoot, 'not-a-directory');
      fs.writeFileSync(filePath, 'probe');
      process.env.DMS_STORAGE_LOCAL_BASE_PATH = filePath;

      try {
        expect(() => configService.assertStorageRuntimeContract()).toThrow(/storage contract invalid/);
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });
  });

  describe('legacy storage normalization', () => {
    it('removes SharePoint config and routes the retired default to local', async () => {
      const defaults = configService.getConfig();
      const legacyConfig = {
        ...defaults,
        storage: {
          ...defaults.storage,
          defaultProvider: 'sharepoint',
          sharepoint: {
            enabled: true,
            basePath: '/sites/documents/shared-documents',
          },
        },
        m365: {
          ...defaults.m365,
          sharepoint: {
            tenantDomain: 'legacy.example',
            sitePath: '/sites/documents',
            defaultLibrary: 'shared-documents',
          },
        },
      };
      const dbClient = {
        dmsConfig: {
          findFirst: jest.fn(async () => ({ configData: legacyConfig })),
        },
      };

      await configService.initFromDb(dbClient as never);

      const normalized = configService.getConfig();
      expect(normalized.storage.defaultProvider).toBe('local');
      expect(normalized.storage).not.toHaveProperty('sharepoint');
      expect(normalized.m365).not.toHaveProperty('sharepoint');
    });
  });

  describe('user surface hidden document paths', () => {
    it('hides publish-ignored verification paths outside local-test', () => {
      process.env.DMS_INSTANCE_ENV = 'prod';
      process.env.DMS_GIT_PUBLISH_IGNORED_PATH_PREFIXES = 'launch-smoke/, codex-lock-ui/';

      expect(configService.isUserSurfaceHiddenPath('launch-smoke/a.md')).toBe(true);
      expect(configService.isUserSurfaceHiddenPath('/codex-lock-ui/a.md')).toBe(true);
      expect(configService.isUserSurfaceHiddenPath('docs/a.md')).toBe(false);
    });

    it('keeps verification paths visible for local-test harnesses', () => {
      process.env.DMS_INSTANCE_ENV = 'local-test';
      process.env.DMS_GIT_PUBLISH_IGNORED_PATH_PREFIXES = 'launch-smoke/';

      expect(configService.getUserSurfaceHiddenPathPrefixes()).toEqual([]);
      expect(configService.isUserSurfaceHiddenPath('launch-smoke/a.md')).toBe(false);
    });
  });

  describe('DB-backed update durability', () => {
    it('does not mutate the runtime config when the DB write fails', async () => {
      const persisted = configService.getConfig();
      const dbClient = {
        dmsConfig: {
          findFirst: jest.fn()
            .mockResolvedValueOnce({ configData: persisted })
            .mockResolvedValueOnce({ configId: 1n }),
          update: jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('database unavailable')),
          create: jest.fn(),
        },
      };
      await configService.initFromDb(dbClient as never);
      const before = configService.getConfig();

      await expect(configService.updateConfig({
        search: { maxResults: before.search.maxResults + 1 },
      })).rejects.toThrow(/persistence failed/);

      expect(configService.getConfig()).toBe(before);
      expect(configService.getConfig().search.maxResults).toBe(before.search.maxResults);
    });
  });
});
