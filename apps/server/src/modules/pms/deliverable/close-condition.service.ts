import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  ApplyCloseConditionTemplateDto,
  UpsertCloseConditionTemplateGroupDto,
  UpsertCloseConditionDto,
  ToggleCheckDto,
} from './dto/deliverable.dto.js';
import { COMPLETED_DELIVERABLE_SUBMISSION_STATUSES } from './deliverable.constants.js';
import { CloseoutApprovalService } from './closeout-approval.service.js';

type CloseConditionTemplateDefinition = {
  conditionCode: string;
  requiresDeliverable: boolean;
  sortOrder: number;
  memo: string;
};

type ResolvedCloseConditionTemplate = {
  templateCode: string;
  source: 'group' | 'default';
  items: CloseConditionTemplateDefinition[];
};

const DEFAULT_CLOSE_CONDITION_GROUP_CODES: Record<string, string> = {
  request: 'request-default',
  proposal: 'proposal-default',
  execution: 'execution-default',
  transition: 'transition-default',
};

const DEFAULT_CLOSE_CONDITION_TEMPLATES: Record<string, CloseConditionTemplateDefinition[]> = {
  request: [
    {
      conditionCode: 'DELIVERABLE_SUBMITTED',
      requiresDeliverable: true,
      sortOrder: 1,
      memo: '필요 산출물 제출 상태 확인',
    },
    {
      conditionCode: 'CUSTOMER_ACCEPTANCE_SIGNED',
      requiresDeliverable: false,
      sortOrder: 2,
      memo: '고객 검수 또는 요청 접수 확인',
    },
  ],
  proposal: [
    {
      conditionCode: 'DELIVERABLE_SUBMITTED',
      requiresDeliverable: true,
      sortOrder: 1,
      memo: '제안서와 견적서 제출 상태 확인',
    },
    {
      conditionCode: 'CUSTOMER_ACCEPTANCE_SIGNED',
      requiresDeliverable: false,
      sortOrder: 2,
      memo: '고객 제안 수락 또는 계약 전환 확인',
    },
  ],
  execution: [
    {
      conditionCode: 'DELIVERABLE_SUBMITTED',
      requiresDeliverable: true,
      sortOrder: 1,
      memo: '수행 산출물 승인 상태 확인',
    },
    {
      conditionCode: 'FINAL_REPORT_DONE',
      requiresDeliverable: false,
      sortOrder: 2,
      memo: '종료 보고 및 최종 결과 정리',
    },
  ],
  transition: [
    {
      conditionCode: 'DELIVERABLE_SUBMITTED',
      requiresDeliverable: true,
      sortOrder: 1,
      memo: '전환 산출물 승인 상태 확인',
    },
    {
      conditionCode: 'HANDOVER_COMPLETED',
      requiresDeliverable: false,
      sortOrder: 2,
      memo: '운영 또는 차기 담당자 인수인계 확인',
    },
  ],
};

const TEMPLATE_APPLY_SOURCE = 'pms-template-apply';
const TEMPLATE_GROUP_SOURCE = 'pms-template-group';
const TEMPLATE_RESTORE_SOURCE = 'pms-template-restore';
const TEMPLATE_APPROVAL_STATUSES = new Set(['draft', 'approved', 'archived']);

