import { jest } from '@jest/globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DmsFeatureAccess } from '@ssoo/types/dms';
import { HomeService } from '../../src/modules/dms/home/home.service.js';
import { personalSettingsService } from '../../src/modules/dms/runtime/personal-settings.service.js';
import { contentService } from '../../src/modules/dms/runtime/content.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

const ADMIN_FEATURES: DmsFeatureAccess = {
  canReadDocuments: true,
  canWriteDocuments: true,
  canManageTemplates: true,
  canUseAssistant: true,
  canUseSearch: true,
  canManageSettings: true,
  canManageStorage: true,
  canUseGit: true,
};

const USER = {
  userId: '7',
  loginId: 'home-user',
};

function createPersonalSettings(lastSeenAt?: string) {
  return {
    identity: { displayName: 'Home User', email: 'home@example.com' },
    workspace: { defaultSettingsScope: 'system' as const, preferredStorageProvider: 'system-default' as const },
    viewer: { defaultZoom: 100 },
    sidebar: { sections: { bookmarks: true, openTabs: false, fileTree: false, changes: false } },
    home: { ...(lastSeenAt ? { lastSeenAt } : {}) },
  };
}

function createHarness(options: { admin?: boolean; activityFailure?: boolean } = {}) {
  const db = {
    client: {
      dmsUserDocumentActivity: {
        findMany: jest.fn(async () => {
          if (options.activityFailure) throw new Error('activity unavailable');
          return [];
        }),
        upsert: jest.fn(),
      },
      dmsDocument: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(),
      },
    },
  };
  const accessService = {
    getAccessSnapshot: jest.fn(async () => ({
      isAuthenticated: true,
      features: { ...ADMIN_FEATURES, canManageSettings: options.admin ?? true },
      policy: {},
    })),
  };
  const accessRequestService = {
    listManageableReadRequests: jest.fn(async () => []),
    listManageableReadRequestsSnapshot: jest.fn(async () => []),
    listManageableDocuments: jest.fn(async () => []),
  };
  const documentAclService = {
    isReadableAbsolutePath: jest.fn(() => true),
    assertCanReadAbsolutePath: jest.fn(),
  };
  const documentRecordService = { ensureDocumentRecord: jest.fn() };
  const collaborationService = { listPublishFailures: jest.fn(async () => []) };
  const ingestQueueService = {
    getMetrics: jest.fn(() => ({
      generatedAt: new Date().toISOString(),
      queueFilePath: '/redacted-in-home-response',
      queueFileBytes: 0,
      maxConcurrentJobs: 1,
      activeJobs: 0,
      retentionDays: 30,
      totalCount: 0,
      counts: { draft: 0, pending_confirm: 0, processing: 0, published: 0, failed: 0, cancelled: 0 },
    })),
  };
  const settingsService = {
    getReadiness: jest.fn(async () => ({
      owner: 'dms',
      snapshotId: 'ready-1',
      checkedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshWindowSeconds: 60,
      source: 'dms.settings.live-probe',
      status: 'ready',
      reason: 'ready',
      blockerCount: 0,
      degradedCount: 0,
      totalCount: 1,
      ownerHref: '/settings/operations/git',
      checks: [],
    })),
  };

  const service = new HomeService(
    db as never,
    accessService as never,
    accessRequestService as never,
    documentAclService as never,
    documentRecordService as never,
    collaborationService as never,
    ingestQueueService as never,
    settingsService as never,
  );

  return {
    service,
    db,
    accessRequestService,
    documentAclService,
    collaborationService,
    ingestQueueService,
    settingsService,
  };
}

