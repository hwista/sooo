import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ExtendedPrismaClient } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import {
  COMPLETED_DELIVERABLE_SUBMISSION_STATUSES,
  isDeliverableSubmissionCompleted,
} from './deliverable.constants.js';
import type {
  CloseoutApprovalDecisionStatusCode,
  CloseoutApprovalTargetTypeCode,
  DecideCloseoutApprovalStepDto,
  UpsertCloseoutApprovalRouteDto,
} from './dto/deliverable.dto.js';

const CLOSEOUT_APPROVAL_SOURCE = 'pms-closeout-approval';
const CLOSEOUT_APPROVAL_DECISION_STATUSES = new Set(['approved', 'rejected', 'skipped']);
const CLOSEOUT_APPROVAL_TARGET_TYPES = new Set(['deliverable', 'close_condition']);

type ApprovalStepTarget = {
  projectId: bigint;
  statusCode: string;
  targetTypeCode: CloseoutApprovalTargetTypeCode;
  targetCode: string;
};

type ProjectCloseoutApprovalStepRecord = {
  approvalStepId: bigint;
  projectId: bigint;
  statusCode: string;
  targetTypeCode: string;
  targetCode: string;
  sequenceNo: number;
  approverUserId: bigint;
  approvalStatusCode: string;
  requestedAt: Date;
  decidedAt: Date | null;
  decidedBy: bigint | null;
  memo: string | null;
  isActive: boolean;
};

type ApprovalStepMap = Map<string, ProjectCloseoutApprovalStepRecord[]>;

type CloseoutApprovalClient = Pick<
  ExtendedPrismaClient,
  'projectCloseoutApprovalStep' | 'projectDeliverable' | 'projectCloseCondition'
>;

@Injectable()
export class CloseoutApprovalService {
  constructor(private readonly db: DatabaseService) {}

  async findStepsByTargets(
    projectId: bigint,
    statusCode: string,
    targetTypeCode: CloseoutApprovalTargetTypeCode,
    targetCodes: string[],
  ): Promise<ApprovalStepMap> {
    if (targetCodes.length === 0) {
      return new Map();
    }

    const steps = await this.db.client.projectCloseoutApprovalStep.findMany({
      where: {
        projectId,
        statusCode,
        targetTypeCode,
        targetCode: { in: targetCodes },
        isActive: true,
      },
      orderBy: [{ targetCode: 'asc' }, { sequenceNo: 'asc' }, { approvalStepId: 'asc' }],
    });

    return this.groupStepsByTargetCode(steps);
  }

  async findRoute(target: ApprovalStepTarget): Promise<ProjectCloseoutApprovalStepRecord[]> {
    this.assertSupportedTargetType(target.targetTypeCode);
    return this.db.client.projectCloseoutApprovalStep.findMany({
      where: {
        ...target,
        isActive: true,
      },
      orderBy: [{ sequenceNo: 'asc' }, { approvalStepId: 'asc' }],
    });
  }

  async replaceRoute(
    target: ApprovalStepTarget,
    dto: UpsertCloseoutApprovalRouteDto,
    currentUserId: bigint,
  ): Promise<ProjectCloseoutApprovalStepRecord[]> {
    this.assertSupportedTargetType(target.targetTypeCode);
    const normalizedSteps = this.normalizeRouteSteps(dto);
    await this.assertApproversAreActiveProjectMembers(target.projectId, normalizedSteps.map((step) => step.approverUserId));

    await this.db.client.$transaction(async (tx) => {
      await this.assertTargetExists(target, tx);

      await tx.projectCloseoutApprovalStep.updateMany({
        where: {
          ...target,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedBy: currentUserId,
          lastSource: CLOSEOUT_APPROVAL_SOURCE,
          lastActivity: 'approval-route-replaced',
        },
      });

      for (const step of normalizedSteps) {
        await tx.projectCloseoutApprovalStep.create({
          data: {
            ...target,
            sequenceNo: step.sequenceNo,
            approverUserId: step.approverUserId,
            approvalStatusCode: 'pending',
            requestedAt: new Date(),
            memo: step.memo,
            createdBy: currentUserId,
            updatedBy: currentUserId,
            lastSource: CLOSEOUT_APPROVAL_SOURCE,
            lastActivity: 'approval-route-set',
          },
        });
      }

      await this.markTargetApprovalRequested(target, tx, currentUserId);
    });

    return this.findRoute(target);
  }

  async decideStep(
    target: ApprovalStepTarget,
    approvalStepId: bigint,
    dto: DecideCloseoutApprovalStepDto,
    currentUserId: bigint,
  ): Promise<ProjectCloseoutApprovalStepRecord[]> {
    this.assertSupportedTargetType(target.targetTypeCode);
    const approvalStatusCode = this.normalizeDecisionStatus(dto.approvalStatusCode);
    const step = await this.db.client.projectCloseoutApprovalStep.findFirst({
      where: {
        approvalStepId,
        ...target,
        isActive: true,
      },
    });

    if (!step) {
      throw new NotFoundException(`Closeout approval step not found: ${approvalStepId.toString()}`);
    }
    if (step.approverUserId !== currentUserId) {
      throw new ForbiddenException('지정 승인자만 이 승인 단계를 처리할 수 있습니다.');
    }

    await this.db.client.$transaction(async (tx) => {
      await tx.projectCloseoutApprovalStep.update({
        where: { approvalStepId },
        data: {
          approvalStatusCode,
          decidedAt: new Date(),
          decidedBy: currentUserId,
          memo: dto.memo?.trim() || step.memo,
          updatedBy: currentUserId,
          lastSource: CLOSEOUT_APPROVAL_SOURCE,
          lastActivity: `approval-step-${approvalStatusCode}`,
        },
      });

      await this.applyTargetDecision(target, approvalStatusCode, tx, currentUserId);
    });

    return this.findRoute(target);
  }

