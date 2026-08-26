import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { ControlPlaneSyncService } from '../../src/modules/dms/access/control-plane-sync.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { gitService } from '../../src/modules/dms/runtime/git.service.js';

describe('ControlPlaneSyncService safety guard', () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-control-plane-'));
    fs.mkdirSync(path.join(rootDir, '.git'));
    jest.spyOn(configService, 'getDocDir').mockReturnValue(rootDir);
    jest.spyOn(gitService, 'initialize').mockResolvedValue({
      success: true,
      data: { isNew: false, mode: 'existing' },
    });
    jest.spyOn(gitService, 'inspectRemoteParity').mockResolvedValue({
      success: true,
      data: {
        remote: 'origin',
        verified: true,
        canTreatLocalAsCanonical: true,
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  function createService(activeDocuments: Array<{ documentId: bigint; relativePath: string }>) {
    const transaction = jest.fn();
    const db = {
      client: {
        dmsDocument: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue(activeDocuments),
        },
        $transaction: transaction,
      },
    } as unknown as ConstructorParameters<typeof ControlPlaneSyncService>[0];
    const documentControlPlaneService = {
      refreshCache: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as ConstructorParameters<typeof ControlPlaneSyncService>[1];
    const documentRecordService = {
      ensureDocumentRecord: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      upsertRepairNeededDocument: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as ConstructorParameters<typeof ControlPlaneSyncService>[2];

    return {
      service: new ControlPlaneSyncService(db, documentControlPlaneService, documentRecordService),
      transaction,
      documentControlPlaneService,
      documentRecordService,
    };
  }

  it('blocks an empty markdown root before any control-plane mutation', async () => {
    const activeDocuments = Array.from({ length: 12 }, (_, index) => ({
      documentId: BigInt(index + 1),
      relativePath: `docs/${index + 1}.md`,
    }));
    const fixture = createService(activeDocuments);

    await expect(fixture.service.ensureRepoControlPlaneSynced(true)).rejects.toThrow(
      /safety guard blocked deactivation: markdown root scanned 0 files/,
    );

    expect(fixture.documentRecordService.ensureDocumentRecord).not.toHaveBeenCalled();
    expect(fixture.transaction).not.toHaveBeenCalled();
    expect(fixture.documentControlPlaneService.refreshCache).not.toHaveBeenCalled();
    expect(fixture.service.getStatus()).toMatchObject({
      state: 'failed',
      reason: expect.stringContaining('safety guard blocked deactivation'),
    });
  });

  it('blocks a suspicious majority drop before registering a misbound root', async () => {
    fs.writeFileSync(path.join(rootDir, 'unrelated.md'), '# unrelated');
    const activeDocuments = Array.from({ length: 12 }, (_, index) => ({
      documentId: BigInt(index + 1),
      relativePath: `docs/${index + 1}.md`,
    }));
    const fixture = createService(activeDocuments);

    await expect(fixture.service.ensureRepoControlPlaneSynced(true)).rejects.toThrow(
      /safety guard blocked bulk deactivation: 12\/12/,
    );

    expect(fixture.documentRecordService.ensureDocumentRecord).not.toHaveBeenCalled();
    expect(fixture.transaction).not.toHaveBeenCalled();
  });

  it('allows an empty first bootstrap when the DB has no active documents', async () => {
    const fixture = createService([]);

    await expect(fixture.service.ensureRepoControlPlaneSynced(true)).resolves.toBeUndefined();

    expect(fixture.documentControlPlaneService.refreshCache).toHaveBeenCalledTimes(1);
    expect(fixture.service.getStatus()).toMatchObject({
      state: 'ready',
      scanned: 0,
      deactivated: 0,
    });
  });
});
