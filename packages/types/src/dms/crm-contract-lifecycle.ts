export type DmsCrmContractLifecycleStepKey =
  | 'template-review'
  | 'attachment-confirmation'
  | 'word-export'
  | 'pdf-export'
  | 'approval';

export type DmsCrmContractLifecycleOwner = 'crm' | 'dms';
export type DmsCrmContractLifecycleStatus = 'ready' | 'pending' | 'blocked' | 'completed';
export type DmsCrmContractArtifactKind =
  | 'export-policy-record'
  | 'template-version-snapshot'
  | 'template-change-review-record'
  | 'template-change-request-ledger'
  | 'template-review-record'
  | 'attachment-confirmation-record'
  | 'attachment-finalization-ledger'
  | 'word-export'
  | 'pdf-export'
  | 'approval-route-record'
  | 'approval-workflow-record'
  | 'approval-route-ledger'
  | 'approval-record';
export type DmsCrmContractLifecycleApprovalStatus = 'approved';
export type DmsCrmContractLifecycleTemplateChangeStatus = 'not-required' | 'approved';
export type DmsCrmContractLifecycleTemplateChangeRequestStatus = 'closed-without-change' | 'approved';
export type DmsCrmContractLifecycleDirectorySyncStatus = 'synced' | 'partial' | 'unavailable';
export type DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus =
  | 'synced'
  | 'synced-with-directory-gaps'
  | 'synced-with-directory-unavailable';
export type DmsCrmContractLifecycleAttachmentFinalizationStatus = 'finalized' | 'deferred';

export interface DmsCrmContractLifecycleVariable {
  key: string;
  label: string;
  value: string;
  required: boolean;
  source: string;
}

export interface DmsCrmContractLifecycleAttachment {
  key: string;
  label: string;
  status: string;
  evidenceLabel?: string;
  evidencePath?: string;
  note: string;
}

export interface DmsCrmContractLifecycleAttachmentFinalizationItem {
  key: string;
  label: string;
  sourceStatus: string;
  finalizationStatus: DmsCrmContractLifecycleAttachmentFinalizationStatus;
  finalized: boolean;
  evidenceLabel?: string;
  evidencePath?: string;
  note: string;
  finalizedAt?: string;
}

export interface DmsCrmContractLifecycleStep {
  key: 'markdown-draft' | DmsCrmContractLifecycleStepKey;
  label: string;
  owner: DmsCrmContractLifecycleOwner;
  status: DmsCrmContractLifecycleStatus;
  evidenceLabel: string;
  evidencePath?: string;
  note: string;
  blockingReasons?: string[];
}

export interface DmsCrmContractLifecycleExecutionRequest {
  contractId: string;
  contractCode: string;
  documentTitle: string;
  templateKey: string;
  draftPath: string;
  variables: DmsCrmContractLifecycleVariable[];
  attachments: DmsCrmContractLifecycleAttachment[];
  lifecycle: DmsCrmContractLifecycleStep[];
  memo?: string;
}

export interface DmsCrmContractLifecycleTemplateVersion {
  templateKey: string;
  templateName: string;
  status: string;
  sourcePath?: string;
  versionId: string;
  capturedAt: string;
}

export interface DmsCrmContractLifecycleApprovalActor {
  sequence: number;
  role: string;
  loginId: string;
  displayName: string;
  status: DmsCrmContractLifecycleApprovalStatus;
  approvedAt: string;
  evidenceLabel: string;
  note: string;
}

export interface DmsCrmContractLifecycleApprovalRoute {
  routeKey: string;
  routeName: string;
  policyVersion: string;
  organizationScope: string;
  requiredRoles: string[];
  externalDirectorySynced: boolean;
  directorySyncStatus: DmsCrmContractLifecycleDirectorySyncStatus;
  directorySource: string;
  directorySyncedAt?: string;
  resolvedActors: DmsCrmContractLifecycleApprovalRouteActor[];
  resolvedAt: string;
}

export interface DmsCrmContractApprovalRoutePolicy {
  routeKey: string;
  routeName: string;
  policyVersion: string;
  organizationScope: string;
  requiredRoles: string[];
}

export interface DmsCrmContractExportPolicy {
  policyKey: string;
  policyVersion: string;
  organizationScope: string;
  markdownRecordRootPath: string;
  storageArtifactRootPath: string;
}

export const DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY = {
  routeKey: 'dms-crm-contract-standard',
  routeName: 'DMS CRM contract standard approval route',
  policyVersion: 'dms-crm-contract-standard@2026-07-09',
  organizationScope: 'global',
  requiredRoles: ['template-owner', 'contract-approver'],
} satisfies DmsCrmContractApprovalRoutePolicy;

