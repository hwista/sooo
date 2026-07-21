import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  LegacyIssueCleanupArchiveResult,
  LegacyIssueCleanupCanonicalizeResult,
  LegacyIssueCleanupSummary,
  UpdateIssueDto,
} from '@ssoo/types';

type LegacyIssueArchiveSource = Prisma.IssueGetPayload<Prisma.IssueDefaultArgs>;
type LegacyIssueArchiveClient = Pick<DatabaseService['client'], 'legacyIssueArchive' | 'issue'>;
type LegacyIssueCanonicalizationClient = Pick<
  DatabaseService['client'],
  'legacyIssueArchive' | 'issue' | 'projectIssue' | 'projectRisk' | 'projectChangeRequest'
>;
type LegacyIssueCanonicalTarget = 'issue' | 'risk' | 'change';

const legacyIssueCanonicalTargets: Record<string, LegacyIssueCanonicalTarget> = {
  bug: 'issue',
  impediment: 'issue',
  inquiry: 'issue',
  improvement: 'issue',
  risk: 'risk',
  requirement_change: 'change',
};

const legacyProjectIssueTypeCodes = new Set(['bug', 'impediment', 'inquiry', 'improvement']);

const legacyIssueCanonicalTargetLabels: Record<LegacyIssueCanonicalTarget, string> = {
  issue: '정식 이슈',
  risk: '정식 리스크',
  change: '정식 변경요청',
};

@Injectable()
export class IssueService {
  constructor(private readonly db: DatabaseService) {}

  private readonly legacyIssueArchiveReasonCode = 'hidden_cleanup';
  private readonly legacyIssueTerminalArchiveReasonCode = 'manual_cleanup';
  private readonly legacyIssueCanonicalizedArchiveReasonCode = 'canonicalized_cleanup';
  private readonly terminalLegacyIssueStatusCodes = ['resolved', 'closed'];

  private readonly userSelect = {
    id: true,
    userName: true,
    displayName: true,
  } as const;

