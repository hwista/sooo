import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { gitService, type GitRemoteParityStatus } from '../runtime/git.service.js';
import { normalizeRelativePath } from '../runtime/path-utils.js';
import { listMarkdownFiles } from '../search/search.helpers.js';
import { ACTIVE_REQUEST_SOURCE } from './access-request.util.js';
import { DocumentControlPlaneService } from './document-control-plane.service.js';
import { DocumentRecordService } from './document-record.service.js';

const CONTROL_PLANE_SYNC_MAX_AGE_MS = 30_000;
const BULK_DEACTIVATION_MIN_DOCUMENTS = 10;
const BULK_DEACTIVATION_MAX_RATIO = 0.5;
const logger = createDmsLogger('DmsControlPlaneSyncService');

interface ActiveDocumentIdentity {
  documentId: bigint;
  relativePath: string;
}

export interface ControlPlaneSyncStatus {
  state: 'not-run' | 'ready' | 'degraded' | 'failed';
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  reason?: string;
  scanned?: number;
  synced?: number;
  repaired?: number;
  failed?: number;
  deactivated?: number;
}

interface ControlPlaneSyncSummary {
  scanned: number;
  synced: number;
  repaired: number;
  failed: number;
  deactivated: number;
}

@Injectable()
export class ControlPlaneSyncService {
  private lastControlPlaneSyncAt = 0;
  private controlPlaneSyncPromise: Promise<void> | null = null;
  private deferredGitBootstrapRoot: string | null = null;
  private syncStatus: ControlPlaneSyncStatus = { state: 'not-run' };

  constructor(
    private readonly db: DatabaseService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
    private readonly documentRecordService: DocumentRecordService,
  ) {}

  markSynced(): void {
    this.lastControlPlaneSyncAt = Date.now();
    const now = new Date(this.lastControlPlaneSyncAt).toISOString();
    this.syncStatus = {
      ...this.syncStatus,
      state: 'ready',
      lastAttemptAt: now,
      lastSuccessAt: now,
      reason: undefined,
    };
  }

  getStatus(): ControlPlaneSyncStatus {
    return { ...this.syncStatus };
  }

  async ensureRepoControlPlaneSynced(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastControlPlaneSyncAt < CONTROL_PLANE_SYNC_MAX_AGE_MS) {
      return;
    }
    if (this.controlPlaneSyncPromise) {
      await this.controlPlaneSyncPromise;
      return;
    }

    this.controlPlaneSyncPromise = (async () => {
      this.syncStatus = {
        ...this.syncStatus,
        state: 'not-run',
        lastAttemptAt: new Date().toISOString(),
        reason: undefined,
      };
      try {
        await this.ensureGitContentPlaneReady();
        const repoParity = await this.inspectRepoMutationParity();
        if (!repoParity.canTreatLocalAsCanonical) {
          const pullRecovered = await this.tryPullAndRecover(repoParity);
          if (!pullRecovered) {
            logger.warn('문서 repo -> control-plane 동기화 보류 (원격 parity 확인 필요)', {
              force,
              reason: repoParity.reason,
              syncStatus: repoParity.syncStatus
                ? {
                    remote: repoParity.syncStatus.remote,
                    remoteConfigured: repoParity.syncStatus.remoteConfigured,
                    remoteExists: repoParity.syncStatus.remoteExists,
                    remoteAhead: repoParity.syncStatus.remoteAhead,
                    localAhead: repoParity.syncStatus.localAhead,
                    diverged: repoParity.syncStatus.diverged,
                  }
                : undefined,
            });
            await this.documentControlPlaneService.refreshCache();
            this.lastControlPlaneSyncAt = Date.now();
            this.syncStatus = {
              ...this.syncStatus,
              state: 'degraded',
              reason: repoParity.reason ?? 'Remote parity verification is required.',
            };
            return;
          }
        }
        const summary = await this.syncRepoControlPlane(force);
        await this.documentControlPlaneService.refreshCache();
        this.lastControlPlaneSyncAt = Date.now();
        this.syncStatus = {
          state: 'ready',
          lastAttemptAt: this.syncStatus.lastAttemptAt,
          lastSuccessAt: new Date(this.lastControlPlaneSyncAt).toISOString(),
          ...summary,
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.syncStatus = {
          ...this.syncStatus,
          state: 'failed',
          reason,
        };
        logger.warn('문서 control-plane 동기화 실패', { message: reason });
        throw error;
      } finally {
        this.controlPlaneSyncPromise = null;
      }
    })();

    await this.controlPlaneSyncPromise;
  }

  async ensureGitContentPlaneReady(): Promise<void> {
    const rootDir = configService.getDocDir();
    const workingTreeEntries = fs.existsSync(rootDir)
      ? fs.readdirSync(rootDir)
      : [];
    const hasGitRepository = workingTreeEntries.includes('.git');
    const visibleEntries = workingTreeEntries.filter((entry) => entry !== '.git');
    const shouldInitializeGit = hasGitRepository || workingTreeEntries.length === 0;

    if (!shouldInitializeGit) {
      if (!hasGitRepository && this.deferredGitBootstrapRoot !== rootDir) {
        this.deferredGitBootstrapRoot = rootDir;
        logger.warn('Git content-plane bootstrap 보류 (reconcile 필요)', {
          rootDir,
          visibleEntryCount: visibleEntries.length,
          bootstrapRemoteConfigured: Boolean(configService.getGitBootstrapRemoteUrl()),
        });
      }
      return;
    }

    this.deferredGitBootstrapRoot = null;
    const initResult = await gitService.initialize();
    if (!initResult.success) {
      throw new Error(`Git content-plane bootstrap failed: ${initResult.error}`);
    }
  }

