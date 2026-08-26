import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { StorageProvider } from '../runtime/dms-config.service.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { contentService } from '../runtime/content.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { gitService } from '../runtime/git.service.js';
import { type StorageOrigin } from '../storage/storage-adapter.service.js';

export type IngestJobStatus =
  | 'draft'
  | 'pending_confirm'
  | 'processing'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface IngestJob {
  id: string;
  title: string;
  content: string;
  provider: StorageProvider;
  relativePath: string;
  requestedBy: string;
  origin: StorageOrigin;
  createdAt: string;
  updatedAt: string;
  status: IngestJobStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  publishedAt?: string;
  cancelledAt?: string;
  lastOperatedBy?: string;
  error?: string;
  storageUri?: string;
  docPath?: string;
  commitHash?: string;
  publishedBranch?: string;
}

export interface SubmitIngestRequest {
  title: string;
  content: string;
  requestedBy?: string;
  submittedBy?: string;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
}

interface PersistedIngestJob extends IngestJob {
  submittedBy?: string;
}

interface IngestQueueShape {
  jobs: PersistedIngestJob[];
}

export interface IngestQueueMetrics {
  generatedAt: string;
  queueFilePath: string;
  queueFileBytes: number;
  maxConcurrentJobs: number;
  activeJobs: number;
  retentionDays: number;
  totalCount: number;
  counts: Record<IngestJobStatus, number>;
  oldestPendingAt?: string;
  latestFailure?: { jobId: string; at: string; error: string };
}

const DEFAULT_INGEST_RUNTIME_OWNER = 'admin';

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
}

function normalizeJob(job: PersistedIngestJob): PersistedIngestJob {
  const interrupted = job.status === 'processing';
  return {
    ...job,
    status: interrupted ? 'failed' : job.status,
    attemptCount: Number.isInteger(job.attemptCount) ? job.attemptCount : 0,
    error: interrupted ? '서버 재시작으로 처리 중 작업이 중단되었습니다. 재시도하세요.' : job.error,
    updatedAt: interrupted ? new Date().toISOString() : job.updatedAt,
  };
}

@Injectable()
export class IngestQueueService {
  private mutationTail: Promise<void> = Promise.resolve();
  private publicationTail: Promise<void> = Promise.resolve();
  private readonly activeJobIds = new Set<string>();

  constructor(
    private readonly accessRequestService: AccessRequestService,
  ) {}

  private getQueueRootPath(): string {
    return configService.getIngestQueueDir();
  }

  private getQueueFilePath(): string {
    return path.join(this.getQueueRootPath(), 'jobs.json');
  }

  private getPublishedDocRootPath(): string {
    return path.join(configService.getDocDir(), 'ingest');
  }