export const DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY = {
  policyKey: 'dms-crm-contract-export-standard',
  policyVersion: 'dms-crm-contract-export-standard@2026-07-10',
  organizationScope: 'global',
  markdownRecordRootPath: '_generated/crm-contract-lifecycle',
  storageArtifactRootPath: '_assets/crm-contract-lifecycle',
} satisfies DmsCrmContractExportPolicy;

export interface DmsCrmContractLifecycleApprovalRouteActor {
  role: string;
  loginId: string;
  displayName: string;
  directorySource: string;
  userId?: string;
  userName?: string;
  email?: string;
  departmentCode?: string;
  positionCode?: string;
  organizationId?: string;
  organizationCode?: string;
  organizationName?: string;
  organizationScope?: string;
}

export interface DmsCrmContractLifecycleApprovalRouteLedger {
  ledgerId: string;
  syncStatus: DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus;
  routeKey: string;
  policyVersion: string;
  organizationScope: string;
  requiredRoles: string[];
  syncedActorCount: number;
  syncedAt: string;
  directorySyncStatus: DmsCrmContractLifecycleDirectorySyncStatus;
  directorySource: string;
  routeRecordPath: string;
  workflowRecordPath: string;
  evidenceLabel: string;
  resolvedActors: DmsCrmContractLifecycleApprovalRouteActor[];
}

export interface DmsCrmContractLifecycleAttachmentFinalizationLedger {
  ledgerId: string;
  status: DmsCrmContractLifecycleAttachmentFinalizationStatus;
  attachmentCount: number;
  finalizedAttachmentCount: number;
  deferredAttachmentCount: number;
  finalizedAt: string;
  attachmentRecordPath: string;
  evidenceLabel: string;
  items: DmsCrmContractLifecycleAttachmentFinalizationItem[];
  boundaryNotice: string;
}

export interface DmsCrmContractLifecycleExportPolicyRecord {
  policyKey: string;
  policyVersion: string;
  organizationScope: string;
  markdownRecordRootPath: string;
  storageArtifactRootPath: string;
  resolvedRecordPath: string;
  resolvedArtifactPath: string;
  resolvedAt: string;
  evidenceLabel: string;
  boundaryNotice: string;
}

export interface DmsCrmContractLifecycleTemplateChangeReview {
  status: DmsCrmContractLifecycleTemplateChangeStatus;
  reason: string;
  reviewedAt: string;
  reviewerLoginId: string;
  evidenceLabel: string;
}

export interface DmsCrmContractLifecycleTemplateChangeRequestLedger {
  ledgerId: string;
  status: DmsCrmContractLifecycleTemplateChangeRequestStatus;
  changeRequestRequired: boolean;
  templateKey: string;
  templateVersionId: string;
  requestedByLoginId: string;
  requestedAt: string;
  reviewedAt: string;
  reviewStatus: DmsCrmContractLifecycleTemplateChangeStatus;
  evidenceLabel: string;
  reason: string;
  sourcePath?: string;
}

export interface DmsCrmContractLifecycleGovernance {
  templateVersion: DmsCrmContractLifecycleTemplateVersion;
  exportPolicy: DmsCrmContractLifecycleExportPolicyRecord;
  approvalRoute: DmsCrmContractLifecycleApprovalRoute;
  approvalRouteLedger: DmsCrmContractLifecycleApprovalRouteLedger;
  attachmentFinalizationLedger: DmsCrmContractLifecycleAttachmentFinalizationLedger;
  templateChangeReview: DmsCrmContractLifecycleTemplateChangeReview;
  templateChangeRequestLedger: DmsCrmContractLifecycleTemplateChangeRequestLedger;
  approvalActors: DmsCrmContractLifecycleApprovalActor[];
  boundaryNotice: string;
}

export interface DmsCrmContractLifecycleArtifact {
  kind: DmsCrmContractArtifactKind;
  label: string;
  path: string;
  storageUri?: string;
  checksum?: string;
  size?: number;
}

export interface DmsCrmContractLifecycleEvidenceStep {
  key: DmsCrmContractLifecycleStepKey;
  evidencePath: string;
  evidenceLabel?: string;
  note?: string;
}

export interface DmsCrmContractLifecycleExecutionResult {
  contractId: string;
  contractCode: string;
  templateKey: string;
  executedAt: string;
  governance: DmsCrmContractLifecycleGovernance;
  artifacts: DmsCrmContractLifecycleArtifact[];
  evidenceSteps: DmsCrmContractLifecycleEvidenceStep[];
  boundaryNotice: string;
  nextAction: string;
}
