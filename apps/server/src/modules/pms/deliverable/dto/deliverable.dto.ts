import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsInt, Min, IsArray, ValidateNested, IsIn } from 'class-validator';
import {
  DELIVERABLE_SUBMISSION_STATUS_CODES,
  DELIVERABLE_SUBMISSION_STATUS_INPUT_CODES,
} from '../deliverable.constants.js';

const TEMPLATE_GROUP_APPROVAL_STATUS_CODES = ['draft', 'approved', 'archived'] as const;
const TEMPLATE_APPLY_MODE_CODES = ['append', 'replace'] as const;
const CLOSEOUT_APPROVAL_TARGET_TYPE_CODES = ['deliverable', 'close_condition'] as const;
const CLOSEOUT_APPROVAL_STATUS_CODES = ['pending', 'approved', 'rejected', 'skipped'] as const;
const CLOSEOUT_APPROVAL_DECISION_STATUS_CODES = ['approved', 'rejected', 'skipped'] as const;

type TemplateGroupApprovalStatusCode = typeof TEMPLATE_GROUP_APPROVAL_STATUS_CODES[number];
type TemplateApplyModeCode = typeof TEMPLATE_APPLY_MODE_CODES[number];
export type CloseoutApprovalTargetTypeCode = typeof CLOSEOUT_APPROVAL_TARGET_TYPE_CODES[number];
export type CloseoutApprovalStatusCode = typeof CLOSEOUT_APPROVAL_STATUS_CODES[number];
export type CloseoutApprovalDecisionStatusCode = typeof CLOSEOUT_APPROVAL_DECISION_STATUS_CODES[number];

// ─── Swagger Response DTOs ───

export class ProjectCloseoutApprovalStepDto {
  @ApiProperty({ description: '승인 단계 ID' })
  approvalStepId!: string;

  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드' })
  statusCode!: string;

  @ApiProperty({ description: '대상 유형', enum: CLOSEOUT_APPROVAL_TARGET_TYPE_CODES })
  targetTypeCode!: CloseoutApprovalTargetTypeCode;

  @ApiProperty({ description: '대상 코드' })
  targetCode!: string;

  @ApiProperty({ description: '승인 순서' })
  sequenceNo!: number;

  @ApiProperty({ description: '승인자 사용자 ID' })
  approverUserId!: string;

  @ApiProperty({ description: '승인 상태 코드', enum: CLOSEOUT_APPROVAL_STATUS_CODES })
  approvalStatusCode!: CloseoutApprovalStatusCode;

  @ApiProperty({ description: '요청 일시' })
  requestedAt!: string;

  @ApiPropertyOptional({ description: '결정 일시' })
  decidedAt?: string;

  @ApiPropertyOptional({ description: '결정자 사용자 ID' })
  decidedBy?: string;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;
}

export class ProjectDeliverableDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  statusCode!: string;

  @ApiProperty({ description: '산출물 코드' })
  deliverableCode!: string;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  eventId?: string;

  @ApiPropertyOptional({ description: '산출물명 (마스터 조인)' })
  deliverableName?: string;

  @ApiPropertyOptional({ description: '연결 이벤트 정보' })
  event?: { eventId: string; eventCode: string; eventName: string } | null;

  @ApiProperty({ description: '제출 상태 코드', enum: DELIVERABLE_SUBMISSION_STATUS_CODES })
  submissionStatusCode!: string;

  @ApiPropertyOptional({ description: '제출일' })
  submittedAt?: string;

  @ApiPropertyOptional({ description: '제출자 ID' })
  submittedBy?: string;

  @ApiPropertyOptional({ description: '원본 파일명' })
  originalFileName?: string;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ type: [ProjectCloseoutApprovalStepDto], description: '산출물 승인선 단계' })
  approvalSteps!: ProjectCloseoutApprovalStepDto[];

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;
}

export class DeliverableTemplateApplyResultDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드' })
  statusCode!: string;

  @ApiProperty({ description: '적용 템플릿 코드' })
  templateCode!: string;

  @ApiProperty({ description: '템플릿 출처', enum: ['group', 'default'] })
  source!: 'group' | 'default';

  @ApiProperty({ description: '적용 방식', enum: TEMPLATE_APPLY_MODE_CODES })
  applyMode!: TemplateApplyModeCode;

  @ApiProperty({ description: '신규 생성 건수' })
  createdCount!: number;

  @ApiProperty({ description: '비활성 항목 복구 건수' })
  restoredCount!: number;

  @ApiProperty({ description: '이미 활성 상태였던 건수' })
  keptCount!: number;

  @ApiProperty({ description: 'replace 적용으로 비활성화된 건수' })
  deactivatedCount!: number;

  @ApiProperty({ type: [ProjectDeliverableDto], description: '적용 후 산출물 목록' })
  items!: ProjectDeliverableDto[];
}

export class DeliverableTemplateGroupItemDto {
  @ApiProperty({ description: '산출물 코드' })
  deliverableCode!: string;

  @ApiProperty({ description: '산출물명' })
  deliverableName!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;
}

export class DeliverableTemplateGroupDto {
  @ApiProperty({ description: '그룹 코드' })
  groupCode!: string;