  private async inspectRepoMutationParity(): Promise<GitRemoteParityStatus> {
    const parityResult = await gitService.inspectRemoteParity('origin');
    if (parityResult.success) {
      return parityResult.data;
    }

    return {
      remote: 'origin',
      verified: false,
      canTreatLocalAsCanonical: false,
      reason: `PARITY_CHECK_FAILED: ${parityResult.error}`,
    };
  }

  private async tryPullAndRecover(parity: GitRemoteParityStatus): Promise<boolean> {
    const sync = parity.syncStatus;
    if (!sync) return false;

    if (sync.remoteAhead && !sync.localAhead && !sync.diverged) {
      const result = await gitService.pullFastForward('origin');
      if (result.pulled) {
        logger.info('런타임 auto-pull 성공 (remote → local ff-only)', {
          behindCount: sync.behindCount,
          pulledCommits: result.commitCount,
        });
        return true;
      }
      logger.warn('런타임 auto-pull 스킵', { reason: result.reason });
      return false;
    }

    return false;
  }

  private async syncRepoControlPlane(force: boolean): Promise<ControlPlaneSyncSummary> {
    const rootDir = configService.getDocDir();
    const markdownFiles = listMarkdownFiles(rootDir);
    const scannedRelativePaths = new Set(
      markdownFiles.map((absolutePath) => normalizeRelativePath(path.relative(rootDir, absolutePath))),
    );
    const activeDocuments = await this.loadActiveDocuments();
    this.assertDeactivationIsSafe(rootDir, scannedRelativePaths, activeDocuments);
    let synced = 0;
    let repaired = 0;
    let failed = 0;

    for (const absolutePath of markdownFiles) {
      const relativePath = normalizeRelativePath(path.relative(rootDir, absolutePath));
      try {
        await this.documentRecordService.ensureDocumentRecord(relativePath);
        synced += 1;
      } catch (error) {
        try {
          await this.documentRecordService.upsertRepairNeededDocument(relativePath, absolutePath, error);
          repaired += 1;
        } catch (repairError) {
          failed += 1;
          logger.warn('repair-needed 문서 동기화도 실패', {
            relativePath,
            error: repairError instanceof Error ? repairError.message : String(repairError),
          });
        }
      }
    }

    const deactivated = await this.deactivateMissingDocuments(scannedRelativePaths, activeDocuments);

    logger.info('문서 repo -> control-plane 동기화 완료', {
      force,
      scanned: markdownFiles.length,
      synced,
      repaired,
      failed,
      deactivated,
    });

    return {
      scanned: markdownFiles.length,
      synced,
      repaired,
      failed,
      deactivated,
    };
  }

  private async loadActiveDocuments(): Promise<ActiveDocumentIdentity[]> {
    return this.db.client.dmsDocument.findMany({
      where: {
        isActive: true,
        documentStatusCode: 'active',
      },
      select: {
        documentId: true,
        relativePath: true,
      },
    });
  }

  private assertDeactivationIsSafe(
    rootDir: string,
    scannedRelativePaths: ReadonlySet<string>,
    activeDocuments: readonly ActiveDocumentIdentity[],
  ): void {
    if (activeDocuments.length === 0) {
      return;
    }

    const missingCount = activeDocuments.filter(
      (document) => !scannedRelativePaths.has(document.relativePath),
    ).length;
    if (missingCount === 0) {
      return;
    }

    if (scannedRelativePaths.size === 0) {
      throw new Error(
        `DMS control-plane safety guard blocked deactivation: markdown root scanned 0 files while ${activeDocuments.length} active documents exist (${rootDir}).`,
      );
    }

    const missingRatio = missingCount / activeDocuments.length;
    if (
      missingCount >= BULK_DEACTIVATION_MIN_DOCUMENTS
      && missingRatio >= BULK_DEACTIVATION_MAX_RATIO
    ) {
      throw new Error(
        `DMS control-plane safety guard blocked bulk deactivation: ${missingCount}/${activeDocuments.length} active documents are absent from the configured markdown root (${rootDir}).`,
      );
    }
  }

  private async deactivateMissingDocuments(
    scannedRelativePaths: ReadonlySet<string>,
    activeDocuments: readonly ActiveDocumentIdentity[],
  ): Promise<number> {

    const missingDocumentIds = activeDocuments
      .filter((document) => !scannedRelativePaths.has(document.relativePath))
      .map((document) => document.documentId);
    if (missingDocumentIds.length === 0) {
      return 0;
    }

    const reconciledAt = new Date();
    await this.db.client.$transaction(async (tx) => {
      await tx.dmsDocument.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
        },
        data: {
          documentStatusCode: 'deleted',
          syncStatusCode: 'deleted',
          isActive: false,
          lastReconciledAt: reconciledAt,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
      await tx.dmsDocumentSourceFile.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
      await tx.dmsDocumentPathHistory.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
      await tx.dmsDocumentComment.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
    });

    return missingDocumentIds.length;
  }
}
