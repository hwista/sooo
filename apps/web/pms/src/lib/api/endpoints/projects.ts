import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, ListParams } from '../types';
import type {
  ContractPayment as PmsContractPayment,
  ApplyCrmContractHandoffSnapshotDto,
  ApplyCrmContractHandoffSnapshotResult,
  CreateProjectHandoffDto,
  ProjectContract as PmsProjectContract,
  ProjectEventRollup,
  ProjectHandoff as PmsProjectHandoff,
  ProjectHandoffTypeCode as PmsProjectHandoffTypeCode,
  ProjectDashboardSummary as PmsProjectDashboardSummary,
  LegacyIssueCleanupArchiveResult as PmsLegacyIssueCleanupArchiveResult,
  LegacyIssueCleanupCanonicalizeResult as PmsLegacyIssueCleanupCanonicalizeResult,
  LegacyIssueCleanupSummary as PmsLegacyIssueCleanupSummary,
  ProjectMemberUserLookup as PmsProjectMemberUserLookup,
  ProjectOrgLookup as PmsProjectOrgLookup,
  PmsProjectAccessSnapshot,
  FindProjectMemberUserLookupDto as PmsFindProjectMemberUserLookupDto,
  FindProjectOrgLookupDto as PmsFindProjectOrgLookupDto,
  UpdateProjectHandoffDto,
} from '@ssoo/types/pms';

/**
 * 프로젝트 상태 코드
 */
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';

/**
 * 프로젝트 단계 코드
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

export type ProjectPhase = 'request' | 'proposal' | 'contract' | 'execution' | 'operation' | 'closed';

export type ProjectLifecycleStatus = 'draft' | 'active' | 'on_hold' | 'cancelled' | 'completed';

/**
 * 프로젝트 소스 코드
 */
export type ProjectDoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'transfer_pending'
  | 'linked'
  | 'cancelled'
  | 'transferred'
  | 'hold';

export interface ProjectLifecycle {
  phase: ProjectPhase;
  status: ProjectLifecycleStatus;
  terminalReason?: ProjectDoneResultCode | null;
}

/**
 * 프로젝트 DTO
 */
export interface Project {
  id: number;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: ProjectDoneResultCode;
  lifecycle: ProjectLifecycle;
  customerId?: number | string | null;
  customerCode?: string | null;
  customerName?: string | null;
  customerOrganizationId?: number | string | null;
  customerOrganizationCode?: string | null;
  customerOrganizationName?: string | null;
  customerOrganizationType?: string | null;
  customerOrganizationScope?: string | null;
  plantId?: number | string | null;
  plantSiteCode?: string | null;
  plantSiteName?: string | null;
  plantSiteTypeCode?: string | null;
  plantSiteRegionCode?: string | null;
  plantSiteOperationOwnerName?: string | null;
  systemInstanceId?: number | string | null;
  systemInstanceCode?: string | null;
  systemInstanceName?: string | null;
  systemInstanceEnvironmentCode?: string | null;
  systemInstanceOperationOwnerTypeCode?: string | null;
  systemInstanceOperationOwnerName?: string | null;
  systemInstanceLifecycleStatusCode?: string | null;
  currentOwnerUserId?: number;
  ownerOrganizationId?: number | string | null;
  memo?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  requestDetail?: ProjectRequestDetail | null;
  proposalDetail?: ProjectProposalDetail | null;
  executionDetail?: ProjectExecutionDetail | null;
  transitionDetail?: ProjectTransitionDetail | null;
  projectStatuses?: ProjectStatusItem[];
}

export interface ProjectRequestDetail {
  requestSourceCode?: string | null;
  requestChannelCode?: string | null;
  requestSummary?: string | null;
  requestReceivedAt?: string | null;
  requestPriorityCode?: string | null;
  requestOwnerUserId?: number | string | null;
  memo?: string | null;
}

export interface ProjectProposalDetail {
  proposalOwnerUserId?: number | string | null;
  proposalDueAt?: string | null;
  proposalSubmittedAt?: string | null;
  proposalVersion?: number | null;
  estimateAmount?: number | string | null;
  estimateUnitCode?: string | null;
  proposalScopeSummary?: string | null;
  decisionDeadlineAt?: string | null;
  memo?: string | null;
}

export interface ProjectExecutionDetail {
  contractSignedAt?: string | null;
  contractAmount?: number | string | null;
  contractUnitCode?: string | null;
  billingTypeCode?: string | null;
  deliveryMethodCode?: string | null;
  nextProjectId?: number | string | null;
  memo?: string | null;
}

export interface ProjectTransitionDetail {
  operationOwnerUserId?: number | string | null;
  operationReservedAt?: string | null;
  operationStartAt?: string | null;
  transitionDueAt?: string | null;
  transitionSummary?: string | null;
  memo?: string | null;
}

export interface ProjectStatusItem {
  projectId: number | string;
  statusCode: ProjectStatusCode;
  statusGoal: string;
  statusOwnerUserId?: number | string | null;
  expectedStartAt?: string | null;
  expectedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  closeConditionGroupCode?: string | null;
  memo?: string | null;
}

/**
 * 프로젝트 생성 요청
 */
export interface CreateProjectRequest {
  projectName: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  customerId?: string;
  plantId?: string;
  systemInstanceId?: string;
  ownerOrganizationId?: string | null;
  description?: string;
}

/**
 * 프로젝트 수정 요청
 */
export interface UpdateProjectRequest
  extends Omit<Partial<CreateProjectRequest>, 'customerId' | 'plantId' | 'systemInstanceId'> {
  doneResultCode?: ProjectDoneResultCode;
  customerId?: string | null;
  plantId?: string | null;
  systemInstanceId?: string | null;
  ownerOrganizationId?: string | null;
}

/**
 * 단계별 상세 Upsert 요청
 */
export interface UpsertRequestDetailRequest {
  requestSourceCode?: string;
  requestChannelCode?: string;
  requestSummary?: string;
  requestReceivedAt?: string;
  requestPriorityCode?: string;
  requestOwnerUserId?: string;
  memo?: string;
}

export interface UpsertProposalDetailRequest {
  proposalOwnerUserId?: string;
  proposalDueAt?: string;
  proposalSubmittedAt?: string;
  proposalVersion?: number;
  estimateAmount?: string;
  estimateUnitCode?: string;
  proposalScopeSummary?: string;
  decisionDeadlineAt?: string;
  memo?: string;
}

export interface UpsertExecutionDetailRequest {
  contractSignedAt?: string;
  contractAmount?: string;
  contractUnitCode?: string;
  billingTypeCode?: string;
  deliveryMethodCode?: string;
  nextProjectId?: string;
  memo?: string;
}