  @ApiProperty({ description: '그룹명' })
  groupName!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiProperty({ description: '승인 상태 코드', enum: TEMPLATE_GROUP_APPROVAL_STATUS_CODES })
  approvalStatusCode!: TemplateGroupApprovalStatusCode;

  @ApiProperty({ description: '템플릿 버전' })
  versionNo!: number;

  @ApiPropertyOptional({ description: '승인자 ID' })
  approvedBy?: string;

  @ApiPropertyOptional({ description: '승인 일시' })
  approvedAt?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiProperty({ type: [DeliverableTemplateGroupItemDto], description: '그룹 산출물 항목' })
  items!: DeliverableTemplateGroupItemDto[];
}

export class ProjectCloseConditionDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  statusCode!: string;

  @ApiProperty({ description: '종료 조건 코드' })
  conditionCode!: string;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  eventId?: string;

  @ApiProperty({ description: '산출물 필요 여부' })
  requiresDeliverable!: boolean;

  @ApiProperty({ description: '체크 여부' })
  isChecked!: boolean;

  @ApiPropertyOptional({ description: '체크 일시' })
  checkedAt?: string;

  @ApiPropertyOptional({ description: '체크자 ID' })
  checkedBy?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '연결 이벤트 정보' })
  event?: { eventId: string; eventCode: string; eventName: string } | null;

  @ApiProperty({ type: [ProjectCloseoutApprovalStepDto], description: '종료조건 승인선 단계' })
  approvalSteps!: ProjectCloseoutApprovalStepDto[];
}

export class CloseConditionTemplateApplyResultDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드' })
  statusCode!: string;

  @ApiProperty({ description: '적용 템플릿 코드' })
  templateCode!: string;

  @ApiProperty({ description: '템플릿 출처', enum: ['group', 'default'] })
  source!: 'group' | 'default';

  @ApiProperty({ description: '적용 방식', enum: TEMPLATE_APPLY_MODE_CODES })
  applyMode!: TemplateApplyModeCode;

  @ApiProperty({ description: '신규 생성 건수' })
  createdCount!: number;

  @ApiProperty({ description: '비활성 항목 복구 건수' })
  restoredCount!: number;

  @ApiProperty({ description: '이미 활성 상태였던 건수' })
  keptCount!: number;

  @ApiProperty({ description: 'replace 적용으로 비활성화된 건수' })
  deactivatedCount!: number;

  @ApiProperty({ type: [ProjectCloseConditionDto], description: '적용 후 종료조건 목록' })
  items!: ProjectCloseConditionDto[];
}

export class CloseConditionTemplateGroupItemDto {
  @ApiProperty({ description: '종료조건 코드' })
  conditionCode!: string;

  @ApiProperty({ description: '산출물 필요 여부' })
  requiresDeliverable!: boolean;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;
}

export class CloseConditionTemplateGroupDto {
  @ApiProperty({ description: '그룹 코드' })
  groupCode!: string;

  @ApiProperty({ description: '그룹명' })
  groupName!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiProperty({ description: '승인 상태 코드', enum: TEMPLATE_GROUP_APPROVAL_STATUS_CODES })
  approvalStatusCode!: TemplateGroupApprovalStatusCode;

  @ApiProperty({ description: '템플릿 버전' })
  versionNo!: number;

  @ApiPropertyOptional({ description: '승인자 ID' })
  approvedBy?: string;

  @ApiPropertyOptional({ description: '승인 일시' })
  approvedAt?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiProperty({ type: [CloseConditionTemplateGroupItemDto], description: '그룹 종료조건 항목' })
  items!: CloseConditionTemplateGroupItemDto[];
}

export class TemplateGroupHistoryDto {
  @ApiProperty({ description: '이력 순번' })
  historySeq!: string;

  @ApiProperty({ description: '이벤트 유형' })
  eventType!: string;

  @ApiProperty({ description: '이벤트 일시' })
  eventAt!: string;

  @ApiProperty({ description: '그룹 코드' })
  groupCode!: string;

  @ApiProperty({ description: '그룹명' })
  groupName!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiProperty({ description: '승인 상태 코드', enum: TEMPLATE_GROUP_APPROVAL_STATUS_CODES })
  approvalStatusCode!: TemplateGroupApprovalStatusCode;

  @ApiProperty({ description: '템플릿 버전' })
  versionNo!: number;

  @ApiPropertyOptional({ description: '승인자 ID' })
  approvedBy?: string;

  @ApiPropertyOptional({ description: '승인 일시' })
  approvedAt?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;
}

export class UpdateTemplateGroupApprovalDto {
  @ApiProperty({ description: '승인 상태 코드', enum: TEMPLATE_GROUP_APPROVAL_STATUS_CODES })
  @IsString()
  @IsIn(TEMPLATE_GROUP_APPROVAL_STATUS_CODES)
  approvalStatusCode!: TemplateGroupApprovalStatusCode;
}

// ─── Request DTOs ───

export class ApplyDeliverableTemplateDto {
  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  @IsString()
  statusCode!: string;

