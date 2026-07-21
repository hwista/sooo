import type { PmsProjectAccessFeatures, ProjectStageCode, ProjectStatusCode } from './project';

export type PmsHomeRelation = 'pm' | 'member' | 'pmo' | 'viewer';

export type PmsHomeCapabilityKey = keyof PmsProjectAccessFeatures;

export type PmsHomeActionKind =
  | 'view-project'
  | 'edit-project'
  | 'manage-members'
  | 'manage-tasks'
  | 'manage-milestones'
  | 'manage-issues'
  | 'review-feedback'
  | 'manage-deliverables'
  | 'manage-close-conditions'
  | 'advance-stage';

export type PmsHomeTargetTab =
  | 'overview'
  | 'stage'
  | 'members'
  | 'tasks'
  | 'milestones'
  | 'controls'
  | 'review'
  | 'deliverables'
  | 'closeConditions';

export type PmsHomeSignalKind =
  | 'my-task-due'
  | 'my-deliverable-due'
  | 'my-review-request'
  | 'project-stale'
  | 'project-unowned'
  | 'project-risk-open'
  | 'project-issue-blocking'
  | 'review-feedback-open'
  | 'milestone-delayed'
  | 'deliverable-approval-pending'
  | 'closeout-blocked'
  | 'stage-transition-ready'
  | 'recent-change';

export type PmsHomeSignalSeverity = 'critical' | 'warning' | 'normal' | 'info';

export interface PmsHomeAllowedAction {
  kind: PmsHomeActionKind;
  label: string;
  targetPath: string;
  targetTab: PmsHomeTargetTab;
  requiredCapability?: PmsHomeCapabilityKey | null;
}

export interface PmsHomeSignal {
  id: string;
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  currentOwnerUserId?: string | null;
  ownerOrganizationId?: string | null;
  updatedAt: string;
  relation: PmsHomeRelation;
  kind: PmsHomeSignalKind;
  severity: PmsHomeSignalSeverity;
  label: string;
  reason: string;
  nextActionLabel: string;
  targetPath: string;
  targetTab: PmsHomeTargetTab;
  requiredCapability?: PmsHomeCapabilityKey | null;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
  sortWeight: number;
  relatedSignalCount?: number;
}

export interface PmsHomeRelationCounts {
  pm: number;
  member: number;
  pmo: number;
  viewer: number;
}

export interface PmsHomeMetrics {
  active: number;
  directActions: number;
  attention: number;
  pmoSignals: number;
  feedback: number;
  closeout: number;
  stale: number;
  actionableProjects: number;
  readOnlyProjects: number;
}

export interface PmsHomeRiskReportSummary {
  openRisks: number;
  highRisks: number;
  unassignedRisks: number;
  blockingIssues: number;
  activeChanges: number;
  plannedReports: number;
  readyReports: number;
  completedReports: number;
  overdueReports: number;
  delayedMilestones: number;
  pendingDeliverables: number;
  closeoutBlockedProjects: number;
}

export interface PmsHomePortfolioDashboardProject {
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  relation: PmsHomeRelation;
  currentOwnerUserId?: string | null;
  ownerOrganizationId?: string | null;
  updatedAt: string;
  estimatedHours: number;
  actualHours: number;
  effortVarianceHours: number;
  effortBurnRate: number;
  delayedMilestoneCount: number;
  pendingDeliverableCount: number;
  openControlCount: number;
  openIssueCount: number;
  openRiskCount: number;
  activeChangeCount: number;
  launchFeedbackCount: number;
  closeoutBlockerCount: number;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
}

export interface PmsHomePortfolioDashboard {
  projectCount: number;
  activeProjectCount: number;
  pmOwnedProjectCount: number;
  pmoVisibleProjectCount: number;
  crmContractSnapshotCount: number;
  crmContractSnapshotAmount: string;
  crmContractSnapshotCurrencyCode: string;
  scheduledPaymentSnapshotAmount: string;
  overduePaymentCount: number;
  dueSoonPaymentCount: number;
  estimatedHours: number;
  actualHours: number;
  effortVarianceHours: number;
  effortBurnRate: number;
  delayedMilestoneCount: number;
  pendingDeliverableCount: number;
  openControlCount: number;
  openRiskCount: number;
  openIssueCount: number;
  activeChangeCount: number;
  launchFeedbackCount: number;
  closeoutBlockedProjectCount: number;
  staleProjectCount: number;
  topProjects: PmsHomePortfolioDashboardProject[];
  boundaryNote: string;
}

export interface PmsHomeFlowItem {
  statusCode: ProjectStatusCode;
  count: number;
}

export interface PmsHomeRecentChange {
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  relation: PmsHomeRelation;
  title: string;
  changedAt: string;
  currentOwnerUserId?: string | null;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
}

export interface PmsHomeAccessProject {
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  relation: PmsHomeRelation;
  currentOwnerUserId?: string | null;
  ownerOrganizationId?: string | null;
  updatedAt: string;
  features: PmsProjectAccessFeatures;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
}

export interface PmsHomeSummary {
  generatedAt: string;
  relationCounts: PmsHomeRelationCounts;
  metrics: PmsHomeMetrics;
  riskReportSummary: PmsHomeRiskReportSummary;
  portfolioDashboard: PmsHomePortfolioDashboard;
  briefing: string[];
  signals: PmsHomeSignal[];
  feedbackSignals: PmsHomeSignal[];
  flow: PmsHomeFlowItem[];
  recentChanges: PmsHomeRecentChange[];
  accessProjects: PmsHomeAccessProject[];
}