describe('HomeService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('TC-DMS-HOME-05: 한 섹션 실패를 격리하고 전체 홈 응답은 유지한다', async () => {
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings());
    const { service } = createHarness({ activityFailure: true });

    const result = await service.getSummary(USER);

    expect(result.sections.continueWorking.status).toBe('degraded');
    expect(result.sections.changes.status).toBe('empty');
    expect(result.sections.actions.status).toBe('empty');
    expect(result.sections.operations.status).toBe('empty');
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('TC-DMS-HOME-06: 비관리자에게 운영 probe를 실행하거나 노출하지 않는다', async () => {
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings());
    const { service, collaborationService, ingestQueueService, settingsService } = createHarness({ admin: false });

    const result = await service.getSummary(USER);

    expect(result.features.canManageSettings).toBe(false);
    expect(result.sections.operations).toEqual({ status: 'empty', items: [] });
    expect(settingsService.getReadiness).not.toHaveBeenCalled();
    expect(collaborationService.listPublishFailures).not.toHaveBeenCalled();
    expect(ingestQueueService.getMetrics).not.toHaveBeenCalled();
  });

  it('TC-DMS-HOME-04: 마지막 확인 시각을 뒤로 되돌리지 않고 invalid/future를 거부한다', async () => {
    const currentSeenAt = '2020-08-20T08:00:00.000Z';
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings(currentSeenAt));
    const updateSpy = jest.spyOn(personalSettingsService, 'updateSettingsForUser')
      .mockResolvedValue(createPersonalSettings(currentSeenAt));
    const { service } = createHarness();

    const result = await service.acknowledgeSeen(USER, '2020-08-20T07:00:00.000Z');

    expect(result.lastSeenAt).toBe(currentSeenAt);
    expect(updateSpy).toHaveBeenCalledWith(USER.userId, {
      home: { lastSeenAt: currentSeenAt },
    });
    await expect(service.acknowledgeSeen(USER, 'not-a-date')).rejects.toThrow('유효한 확인 시각');
    await expect(service.acknowledgeSeen(
      USER,
      new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    )).rejects.toThrow('미래의 확인 시각');
  });

  it('TC-DMS-HOME-01: activity 조회를 현재 사용자 ID로 격리한다', async () => {
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings());
    const { service, db } = createHarness({ admin: false });

    await service.getSummary(USER);

    expect(db.client.dmsUserDocumentActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 7n }),
      }),
    );
  });

  it('TC-DMS-HOME-07: 홈 처리함은 문서 갱신을 유발하는 동기화 조회를 실행하지 않는다', async () => {
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings());
    const { service, accessRequestService } = createHarness();

    await service.getSummary(USER);

    expect(accessRequestService.listManageableReadRequestsSnapshot).toHaveBeenCalledWith(
      USER,
      { status: 'pending' },
    );
    expect(accessRequestService.listManageableReadRequests).not.toHaveBeenCalled();
  });

  it('TC-DMS-HOME-02: 동일 사용자·문서 방문을 count 증가 upsert로 기록한다', async () => {
    const currentFile = fileURLToPath(import.meta.url);
    jest.spyOn(contentService, 'resolveContentPath').mockReturnValue({
      targetPath: currentFile,
      valid: true,
      safeRelPath: 'tests/home-visit.md',
    });
    const { service, db, documentAclService } = createHarness();
    db.client.dmsDocument.findFirst.mockResolvedValue({ documentId: 99n } as never);
    db.client.dmsUserDocumentActivity.upsert.mockResolvedValue({
      documentId: 99n,
      lastOpenedAt: new Date('2020-08-20T08:00:00.000Z'),
      openCount: 2,
    } as never);

    const result = await service.recordVisit(USER, 'tests/home-visit.md');

    expect(documentAclService.assertCanReadAbsolutePath).toHaveBeenCalledWith(USER, currentFile);
    expect(db.client.dmsUserDocumentActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ux_dm_user_document_activity_m_user_document: {
            userId: 7n,
            documentId: 99n,
          },
        },
        update: expect.objectContaining({ openCount: { increment: 1 } }),
      }),
    );
    expect(result.openCount).toBe(2);
  });

  it('TC-DMS-HOME-03: 삭제된 문서는 최근·변경 목록에서 제외한다', async () => {
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings());
    const { service, db } = createHarness({ admin: false });
    const document = {
      documentId: 10n,
      relativePath: 'deleted/document.md',
      syncStatusCode: 'synced',
      createdAt: new Date('2020-08-20T08:00:00.000Z'),
      lastSyncedAt: new Date('2020-08-20T08:00:00.000Z'),
      ownerUser: { userName: 'owner', displayName: null },
    };
    db.client.dmsUserDocumentActivity.findMany.mockResolvedValue([{
      lastOpenedAt: new Date('2020-08-20T08:00:00.000Z'),
      openCount: 1,
      document,
    }] as never);
    db.client.dmsDocument.findMany.mockResolvedValue([document] as never);

    const result = await service.getSummary(USER);

    expect(result.sections.continueWorking.items).toEqual([]);
    expect(result.sections.changes.items).toEqual([]);
  });

  it('TC-DMS-HOME-03: 현재 열람 권한을 잃은 문서는 최근·변경 목록에서 제외한다', async () => {
    jest.spyOn(personalSettingsService, 'loadSettingsForUser')
      .mockResolvedValue(createPersonalSettings());
    const currentFile = fileURLToPath(import.meta.url);
    const relativePath = path.basename(currentFile);
    jest.spyOn(configService, 'getDocDir').mockReturnValue(path.dirname(currentFile));
    const { service, db, documentAclService } = createHarness({ admin: false });
    const document = {
      documentId: 11n,
      relativePath,
      syncStatusCode: 'synced',
      createdAt: new Date('2020-08-20T08:00:00.000Z'),
      lastSyncedAt: new Date('2020-08-20T08:00:00.000Z'),
      ownerUser: { userName: 'owner', displayName: null },
    };
    documentAclService.isReadableAbsolutePath.mockReturnValue(false);
    db.client.dmsUserDocumentActivity.findMany.mockResolvedValue([{
      lastOpenedAt: new Date('2020-08-20T08:00:00.000Z'),
      openCount: 1,
      document,
    }] as never);
    db.client.dmsDocument.findMany.mockResolvedValue([document] as never);

    const result = await service.getSummary(USER);

    expect(result.sections.continueWorking.items).toEqual([]);
    expect(result.sections.changes.items).toEqual([]);
  });
});