  private buildPublishedDocRelativePath(job: IngestJob): string {
    const safeTitle = job.title
      .normalize('NFKC')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 120) || 'document';
    return path.posix.join('ingest', `${job.id}-${safeTitle}.md`);
  }

  private buildPublishedDocContent(job: IngestJob, confirmedAt: string): string {
    const safeTitle = job.title.replace(/[\r\n]+/g, ' ').trim();
    const docLines = [
      `# ${safeTitle}`,
      '',
      '> 자동 수집 문서',
      '',
      `- requestedBy: ${job.requestedBy.replace(/[\r\n]+/g, ' ')}`,
      `- confirmedAt: ${confirmedAt}`,
    ];

    const sourceStorageUri = job.storageUri?.trim();
    if (sourceStorageUri) {
      docLines.push(`- sourceStorageUri: ${sourceStorageUri}`);
      docLines.push(`- sourceProvider: ${job.provider}`);
    }

    docLines.push('', '---', '', job.content, '');
    return docLines.join('\n');
  }

  private buildPublishedDocMetadata(job: PersistedIngestJob, confirmedAt: string): Record<string, unknown> {
    const sourceStorageUri = job.storageUri?.trim();
    const runtimeOwner = typeof job.submittedBy === 'string' && job.submittedBy.trim().length > 0
      ? job.submittedBy.trim()
      : DEFAULT_INGEST_RUNTIME_OWNER;

    return {
      title: job.title,
      summary: '자동 수집 문서',
      author: runtimeOwner,
      lastModifiedBy: runtimeOwner,
      ownerLoginId: runtimeOwner,
      createdAt: confirmedAt,
      updatedAt: confirmedAt,
      visibility: { scope: 'self' },
      sourceLinks: sourceStorageUri ? [sourceStorageUri] : [],
    };
  }

  private toPublicJob(job: PersistedIngestJob): IngestJob {
    const { submittedBy: _submittedBy, ...publicJob } = job;
    return publicJob;
  }

  private loadQueue(): IngestQueueShape {
    const root = this.getQueueRootPath();
    ensureDirectory(root);
    const queueFile = this.getQueueFilePath();
    if (!fs.existsSync(queueFile)) return { jobs: [] };

    try {
      const raw = fs.readFileSync(queueFile, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<IngestQueueShape>;
      if (!Array.isArray(parsed.jobs)) {
        throw new Error('jobs 배열이 없습니다.');
      }
      return { jobs: parsed.jobs.map((job) => normalizeJob(job)) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `수집 큐 파일을 읽을 수 없습니다. 원본을 보존한 채 복구가 필요합니다: ${reason}`,
      );
    }
  }

  private saveQueue(queue: IngestQueueShape): void {
    const root = this.getQueueRootPath();
    ensureDirectory(root);
    const queueFile = this.getQueueFilePath();
    const temporaryFile = `${queueFile}.${process.pid}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporaryFile, `${JSON.stringify(queue, null, 2)}\n`, {
        encoding: 'utf-8',
        mode: 0o600,
      });
      fs.renameSync(temporaryFile, queueFile);
    } finally {
      if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
    }
  }

  private async withQueueMutation<T>(operation: () => Promise<T> | T): Promise<T> {
    const previous = this.mutationTail;
    let release!: () => void;
    this.mutationTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async withPublication<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.publicationTail;
    let release!: () => void;
    this.publicationTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private findJob(queue: IngestQueueShape, id: string): PersistedIngestJob {
    const job = queue.jobs.find((item) => item.id === id);
    if (!job) throw new NotFoundException('수집 작업을 찾을 수 없습니다.');
    return job;
  }

  private async publishJob(job: PersistedIngestJob): Promise<PersistedIngestJob> {
    return this.withPublication(async () => {
      const remoteParity = await gitService.inspectRemoteParity('origin');
      if (!remoteParity.success || !remoteParity.data.canTreatLocalAsCanonical) {
        throw new Error(
          remoteParity.success
            ? remoteParity.data.reason ?? 'Git remote parity를 확인할 수 없습니다.'
            : remoteParity.error,
        );
      }

      ensureDirectory(this.getPublishedDocRootPath());
      const confirmedAt = new Date().toISOString();
      const docPath = this.buildPublishedDocRelativePath(job);
      const docContent = this.buildPublishedDocContent(job, confirmedAt);
      const docMetadata = this.buildPublishedDocMetadata(job, confirmedAt);
      const saved = contentService.save(docPath, docContent, docMetadata);

      if (!saved.success || !saved.data) {
        throw new Error(saved.error ?? '수집 문서 게시에 실패했습니다.');
      }

      const actor = job.lastOperatedBy?.trim()
        || job.submittedBy?.trim()
        || DEFAULT_INGEST_RUNTIME_OWNER;
      const commitResult = await gitService.commitFiles(
        [docPath],
        `feat(dms): publish ingest document ${job.id}`,
        actor,
        [
          `DMS-Ingest-Job-Id: ${job.id}`,
          `DMS-Actor-LoginId: ${actor}`,
        ],
      );
      if (!commitResult.success) {
        throw new Error(`Git commit 실패: ${commitResult.error}`);
      }

      const pushResult = await gitService.publishCurrentBranch('origin');
      if (!pushResult.success) {
        throw new Error(`Git publish 실패: ${pushResult.error}`);
      }

      const pathParity = await gitService.inspectPathParity([docPath], 'origin');
      if (!pathParity.success || !pathParity.data.verified || !pathParity.data.clean) {
        throw new Error(
          pathParity.success
            ? pathParity.data.reason ?? '게시 문서의 Git parity가 clean 상태가 아닙니다.'
            : pathParity.error,
        );
      }

      await this.accessRequestService.syncDocumentProjection(docPath, saved.data.metadata ?? docMetadata);
      return {
        ...job,
        status: 'published',
        docPath: saved.data.savedPath,
        commitHash: commitResult.data.hash,
        publishedBranch: pushResult.data.branch,
        publishedAt: confirmedAt,
        updatedAt: confirmedAt,
        error: undefined,
      };
    });
  }

  private async processJob(
    id: string,
    operation: 'confirm' | 'retry' | 'auto-publish',
    operatedBy: string,
    throwOnFailure: boolean,
  ): Promise<IngestJob> {
    const started = await this.withQueueMutation(() => {
      const queue = this.loadQueue();
      const target = this.findJob(queue, id);
      if (target.status === 'published' && operation === 'confirm') {
        return { shouldProcess: false as const, job: target };
      }
      if (operation === 'retry' && target.status !== 'failed') {
        throw new BadRequestException('실패한 작업만 재시도할 수 있습니다.');
      }
      if (operation !== 'retry' && !['draft', 'pending_confirm'].includes(target.status)) {
        throw new BadRequestException(`${target.status} 상태의 작업은 게시할 수 없습니다.`);
      }

      const maxConcurrentJobs = configService.getConfig().ingest.maxConcurrentJobs;
      if (this.activeJobIds.size >= maxConcurrentJobs) {
        throw new ConflictException(`수집 동시 처리 한도(${maxConcurrentJobs})에 도달했습니다.`);
      }
      this.activeJobIds.add(id);
      const now = new Date().toISOString();
      const next: PersistedIngestJob = {
        ...target,
        status: 'processing',
        attemptCount: target.attemptCount + 1,
        lastAttemptAt: now,
        lastOperatedBy: operatedBy,
        updatedAt: now,
        error: undefined,
      };
      queue.jobs = queue.jobs.map((job) => job.id === id ? next : job);
      this.saveQueue(queue);
      return { shouldProcess: true as const, job: next };
    });

    if (!started.shouldProcess) return this.toPublicJob(started.job);

    try {
      const published = await this.publishJob(started.job);
      await this.withQueueMutation(() => {
        const queue = this.loadQueue();
        queue.jobs = queue.jobs.map((job) => job.id === id ? published : job);
        this.saveQueue(queue);
      });
      return this.toPublicJob(published);
    } catch (error) {
      const message = error instanceof Error ? error.message : '수집 처리 실패';
      const failed = await this.withQueueMutation(() => {
        const queue = this.loadQueue();
        const current = this.findJob(queue, id);
        const next: PersistedIngestJob = {
          ...current,
          status: 'failed',
          error: message,
          updatedAt: new Date().toISOString(),
        };
        queue.jobs = queue.jobs.map((job) => job.id === id ? next : job);
        this.saveQueue(queue);
        return next;
      });
      if (throwOnFailure) {
        throw new BadRequestException(`수집 문서 게시에 실패했습니다: ${message}`);
      }
      return this.toPublicJob(failed);
    } finally {
      this.activeJobIds.delete(id);
    }
  }

  async submit(request: SubmitIngestRequest): Promise<IngestJob> {
    const pendingJob = await this.withQueueMutation(() => {
      const queue = this.loadQueue();
      const now = new Date().toISOString();
      const job: PersistedIngestJob = {
        id: `ingest-${Date.now()}-${randomUUID().slice(0, 8)}`,
        title: request.title.trim(),
        content: request.content,
        provider: request.provider ?? configService.getConfig().storage.defaultProvider,
        relativePath: request.relativePath?.trim() || 'ingest',
        requestedBy: request.requestedBy?.trim() || 'system',
        submittedBy: request.submittedBy?.trim() || DEFAULT_INGEST_RUNTIME_OWNER,
        origin: request.origin ?? 'ingest',
        createdAt: now,
        updatedAt: now,
        status: 'pending_confirm',
        attemptCount: 0,
      };
      queue.jobs.unshift(job);
      this.saveQueue(queue);
      return job;
    });

    if (!configService.getConfig().ingest.autoPublish) return this.toPublicJob(pendingJob);
    try {
      return await this.processJob(
        pendingJob.id,
        'auto-publish',
        pendingJob.submittedBy ?? DEFAULT_INGEST_RUNTIME_OWNER,
        false,
      );
    } catch (error) {
      if (error instanceof ConflictException) return this.toPublicJob(pendingJob);
      throw error;
    }
  }

  list(): IngestJob[] {
    return this.loadQueue().jobs.map((job) => this.toPublicJob(job));
  }

  getMetrics(): IngestQueueMetrics {
    const jobs = this.loadQueue().jobs;
    const statuses: IngestJobStatus[] = ['draft', 'pending_confirm', 'processing', 'published', 'failed', 'cancelled'];
    const counts = Object.fromEntries(statuses.map((status) => [
      status,
      jobs.filter((job) => job.status === status).length,
    ])) as Record<IngestJobStatus, number>;
    const pending = jobs
      .filter((job) => ['draft', 'pending_confirm', 'processing'].includes(job.status))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const failures = jobs
      .filter((job) => job.status === 'failed' && job.error)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const queueFile = this.getQueueFilePath();
    return {
      generatedAt: new Date().toISOString(),
      queueFilePath: queueFile,
      queueFileBytes: fs.existsSync(queueFile) ? fs.statSync(queueFile).size : 0,
      maxConcurrentJobs: configService.getConfig().ingest.maxConcurrentJobs,
      activeJobs: this.activeJobIds.size,
      retentionDays: configService.getConfig().ingest.retentionDays,
      totalCount: jobs.length,
      counts,
      oldestPendingAt: pending[0]?.createdAt,
      latestFailure: failures[0] ? {
        jobId: failures[0].id,
        at: failures[0].updatedAt,
        error: failures[0].error!,
      } : undefined,
    };
  }

  confirm(id: string, operatedBy: string): Promise<IngestJob> {
    return this.processJob(id, 'confirm', operatedBy, true);
  }

  retry(id: string, operatedBy: string): Promise<IngestJob> {
    return this.processJob(id, 'retry', operatedBy, true);
  }

  async cancel(id: string, operatedBy: string): Promise<IngestJob> {
    return this.withQueueMutation(() => {
      const queue = this.loadQueue();
      const target = this.findJob(queue, id);
      if (!['draft', 'pending_confirm', 'failed'].includes(target.status)) {
        throw new BadRequestException(`${target.status} 상태의 작업은 취소할 수 없습니다.`);
      }
      const now = new Date().toISOString();
      const cancelled: PersistedIngestJob = {
        ...target,
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
        lastOperatedBy: operatedBy,
        error: undefined,
      };
      queue.jobs = queue.jobs.map((job) => job.id === id ? cancelled : job);
      this.saveQueue(queue);
      return this.toPublicJob(cancelled);
    });
  }

  async cleanup(olderThanDays?: number): Promise<{
    cutoff: string;
    removedCount: number;
    retainedCount: number;
    removedJobIds: string[];
  }> {
    return this.withQueueMutation(() => {
      const retentionDays = olderThanDays ?? configService.getConfig().ingest.retentionDays;
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const queue = this.loadQueue();
      const removable = queue.jobs.filter((job) => (
        ['published', 'cancelled'].includes(job.status) && job.updatedAt < cutoff
      ));
      const removedIds = new Set(removable.map((job) => job.id));
      queue.jobs = queue.jobs.filter((job) => !removedIds.has(job.id));
      if (removable.length > 0) this.saveQueue(queue);
      return {
        cutoff,
        removedCount: removable.length,
        retainedCount: queue.jobs.length,
        removedJobIds: removable.map((job) => job.id),
      };
    });
  }
}