  private groupStepsByTargetCode(steps: ProjectCloseoutApprovalStepRecord[]): ApprovalStepMap {
    const map: ApprovalStepMap = new Map();
    for (const step of steps) {
      map.set(step.targetCode, [...(map.get(step.targetCode) ?? []), step]);
    }
    return map;
  }

  private normalizeRouteSteps(dto: UpsertCloseoutApprovalRouteDto) {
    if (!dto.steps?.length) {
      throw new BadRequestException('승인선은 1개 이상의 승인 단계가 필요합니다.');
    }
    if (dto.steps.length > 5) {
      throw new BadRequestException('승인선은 최대 5단계까지 지정할 수 있습니다.');
    }

    const seenSequences = new Set<number>();
    const seenApprovers = new Set<string>();
    return dto.steps.map((step, index) => {
      const sequenceNo = step.sequenceNo ?? index + 1;
      if (seenSequences.has(sequenceNo)) {
        throw new BadRequestException('승인 단계 순서가 중복되었습니다.');
      }
      seenSequences.add(sequenceNo);

      const approverUserId = this.parseUserId(step.approverUserId, '승인자 사용자 ID');
      const approverKey = approverUserId.toString();
      if (seenApprovers.has(approverKey)) {
        throw new BadRequestException('같은 승인자를 승인선에 중복 지정할 수 없습니다.');
      }
      seenApprovers.add(approverKey);

      return {
        sequenceNo,
        approverUserId,
        memo: step.memo?.trim() || null,
      };
    });
  }

  private async assertApproversAreActiveProjectMembers(projectId: bigint, approverUserIds: bigint[]) {
    const uniqueApproverIds = [...new Set(approverUserIds.map((userId) => userId.toString()))].map((userId) => BigInt(userId));
    const members = await this.db.client.projectMember.findMany({
      where: {
        projectId,
        userId: { in: uniqueApproverIds },
        isActive: true,
      },
      select: {
        userId: true,
      },
    });
    const activeUserIds = new Set(members.map((member) => member.userId.toString()));
    const missing = uniqueApproverIds.filter((userId) => !activeUserIds.has(userId.toString()));
    if (missing.length > 0) {
      throw new BadRequestException('승인자는 현재 프로젝트의 활성 멤버여야 합니다.');
    }
  }