  @ApiPropertyOptional({ description: '산출물 그룹 코드. 없으면 상태별 기본 템플릿을 적용합니다.' })
  @IsString()
  @IsOptional()
  groupCode?: string;

  @ApiPropertyOptional({ description: '적용 방식. append는 기존 항목 유지, replace는 템플릿 밖 기존 항목을 비활성화합니다.', enum: TEMPLATE_APPLY_MODE_CODES, default: 'append' })
  @IsIn(TEMPLATE_APPLY_MODE_CODES)
  @IsOptional()
  applyMode?: TemplateApplyModeCode;
}

export class ApplyCloseConditionTemplateDto {
  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  @IsString()
  statusCode!: string;

  @ApiPropertyOptional({ description: '종료조건 그룹 코드. 없으면 상태별 기본 템플릿을 적용합니다.' })
  @IsString()
  @IsOptional()
  groupCode?: string;

  @ApiPropertyOptional({ description: '적용 방식. append는 기존 항목 유지, replace는 템플릿 밖 기존 항목을 비활성화합니다.', enum: TEMPLATE_APPLY_MODE_CODES, default: 'append' })
  @IsIn(TEMPLATE_APPLY_MODE_CODES)
  @IsOptional()
  applyMode?: TemplateApplyModeCode;
}

export class UpsertDeliverableTemplateGroupItemDto {
  @ApiProperty({ description: '산출물 코드' })
  @IsString()
  deliverableCode!: string;

  @ApiProperty({ description: '산출물명' })
  @IsString()
  deliverableName!: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpsertDeliverableTemplateGroupDto {
  @ApiProperty({ description: '그룹 코드' })
  @IsString()
  groupCode!: string;

  @ApiProperty({ description: '그룹명' })
  @IsString()
  groupName!: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ type: [UpsertDeliverableTemplateGroupItemDto], description: '그룹 산출물 항목' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertDeliverableTemplateGroupItemDto)
  items!: UpsertDeliverableTemplateGroupItemDto[];
}

export class UpsertCloseConditionTemplateGroupItemDto {
  @ApiProperty({ description: '종료조건 코드' })
  @IsString()
  conditionCode!: string;

  @ApiProperty({ description: '산출물 필요 여부' })
  @IsBoolean()
  requiresDeliverable!: boolean;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpsertCloseConditionTemplateGroupDto {
  @ApiProperty({ description: '그룹 코드' })
  @IsString()
  groupCode!: string;

  @ApiProperty({ description: '그룹명' })
  @IsString()
  groupName!: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ type: [UpsertCloseConditionTemplateGroupItemDto], description: '그룹 종료조건 항목' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCloseConditionTemplateGroupItemDto)
  items!: UpsertCloseConditionTemplateGroupItemDto[];
}

export class UpsertDeliverableDto {
  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  @IsString()
  statusCode!: string;

  @ApiProperty({ description: '산출물 코드' })
  @IsString()
  deliverableCode!: string;

  @ApiProperty({ description: '제출 상태 코드', enum: DELIVERABLE_SUBMISSION_STATUS_INPUT_CODES })
  @IsString()
  @IsIn(DELIVERABLE_SUBMISSION_STATUS_INPUT_CODES)
  submissionStatusCode!: string;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpdateSubmissionDto {
  @ApiProperty({ description: '제출 상태 코드', enum: DELIVERABLE_SUBMISSION_STATUS_INPUT_CODES })
  @IsString()
  @IsIn(DELIVERABLE_SUBMISSION_STATUS_INPUT_CODES)
  submissionStatusCode!: string;
}

export class UpsertCloseConditionDto {
  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  @IsString()
  statusCode!: string;

  @ApiProperty({ description: '종료 조건 코드' })
  @IsString()
  conditionCode!: string;

  @ApiProperty({ description: '산출물 필요 여부' })
  @IsBoolean()
  requiresDeliverable!: boolean;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class ToggleCheckDto {
  @ApiProperty({ description: '체크 여부' })
  @IsBoolean()
  isChecked!: boolean;
}

export class UpsertCloseoutApprovalStepDto {
  @ApiPropertyOptional({ description: '승인 순서. 없으면 배열 순서 기준으로 저장됩니다.' })
  @IsInt()
  @Min(1)
  @IsOptional()
  sequenceNo?: number;

  @ApiProperty({ description: '프로젝트 멤버 사용자 ID' })
  @IsString()
  approverUserId!: string;

  @ApiPropertyOptional({ description: '승인 단계 메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpsertCloseoutApprovalRouteDto {
  @ApiProperty({ type: [UpsertCloseoutApprovalStepDto], description: '승인선 단계 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCloseoutApprovalStepDto)
  steps!: UpsertCloseoutApprovalStepDto[];
}

export class DecideCloseoutApprovalStepDto {
  @ApiProperty({ description: '승인 결정 상태', enum: CLOSEOUT_APPROVAL_DECISION_STATUS_CODES })
  @IsString()
  @IsIn(CLOSEOUT_APPROVAL_DECISION_STATUS_CODES)
  approvalStatusCode!: CloseoutApprovalDecisionStatusCode;

  @ApiPropertyOptional({ description: '결정 메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}
