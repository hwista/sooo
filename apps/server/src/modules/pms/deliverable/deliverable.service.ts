import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  ApplyDeliverableTemplateDto,
  UpsertDeliverableTemplateGroupDto,
  UpsertDeliverableDto,
  UpdateSubmissionDto,
} from './dto/deliverable.dto.js';
import {
  normalizeDeliverableSubmissionStatusCode,
  type DeliverableSubmissionStatusCode,
} from './deliverable.constants.js';
import { CloseoutApprovalService } from './closeout-approval.service.js';

type DeliverableTemplateDefinition = {
  deliverableCode: string;
  deliverableName: string;
  description: string;
  sortOrder: number;
};

type ResolvedDeliverableTemplate = {
  templateCode: string;
  source: 'group' | 'default';
  items: DeliverableTemplateDefinition[];
};

const DEFAULT_DELIVERABLE_GROUP_CODES: Record<string, string> = {
  request: 'request-default',
  proposal: 'proposal-default',
  execution: 'execution-default',
  transition: 'transition-default',
};

const DEFAULT_DELIVERABLE_TEMPLATES: Record<string, DeliverableTemplateDefinition[]> = {
  request: [
    {
      deliverableCode: 'DLV-REQ-001',
      deliverableName: '요구사항 정의서',
      description: '고객 요구사항을 정리한 문서',
      sortOrder: 1,
    },
    {
      deliverableCode: 'DLV-REQ-002',
      deliverableName: '요청 검토 보고서',
      description: '요청 단계 검토 결과 보고서',
      sortOrder: 2,
    },
  ],
  proposal: [
    {
      deliverableCode: 'DLV-PRO-001',
      deliverableName: '제안서',
      description: '고객 제안 문서',
      sortOrder: 1,
    },
    {
      deliverableCode: 'DLV-PRO-002',
      deliverableName: '견적서',
      description: '견적 금액 및 상세 내역서',
      sortOrder: 2,
    },
    {
      deliverableCode: 'DLV-PRO-003',
      deliverableName: '프로젝트 계획서',
      description: '프로젝트 수행 계획 문서',
      sortOrder: 3,
    },
  ],
  execution: [
    {
      deliverableCode: 'DLV-EXE-001',
      deliverableName: '설계서',
      description: '시스템/화면 설계 문서',
      sortOrder: 1,
    },
    {
      deliverableCode: 'DLV-EXE-002',
      deliverableName: '테스트 결과 보고서',
      description: '테스트 수행 및 결과 보고서',
      sortOrder: 2,
    },
    {
      deliverableCode: 'DLV-EXE-003',
      deliverableName: '사용자 매뉴얼',
      description: '최종 사용자 가이드 문서',
      sortOrder: 3,
    },
  ],
  transition: [
    {
      deliverableCode: 'DLV-TRN-001',
      deliverableName: '인수인계서',
      description: '운영 전환 인수인계 문서',
      sortOrder: 1,
    },
    {
      deliverableCode: 'DLV-TRN-002',
      deliverableName: '운영 가이드',
      description: '시스템 운영/유지보수 가이드',
      sortOrder: 2,
    },
  ],
};

const TEMPLATE_APPLY_SOURCE = 'pms-template-apply';
const TEMPLATE_GROUP_SOURCE = 'pms-template-group';
const TEMPLATE_RESTORE_SOURCE = 'pms-template-restore';
const TEMPLATE_APPROVAL_STATUSES = new Set(['draft', 'approved', 'archived']);

@Injectable()
export class DeliverableService {
  constructor(
    private readonly db: DatabaseService,
    private readonly closeoutApprovalService: CloseoutApprovalService,
  ) {}

  async findByProject(projectId: bigint, statusCode?: string) {
    const rows = await this.db.client.projectDeliverable.findMany({
      where: {
        projectId,
        isActive: true,
        ...(statusCode && { statusCode }),
      },
      include: {
        deliverable: {
          select: {
            deliverableName: true,
            description: true,
            sortOrder: true,
          },
        },
        event: {
          select: {
            eventId: true,
            eventCode: true,
            eventName: true,
          },
        },
      },
      orderBy: [{ statusCode: 'asc' }, { deliverableCode: 'asc' }],
    });

    const stepsByCode = statusCode
      ? await this.closeoutApprovalService.findStepsByTargets(
          projectId,
          statusCode,
          'deliverable',
          rows.map((row) => row.deliverableCode),
        )
      : new Map();

    return rows.map((row) => ({
      ...row,
      approvalSteps: statusCode ? stepsByCode.get(row.deliverableCode) ?? [] : [],
    }));
  }