@Injectable()
export class CloseConditionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly closeoutApprovalService: CloseoutApprovalService,
  ) {}

  async findByProject(projectId: bigint, statusCode?: string) {
    const rows = await this.db.client.projectCloseCondition.findMany({
      where: {
        projectId,
        isActive: true,
        ...(statusCode && { statusCode }),
      },
      include: {
        event: {
          select: {
            eventId: true,
            eventCode: true,
            eventName: true,
          },
        },
      },
      orderBy: [{ statusCode: 'asc' }, { sortOrder: 'asc' }, { conditionCode: 'asc' }],
    });

    const stepsByCode = statusCode
      ? await this.closeoutApprovalService.findStepsByTargets(
          projectId,
          statusCode,
          'close_condition',
          rows.map((row) => row.conditionCode),
        )
      : new Map();

    return rows.map((row) => ({
      ...row,
      approvalSteps: statusCode ? stepsByCode.get(row.conditionCode) ?? [] : [],
    }));
  }

  async findTemplateGroups(options: { includeInactive?: boolean } = {}) {
    const includeInactive = options.includeInactive ?? false;
    const groups = await this.db.client.closeConditionGroup.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        groupItems: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { conditionCode: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { groupCode: 'asc' }],
    });

    return groups.map((group) => ({
      groupCode: group.groupCode,
      groupName: group.groupName,
      description: group.description,
      sortOrder: group.sortOrder,
      approvalStatusCode: group.approvalStatusCode,
      versionNo: group.versionNo,
      approvedBy: group.approvedBy,
      approvedAt: group.approvedAt,
      isActive: group.isActive,
      items: group.groupItems.map((item) => ({
        conditionCode: item.conditionCode,
        requiresDeliverable: item.requiresDeliverable,
        sortOrder: item.sortOrder,
        memo: item.memo,
        isActive: item.isActive,
      })),
    }));
  }

  async upsertTemplateGroup(dto: UpsertCloseConditionTemplateGroupDto) {
    const groupCode = this.normalizeTemplateGroupCode(dto.groupCode);
    const groupName = dto.groupName.trim();
    if (!groupName) {
      throw new BadRequestException('템플릿 그룹명은 필수입니다.');
    }
    if (!dto.items?.length) {
      throw new BadRequestException('템플릿 항목은 1건 이상 필요합니다.');
    }

    await this.db.client.$transaction(async (tx) => {
      await tx.closeConditionGroup.upsert({
        where: { groupCode },
        update: {
          groupName,
          description: dto.description?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
          approvalStatusCode: 'draft',
          versionNo: { increment: 1 },
          approvedBy: null,
          approvedAt: null,
          isActive: true,
          lastSource: TEMPLATE_GROUP_SOURCE,
        },
        create: {
          groupCode,
          groupName,
          description: dto.description?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
          approvalStatusCode: 'draft',
          versionNo: 1,
          lastSource: TEMPLATE_GROUP_SOURCE,
        },
      });

      const itemCodes = new Set<string>();
      for (const [index, item] of dto.items.entries()) {
        const conditionCode = this.normalizeTemplateGroupCode(item.conditionCode);
        itemCodes.add(conditionCode);

        await tx.closeConditionGroupItem.upsert({
          where: {
            pk_pr_close_condition_group_item_r_m: {
              groupCode,
              conditionCode,
            },
          },
          update: {
            requiresDeliverable: item.requiresDeliverable,
            sortOrder: item.sortOrder ?? index + 1,
            memo: item.memo?.trim() || null,
            isActive: true,
            lastSource: TEMPLATE_GROUP_SOURCE,
          },
          create: {
            groupCode,
            conditionCode,
            requiresDeliverable: item.requiresDeliverable,
            sortOrder: item.sortOrder ?? index + 1,
            memo: item.memo?.trim() || null,
            lastSource: TEMPLATE_GROUP_SOURCE,
          },
        });
      }

      await tx.closeConditionGroupItem.updateMany({
        where: {
          groupCode,
          conditionCode: { notIn: [...itemCodes] },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: TEMPLATE_GROUP_SOURCE,
        },
      });
    });

    const groups = await this.findTemplateGroups({ includeInactive: true });
    const group = groups.find((item) => item.groupCode === groupCode);
    if (!group) {
      throw new NotFoundException(`Close condition template group not found: ${groupCode}`);
    }
    return group;
  }

  async findTemplateGroupHistory(groupCodeValue: string) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    await this.assertTemplateGroupExists(groupCode);

    return this.db.client.closeConditionGroupHistory.findMany({
      where: { groupCode },
      orderBy: [{ historySeq: 'desc' }],
      take: 30,
    });
  }

  async updateTemplateGroupApproval(groupCodeValue: string, approvalStatusCode: string, actorUserId: bigint) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    const statusCode = this.normalizeApprovalStatusCode(approvalStatusCode);
    await this.assertTemplateGroupExists(groupCode);

    return this.db.client.closeConditionGroup.update({
      where: { groupCode },
      data: {
        approvalStatusCode: statusCode,
        versionNo: { increment: 1 },
        approvedBy: statusCode === 'approved' ? actorUserId : null,
        approvedAt: statusCode === 'approved' ? new Date() : null,
        isActive: statusCode !== 'archived',
        lastSource: TEMPLATE_GROUP_SOURCE,
      },
    });
  }

  async findTemplateGroup(groupCodeValue: string, options: { includeInactive?: boolean } = {}) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    const groups = await this.findTemplateGroups(options);
    return groups.find((item) => item.groupCode === groupCode) ?? null;
  }

  async deactivateTemplateGroup(groupCodeValue: string) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    await this.assertTemplateGroupExists(groupCode);

    return this.db.client.closeConditionGroup.update({
      where: { groupCode },
      data: {
        approvalStatusCode: 'archived',
        versionNo: { increment: 1 },
        approvedBy: null,
        approvedAt: null,
        isActive: false,
        lastSource: TEMPLATE_GROUP_SOURCE,
      },
    });
  }

  async restoreTemplateGroup(groupCodeValue: string, historySeqValue: string) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    const historySeq = this.parseHistorySeq(historySeqValue);
    const history = await this.db.client.closeConditionGroupHistory.findFirst({
      where: { groupCode, historySeq },
    });

    if (!history) {
      throw new NotFoundException(`Close condition template group history not found: ${groupCode}/${historySeqValue}`);
    }

    const itemHistoryRows = await this.db.client.closeConditionGroupItemHistory.findMany({
      where: {
        groupCode,
        eventAt: { lte: history.eventAt },
      },
      orderBy: [
        { conditionCode: 'asc' },
        { historySeq: 'desc' },
      ],
    });
    const latestItemsByCode = new Map<string, (typeof itemHistoryRows)[number]>();
    for (const item of itemHistoryRows) {
      if (!latestItemsByCode.has(item.conditionCode)) {
        latestItemsByCode.set(item.conditionCode, item);
      }
    }
    const restoredItems = [...latestItemsByCode.values()];
    const restoredCodes = restoredItems.map((item) => item.conditionCode);

    await this.db.client.$transaction(async (tx) => {
      await tx.closeConditionGroup.update({
        where: { groupCode },
        data: {
          groupName: history.groupName,
          description: history.description,
          sortOrder: history.sortOrder,
          approvalStatusCode: 'draft',
          versionNo: { increment: 1 },
          approvedBy: null,
          approvedAt: null,
          isActive: true,
          memo: history.memo,
          lastSource: TEMPLATE_RESTORE_SOURCE,
        },
      });

      for (const item of restoredItems) {
        await tx.closeConditionGroupItem.upsert({
          where: {
            pk_pr_close_condition_group_item_r_m: {
              groupCode,
              conditionCode: item.conditionCode,
            },
          },
          update: {
            requiresDeliverable: item.requiresDeliverable,
            sortOrder: item.sortOrder,
            memo: item.memo,
            isActive: item.isActive,
            lastSource: TEMPLATE_RESTORE_SOURCE,
          },
          create: {
            groupCode,
            conditionCode: item.conditionCode,
            requiresDeliverable: item.requiresDeliverable,
            sortOrder: item.sortOrder,
            memo: item.memo,
            isActive: item.isActive,
            lastSource: TEMPLATE_RESTORE_SOURCE,
          },
        });
      }

      await tx.closeConditionGroupItem.updateMany({
        where: {
          groupCode,
          conditionCode: { notIn: restoredCodes },
        },
        data: {
          isActive: false,
          lastSource: TEMPLATE_RESTORE_SOURCE,
        },
      });
    });

    const groups = await this.findTemplateGroups();
    const group = groups.find((item) => item.groupCode === groupCode);
    if (!group) {
      throw new NotFoundException(`Close condition template group not found after restore: ${groupCode}`);
    }
    return group;
  }

  async upsert(projectId: bigint, dto: UpsertCloseConditionDto) {
    return this.db.client.projectCloseCondition.upsert({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId,
          statusCode: dto.statusCode,
          conditionCode: dto.conditionCode,
        },
      },
      update: {
        ...(dto.eventId !== undefined && { eventId: dto.eventId ? BigInt(dto.eventId) : null }),
        requiresDeliverable: dto.requiresDeliverable,
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        isActive: true,
      },
      create: {
        projectId,
        statusCode: dto.statusCode,
        conditionCode: dto.conditionCode,
        eventId: dto.eventId ? BigInt(dto.eventId) : null,
        requiresDeliverable: dto.requiresDeliverable,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
      include: {
        event: {
          select: {
            eventId: true,
            eventCode: true,
            eventName: true,
          },
        },
      },
    });
  }

  async applyTemplate(projectId: bigint, dto: ApplyCloseConditionTemplateDto) {
    const statusCode = this.normalizeStatusCode(dto.statusCode);
    const applyMode = dto.applyMode ?? 'append';
    await this.assertProjectStatusExists(projectId, statusCode);

    const template = await this.resolveTemplate(statusCode, dto.groupCode);
    const applied = await this.db.client.$transaction(async (tx) => {
      let createdCount = 0;
      let restoredCount = 0;
      let keptCount = 0;
      let deactivatedCount = 0;
      const conditionCodes = template.items.map((item) => item.conditionCode);
      const existingRows = await tx.projectCloseCondition.findMany({
        where: {
          projectId,
          statusCode,
          conditionCode: { in: conditionCodes },
        },
        select: {
          conditionCode: true,
          isActive: true,
        },
      });
      const existingByCode = new Map(existingRows.map((row) => [row.conditionCode, row]));

      for (const item of template.items) {
        const existing = existingByCode.get(item.conditionCode);

        if (existing?.isActive) {
          keptCount += 1;
          continue;
        }

        const baseData = {
          requiresDeliverable: item.requiresDeliverable,
          isChecked: false,
          checkedAt: null,
          checkedBy: null,
          sortOrder: item.sortOrder,
          memo: item.memo,
          isActive: true,
          lastSource: TEMPLATE_APPLY_SOURCE,
        };

        if (existing) {
          restoredCount += 1;
          await tx.projectCloseCondition.update({
            where: {
              pk_pr_project_close_condition_r_m: {
                projectId,
                statusCode,
                conditionCode: item.conditionCode,
              },
            },
            data: baseData,
          });
          continue;
        }

        createdCount += 1;
        await tx.projectCloseCondition.create({
          data: {
            projectId,
            statusCode,
            conditionCode: item.conditionCode,
            eventId: null,
            ...baseData,
          },
        });
      }

      if (applyMode === 'replace') {
        const deactivated = await tx.projectCloseCondition.updateMany({
          where: {
            projectId,
            statusCode,
            isActive: true,
            conditionCode: { notIn: conditionCodes },
          },
          data: {
            isActive: false,
            lastSource: TEMPLATE_APPLY_SOURCE,
          },
        });
        deactivatedCount = deactivated.count;
      }

      return { createdCount, restoredCount, keptCount, deactivatedCount };
    });

    const items = await this.findByProject(projectId, statusCode);
    return {
      projectId,
      statusCode,
      templateCode: template.templateCode,
      source: template.source,
      applyMode,
      ...applied,
      items,
    };
  }

  async toggleCheck(
    projectId: bigint,
    statusCode: string,
    conditionCode: string,
    dto: ToggleCheckDto,
  ) {
    const existing = await this.db.client.projectCloseCondition.findUnique({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectCloseCondition not found: project=${projectId}, status=${statusCode}, condition=${conditionCode}`,
      );
    }

    if (existing.requiresDeliverable && dto.isChecked) {
      const pendingDeliverables = await this.db.client.projectDeliverable.findMany({
        where: {
          projectId,
          statusCode,
          isActive: true,
          submissionStatusCode: { notIn: [...COMPLETED_DELIVERABLE_SUBMISSION_STATUSES] },
        },
        select: {
          deliverableCode: true,
        },
      });

      if (pendingDeliverables.length > 0) {
        throw new BadRequestException(
          `산출물 확정이 필요한 종료조건입니다. 미완료 산출물 ${pendingDeliverables.length}건을 확정/승인 또는 면제 처리한 뒤 완료 처리할 수 있습니다.`,
        );
      }
    }

    return this.db.client.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
      data: {
        isChecked: dto.isChecked,
        checkedAt: dto.isChecked ? new Date() : null,
      },
    });
  }

  async delete(projectId: bigint, statusCode: string, conditionCode: string) {
    const existing = await this.db.client.projectCloseCondition.findUnique({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectCloseCondition not found: project=${projectId}, status=${statusCode}, condition=${conditionCode}`,
      );
    }

    return this.db.client.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
      data: { isActive: false },
    });
  }

  private normalizeStatusCode(statusCode: string): string {
    const normalized = statusCode.trim();
    if (!DEFAULT_CLOSE_CONDITION_TEMPLATES[normalized]) {
      throw new BadRequestException('지원하지 않는 프로젝트 상태 코드입니다.');
    }
    return normalized;
  }

  private async assertProjectStatusExists(projectId: bigint, statusCode: string) {
    const projectStatus = await this.db.client.projectStatus.findUnique({
      where: {
        pk_pr_project_status_m: {
          projectId,
          statusCode,
        },
      },
      select: {
        projectId: true,
      },
    });

    if (projectStatus) {
      return;
    }

    const project = await this.db.client.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId.toString()} not found`);
    }

    throw new BadRequestException('해당 프로젝트 상태가 아직 초기화되지 않았습니다.');
  }

  private async resolveTemplate(
    statusCode: string,
    groupCode?: string,
  ): Promise<ResolvedCloseConditionTemplate> {
    const requestedGroupCode = groupCode?.trim() || DEFAULT_CLOSE_CONDITION_GROUP_CODES[statusCode];
    const groupItems = requestedGroupCode
      ? await this.db.client.closeConditionGroupItem.findMany({
          where: {
            groupCode: requestedGroupCode,
            isActive: true,
          },
          include: {
            group: {
              select: {
                isActive: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { conditionCode: 'asc' }],
        })
      : [];

    const activeGroupItems = groupItems.filter((item) => item.group.isActive);
    if (activeGroupItems.length > 0) {
      return {
        templateCode: requestedGroupCode,
        source: 'group',
        items: activeGroupItems.map((item) => ({
          conditionCode: item.conditionCode,
          requiresDeliverable: item.requiresDeliverable || this.isDeliverableRequiredCondition(item.conditionCode),
          sortOrder: item.sortOrder,
          memo: item.memo ?? `기본 템플릿: ${item.conditionCode}`,
        })),
      };
    }

    return {
      templateCode: `default:${statusCode}`,
      source: 'default',
      items: DEFAULT_CLOSE_CONDITION_TEMPLATES[statusCode],
    };
  }

  private isDeliverableRequiredCondition(conditionCode: string): boolean {
    return conditionCode === 'DELIVERABLE_SUBMITTED';
  }

  private normalizeApprovalStatusCode(value: string): 'draft' | 'approved' | 'archived' {
    const normalized = value.trim();
    if (TEMPLATE_APPROVAL_STATUSES.has(normalized)) {
      return normalized as 'draft' | 'approved' | 'archived';
    }
    throw new BadRequestException('지원하지 않는 템플릿 승인 상태입니다.');
  }

  private parseHistorySeq(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('템플릿 이력 순번은 BigInt 문자열이어야 합니다.');
    }
    return BigInt(value);
  }

  private normalizeTemplateGroupCode(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('템플릿 그룹/항목 코드는 필수입니다.');
    }
    return normalized;
  }

  private async assertTemplateGroupExists(groupCode: string) {
    const group = await this.db.client.closeConditionGroup.findUnique({
      where: { groupCode },
      select: { groupCode: true },
    });
    if (!group) {
      throw new NotFoundException(`Close condition template group not found: ${groupCode}`);
    }
  }
}