export interface UpsertTransitionDetailRequest {
  operationOwnerUserId?: string;
  operationReservedAt?: string;
  operationStartAt?: string;
  transitionDueAt?: string;
  transitionSummary?: string;
  memo?: string;
}

// ─── 상태 전이 ───

export type DoneResultCode =
  | 'accepted' | 'rejected' | 'won' | 'lost'
  | 'completed' | 'transfer_pending' | 'linked'
  | 'cancelled' | 'transferred' | 'hold';

export interface AdvanceStageRequest {
  targetStage: 'in_progress' | 'done';
  doneResultCode?: DoneResultCode;
  statusGoal?: string;
}

export interface TransitionResult {
  previousStatusCode: string;
  previousStageCode: string;
  currentStatusCode: string;
  currentStageCode: string;
  doneResultCode?: string | null;
  advancedToNextStatus: boolean;
  previousLifecycle: ProjectLifecycle;
  currentLifecycle: ProjectLifecycle;
}

export interface TransitionReadiness {
  canComplete: boolean;
  deliverables: { total: number; completed: number; approved: number; pending: number };
  closeConditions: { total: number; checked: number; unchecked: number };
}

export type ProjectHandoff = PmsProjectHandoff;
export type ProjectHandoffTypeCode = PmsProjectHandoffTypeCode;
export type ProjectDashboardSummary = PmsProjectDashboardSummary;
export type CreateProjectHandoffRequest = CreateProjectHandoffDto;
export type UpdateProjectHandoffRequest = UpdateProjectHandoffDto;
export type ProjectContract = PmsProjectContract;
export type ContractPayment = PmsContractPayment;
export type ApplyCrmContractHandoffSnapshotRequest = ApplyCrmContractHandoffSnapshotDto;
export type ApplyCrmContractHandoffSnapshotResponse = ApplyCrmContractHandoffSnapshotResult;

// ─── 프로젝트 멤버 ───

export interface ProjectMember {
  projectId: number | string;
  userId: number | string;
  roleCode: string;
  organizationId?: number | string | null;
  accessLevel: 'owner' | 'participant' | 'contributor';
  isPhaseOwner: boolean;
  assignedAt: string;
  releasedAt?: string | null;
  allocationRate: number;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  user?: {
    id: number | string;
    userName: string;
    displayName?: string | null;
    departmentCode?: string | null;
    positionCode?: string | null;
    email?: string;
  };
}

export type ProjectMemberUserLookupItem = PmsProjectMemberUserLookup;
export type FindProjectMemberUserLookupParams = PmsFindProjectMemberUserLookupDto;

export interface CreateMemberRequest {
  userId: string;
  roleCode: string;
  organizationId?: string | null;
  accessLevel?: 'owner' | 'participant' | 'contributor';
  isPhaseOwner?: boolean;
  assignedAt?: string;
  allocationRate?: number;
  memo?: string;
}

export interface UpdateMemberRequest {
  organizationId?: string | null;
  accessLevel?: 'owner' | 'participant' | 'contributor';
  isPhaseOwner?: boolean;
  releasedAt?: string | null;
  allocationRate?: number;
  isActive?: boolean;
  memo?: string;
}

// ─── 프로젝트 조직 ───

export type ProjectOrgRoleCode = 'owner' | 'customer' | 'supplier' | 'partner';

export interface ProjectOrgItem {
  projectId: number | string;
  organizationId: number | string;
  roleCode: ProjectOrgRoleCode;
  isActive: boolean;
  memo?: string | null;
  lastSource?: string | null;
  lastActivity?: string | null;
  organization?: {
    orgId: number | string;
    orgCode: string;
    orgName: string;
    orgType: string;
    orgClass: string;
    scope: string;
    levelType?: string | null;
    isActive: boolean;
  } | null;
}

export type ProjectOrgLookupItem = PmsProjectOrgLookup;
export type FindProjectOrgLookupParams = PmsFindProjectOrgLookupDto;

export interface CreateProjectOrgRequest {
  roleCode: ProjectOrgRoleCode;
  organizationId?: string;
  customerId?: string;
  memo?: string;
}

export interface UpdateProjectOrgRequest {
  memo?: string | null;
  isActive?: boolean;
}

// ─── 프로젝트 관계 ───

export type ProjectRelationTypeCode = 'successor' | 'split' | 'merge' | 'linked';

export interface ProjectRelationItem {
  sourceProjectId: number | string;
  targetProjectId: number | string;
  relationTypeCode: ProjectRelationTypeCode;
  isActive: boolean;
  memo?: string | null;
  lastSource?: string | null;
  lastActivity?: string | null;
  sourceProject?: {
    id: number | string;
    projectName: string;
    statusCode: string;
    stageCode: string;
  } | null;
  targetProject?: {
    id: number | string;
    projectName: string;
    statusCode: string;
    stageCode: string;
  } | null;
}

export interface CreateProjectRelationRequest {
  relationTypeCode: Extract<ProjectRelationTypeCode, 'linked'>;
  targetProjectId: string;
  memo?: string;
}

// ─── 태스크 ───

export interface TaskItem {
  id: number | string;
  projectId: number | string;
  wbsId?: number | string | null;
  parentTaskId?: number | string | null;
  taskCode: string;
  taskName: string;
  description?: string | null;
  taskTypeCode?: string | null;
  statusCode: string;
  priorityCode: string;
  assigneeUserId?: number | string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  progressRate: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  assignee?: { id: number | string; userName: string; displayName?: string | null } | null;
}

