import fs from 'node:fs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  DmsAcknowledgeHomeSeenResult,
  DmsHomeActionItem,
  DmsHomeDocumentItem,
  DmsHomeOperationalExceptionItem,
  DmsHomeSection,
  DmsHomeSummary,
  DmsRecordDocumentVisitResult,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { AccessService } from '../access/access.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { DocumentRecordService } from '../access/document-record.service.js';
import { CollaborationService } from '../collaboration/collaboration.service.js';
import { IngestQueueService } from '../ingest/ingest-queue.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { personalSettingsService } from '../runtime/personal-settings.service.js';
import { resolveAbsolutePath, resolveDocumentPresentation } from '../search/search.helpers.js';
import { SettingsService } from '../settings/settings.service.js';

const HOME_DOCUMENT_LIMIT = 6;
const HOME_SOURCE = 'dms.home';
const SECTION_UNAVAILABLE_REASON = '일부 운영 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.';

type HomeDocumentRecord = {
  documentId: bigint;
  relativePath: string;
  syncStatusCode: string;
  createdAt: Date;
  lastSyncedAt: Date | null;
  ownerUser: {
    userName: string;
    displayName: string | null;
  };
};

@Injectable()
export class HomeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessService: AccessService,
    private readonly accessRequestService: AccessRequestService,
    private readonly documentAclService: DocumentAclService,
    private readonly documentRecordService: DocumentRecordService,
    private readonly collaborationService: CollaborationService,
    private readonly ingestQueueService: IngestQueueService,
    private readonly settingsService: SettingsService,
  ) {}

  async getSummary(user: TokenPayload): Promise<DmsHomeSummary> {
    const generatedAt = new Date();
    const access = await this.accessService.getAccessSnapshot(user);
    let lastSeenAt: Date | undefined;
    let settingsDegraded = false;

    try {
      const settings = await personalSettingsService.loadSettingsForUser(user.userId);
      const candidate = settings.home.lastSeenAt
        ? new Date(settings.home.lastSeenAt)
        : undefined;
      if (candidate && !Number.isNaN(candidate.getTime())) {
        lastSeenAt = candidate;
      }
    } catch {
      settingsDegraded = true;
    }

    const [continueWorking, loadedChanges, actions, operations] = await Promise.all([
      this.loadSection(() => this.loadContinueWorking(user)),
      this.loadSection(() => this.loadChanges(user, lastSeenAt)),
      this.loadActions(user),
      access.features.canManageSettings
        ? this.loadOperations()
        : Promise.resolve(this.emptySection<DmsHomeOperationalExceptionItem>()),
    ]);

    const changes = settingsDegraded
      ? {
          ...loadedChanges,
          status: 'degraded' as const,
          reason: '마지막 홈 확인 시각을 불러오지 못해 최신 문서를 표시합니다.',
        }
      : loadedChanges;

    return {
      generatedAt: generatedAt.toISOString(),
      ...(lastSeenAt ? { lastSeenAt: lastSeenAt.toISOString() } : {}),
      hasPreviousVisit: Boolean(lastSeenAt),
      features: access.features,
      metrics: {
        continueWorking: continueWorking.items.length,
        changedSinceLastVisit: changes.items.length,
        pendingActions: actions.items.length,
        operationalExceptions: operations.items.length,
      },
      sections: {
        continueWorking,
        changes,
        actions,
        operations,
      },
    };
  }

  async recordVisit(user: TokenPayload, inputPath: string): Promise<DmsRecordDocumentVisitResult> {
    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(inputPath);
    if (!valid || !safeRelPath.toLowerCase().endsWith('.md')) {
      throw new BadRequestException('유효한 문서 경로가 아닙니다.');
    }
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    this.documentAclService.assertCanReadAbsolutePath(user, targetPath);
    const userId = this.parseUserId(user.userId);
    const existingDocument = await this.db.client.dmsDocument.findFirst({
      where: { relativePath: safeRelPath, isActive: true, documentStatusCode: 'active' },
      select: { documentId: true },
    });
    const document = existingDocument
      ?? await this.documentRecordService.ensureDocumentRecord(safeRelPath);
    const openedAt = new Date();
    const activity = await this.db.client.dmsUserDocumentActivity.upsert({
      where: {
        ux_dm_user_document_activity_m_user_document: {
          userId,
          documentId: document.documentId,
        },
      },
      create: {
        userId,
        documentId: document.documentId,
        firstOpenedAt: openedAt,
        lastOpenedAt: openedAt,
        openCount: 1,
        createdBy: userId,
        updatedBy: userId,
        lastSource: HOME_SOURCE,
        lastActivity: 'document-opened',
      },
      update: {
        lastOpenedAt: openedAt,
        openCount: { increment: 1 },
        isActive: true,
        updatedBy: userId,
        lastSource: HOME_SOURCE,
        lastActivity: 'document-opened',
      },
      select: {
        documentId: true,
        lastOpenedAt: true,
        openCount: true,
      },
    });

    return {
      documentId: activity.documentId.toString(),
      lastOpenedAt: activity.lastOpenedAt.toISOString(),
      openCount: activity.openCount,
    };
  }

  async acknowledgeSeen(user: TokenPayload, seenAtValue: string): Promise<DmsAcknowledgeHomeSeenResult> {
    const seenAt = new Date(seenAtValue);
    if (Number.isNaN(seenAt.getTime())) {
      throw new BadRequestException('유효한 확인 시각이 아닙니다.');
    }
    if (seenAt.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException('미래의 확인 시각은 저장할 수 없습니다.');
    }

    const current = await personalSettingsService.loadSettingsForUser(user.userId);
    const currentSeenAt = current.home.lastSeenAt
      ? new Date(current.home.lastSeenAt)
      : undefined;
    const monotonicSeenAt = currentSeenAt
      && !Number.isNaN(currentSeenAt.getTime())
      && currentSeenAt.getTime() > seenAt.getTime()
      ? currentSeenAt
      : seenAt;

    await personalSettingsService.updateSettingsForUser(user.userId, {
      home: { lastSeenAt: monotonicSeenAt.toISOString() },
    });
    return { lastSeenAt: monotonicSeenAt.toISOString() };
  }

  private async loadContinueWorking(user: TokenPayload): Promise<DmsHomeDocumentItem[]> {
    const rows = await this.db.client.dmsUserDocumentActivity.findMany({
      where: {
        userId: this.parseUserId(user.userId),
        isActive: true,
        document: { isActive: true, documentStatusCode: 'active' },
      },
      orderBy: { lastOpenedAt: 'desc' },
      take: HOME_DOCUMENT_LIMIT * 2,
      select: {
        lastOpenedAt: true,
        openCount: true,
        document: {
          select: {
            documentId: true,
            relativePath: true,
            syncStatusCode: true,
            createdAt: true,
            lastSyncedAt: true,
            ownerUser: { select: { userName: true, displayName: true } },
          },
        },
      },
    });

    return rows
      .filter(({ document }) => this.isReadableDocument(user, document.relativePath))
      .slice(0, HOME_DOCUMENT_LIMIT)
      .map(({ document, lastOpenedAt, openCount }) => this.toDocumentItem(document, {
        lastOpenedAt,
        openCount,
      }));
  }

  private async loadChanges(user: TokenPayload, lastSeenAt?: Date): Promise<DmsHomeDocumentItem[]> {
    const rows = await this.db.client.dmsDocument.findMany({
      where: {
        isActive: true,
        documentStatusCode: 'active',
        ...(lastSeenAt
          ? {
              OR: [
                { lastSyncedAt: { gt: lastSeenAt } },
                { lastSyncedAt: null, createdAt: { gt: lastSeenAt } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastSyncedAt: 'desc' }, { createdAt: 'desc' }],
      take: HOME_DOCUMENT_LIMIT * 3,
      select: {
        documentId: true,
        relativePath: true,
        syncStatusCode: true,
        createdAt: true,
        lastSyncedAt: true,
        ownerUser: { select: { userName: true, displayName: true } },
      },
    });

    return rows
      .filter((document) => this.isReadableDocument(user, document.relativePath))
      .slice(0, HOME_DOCUMENT_LIMIT)
      .map((document) => this.toDocumentItem(document));
  }

  private async loadActions(user: TokenPayload): Promise<DmsHomeSection<DmsHomeActionItem>> {
    const [requestResult, documentResult] = await Promise.allSettled([
      this.accessRequestService.listManageableReadRequestsSnapshot(user, { status: 'pending' }),
      this.loadRepairDocuments(user),
    ]);
    const items: DmsHomeActionItem[] = [];

    if (requestResult.status === 'fulfilled') {
      items.push(...requestResult.value.slice(0, HOME_DOCUMENT_LIMIT).map((request) => ({
        id: `access-request:${request.requestId}`,
        kind: 'access-request' as const,
        title: request.documentTitle,
        description: `${request.requester.displayName ?? request.requester.loginId} 님의 ${request.requestedRole === 'write' ? '편집' : '열람'} 요청`,
        occurredAt: request.requestedAt,
        target: { kind: 'settings' as const, scope: 'system' as const, sectionId: 'documentAccess' },
      })));
    }
    if (documentResult.status === 'fulfilled') {
      items.push(...documentResult.value.map((document) => ({
        id: `document-repair:${document.documentId.toString()}`,
        kind: 'document-repair' as const,
        title: resolveDocumentPresentation(
          document.relativePath,
          configService.getDocDir(),
          document.relativePath.split('/').pop()?.replace(/\.md$/i, '') ?? '문서',
        ).title,
        description: '문서 제어 정보 확인이 필요합니다.',
        occurredAt: document.updatedAt.toISOString(),
        target: { kind: 'document' as const, path: document.relativePath },
      })));
    }

    return this.sectionFromSettled(items, [requestResult, documentResult]);
  }

  private async loadOperations(): Promise<DmsHomeSection<DmsHomeOperationalExceptionItem>> {
    const [readinessResult, publishResult, ingestResult] = await Promise.allSettled([
      this.settingsService.getReadiness(),
      this.collaborationService.listPublishFailures(),
      Promise.resolve(this.ingestQueueService.getMetrics()),
    ]);
    const items: DmsHomeOperationalExceptionItem[] = [];

    if (readinessResult.status === 'fulfilled' && readinessResult.value.status !== 'ready') {
      const readiness = readinessResult.value;
      items.push({
        id: `readiness:${readiness.snapshotId}`,
        kind: 'readiness',
        severity: readiness.status === 'blocked' || readiness.status === 'unknown' ? 'critical' : 'warning',
        title: 'DMS 실행 준비 상태 확인 필요',
        description: readiness.reason,
        occurredAt: readiness.checkedAt ?? undefined,
        target: { kind: 'settings', scope: 'system', sectionId: 'git' },
      });
    }
    if (publishResult.status === 'fulfilled') {
      items.push(...publishResult.value.slice(0, HOME_DOCUMENT_LIMIT).map((failure) => ({
        id: `publish:${failure.path}`,
        kind: 'publish' as const,
        severity: 'critical' as const,
        title: '문서 게시 실패',
        description: `${failure.path} 게시 상태를 확인하고 재시도하세요.`,
        occurredAt: failure.lastQueuedAt,
        target: { kind: 'document' as const, path: failure.path },
      })));
    }
    if (ingestResult.status === 'fulfilled') {
      const metrics = ingestResult.value;
      if (metrics.counts.failed > 0) {
        items.push({
          id: `ingest:failed:${metrics.generatedAt}`,
          kind: 'ingest',
          severity: 'critical',
          title: `수집 실패 ${metrics.counts.failed}건`,
          description: '수집 대기열에서 실패 원인을 확인하고 재시도하세요.',
          occurredAt: metrics.latestFailure?.at,
          target: { kind: 'settings', scope: 'system', sectionId: 'ingest-runtime' },
        });
      }
      const pendingCount = metrics.counts.draft + metrics.counts.pending_confirm + metrics.counts.processing;
      if (pendingCount > 0) {
        items.push({
          id: `ingest:pending:${metrics.generatedAt}`,
          kind: 'ingest',
          severity: 'warning',
          title: `수집 처리 대기 ${pendingCount}건`,
          description: '확인 또는 처리를 기다리는 수집 작업이 있습니다.',
          occurredAt: metrics.oldestPendingAt,
          target: { kind: 'settings', scope: 'system', sectionId: 'ingest-runtime' },
        });
      }
    }

    return this.sectionFromSettled(items, [readinessResult, publishResult, ingestResult]);
  }

  private async loadRepairDocuments(user: TokenPayload) {
    const documents = await this.db.client.dmsDocument.findMany({
      where: {
        ownerUserId: this.parseUserId(user.userId),
        isActive: true,
        documentStatusCode: 'active',
        syncStatusCode: 'repair_needed',
      },
      orderBy: { updatedAt: 'desc' },
      take: HOME_DOCUMENT_LIMIT * 2,
      select: {
        documentId: true,
        relativePath: true,
        updatedAt: true,
      },
    });
    return documents
      .filter((document) => this.isReadableDocument(user, document.relativePath))
      .slice(0, HOME_DOCUMENT_LIMIT);
  }

  private toDocumentItem(
    document: HomeDocumentRecord,
    activity?: { lastOpenedAt: Date; openCount: number },
  ): DmsHomeDocumentItem {
    const title = resolveDocumentPresentation(
      document.relativePath,
      configService.getDocDir(),
      document.relativePath.split('/').pop()?.replace(/\.md$/i, '') ?? '문서',
    ).title;
    return {
      documentId: document.documentId.toString(),
      path: document.relativePath,
      title,
      ownerName: document.ownerUser.displayName ?? document.ownerUser.userName,
      updatedAt: (document.lastSyncedAt ?? document.createdAt).toISOString(),
      syncStatusCode: document.syncStatusCode,
      ...(activity
        ? {
            lastOpenedAt: activity.lastOpenedAt.toISOString(),
            openCount: activity.openCount,
          }
        : {}),
    };
  }

  private isReadableDocument(user: TokenPayload, relativePath: string): boolean {
    const absolutePath = resolveAbsolutePath(relativePath, configService.getDocDir());
    return fs.existsSync(absolutePath)
      && fs.statSync(absolutePath).isFile()
      && this.documentAclService.isReadableAbsolutePath(user, absolutePath);
  }

  private parseUserId(userId: string): bigint {
    try {
      return BigInt(userId);
    } catch {
      throw new BadRequestException('유효한 사용자 식별자가 아닙니다.');
    }
  }

  private async loadSection<T>(loader: () => Promise<T[]>): Promise<DmsHomeSection<T>> {
    try {
      const items = await loader();
      return items.length > 0
        ? { status: 'ready', items }
        : this.emptySection<T>();
    } catch {
      return { status: 'degraded', items: [], reason: SECTION_UNAVAILABLE_REASON };
    }
  }

  private sectionFromSettled<T>(
    items: T[],
    results: PromiseSettledResult<unknown>[],
  ): DmsHomeSection<T> {
    if (results.some((result) => result.status === 'rejected')) {
      return { status: 'degraded', items, reason: SECTION_UNAVAILABLE_REASON };
    }
    return items.length > 0
      ? { status: 'ready', items }
      : this.emptySection<T>();
  }

  private emptySection<T>(): DmsHomeSection<T> {
    return { status: 'empty', items: [] };
  }
}