  private async assertTargetExists(target: ApprovalStepTarget, client: CloseoutApprovalClient) {
    if (target.targetTypeCode === 'deliverable') {
      const deliverable = await client.projectDeliverable.findUnique({
        where: {
          pk_pr_project_deliverable_r_m: {
            projectId: target.projectId,
            statusCode: target.statusCode,
            deliverableCode: target.targetCode,
          },
        },
        select: { projectId: true, isActive: true },
      });
      if (!deliverable?.isActive) {
        throw new NotFoundException(`Project deliverable not found: ${target.targetCode}`);
      }
      return;
    }

    const condition = await client.projectCloseCondition.findUnique({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId: target.projectId,
          statusCode: target.statusCode,
          conditionCode: target.targetCode,
        },
      },
      select: { projectId: true, isActive: true },
    });
    if (!condition?.isActive) {
      throw new NotFoundException(`Project close condition not found: ${target.targetCode}`);
    }
  }

  private async markTargetApprovalRequested(
    target: ApprovalStepTarget,
    tx: CloseoutApprovalClient,
    currentUserId: bigint,
  ) {
    if (target.targetTypeCode === 'deliverable') {
      const deliverable = await tx.projectDeliverable.findUnique({
        where: {
          pk_pr_project_deliverable_r_m: {
            projectId: target.projectId,
            statusCode: target.statusCode,
            deliverableCode: target.targetCode,
          },
        },
        select: { submissionStatusCode: true },
      });
      const nextStatus = deliverable && isDeliverableSubmissionCompleted(deliverable.submissionStatusCode)
        ? deliverable.submissionStatusCode
        : 'submitted';
      await tx.projectDeliverable.update({
        where: {
          pk_pr_project_deliverable_r_m: {
            projectId: target.projectId,
            statusCode: target.statusCode,
            deliverableCode: target.targetCode,
          },
        },
        data: {
          submissionStatusCode: nextStatus,
          submittedAt: new Date(),
          submittedBy: currentUserId,
          updatedBy: currentUserId,
          lastSource: CLOSEOUT_APPROVAL_SOURCE,
          lastActivity: 'approval-route-requested',
        },
      });
      return;
    }

    await tx.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId: target.projectId,
          statusCode: target.statusCode,
          conditionCode: target.targetCode,
        },
      },
      data: {
        isChecked: false,
        checkedAt: null,
        checkedBy: null,
        updatedBy: currentUserId,
        lastSource: CLOSEOUT_APPROVAL_SOURCE,
        lastActivity: 'approval-route-requested',
      },
    });
  }

  private async applyTargetDecision(
    target: ApprovalStepTarget,
    approvalStatusCode: CloseoutApprovalDecisionStatusCode,
    tx: CloseoutApprovalClient,
    currentUserId: bigint,
  ) {
    if (approvalStatusCode === 'rejected') {
      await this.markTargetRejected(target, tx, currentUserId);
      return;
    }

    const activeSteps = await tx.projectCloseoutApprovalStep.findMany({
      where: {
        ...target,
        isActive: true,
      },
      select: {
        approvalStatusCode: true,
      },
    });
    const allApproved = activeSteps.length > 0
      && activeSteps.every((step) => step.approvalStatusCode === 'approved' || step.approvalStatusCode === 'skipped');
    if (!allApproved) {
      return;
    }

    if (target.targetTypeCode === 'deliverable') {
      await tx.projectDeliverable.update({
        where: {
          pk_pr_project_deliverable_r_m: {
            projectId: target.projectId,
            statusCode: target.statusCode,
            deliverableCode: target.targetCode,
          },
        },
        data: {
          submissionStatusCode: 'approved',
          submittedAt: new Date(),
          submittedBy: currentUserId,
          updatedBy: currentUserId,
          lastSource: CLOSEOUT_APPROVAL_SOURCE,
          lastActivity: 'approval-route-approved',
        },
      });
      return;
    }

    const condition = await tx.projectCloseCondition.findUnique({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId: target.projectId,
          statusCode: target.statusCode,
          conditionCode: target.targetCode,
        },
      },
      select: {
        requiresDeliverable: true,
      },
    });
    if (!condition) {
      throw new NotFoundException(`Project close condition not found: ${target.targetCode}`);
    }
    if (condition.requiresDeliverable) {
      const pendingDeliverables = await tx.projectDeliverable.findMany({
        where: {
          projectId: target.projectId,
          statusCode: target.statusCode,
          isActive: true,
          submissionStatusCode: { notIn: [...COMPLETED_DELIVERABLE_SUBMISSION_STATUSES] },
        },
        select: { deliverableCode: true },
      });
      if (pendingDeliverables.length > 0) {
        throw new BadRequestException(
          `산출물 확정이 필요한 종료조건입니다. 미완료 산출물 ${pendingDeliverables.length}건을 확정/승인 또는 면제 처리한 뒤 승인할 수 있습니다.`,
        );
      }
    }

    await tx.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId: target.projectId,
          statusCode: target.statusCode,
          conditionCode: target.targetCode,
        },
      },
      data: {
        isChecked: true,
        checkedAt: new Date(),
        checkedBy: currentUserId,
        updatedBy: currentUserId,
        lastSource: CLOSEOUT_APPROVAL_SOURCE,
        lastActivity: 'approval-route-approved',
      },
    });
  }

  private async markTargetRejected(
    target: ApprovalStepTarget,
    tx: CloseoutApprovalClient,
    currentUserId: bigint,
  ) {
    if (target.targetTypeCode === 'deliverable') {
      await tx.projectDeliverable.update({
        where: {
          pk_pr_project_deliverable_r_m: {
            projectId: target.projectId,
            statusCode: target.statusCode,
            deliverableCode: target.targetCode,
          },
        },
        data: {
          submissionStatusCode: 'rejected',
          updatedBy: currentUserId,
          lastSource: CLOSEOUT_APPROVAL_SOURCE,
          lastActivity: 'approval-route-rejected',
        },
      });
      return;
    }

    await tx.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId: target.projectId,
          statusCode: target.statusCode,
          conditionCode: target.targetCode,
        },
      },
      data: {
        isChecked: false,
        checkedAt: null,
        checkedBy: null,
        updatedBy: currentUserId,
        lastSource: CLOSEOUT_APPROVAL_SOURCE,
        lastActivity: 'approval-route-rejected',
      },
    });
  }

  private normalizeDecisionStatus(value: string): CloseoutApprovalDecisionStatusCode {
    const normalized = value.trim();
    if (CLOSEOUT_APPROVAL_DECISION_STATUSES.has(normalized)) {
      return normalized as CloseoutApprovalDecisionStatusCode;
    }
    throw new BadRequestException('지원하지 않는 승인 결정 상태입니다.');
  }

  private assertSupportedTargetType(value: string): asserts value is CloseoutApprovalTargetTypeCode {
    if (!CLOSEOUT_APPROVAL_TARGET_TYPES.has(value)) {
      throw new BadRequestException('지원하지 않는 승인 대상 유형입니다.');
    }
  }

  private parseUserId(value: string, fieldName: string): bigint {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException(`${fieldName}는 숫자 문자열이어야 합니다.`);
    }
    return BigInt(normalized);
  }
}
