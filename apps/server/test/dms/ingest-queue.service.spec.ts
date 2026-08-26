import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { IngestQueueService } from '../../src/modules/dms/ingest/ingest-queue.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { gitService } from '../../src/modules/dms/runtime/git.service.js';

describe('IngestQueueService operations', () => {
  let rootDir: string;
  let queueDir: string;
  let documentDir: string;
  let syncDocumentProjection: jest.Mock<() => Promise<void>>;
  let service: IngestQueueService;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-ingest-'));
    queueDir = path.join(rootDir, 'queue');
    documentDir = path.join(rootDir, 'documents');
    const baseConfig = configService.getConfig();
    jest.spyOn(configService, 'getIngestQueueDir').mockReturnValue(queueDir);
    jest.spyOn(configService, 'getDocDir').mockReturnValue(documentDir);
    jest.spyOn(configService, 'getConfig').mockReturnValue({
      ...baseConfig,
      ingest: {
        ...baseConfig.ingest,
        autoPublish: false,
        maxConcurrentJobs: 1,
        retentionDays: 30,
      },
    });
    jest.spyOn(gitService, 'inspectRemoteParity').mockResolvedValue({
      success: true,
      data: {
        remote: 'origin',
        verified: true,
        canTreatLocalAsCanonical: true,
      },
    });
    jest.spyOn(gitService, 'commitFiles').mockResolvedValue({
      success: true,
      data: { hash: 'ingest-commit-hash' },
    });
    jest.spyOn(gitService, 'publishCurrentBranch').mockResolvedValue({
      success: true,
      data: { remote: 'origin', branch: 'main' },
    });
    jest.spyOn(gitService, 'inspectPathParity').mockResolvedValue({
      success: true,
      data: {
        remote: 'origin',
        verified: true,
        clean: true,
        workingTreePaths: [],
        localAheadPaths: [],
        remoteAheadPaths: [],
      },
    });
    syncDocumentProjection = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    service = new IngestQueueService({ syncDocumentProjection } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('submits, confirms, and publishes a traversal-safe markdown path', async () => {
    const pending = await service.submit({
      title: '../../ quarterly / report',
      content: 'launch smoke content',
      submittedBy: 'admin',
    });
    expect(pending).toMatchObject({ status: 'pending_confirm', attemptCount: 0 });

    const published = await service.confirm(pending.id, 'admin');
    expect(published).toMatchObject({
      status: 'published',
      attemptCount: 1,
      commitHash: 'ingest-commit-hash',
      publishedBranch: 'main',
    });
    expect(published.docPath).toMatch(/^ingest\//);
    expect(published.docPath).not.toContain('../');
    expect(fs.existsSync(path.join(documentDir, published.docPath!))).toBe(true);
    expect(gitService.commitFiles).toHaveBeenCalledWith(
      [published.docPath],
      expect.stringContaining(pending.id),
      'admin',
      expect.arrayContaining([
        `DMS-Ingest-Job-Id: ${pending.id}`,
        'DMS-Actor-LoginId: admin',
      ]),
    );
    expect(gitService.publishCurrentBranch).toHaveBeenCalledWith('origin');
    expect(gitService.inspectPathParity).toHaveBeenCalledWith([published.docPath], 'origin');
    expect(syncDocumentProjection).toHaveBeenCalledTimes(1);
  });

  it('TC-DMS-INGEST-01 keeps a Git commit failure visible and blocks projection', async () => {
    jest.mocked(gitService.commitFiles).mockResolvedValueOnce({
      success: false,
      error: 'commit rejected',
    });
    const pending = await service.submit({
      title: 'commit failure',
      content: 'content',
      submittedBy: 'operator',
    });

    await expect(service.confirm(pending.id, 'operator')).rejects.toThrow(/Git commit 실패: commit rejected/);

    expect(service.list()[0]).toMatchObject({
      id: pending.id,
      status: 'failed',
      attemptCount: 1,
      error: 'Git commit 실패: commit rejected',
    });
    expect(gitService.publishCurrentBranch).not.toHaveBeenCalled();
    expect(syncDocumentProjection).not.toHaveBeenCalled();
  });

  it('TC-DMS-INGEST-02 keeps a Git parity failure visible and blocks projection', async () => {
    jest.mocked(gitService.inspectPathParity).mockResolvedValueOnce({
      success: true,
      data: {
        remote: 'origin',
        verified: true,
        clean: false,
        workingTreePaths: [],
        localAheadPaths: ['ingest/unpublished.md'],
        remoteAheadPaths: [],
        reason: 'PATH_PENDING_LOCAL: unpublished ingest document',
      },
    });
    const pending = await service.submit({
      title: 'parity failure',
      content: 'content',
      submittedBy: 'operator',
    });

    await expect(service.confirm(pending.id, 'operator')).rejects.toThrow(/PATH_PENDING_LOCAL/);

    expect(service.list()[0]).toMatchObject({
      id: pending.id,
      status: 'failed',
      attemptCount: 1,
      error: 'PATH_PENDING_LOCAL: unpublished ingest document',
    });
    expect(syncDocumentProjection).not.toHaveBeenCalled();
  });

  it('TC-DMS-INGEST-03 retries a job whose commit succeeded before publish failed', async () => {
    jest.mocked(gitService.commitFiles)
      .mockResolvedValueOnce({ success: true, data: { hash: 'committed-before-push-failure' } })
      .mockResolvedValueOnce({ success: true, data: { hash: 'committed-before-push-failure' } });
    jest.mocked(gitService.publishCurrentBranch)
      .mockResolvedValueOnce({ success: false, error: 'remote temporarily unavailable' })
      .mockResolvedValueOnce({ success: true, data: { remote: 'origin', branch: 'main' } });
    const pending = await service.submit({
      title: 'push retry job',
      content: 'content',
      submittedBy: 'operator',
    });

    await expect(service.confirm(pending.id, 'operator')).rejects.toThrow(
      /Git publish 실패: remote temporarily unavailable/,
    );
    expect(service.list()[0]).toMatchObject({ status: 'failed', attemptCount: 1 });

    await expect(service.retry(pending.id, 'operator')).resolves.toMatchObject({
      status: 'published',
      attemptCount: 2,
      commitHash: 'committed-before-push-failure',
      publishedBranch: 'main',
    });
    expect(gitService.commitFiles).toHaveBeenCalledTimes(2);
    expect(gitService.publishCurrentBranch).toHaveBeenCalledTimes(2);
    expect(syncDocumentProjection).toHaveBeenCalledTimes(1);
  });

  it('persists a failure and allows an explicit retry', async () => {
    syncDocumentProjection.mockRejectedValueOnce(new Error('projection unavailable'));
    const pending = await service.submit({ title: 'retry job', content: 'content', submittedBy: 'admin' });

    await expect(service.confirm(pending.id, 'admin')).rejects.toThrow(/projection unavailable/);
    expect(service.list()[0]).toMatchObject({ status: 'failed', attemptCount: 1 });

    const retried = await service.retry(pending.id, 'admin');
    expect(retried).toMatchObject({ status: 'published', attemptCount: 2 });
  });

  it('cancels pending jobs and cleans only old terminal history', async () => {
    const cancelled = await service.submit({ title: 'cancel job', content: 'content' });
    await service.cancel(cancelled.id, 'operator');
    const pending = await service.submit({ title: 'keep pending', content: 'content' });

    const queueFile = path.join(queueDir, 'jobs.json');
    const queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8')) as { jobs: Array<Record<string, unknown>> };
    queue.jobs = queue.jobs.map((job) => job.id === cancelled.id
      ? { ...job, updatedAt: '2020-01-01T00:00:00.000Z' }
      : job);
    fs.writeFileSync(queueFile, `${JSON.stringify(queue, null, 2)}\n`, 'utf-8');

    const result = await service.cleanup(30);
    expect(result.removedJobIds).toEqual([cancelled.id]);
    expect(service.list().map((job) => job.id)).toEqual([pending.id]);
  });

  it('fails closed without overwriting a corrupt queue file', async () => {
    fs.mkdirSync(queueDir, { recursive: true });
    const queueFile = path.join(queueDir, 'jobs.json');
    fs.writeFileSync(queueFile, '{not-json', 'utf-8');

    expect(() => service.list()).toThrow(/원본을 보존한 채 복구/);
    await expect(service.submit({ title: 'must not overwrite', content: 'content' })).rejects.toThrow(
      /원본을 보존한 채 복구/,
    );
    expect(fs.readFileSync(queueFile, 'utf-8')).toBe('{not-json');
  });

  it('enforces configured concurrent processing capacity', async () => {
    let markCommitStarted!: () => void;
    let releaseCommit!: () => void;
    const commitStarted = new Promise<void>((resolve) => {
      markCommitStarted = resolve;
    });
    jest.mocked(gitService.commitFiles).mockImplementationOnce(() => {
      markCommitStarted();
      return new Promise((resolve) => {
        releaseCommit = () => resolve({ success: true, data: { hash: 'concurrent-commit' } });
      });
    });
    const first = await service.submit({ title: 'first', content: 'content' });
    const second = await service.submit({ title: 'second', content: 'content' });

    const firstRun = service.confirm(first.id, 'admin');
    await commitStarted;
    await expect(service.confirm(second.id, 'admin')).rejects.toThrow(/동시 처리 한도/);
    releaseCommit();
    await expect(firstRun).resolves.toMatchObject({ status: 'published' });
  });
});