export interface CreateTaskRequest {
  wbsId?: string | null;
  parentTaskId?: string | null;
  taskCode: string;
  taskName: string;
  description?: string;
  taskTypeCode?: string;
  priorityCode?: string;
  assigneeUserId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  estimatedHours?: number;
  depth?: number;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateTaskRequest {
  wbsId?: string | null;
  taskName?: string;
  description?: string;
  taskTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  progressRate?: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  sortOrder?: number;
  memo?: string;
}

export interface TaskEffortLogItem {
  effortLogId: number | string;
  projectId: number | string;
  taskId: number | string;
  userId?: number | string | null;
  workDate: string;
  actualHours: number;
  workTypeCode: string;
  summary?: string | null;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
  task?: { id: number | string; taskCode: string; taskName: string } | null;
  user?: { id: number | string; userName: string; displayName?: string | null } | null;
}

export interface CreateTaskEffortLogRequest {
  taskId: string;
  userId?: string | null;
  workDate: string;
  actualHours: number;
  workTypeCode?: string;
  summary?: string | null;
  memo?: string | null;
}

export interface UpdateTaskEffortLogRequest {
  taskId?: string;
  userId?: string | null;
  workDate?: string;
  actualHours?: number;
  workTypeCode?: string;
  summary?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

// ─── 마일스톤 ───

export interface MilestoneItem {
  id: number | string;
  projectId: number | string;
  objectiveId?: number | string | null;
  milestoneCode: string;
  milestoneName: string;
  description?: string | null;
  statusCode: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateMilestoneRequest {
  objectiveId?: string | null;
  milestoneCode: string;
  milestoneName: string;
  description?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateMilestoneRequest {
  objectiveId?: string | null;
  milestoneName?: string;
  description?: string;
  statusCode?: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder?: number;
  memo?: string;
}

// ─── 목표(Objective) ───

export interface ObjectiveItem {
  id: number | string;
  projectId: number | string;
  parentObjectiveId?: number | string | null;
  objectiveCode: string;
  objectiveName: string;
  description?: string | null;
  statusCode: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateObjectiveRequest {
  parentObjectiveId?: string | null;
  objectiveCode: string;
  objectiveName: string;
  description?: string;
  statusCode?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateObjectiveRequest {
  parentObjectiveId?: string | null;
  objectiveName?: string;
  description?: string | null;
  statusCode?: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

// ─── WBS ───

export interface WbsItem {
  id: number | string;
  projectId: number | string;
  objectiveId?: number | string | null;
  parentWbsId?: number | string | null;
  wbsCode: string;
  wbsName: string;
  description?: string | null;
  statusCode: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateWbsRequest {
  objectiveId?: string | null;
  parentWbsId?: string | null;
  wbsCode: string;
  wbsName: string;
  description?: string;
  statusCode?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateWbsRequest {
  objectiveId?: string | null;
  parentWbsId?: string | null;
  wbsName?: string;
  description?: string | null;
  statusCode?: string;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

// ─── 이슈 ───

export interface IssueItem {
  id: number | string;
  projectId: number | string;
  issueCode: string;
  issueTitle: string;
  description?: string | null;
  issueTypeCode: string;
  statusCode: string;
  priorityCode: string;
  reportedByUserId?: number | string | null;
  assigneeUserId?: number | string | null;
  reportedAt: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  reportedBy?: { id: number | string; userName: string; displayName?: string | null } | null;
  assignee?: { id: number | string; userName: string; displayName?: string | null } | null;
}

export type LegacyIssueCleanupSummary = PmsLegacyIssueCleanupSummary;
export type LegacyIssueCleanupArchiveResult = PmsLegacyIssueCleanupArchiveResult;
export type LegacyIssueCleanupCanonicalizeResult = PmsLegacyIssueCleanupCanonicalizeResult;

export interface UpdateIssueRequest {
  issueTitle?: string;
  description?: string;
  issueTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string;
  isActive?: boolean;
  memo?: string;
}

export interface ProjectIssueItem {
  projectIssueId: number | string;
  projectId: number | string;
  issueCode: string;
  issueTitle: string;
  description?: string | null;
  issueTypeCode: string;
  statusCode: string;
  priorityCode: string;
  reportedByUserId?: number | string | null;
  ownerUserId?: number | string | null;
  reportedAt: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateProjectIssueRequest {
  issueCode: string;
  issueTitle: string;
  description?: string;
  issueTypeCode: string;
  statusCode?: string;
  priorityCode?: string;
  reportedByUserId?: string;
  ownerUserId?: string;
  assigneeUserId?: string;
  reportedAt?: string;
  dueAt?: string;
  resolvedAt?: string;
  resolution?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectIssueRequest {
  issueTitle?: string;
  description?: string | null;
  issueTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  ownerUserId?: string | null;
  assigneeUserId?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

// ─── 컨트롤 도메인 ───

export interface ProjectRequirementItem {
  requirementId: number | string;
  projectId: number | string;
  requirementCode: string;
  requirementTitle: string;
  description?: string | null;
  statusCode: string;
  priorityCode: string;
  ownerUserId?: number | string | null;
  dueAt?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateProjectRequirementRequest {
  requirementCode: string;
  requirementTitle: string;
  description?: string;
  statusCode?: string;
  priorityCode?: string;
  ownerUserId?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectRequirementRequest {
  requirementTitle?: string;
  description?: string | null;
  statusCode?: string;
  priorityCode?: string;
  ownerUserId?: string | null;
  dueAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export interface ProjectRiskItem {
  riskId: number | string;
  projectId: number | string;
  riskCode: string;
  riskTitle: string;
  description?: string | null;
  statusCode: string;
  impactCode: string;
  likelihoodCode: string;
  responsePlan?: string | null;
  ownerUserId?: number | string | null;
  dueAt?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateProjectRiskRequest {
  riskCode: string;
  riskTitle: string;
  description?: string;
  statusCode?: string;
  impactCode?: string;
  likelihoodCode?: string;
  responsePlan?: string;
  ownerUserId?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectRiskRequest {
  riskTitle?: string;
  description?: string | null;
  statusCode?: string;
  impactCode?: string;
  likelihoodCode?: string;
  responsePlan?: string | null;
  ownerUserId?: string | null;
  dueAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export interface ProjectChangeRequestItem {
  changeRequestId: number | string;
  projectId: number | string;
  changeCode: string;
  changeTitle: string;
  description?: string | null;
  statusCode: string;
  priorityCode: string;
  requestedAt: string;
  decidedAt?: string | null;
  ownerUserId?: number | string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateProjectChangeRequest {
  changeCode: string;
  changeTitle: string;
  description?: string;
  statusCode?: string;
  priorityCode?: string;
  ownerUserId?: string;
  requestedAt?: string;
  decidedAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectChangeRequest {
  changeTitle?: string;
  description?: string | null;
  statusCode?: string;
  priorityCode?: string;
  ownerUserId?: string | null;
  requestedAt?: string;
  decidedAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export interface ProjectEventItem {
  eventId: number | string;
  projectId: number | string;
  eventCode: string;
  eventName: string;
  description?: string | null;
  eventTypeCode: string;
  statusCode: string;
  scheduledAt?: string | null;
  occurredAt?: string | null;
  summary?: string | null;
  ownerUserId?: number | string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  rollup?: ProjectEventRollup | null;
}

export interface CreateProjectEventRequest {
  eventCode: string;
  eventName: string;
  description?: string;
  eventTypeCode?: string;
  statusCode?: string;
  scheduledAt?: string;
  occurredAt?: string;
  summary?: string;
  ownerUserId?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectEventRequest {
  eventName?: string;
  description?: string | null;
  eventTypeCode?: string;
  statusCode?: string;
  scheduledAt?: string | null;
  occurredAt?: string | null;
  summary?: string | null;
  ownerUserId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

// ─── 산출물 ───

export type CloseoutApprovalTargetTypeCode = 'deliverable' | 'close_condition';
export type CloseoutApprovalStatusCode = 'pending' | 'approved' | 'rejected' | 'skipped';
export type CloseoutApprovalDecisionStatusCode = 'approved' | 'rejected' | 'skipped';

export interface ProjectCloseoutApprovalStep {
  approvalStepId: number | string;
  projectId: number | string;
  statusCode: string;
  targetTypeCode: CloseoutApprovalTargetTypeCode;
  targetCode: string;
  sequenceNo: number;
  approverUserId: number | string;
  approvalStatusCode: CloseoutApprovalStatusCode;
  requestedAt: string;
  decidedAt?: string | null;
  decidedBy?: number | string | null;
  memo?: string | null;
  isActive: boolean;
}

export interface UpsertCloseoutApprovalRouteRequest {
  steps: Array<{
    sequenceNo?: number;
    approverUserId: string;
    memo?: string;
  }>;
}

export interface DecideCloseoutApprovalStepRequest {
  approvalStatusCode: CloseoutApprovalDecisionStatusCode;
  memo?: string;
}

export interface DeliverableItem {
  projectId: number | string;
  statusCode: string;
  deliverableCode: string;
  eventId?: number | string | null;
  deliverableName?: string;
  submissionStatusCode: string;
  submittedAt?: string | null;
  submittedBy?: number | string | null;
  originalFileName?: string | null;
  memo?: string | null;
  approvalSteps: ProjectCloseoutApprovalStep[];
  isActive: boolean;
  event?: {
    eventId: number | string;
    eventCode: string;
    eventName: string;
  } | null;
  deliverable?: {
    deliverableName: string;
    description?: string | null;
    sortOrder: number;
  };
}

export interface UpsertDeliverableRequest {
  statusCode: string;
  deliverableCode: string;
  submissionStatusCode: string;
  eventId?: string;
  memo?: string;
}

export interface ApplyDeliverableTemplateRequest {
  statusCode: string;
  groupCode?: string;
  applyMode?: 'append' | 'replace';
}

export interface DeliverableTemplateGroupItem {
  deliverableCode: string;
  deliverableName: string;
  description?: string | null;
  sortOrder: number;
  memo?: string | null;
  isActive: boolean;
}

export interface DeliverableTemplateGroup {
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  items: DeliverableTemplateGroupItem[];
}

export interface UpsertDeliverableTemplateGroupRequest {
  groupCode: string;
  groupName: string;
  description?: string;
  sortOrder?: number;
  items: Array<{
    deliverableCode: string;
    deliverableName: string;
    description?: string;
    sortOrder?: number;
    memo?: string;
  }>;
}

export interface DeliverableTemplateApplyResult {
  projectId: number | string;
  statusCode: string;
  templateCode: string;
  source: 'group' | 'default';
  applyMode: 'append' | 'replace';
  createdCount: number;
  restoredCount: number;
  keptCount: number;
  deactivatedCount: number;
  items: DeliverableItem[];
}

export interface UpdateSubmissionRequest {
  submissionStatusCode: string;
}

// ─── 종료 조건 ───

export interface CloseConditionItem {
  projectId: number | string;
  statusCode: string;
  conditionCode: string;
  eventId?: number | string | null;
  requiresDeliverable: boolean;
  isChecked: boolean;
  checkedAt?: string | null;
  checkedBy?: number | string | null;
  sortOrder: number;
  memo?: string | null;
  isActive: boolean;
  event?: {
    eventId: number | string;
    eventCode: string;
    eventName: string;
  } | null;
  approvalSteps: ProjectCloseoutApprovalStep[];
}

export interface UpsertCloseConditionRequest {
  statusCode: string;
  conditionCode: string;
  requiresDeliverable: boolean;
  eventId?: string;
  sortOrder?: number;
  memo?: string;
}

export interface ApplyCloseConditionTemplateRequest {
  statusCode: string;
  groupCode?: string;
  applyMode?: 'append' | 'replace';
}

export interface CloseConditionTemplateGroupItem {
  conditionCode: string;
  requiresDeliverable: boolean;
  sortOrder: number;
  memo?: string | null;
  isActive: boolean;
}

export interface CloseConditionTemplateGroup {
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  items: CloseConditionTemplateGroupItem[];
}

export interface UpsertCloseConditionTemplateGroupRequest {
  groupCode: string;
  groupName: string;
  description?: string;
  sortOrder?: number;
  items: Array<{
    conditionCode: string;
    requiresDeliverable: boolean;
    sortOrder?: number;
    memo?: string;
  }>;
}

export interface CloseConditionTemplateApplyResult {
  projectId: number | string;
  statusCode: string;
  templateCode: string;
  source: 'group' | 'default';
  applyMode: 'append' | 'replace';
  createdCount: number;
  restoredCount: number;
  keptCount: number;
  deactivatedCount: number;
  items: CloseConditionItem[];
}

export interface ToggleCheckRequest {
  isChecked: boolean;
}

/**
 * 프로젝트 필터
 */
export interface ProjectFilters extends ListParams {
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  customerId?: number | string;
}

interface ProjectListApiResponse {
  success: boolean;
  data?: Project[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * 프로젝트 API
 */
export const projectsApi = {
  /**
   * 프로젝트 목록 조회
   */
  list: async (params?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> => {
    const requestParams = params
      ? (() => {
          const { pageSize, ...rest } = params;
          return {
            ...rest,
            ...(pageSize !== undefined && { limit: pageSize }),
          };
        })()
      : undefined;
    const response = await apiClient.get<ProjectListApiResponse>('/projects', {
      params: requestParams,
    });

    if (!response.data.success || !response.data.data || !response.data.meta) {
      return {
        success: false,
        data: null,
        message: response.data.error?.message || '요청 처리 중 오류가 발생했습니다.',
      };
    }

    const pageSize = response.data.meta.limit || params?.pageSize || 10;
    const totalPages = pageSize ? Math.ceil(response.data.meta.total / pageSize) : 0;

    return {
      success: true,
      data: {
        items: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        pageSize,
        totalPages,
      },
      message: response.data.message || '',
    };
  },

  /**
   * 프로젝트 상세 조회
   */
  getById: async (id: number): Promise<ApiResponse<Project>> => {
    const response = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  },

  /**
   * 프로젝트 접근 스냅샷 조회
   */
  getAccess: async (id: number): Promise<ApiResponse<PmsProjectAccessSnapshot>> => {
    const response = await apiClient.get<ApiResponse<PmsProjectAccessSnapshot>>(`/projects/${id}/access`);
    return response.data;
  },

  /**
   * 프로젝트 통제 대시보드 요약 조회
   */
  getDashboardSummary: async (id: number): Promise<ApiResponse<ProjectDashboardSummary>> => {
    const response = await apiClient.get<ApiResponse<ProjectDashboardSummary>>(`/projects/${id}/dashboard/summary`);
    return response.data;
  },

  /**
   * 프로젝트 생성
   */
  create: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data);
    return response.data;
  },

  /**
   * 프로젝트 수정
   */
  update: async (id: number, data: UpdateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data;
  },

  /**
   * 프로젝트 삭제
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },

  // ─── 단계별 상세 Upsert ───

  upsertRequestDetail: async (id: number, data: UpsertRequestDetailRequest): Promise<ApiResponse<ProjectRequestDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectRequestDetail>>(`/projects/${id}/request-detail`, data);
    return response.data;
  },

  upsertProposalDetail: async (id: number, data: UpsertProposalDetailRequest): Promise<ApiResponse<ProjectProposalDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectProposalDetail>>(`/projects/${id}/proposal-detail`, data);
    return response.data;
  },

  upsertExecutionDetail: async (id: number, data: UpsertExecutionDetailRequest): Promise<ApiResponse<ProjectExecutionDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectExecutionDetail>>(`/projects/${id}/execution-detail`, data);
    return response.data;
  },

  upsertTransitionDetail: async (id: number, data: UpsertTransitionDetailRequest): Promise<ApiResponse<ProjectTransitionDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectTransitionDetail>>(`/projects/${id}/transition-detail`, data);
    return response.data;
  },

  // ─── 상태 전이 ───

  getTransitionReadiness: async (projectId: number): Promise<ApiResponse<TransitionReadiness>> => {
    const response = await apiClient.get<ApiResponse<TransitionReadiness>>(`/projects/${projectId}/transition-readiness`);
    return response.data;
  },

  advanceStage: async (id: number, data: AdvanceStageRequest): Promise<ApiResponse<TransitionResult>> => {
    const response = await apiClient.post<ApiResponse<TransitionResult>>(`/projects/${id}/advance-stage`, data);
    return response.data;
  },

  // ─── 인수인계 / 계약 스냅샷 ───

  getHandoffs: async (projectId: number): Promise<ApiResponse<ProjectHandoff[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectHandoff[]>>(`/projects/${projectId}/handoffs`);
    return response.data;
  },

  createHandoff: async (
    projectId: number,
    data: CreateProjectHandoffRequest,
  ): Promise<ApiResponse<ProjectHandoff>> => {
    const response = await apiClient.post<ApiResponse<ProjectHandoff>>(`/projects/${projectId}/handoffs`, data);
    return response.data;
  },

  updateHandoff: async (
    projectId: number,
    handoffId: string,
    data: UpdateProjectHandoffRequest,
  ): Promise<ApiResponse<ProjectHandoff>> => {
    const response = await apiClient.put<ApiResponse<ProjectHandoff>>(
      `/projects/${projectId}/handoffs/${handoffId}`,
      data,
    );
    return response.data;
  },

  getContracts: async (projectId: number): Promise<ApiResponse<ProjectContract[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectContract[]>>(`/projects/${projectId}/contracts`);
    return response.data;
  },

  applyCrmContractHandoffSnapshot: async (
    projectId: number,
    data: ApplyCrmContractHandoffSnapshotRequest,
  ): Promise<ApiResponse<ApplyCrmContractHandoffSnapshotResponse>> => {
    const response = await apiClient.post<ApiResponse<ApplyCrmContractHandoffSnapshotResponse>>(
      `/projects/${projectId}/contracts/crm-handoff-snapshot`,
      data,
    );
    return response.data;
  },

  // ─── 멤버 ───

  getMembers: async (projectId: number): Promise<ApiResponse<ProjectMember[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`);
    return response.data;
  },

  getMemberUserLookup: async (
    projectId: number,
    params?: FindProjectMemberUserLookupParams,
  ): Promise<ApiResponse<ProjectMemberUserLookupItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectMemberUserLookupItem[]>>(
      `/projects/${projectId}/members/lookup`,
      { params },
    );
    return response.data;
  },

  addMember: async (projectId: number, data: CreateMemberRequest): Promise<ApiResponse<ProjectMember>> => {
    const response = await apiClient.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, data);
    return response.data;
  },

  updateMember: async (projectId: number, userId: string, roleCode: string, data: UpdateMemberRequest): Promise<ApiResponse<ProjectMember>> => {
    const response = await apiClient.put<ApiResponse<ProjectMember>>(`/projects/${projectId}/members/${userId}/${roleCode}`, data);
    return response.data;
  },

  removeMember: async (projectId: number, userId: string, roleCode: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/members/${userId}/${roleCode}`);
    return response.data;
  },

  // ─── 프로젝트 조직 ───

  getProjectOrgs: async (projectId: number): Promise<ApiResponse<ProjectOrgItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectOrgItem[]>>(
      `/projects/${projectId}/organizations`,
    );
    return response.data;
  },

  getProjectOrgLookup: async (
    projectId: number,
    params?: FindProjectOrgLookupParams,
  ): Promise<ApiResponse<ProjectOrgLookupItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectOrgLookupItem[]>>(
      `/projects/${projectId}/organizations/lookup`,
      { params },
    );
    return response.data;
  },

  createProjectOrg: async (
    projectId: number,
    data: CreateProjectOrgRequest,
  ): Promise<ApiResponse<ProjectOrgItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectOrgItem>>(
      `/projects/${projectId}/organizations`,
      data,
    );
    return response.data;
  },

  updateProjectOrg: async (
    projectId: number,
    organizationId: string,
    roleCode: ProjectOrgRoleCode,
    data: UpdateProjectOrgRequest,
  ): Promise<ApiResponse<ProjectOrgItem>> => {
    const response = await apiClient.put<ApiResponse<ProjectOrgItem>>(
      `/projects/${projectId}/organizations/${organizationId}/${roleCode}`,
      data,
    );
    return response.data;
  },

  removeProjectOrg: async (
    projectId: number,
    organizationId: string,
    roleCode: ProjectOrgRoleCode,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/organizations/${organizationId}/${roleCode}`,
    );
    return response.data;
  },

  // ─── 프로젝트 관계 ───

  getProjectRelations: async (projectId: number): Promise<ApiResponse<ProjectRelationItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectRelationItem[]>>(
      `/projects/${projectId}/relations`,
    );
    return response.data;
  },

  createProjectRelation: async (
    projectId: number,
    data: CreateProjectRelationRequest,
  ): Promise<ApiResponse<ProjectRelationItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectRelationItem>>(
      `/projects/${projectId}/relations`,
      data,
    );
    return response.data;
  },

  removeProjectRelation: async (
    projectId: number,
    targetProjectId: string,
    relationTypeCode: Extract<ProjectRelationTypeCode, 'linked'>,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/relations/${targetProjectId}/${relationTypeCode}`,
    );
    return response.data;
  },

  // ─── 목표 ───

  getObjectives: async (projectId: number): Promise<ApiResponse<ObjectiveItem[]>> => {
    const response = await apiClient.get<ApiResponse<ObjectiveItem[]>>(`/projects/${projectId}/objectives`);
    return response.data;
  },

  createObjective: async (projectId: number, data: CreateObjectiveRequest): Promise<ApiResponse<ObjectiveItem>> => {
    const response = await apiClient.post<ApiResponse<ObjectiveItem>>(`/projects/${projectId}/objectives`, data);
    return response.data;
  },

  updateObjective: async (
    projectId: number,
    objectiveId: string,
    data: UpdateObjectiveRequest,
  ): Promise<ApiResponse<ObjectiveItem>> => {
    const response = await apiClient.put<ApiResponse<ObjectiveItem>>(
      `/projects/${projectId}/objectives/${objectiveId}`,
      data,
    );
    return response.data;
  },

  deleteObjective: async (projectId: number, objectiveId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/objectives/${objectiveId}`);
    return response.data;
  },

  // ─── WBS ───

  getWbs: async (projectId: number): Promise<ApiResponse<WbsItem[]>> => {
    const response = await apiClient.get<ApiResponse<WbsItem[]>>(`/projects/${projectId}/wbs`);
    return response.data;
  },

  createWbs: async (projectId: number, data: CreateWbsRequest): Promise<ApiResponse<WbsItem>> => {
    const response = await apiClient.post<ApiResponse<WbsItem>>(`/projects/${projectId}/wbs`, data);
    return response.data;
  },

  updateWbs: async (
    projectId: number,
    wbsId: string,
    data: UpdateWbsRequest,
  ): Promise<ApiResponse<WbsItem>> => {
    const response = await apiClient.put<ApiResponse<WbsItem>>(`/projects/${projectId}/wbs/${wbsId}`, data);
    return response.data;
  },

  deleteWbs: async (projectId: number, wbsId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/wbs/${wbsId}`);
    return response.data;
  },

  // ─── 태스크 ───

  getTasks: async (projectId: number): Promise<ApiResponse<TaskItem[]>> => {
    const response = await apiClient.get<ApiResponse<TaskItem[]>>(`/projects/${projectId}/tasks`);
    return response.data;
  },

  getTaskEffortLogs: async (projectId: number): Promise<ApiResponse<TaskEffortLogItem[]>> => {
    const response = await apiClient.get<ApiResponse<TaskEffortLogItem[]>>(
      `/projects/${projectId}/tasks/effort-logs`,
    );
    return response.data;
  },

  createTaskEffortLog: async (
    projectId: number,
    data: CreateTaskEffortLogRequest,
  ): Promise<ApiResponse<TaskEffortLogItem>> => {
    const response = await apiClient.post<ApiResponse<TaskEffortLogItem>>(
      `/projects/${projectId}/tasks/effort-logs`,
      data,
    );
    return response.data;
  },

  updateTaskEffortLog: async (
    projectId: number,
    effortLogId: string,
    data: UpdateTaskEffortLogRequest,
  ): Promise<ApiResponse<TaskEffortLogItem>> => {
    const response = await apiClient.put<ApiResponse<TaskEffortLogItem>>(
      `/projects/${projectId}/tasks/effort-logs/${effortLogId}`,
      data,
    );
    return response.data;
  },

  deleteTaskEffortLog: async (
    projectId: number,
    effortLogId: string,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/tasks/effort-logs/${effortLogId}`,
    );
    return response.data;
  },

  createTask: async (projectId: number, data: CreateTaskRequest): Promise<ApiResponse<TaskItem>> => {
    const response = await apiClient.post<ApiResponse<TaskItem>>(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  updateTask: async (projectId: number, taskId: string, data: UpdateTaskRequest): Promise<ApiResponse<TaskItem>> => {
    const response = await apiClient.put<ApiResponse<TaskItem>>(`/projects/${projectId}/tasks/${taskId}`, data);
    return response.data;
  },

  deleteTask: async (projectId: number, taskId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  // ─── 마일스톤 ───

  getMilestones: async (projectId: number): Promise<ApiResponse<MilestoneItem[]>> => {
    const response = await apiClient.get<ApiResponse<MilestoneItem[]>>(`/projects/${projectId}/milestones`);
    return response.data;
  },

  createMilestone: async (projectId: number, data: CreateMilestoneRequest): Promise<ApiResponse<MilestoneItem>> => {
    const response = await apiClient.post<ApiResponse<MilestoneItem>>(`/projects/${projectId}/milestones`, data);
    return response.data;
  },

  updateMilestone: async (projectId: number, milestoneId: string, data: UpdateMilestoneRequest): Promise<ApiResponse<MilestoneItem>> => {
    const response = await apiClient.put<ApiResponse<MilestoneItem>>(`/projects/${projectId}/milestones/${milestoneId}`, data);
    return response.data;
  },

  deleteMilestone: async (projectId: number, milestoneId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/milestones/${milestoneId}`);
    return response.data;
  },

  // ─── 이슈 ───

  getIssues: async (projectId: number, filters?: { statusCode?: string; issueTypeCode?: string }): Promise<ApiResponse<IssueItem[]>> => {
    const response = await apiClient.get<ApiResponse<IssueItem[]>>(`/projects/${projectId}/issues`, { params: filters });
    return response.data;
  },

  getIssueCleanupSummary: async (projectId: number): Promise<ApiResponse<LegacyIssueCleanupSummary>> => {
    const response = await apiClient.get<ApiResponse<LegacyIssueCleanupSummary>>(
      `/projects/${projectId}/issues/cleanup-summary`,
    );
    return response.data;
  },

  archiveTerminalIssues: async (projectId: number): Promise<ApiResponse<LegacyIssueCleanupArchiveResult>> => {
    const response = await apiClient.post<ApiResponse<LegacyIssueCleanupArchiveResult>>(
      `/projects/${projectId}/issues/cleanup-terminal/archive`,
    );
    return response.data;
  },

  canonicalizePendingIssues: async (projectId: number): Promise<ApiResponse<LegacyIssueCleanupCanonicalizeResult>> => {
    const response = await apiClient.post<ApiResponse<LegacyIssueCleanupCanonicalizeResult>>(
      `/projects/${projectId}/issues/cleanup-pending/canonicalize`,
    );
    return response.data;
  },

  updateIssue: async (projectId: number, issueId: string, data: UpdateIssueRequest): Promise<ApiResponse<IssueItem>> => {
    const response = await apiClient.put<ApiResponse<IssueItem>>(`/projects/${projectId}/issues/${issueId}`, data);
    return response.data;
  },

  deleteIssue: async (projectId: number, issueId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/issues/${issueId}`);
    return response.data;
  },

  // ─── canonical 이슈 ───

  getControlIssues: async (projectId: number): Promise<ApiResponse<ProjectIssueItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectIssueItem[]>>(
      `/projects/${projectId}/control/issues`,
    );
    return response.data;
  },

  createProjectIssue: async (
    projectId: number,
    data: CreateProjectIssueRequest,
  ): Promise<ApiResponse<ProjectIssueItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectIssueItem>>(
      `/projects/${projectId}/control/issues`,
      data,
    );
    return response.data;
  },

  updateProjectIssue: async (
    projectId: number,
    projectIssueId: string,
    data: UpdateProjectIssueRequest,
  ): Promise<ApiResponse<ProjectIssueItem>> => {
    const response = await apiClient.put<ApiResponse<ProjectIssueItem>>(
      `/projects/${projectId}/control/issues/${projectIssueId}`,
      data,
    );
    return response.data;
  },

  deleteProjectIssue: async (
    projectId: number,
    projectIssueId: string,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/control/issues/${projectIssueId}`,
    );
    return response.data;
  },

  // ─── 요구사항 ───

  getRequirements: async (projectId: number): Promise<ApiResponse<ProjectRequirementItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectRequirementItem[]>>(
      `/projects/${projectId}/control/requirements`,
    );
    return response.data;
  },

  createRequirement: async (
    projectId: number,
    data: CreateProjectRequirementRequest,
  ): Promise<ApiResponse<ProjectRequirementItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectRequirementItem>>(
      `/projects/${projectId}/control/requirements`,
      data,
    );
    return response.data;
  },

  updateRequirement: async (
    projectId: number,
    requirementId: string,
    data: UpdateProjectRequirementRequest,
  ): Promise<ApiResponse<ProjectRequirementItem>> => {
    const response = await apiClient.put<ApiResponse<ProjectRequirementItem>>(
      `/projects/${projectId}/control/requirements/${requirementId}`,
      data,
    );
    return response.data;
  },

  deleteRequirement: async (projectId: number, requirementId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/control/requirements/${requirementId}`,
    );
    return response.data;
  },

  // ─── 리스크 ───

  getRisks: async (projectId: number): Promise<ApiResponse<ProjectRiskItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectRiskItem[]>>(
      `/projects/${projectId}/control/risks`,
    );
    return response.data;
  },

  createRisk: async (
    projectId: number,
    data: CreateProjectRiskRequest,
  ): Promise<ApiResponse<ProjectRiskItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectRiskItem>>(
      `/projects/${projectId}/control/risks`,
      data,
    );
    return response.data;
  },

  updateRisk: async (
    projectId: number,
    riskId: string,
    data: UpdateProjectRiskRequest,
  ): Promise<ApiResponse<ProjectRiskItem>> => {
    const response = await apiClient.put<ApiResponse<ProjectRiskItem>>(
      `/projects/${projectId}/control/risks/${riskId}`,
      data,
    );
    return response.data;
  },

  deleteRisk: async (projectId: number, riskId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/control/risks/${riskId}`,
    );
    return response.data;
  },

  // ─── 변경요청 ───

  getChangeRequests: async (projectId: number): Promise<ApiResponse<ProjectChangeRequestItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectChangeRequestItem[]>>(
      `/projects/${projectId}/control/changes`,
    );
    return response.data;
  },

  createChangeRequest: async (
    projectId: number,
    data: CreateProjectChangeRequest,
  ): Promise<ApiResponse<ProjectChangeRequestItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectChangeRequestItem>>(
      `/projects/${projectId}/control/changes`,
      data,
    );
    return response.data;
  },

  updateChangeRequest: async (
    projectId: number,
    changeRequestId: string,
    data: UpdateProjectChangeRequest,
  ): Promise<ApiResponse<ProjectChangeRequestItem>> => {
    const response = await apiClient.put<ApiResponse<ProjectChangeRequestItem>>(
      `/projects/${projectId}/control/changes/${changeRequestId}`,
      data,
    );
    return response.data;
  },

  deleteChangeRequest: async (
    projectId: number,
    changeRequestId: string,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/control/changes/${changeRequestId}`,
    );
    return response.data;
  },

  // ─── 이벤트 ───

  getEvents: async (projectId: number): Promise<ApiResponse<ProjectEventItem[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectEventItem[]>>(
      `/projects/${projectId}/control/events`,
    );
    return response.data;
  },

  createEvent: async (
    projectId: number,
    data: CreateProjectEventRequest,
  ): Promise<ApiResponse<ProjectEventItem>> => {
    const response = await apiClient.post<ApiResponse<ProjectEventItem>>(
      `/projects/${projectId}/control/events`,
      data,
    );
    return response.data;
  },

  updateEvent: async (
    projectId: number,
    eventId: string,
    data: UpdateProjectEventRequest,
  ): Promise<ApiResponse<ProjectEventItem>> => {
    const response = await apiClient.put<ApiResponse<ProjectEventItem>>(
      `/projects/${projectId}/control/events/${eventId}`,
      data,
    );
    return response.data;
  },

  deleteEvent: async (projectId: number, eventId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/control/events/${eventId}`,
    );
    return response.data;
  },

  // ─── 산출물 ───

  getDeliverables: async (projectId: number, statusCode?: string): Promise<ApiResponse<DeliverableItem[]>> => {
    const response = await apiClient.get<ApiResponse<DeliverableItem[]>>(`/projects/${projectId}/deliverables`, {
      params: statusCode ? { statusCode } : undefined,
    });
    return response.data;
  },

  upsertDeliverable: async (projectId: number, data: UpsertDeliverableRequest): Promise<ApiResponse<DeliverableItem>> => {
    const response = await apiClient.post<ApiResponse<DeliverableItem>>(`/projects/${projectId}/deliverables`, data);
    return response.data;
  },

  applyDeliverableTemplate: async (projectId: number, data: ApplyDeliverableTemplateRequest): Promise<ApiResponse<DeliverableTemplateApplyResult>> => {
    const response = await apiClient.post<ApiResponse<DeliverableTemplateApplyResult>>(`/projects/${projectId}/deliverables/template`, data);
    return response.data;
  },

  getDeliverableTemplateGroups: async (projectId: number): Promise<ApiResponse<DeliverableTemplateGroup[]>> => {
    const response = await apiClient.get<ApiResponse<DeliverableTemplateGroup[]>>(`/projects/${projectId}/deliverables/templates`);
    return response.data;
  },

  upsertDeliverableTemplateGroup: async (projectId: number, data: UpsertDeliverableTemplateGroupRequest): Promise<ApiResponse<DeliverableTemplateGroup>> => {
    const response = await apiClient.post<ApiResponse<DeliverableTemplateGroup>>(`/projects/${projectId}/deliverables/templates`, data);
    return response.data;
  },

  updateDeliverableSubmission: async (projectId: number, statusCode: string, deliverableCode: string, data: UpdateSubmissionRequest): Promise<ApiResponse<DeliverableItem>> => {
    const response = await apiClient.patch<ApiResponse<DeliverableItem>>(`/projects/${projectId}/deliverables/${statusCode}/${deliverableCode}/submission`, data);
    return response.data;
  },

  replaceDeliverableApprovalRoute: async (
    projectId: number,
    statusCode: string,
    deliverableCode: string,
    data: UpsertCloseoutApprovalRouteRequest,
  ): Promise<ApiResponse<ProjectCloseoutApprovalStep[]>> => {
    const response = await apiClient.put<ApiResponse<ProjectCloseoutApprovalStep[]>>(
      `/projects/${projectId}/deliverables/${statusCode}/${encodeURIComponent(deliverableCode)}/approval-steps`,
      data,
    );
    return response.data;
  },

  decideDeliverableApprovalStep: async (
    projectId: number,
    statusCode: string,
    deliverableCode: string,
    approvalStepId: string,
    data: DecideCloseoutApprovalStepRequest,
  ): Promise<ApiResponse<ProjectCloseoutApprovalStep[]>> => {
    const response = await apiClient.patch<ApiResponse<ProjectCloseoutApprovalStep[]>>(
      `/projects/${projectId}/deliverables/${statusCode}/${encodeURIComponent(deliverableCode)}/approval-steps/${approvalStepId}/decision`,
      data,
    );
    return response.data;
  },

  deleteDeliverable: async (projectId: number, statusCode: string, deliverableCode: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/deliverables/${statusCode}/${deliverableCode}`);
    return response.data;
  },

  // ─── 종료 조건 ───

  getCloseConditions: async (projectId: number, statusCode?: string): Promise<ApiResponse<CloseConditionItem[]>> => {
    const response = await apiClient.get<ApiResponse<CloseConditionItem[]>>(`/projects/${projectId}/close-conditions`, {
      params: statusCode ? { statusCode } : undefined,
    });
    return response.data;
  },

  upsertCloseCondition: async (projectId: number, data: UpsertCloseConditionRequest): Promise<ApiResponse<CloseConditionItem>> => {
    const response = await apiClient.post<ApiResponse<CloseConditionItem>>(`/projects/${projectId}/close-conditions`, data);
    return response.data;
  },

  applyCloseConditionTemplate: async (projectId: number, data: ApplyCloseConditionTemplateRequest): Promise<ApiResponse<CloseConditionTemplateApplyResult>> => {
    const response = await apiClient.post<ApiResponse<CloseConditionTemplateApplyResult>>(`/projects/${projectId}/close-conditions/template`, data);
    return response.data;
  },

  getCloseConditionTemplateGroups: async (projectId: number): Promise<ApiResponse<CloseConditionTemplateGroup[]>> => {
    const response = await apiClient.get<ApiResponse<CloseConditionTemplateGroup[]>>(`/projects/${projectId}/close-conditions/templates`);
    return response.data;
  },

  upsertCloseConditionTemplateGroup: async (projectId: number, data: UpsertCloseConditionTemplateGroupRequest): Promise<ApiResponse<CloseConditionTemplateGroup>> => {
    const response = await apiClient.post<ApiResponse<CloseConditionTemplateGroup>>(`/projects/${projectId}/close-conditions/templates`, data);
    return response.data;
  },

  toggleCloseCondition: async (projectId: number, statusCode: string, conditionCode: string, data: ToggleCheckRequest): Promise<ApiResponse<CloseConditionItem>> => {
    const response = await apiClient.patch<ApiResponse<CloseConditionItem>>(`/projects/${projectId}/close-conditions/${statusCode}/${conditionCode}/check`, data);
    return response.data;
  },

  replaceCloseConditionApprovalRoute: async (
    projectId: number,
    statusCode: string,
    conditionCode: string,
    data: UpsertCloseoutApprovalRouteRequest,
  ): Promise<ApiResponse<ProjectCloseoutApprovalStep[]>> => {
    const response = await apiClient.put<ApiResponse<ProjectCloseoutApprovalStep[]>>(
      `/projects/${projectId}/close-conditions/${statusCode}/${encodeURIComponent(conditionCode)}/approval-steps`,
      data,
    );
    return response.data;
  },

  decideCloseConditionApprovalStep: async (
    projectId: number,
    statusCode: string,
    conditionCode: string,
    approvalStepId: string,
    data: DecideCloseoutApprovalStepRequest,
  ): Promise<ApiResponse<ProjectCloseoutApprovalStep[]>> => {
    const response = await apiClient.patch<ApiResponse<ProjectCloseoutApprovalStep[]>>(
      `/projects/${projectId}/close-conditions/${statusCode}/${encodeURIComponent(conditionCode)}/approval-steps/${approvalStepId}/decision`,
      data,
    );
    return response.data;
  },

  deleteCloseCondition: async (projectId: number, statusCode: string, conditionCode: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/close-conditions/${statusCode}/${conditionCode}`);
    return response.data;
  },
};