  async findByProject(projectId: bigint, filters?: { statusCode?: string; issueTypeCode?: string }) {
    return this.db.client.issue.findMany({
      where: {
        projectId,
        isActive: true,
        ...(filters?.statusCode && { statusCode: filters.statusCode }),
        ...(filters?.issueTypeCode && { issueTypeCode: filters.issueTypeCode }),
      },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
      orderBy: [{ priorityCode: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getCleanupSummary(projectId: bigint): Promise<LegacyIssueCleanupSummary> {
    const where = { projectId, isActive: true };
    const [
      activeCleanupCount,
      pendingCleanupCount,
      terminalCleanupCount,
      archivedCleanupCount,
      statusGroups,
      typeGroups,
    ] = await this.db.client.$transaction([
      this.db.client.issue.count({ where }),
      this.db.client.issue.count({
        where: {
          ...where,
          statusCode: { notIn: this.terminalLegacyIssueStatusCodes },
        },
      }),
      this.db.client.issue.count({
        where: {
          ...where,
          statusCode: { in: this.terminalLegacyIssueStatusCodes },
        },
      }),
      this.db.client.legacyIssueArchive.count({ where: { projectId, isActive: true } }),
      this.db.client.issue.groupBy({
        by: ['statusCode'],
        where,
        _count: { _all: true },
        orderBy: { statusCode: 'asc' },
      }),
      this.db.client.issue.groupBy({
        by: ['issueTypeCode'],
        where,
        _count: { _all: true },
        orderBy: { issueTypeCode: 'asc' },
      }),
    ]);

    return {
      projectId: projectId.toString(),
      activeCleanupCount,
      pendingCleanupCount,
      terminalCleanupCount,
      archivedCleanupCount,
      readyForPhysicalRemoval: activeCleanupCount === 0,
      statusCounts: statusGroups.map((group) => ({
        statusCode: group.statusCode,
        count: group._count._all,
      })),
      issueTypeCounts: typeGroups.map((group) => ({
        issueTypeCode: group.issueTypeCode,
        count: group._count._all,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async archiveTerminalCleanupRows(projectId: bigint): Promise<LegacyIssueCleanupArchiveResult> {
    const terminalIssues = await this.db.client.issue.findMany({
      where: {
        projectId,
        isActive: true,
        statusCode: { in: this.terminalLegacyIssueStatusCodes },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    if (terminalIssues.length > 0) {
      const archivedAt = new Date();
      await this.db.client.$transaction(async (tx) => {
        for (const issue of terminalIssues) {
          await this.archiveAndHideIssue(tx, issue, {
            archivedAt,
            archivedReasonCode: this.legacyIssueTerminalArchiveReasonCode,
            fallbackResolution: '완료된 legacy Issue cleanup 일괄 숨김 처리됨',
          });
        }
      });
    }

    const summary = await this.getCleanupSummary(projectId);
    return {
      ...summary,
      archivedCount: terminalIssues.length,
    };
  }

  async canonicalizePendingCleanupRows(projectId: bigint): Promise<LegacyIssueCleanupCanonicalizeResult> {
    const pendingIssues = await this.db.client.issue.findMany({
      where: {
        projectId,
        isActive: true,
        statusCode: { notIn: this.terminalLegacyIssueStatusCodes },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const counts = {
      issue: 0,
      risk: 0,
      change: 0,
    };

    if (pendingIssues.length > 0) {
      const archivedAt = new Date();
      await this.db.client.$transaction(async (tx) => {
        for (const issue of pendingIssues) {
          const target = await this.canonicalizeAndHideIssue(tx, issue, archivedAt);
          counts[target] += 1;
        }
      });
    }

    const summary = await this.getCleanupSummary(projectId);
    return {
      ...summary,
      convertedCount: pendingIssues.length,
      projectIssueCount: counts.issue,
      riskCount: counts.risk,
      changeRequestCount: counts.change,
    };
  }

  async findOne(id: bigint) {
    const issue = await this.db.client.issue.findUnique({
      where: { id },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
    });
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  async update(id: bigint, dto: UpdateIssueDto) {
    const existing = await this.db.client.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);

    return this.db.client.issue.update({
      where: { id },
      data: {
        ...(dto.issueTitle !== undefined && { issueTitle: dto.issueTitle }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.issueTypeCode !== undefined && { issueTypeCode: dto.issueTypeCode }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.priorityCode !== undefined && { priorityCode: dto.priorityCode }),
        ...(dto.assigneeUserId !== undefined && { assigneeUserId: dto.assigneeUserId ? BigInt(dto.assigneeUserId) : null }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.resolvedAt !== undefined && { resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null }),
        ...(dto.resolution !== undefined && { resolution: dto.resolution }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
    });
  }

  async remove(id: bigint) {
    const existing = await this.db.client.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);

    const archivedAt = new Date();
    return this.db.client.$transaction((tx) => (
      this.archiveAndHideIssue(tx, existing, {
        archivedAt,
        archivedReasonCode: this.legacyIssueArchiveReasonCode,
        fallbackResolution: '호환성 인박스에서 숨김 처리됨',
      })
    ));
  }

  private buildLegacyIssueArchive(
    existing: LegacyIssueArchiveSource,
    archivedAt: Date,
    archivedReasonCode: string,
  ) {
    const archivedIssue = {
      projectId: existing.projectId,
      issueCode: existing.issueCode,
      issueTitle: existing.issueTitle,
      description: existing.description,
      issueTypeCode: existing.issueTypeCode,
      statusCode: existing.statusCode,
      priorityCode: existing.priorityCode,
      reportedByUserId: existing.reportedByUserId,
      assigneeUserId: existing.assigneeUserId,
      reportedAt: existing.reportedAt,
      dueAt: existing.dueAt,
      resolvedAt: existing.resolvedAt,
      resolution: existing.resolution,
      sortOrder: existing.sortOrder,
      sourceIsActive: existing.isActive,
      archivedReasonCode,
      archivedAt,
      sourceCreatedBy: existing.createdBy,
      sourceCreatedAt: existing.createdAt,
      sourceUpdatedBy: existing.updatedBy,
      sourceUpdatedAt: existing.updatedAt,
      sourceLastSource: existing.lastSource,
      sourceLastActivity: existing.lastActivity,
      sourceTransactionId: existing.transactionId,
      isActive: true,
      memo: existing.memo,
    };

    return archivedIssue;
  }

  private async canonicalizeAndHideIssue(
    tx: LegacyIssueCanonicalizationClient,
    existing: LegacyIssueArchiveSource,
    archivedAt: Date,
  ): Promise<LegacyIssueCanonicalTarget> {
    const target = legacyIssueCanonicalTargets[existing.issueTypeCode] ?? 'issue';
    const memo = `기존 Issue ${existing.issueCode}에서 전환`;
    const description = this.buildCanonicalizedDescription(existing);

    if (target === 'risk') {
      await this.ensureCanonicalRisk(tx, existing, description, memo);
    } else if (target === 'change') {
      await this.ensureCanonicalChangeRequest(tx, existing, description, memo);
    } else {
      await this.ensureCanonicalProjectIssue(tx, existing, description, memo);
    }

    await this.archiveAndHideIssue(tx, existing, {
      archivedAt,
      archivedReasonCode: this.legacyIssueCanonicalizedArchiveReasonCode,
      fallbackResolution: `${legacyIssueCanonicalTargetLabels[target]}으로 전환됨`,
    });

    return target;
  }

  private async ensureCanonicalProjectIssue(
    tx: LegacyIssueCanonicalizationClient,
    existing: LegacyIssueArchiveSource,
    description: string,
    memo: string,
  ) {
    const issueCode = this.getCanonicalCode('PI', existing);
    const found = await tx.projectIssue.findFirst({
      where: {
        projectId: existing.projectId,
        issueCode,
      },
    });
    if (found) {
      return;
    }

    await tx.projectIssue.create({
      data: {
        projectId: existing.projectId,
        issueCode,
        issueTitle: existing.issueTitle,
        description,
        issueTypeCode: legacyProjectIssueTypeCodes.has(existing.issueTypeCode) ? existing.issueTypeCode : 'inquiry',
        statusCode: existing.statusCode,
        priorityCode: existing.priorityCode,
        reportedByUserId: existing.reportedByUserId,
        ownerUserId: existing.assigneeUserId,
        reportedAt: existing.reportedAt,
        dueAt: existing.dueAt,
        resolvedAt: existing.resolvedAt,
        resolution: existing.resolution,
        memo,
      },
    });
  }

  private async ensureCanonicalRisk(
    tx: LegacyIssueCanonicalizationClient,
    existing: LegacyIssueArchiveSource,
    description: string,
    memo: string,
  ) {
    const riskCode = this.getCanonicalCode('RK', existing);
    const found = await tx.projectRisk.findFirst({
      where: {
        projectId: existing.projectId,
        riskCode,
      },
    });
    if (found) {
      return;
    }

    await tx.projectRisk.create({
      data: {
        projectId: existing.projectId,
        riskCode,
        riskTitle: existing.issueTitle,
        description,
        statusCode: existing.statusCode === 'in_progress' ? 'monitoring' : 'identified',
        impactCode: existing.priorityCode === 'critical' || existing.priorityCode === 'high' ? 'high' : 'medium',
        likelihoodCode: 'medium',
        responsePlan: existing.resolution,
        ownerUserId: existing.assigneeUserId,
        dueAt: existing.dueAt,
        memo,
      },
    });
  }

  private async ensureCanonicalChangeRequest(
    tx: LegacyIssueCanonicalizationClient,
    existing: LegacyIssueArchiveSource,
    description: string,
    memo: string,
  ) {
    const changeCode = this.getCanonicalCode('CHG', existing);
    const found = await tx.projectChangeRequest.findFirst({
      where: {
        projectId: existing.projectId,
        changeCode,
      },
    });
    if (found) {
      return;
    }

    await tx.projectChangeRequest.create({
      data: {
        projectId: existing.projectId,
        changeCode,
        changeTitle: existing.issueTitle,
        description,
        statusCode: existing.statusCode === 'in_progress' ? 'reviewing' : 'requested',
        priorityCode: existing.priorityCode,
        requestedAt: existing.reportedAt,
        ownerUserId: existing.assigneeUserId,
        memo,
      },
    });
  }

  private getCanonicalCode(prefix: string, existing: LegacyIssueArchiveSource) {
    return `${prefix}-LEG-${existing.id.toString()}`;
  }

  private buildCanonicalizedDescription(existing: LegacyIssueArchiveSource) {
    const lines = [
      existing.description,
      '',
      `전환 원본: 기존 Issue ${existing.issueCode}`,
    ].filter((line): line is string => typeof line === 'string' && line.length > 0);

    return lines.join('\n');
  }

  private async archiveAndHideIssue(
    tx: LegacyIssueArchiveClient,
    existing: LegacyIssueArchiveSource,
    options: { archivedAt: Date; archivedReasonCode: string; fallbackResolution: string },
  ) {
    const archivedIssue = this.buildLegacyIssueArchive(existing, options.archivedAt, options.archivedReasonCode);

    await tx.legacyIssueArchive.upsert({
      where: { sourceIssueId: existing.id },
      create: {
        sourceIssueId: existing.id,
        ...archivedIssue,
      },
      update: archivedIssue,
    });

    return tx.issue.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        statusCode: this.terminalLegacyIssueStatusCodes.includes(existing.statusCode) ? existing.statusCode : 'closed',
        resolvedAt: existing.resolvedAt ?? options.archivedAt,
        resolution: existing.resolution ?? options.fallbackResolution,
      },
    });
  }
}
