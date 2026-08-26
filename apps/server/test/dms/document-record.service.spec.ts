import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jest } from '@jest/globals';
import { DocumentRecordService } from '../../src/modules/dms/access/document-record.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { contentService } from '../../src/modules/dms/runtime/content.service.js';

const USER_ID = 7n;

describe('DocumentRecordService content change clock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('TC-DMS-HOME-08: 단순 재조정은 lastSyncedAt을 보존하고 실제 메타데이터 변경만 전진시킨다', async () => {
    const currentFile = fileURLToPath(import.meta.url);
    const rootDir = path.dirname(currentFile);
    const relativePath = path.basename(currentFile);
    const content = fs.readFileSync(currentFile, 'utf-8');
    const previousChangedAt = new Date('2020-08-20T08:00:00.000Z');
    const nextChangedAt = '2020-08-20T09:00:00.000Z';
    const metadata = contentService.buildDefaultDocumentMetadata(
      content,
      currentFile,
      undefined,
      {
        defaultOwnerId: USER_ID.toString(),
        defaultOwnerLoginId: 'home-user',
        defaultRevisionSeq: 1,
      },
    );
    const existing = {
      documentId: 99n,
      ownerUserId: USER_ID,
      latestGitCommitHash: null,
      lastSyncedAt: previousChangedAt,
      metadataJson: metadata,
    };
    const update = jest.fn(async () => ({
      documentId: 99n,
      relativePath,
      visibilityScope: 'self',
      targetOrgId: null,
      ownerUserId: USER_ID,
      syncStatusCode: 'synced',
      metadataJson: metadata,
    }));
    const db = {
      client: {
        dmsDocument: {
          findFirst: jest.fn(async () => existing),
          update,
        },
        userAuth: {
          findFirst: jest.fn(async () => ({ userId: USER_ID, loginId: 'home-user' })),
        },
      },
    };
    const projection = { syncDocumentProjectionRelations: jest.fn(async () => undefined) };
    jest.spyOn(configService, 'getDocDir').mockReturnValue(rootDir);
    const service = new DocumentRecordService(db as never, projection as never);

    await service.ensureDocumentRecord(relativePath);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastSyncedAt: previousChangedAt }),
    }));

    await service.ensureDocumentRecord(relativePath, {
      ...metadata,
      updatedAt: nextChangedAt,
      revisionSeq: 2,
    });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lastSyncedAt: new Date(nextChangedAt) }),
    }));
  });
});