  async findTemplateGroups(options: { includeInactive?: boolean } = {}) {
    const includeInactive = options.includeInactive ?? false;
    const groups = await this.db.client.deliverableGroup.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        groupItems: {
          where: includeInactive ? {} : { isActive: true },
          include: {
            deliverable: {
              select: {
                deliverableCode: true,
                deliverableName: true,
                description: true,
                sortOrder: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { deliverableCode: 'asc' }],
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
      items: group.groupItems
        .filter((item) => includeInactive || item.deliverable.isActive)
        .map((item) => ({
          deliverableCode: item.deliverableCode,
          deliverableName: item.deliverable.deliverableName,
          description: item.deliverable.description,
          sortOrder: item.sortOrder,
          memo: item.memo,
          isActive: item.isActive,
        })),
    }));
  }

  async upsertTemplateGroup(dto: UpsertDeliverableTemplateGroupDto) {
    const groupCode = this.normalizeTemplateGroupCode(dto.groupCode);
    const groupName = dto.groupName.trim();
    if (!groupName) {
      throw new BadRequestException('템플릿 그룹명은 필수입니다.');
    }
    if (!dto.items?.length) {
      throw new BadRequestException('템플릿 항목은 1건 이상 필요합니다.');
    }

    await this.db.client.$transaction(async (tx) => {
      await tx.deliverableGroup.upsert({
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
        const deliverableCode = this.normalizeTemplateGroupCode(item.deliverableCode);
        const deliverableName = item.deliverableName.trim() || deliverableCode;
        itemCodes.add(deliverableCode);

        await tx.deliverable.upsert({
          where: { deliverableCode },
          update: {
            deliverableName,
            description: item.description?.trim() || null,
            sortOrder: item.sortOrder ?? index + 1,
            isActive: true,
            lastSource: TEMPLATE_GROUP_SOURCE,
          },
          create: {
            deliverableCode,
            deliverableName,
            description: item.description?.trim() || null,
            sortOrder: item.sortOrder ?? index + 1,
            lastSource: TEMPLATE_GROUP_SOURCE,
          },
        });

        await tx.deliverableGroupItem.upsert({
          where: {
            pk_pr_deliverable_group_item_r_m: {
              groupCode,
              deliverableCode,
            },
          },
          update: {
            sortOrder: item.sortOrder ?? index + 1,
            memo: item.memo?.trim() || null,
            isActive: true,
            lastSource: TEMPLATE_GROUP_SOURCE,
          },
          create: {
            groupCode,
            deliverableCode,
            sortOrder: item.sortOrder ?? index + 1,
            memo: item.memo?.trim() || null,
            lastSource: TEMPLATE_GROUP_SOURCE,
          },
        });
      }

      await tx.deliverableGroupItem.updateMany({
        where: {
          groupCode,
          deliverableCode: { notIn: [...itemCodes] },
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
      throw new NotFoundException(`Deliverable template group not found: ${groupCode}`);
    }
    return group;
  }

  async findTemplateGroupHistory(groupCodeValue: string) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    await this.assertTemplateGroupExists(groupCode);

    return this.db.client.deliverableGroupHistory.findMany({
      where: { groupCode },
      orderBy: [{ historySeq: 'desc' }],
      take: 30,
    });
  }

  async updateTemplateGroupApproval(groupCodeValue: string, approvalStatusCode: string, actorUserId: bigint) {
    const groupCode = this.normalizeTemplateGroupCode(groupCodeValue);
    const statusCode = this.normalizeApprovalStatusCode(approvalStatusCode);
    await this.assertTemplateGroupExists(groupCode);

    return this.db.client.deliverableGroup.update({
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

    return this.db.client.deliverableGroup.update({
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
    const history = await this.db.client.deliverableGroupHistory.findFirst({
      where: { groupCode, historySeq },
    });

    if (!history) {
      throw new NotFoundException(`Deliverable template group history not found: ${groupCode}/${historySeqValue}`);
    }

    const itemHistoryRows = await this.db.client.deliverableGroupItemHistory.findMany({
      where: {
        groupCode,
        eventAt: { lte: history.eventAt },
      },
      orderBy: [
        { deliverableCode: 'asc' },
        { historySeq: 'desc' },
      ],
    });
    const latestItemsByCode = new Map<string, (typeof itemHistoryRows)[number]>();
    for (const item of itemHistoryRows) {
      if (!latestItemsByCode.has(item.deliverableCode)) {
        latestItemsByCode.set(item.deliverableCode, item);
      }
    }
    const restoredItems = [...latestItemsByCode.values()];
    const restoredCodes = restoredItems.map((item) => item.deliverableCode);

    await this.db.client.$transaction(async (tx) => {
      await tx.deliverableGroup.update({
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
        await tx.deliverableGroupItem.upsert({
          where: {
            pk_pr_deliverable_group_item_r_m: {
              groupCode,
              deliverableCode: item.deliverableCode,
            },
          },
          update: {
            sortOrder: item.sortOrder,
            memo: item.memo,
            isActive: item.isActive,
            lastSource: TEMPLATE_RESTORE_SOURCE,
          },
          create: {
            groupCode,
            deliverableCode: item.deliverableCode,
            sortOrder: item.sortOrder,
            memo: item.memo,
            isActive: item.isActive,
            lastSource: TEMPLATE_RESTORE_SOURCE,
          },
        });
      }

      await tx.deliverableGroupItem.updateMany({
        where: {
          groupCode,
          deliverableCode: { notIn: restoredCodes },
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
      throw new NotFoundException(`Deliverable template group not found after restore: ${groupCode}`);
    }
    return group;
  }

  async upsert(projectId: bigint, dto: UpsertDeliverableDto) {
    const submissionStatusCode = this.normalizeSubmissionStatusCode(dto.submissionStatusCode);

    return this.db.client.projectDeliverable.upsert({
      where: {
        pk_pr_project_deliverable_r_m: {
          projectId,
          statusCode: dto.statusCode,
          deliverableCode: dto.deliverableCode,
        },
      },
      update: {
        ...(dto.eventId !== undefined && { eventId: dto.eventId ? BigInt(dto.eventId) : null }),
        submissionStatusCode,
        ...(dto.memo !== undefined && { memo: dto.memo }),
        isActive: true,
      },
      create: {
        projectId,
        statusCode: dto.statusCode,
        deliverableCode: dto.deliverableCode,
        eventId: dto.eventId ? BigInt(dto.eventId) : null,
        submissionStatusCode,
        memo: dto.memo,
      },
      include: {
        deliverable: {
          select: {
            deliverableName: true,
            description: true,
            sortOrder: true,
          },
        },
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

  async applyTemplate(projectId: bigint, dto: ApplyDeliverableTemplateDto) {
    const statusCode = this.normalizeStatusCode(dto.statusCode);
    const applyMode = dto.applyMode ?? 'append';
    await this.assertProjectStatusExists(projectId, statusCode);

    const template = await this.resolveTemplate(statusCode, dto.groupCode);
    const applied = await this.db.client.$transaction(async (tx) => {
      let createdCount = 0;
      let restoredCount = 0;
      let keptCount = 0;
      let deactivatedCount = 0;
      const deliverableCodes = template.items.map((item) => item.deliverableCode);

      if (template.source === 'default') {
        for (const item of template.items) {
          await tx.deliverable.upsert({
            where: { deliverableCode: item.deliverableCode },
            update: {
              deliverableName: item.deliverableName,
              description: item.description,
              sortOrder: item.sortOrder,
              isActive: true,
              lastSource: TEMPLATE_APPLY_SOURCE,
            },
            create: {
              deliverableCode: item.deliverableCode,
              deliverableName: item.deliverableName,
              description: item.description,
              sortOrder: item.sortOrder,
              lastSource: TEMPLATE_APPLY_SOURCE,
            },
          });
        }
      }

      const existingRows = await tx.projectDeliverable.findMany({
        where: {
          projectId,
          statusCode,
          deliverableCode: { in: deliverableCodes },
        },
        select: {
          deliverableCode: true,
          isActive: true,
        },
      });
      const existingByCode = new Map(existingRows.map((row) => [row.deliverableCode, row]));

      for (const item of template.items) {
        const existing = existingByCode.get(item.deliverableCode);

        if (existing?.isActive) {
          keptCount += 1;
          continue;
        }

        const baseData = {
          submissionStatusCode: 'not_submitted',
          memo: `기본 템플릿: ${item.deliverableName}`,
          isActive: true,
          lastSource: TEMPLATE_APPLY_SOURCE,
        };

        if (existing) {
          restoredCount += 1;
          await tx.projectDeliverable.update({
            where: {
              pk_pr_project_deliverable_r_m: {
                projectId,
                statusCode,
                deliverableCode: item.deliverableCode,
              },
            },
            data: baseData,
          });
          continue;
        }

        createdCount += 1;
        await tx.projectDeliverable.create({
          data: {
            projectId,
            statusCode,
            deliverableCode: item.deliverableCode,
            eventId: null,
            ...baseData,
          },
        });
      }

      if (applyMode === 'replace') {
        const deactivated = await tx.projectDeliverable.updateMany({
          where: {
            projectId,
            statusCode,
            isActive: true,
            deliverableCode: { notIn: deliverableCodes },
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

  async updateSubmission(
    projectId: bigint,
    statusCode: string,
    deliverableCode: string,
    dto: UpdateSubmissionDto,
  ) {
    const submissionStatusCode = this.normalizeSubmissionStatusCode(dto.submissionStatusCode);
    const existing = await this.db.client.projectDeliverable.findUnique({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectDeliverable not found: project=${projectId}, status=${statusCode}, deliverable=${deliverableCode}`,
      );
    }

    return this.db.client.projectDeliverable.update({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
      data: {
        submissionStatusCode,
      },
      include: {
        deliverable: {
          select: {
            deliverableName: true,
            description: true,
            sortOrder: true,
          },
        },
      },
    });
  }

  async delete(projectId: bigint, statusCode: string, deliverableCode: string) {
    const existing = await this.db.client.projectDeliverable.findUnique({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectDeliverable not found: project=${projectId}, status=${statusCode}, deliverable=${deliverableCode}`,
      );
    }

    return this.db.client.projectDeliverable.update({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
      data: { isActive: false },
    });
  }

  private normalizeStatusCode(statusCode: string): string {
    const normalized = statusCode.trim();
    if (!DEFAULT_DELIVERABLE_TEMPLATES[normalized]) {
      throw new BadRequestException('지원하지 않는 프로젝트 상태 코드입니다.');
    }
    return normalized;
  }

  private normalizeSubmissionStatusCode(value: string): DeliverableSubmissionStatusCode {
    try {
      return normalizeDeliverableSubmissionStatusCode(value);
    } catch {
      throw new BadRequestException('지원하지 않는 산출물 제출 상태입니다.');
    }
  }

  private normalizeTemplateGroupCode(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('템플릿 그룹/항목 코드는 필수입니다.');
    }
    return normalized;
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

  private async assertTemplateGroupExists(groupCode: string) {
    const group = await this.db.client.deliverableGroup.findUnique({
      where: { groupCode },
      select: { groupCode: true },
    });
    if (!group) {
      throw new NotFoundException(`Deliverable template group not found: ${groupCode}`);
    }
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
  ): Promise<ResolvedDeliverableTemplate> {
    const requestedGroupCode = groupCode?.trim() || DEFAULT_DELIVERABLE_GROUP_CODES[statusCode];
    const groupItems = requestedGroupCode
      ? await this.db.client.deliverableGroupItem.findMany({
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
            deliverable: {
              select: {
                deliverableCode: true,
                deliverableName: true,
                description: true,
                sortOrder: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { deliverableCode: 'asc' }],
        })
      : [];

    const activeGroupItems = groupItems.filter((item) => item.group.isActive && item.deliverable.isActive);
    if (activeGroupItems.length > 0) {
      return {
        templateCode: requestedGroupCode,
        source: 'group',
        items: activeGroupItems.map((item) => ({
          deliverableCode: item.deliverable.deliverableCode,
          deliverableName: item.deliverable.deliverableName,
          description: item.deliverable.description ?? '',
          sortOrder: item.sortOrder,
        })),
      };
    }

    return {
      templateCode: `default:${statusCode}`,
      source: 'default',
      items: DEFAULT_DELIVERABLE_TEMPLATES[statusCode],
    };
  }
}
