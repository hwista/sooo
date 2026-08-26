import type {
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerProfile,
} from './quote.js';
import type { LaunchReadinessSnapshot } from '../common/launch-readiness.js';

export type CrmLaunchReadinessStatus = 'ready' | 'degraded' | 'blocked' | 'not-required';
export type CrmAccountingProviderMode = 'disabled' | 'external-api';

export interface CrmSettingsSource {
  kind: 'database';
  configCode: string;
  lastActivity?: string;
  transactionId?: string;
}

export interface CrmSettings {
  id: string;
  configCode: string;
  revision: number;
  quoteTemplateKey: string;
  contractTemplateKey: string;
  dmsHandoffEnabled: boolean;
  pmsHandoffEnabled: boolean;
  accountingHandoffEnabled: boolean;
  accountingProviderMode: CrmAccountingProviderMode;
  stalledAfterMinutes: number;
  attemptRetentionDays: number;
  memo?: string;
  updatedAt: string;
  updatedBy?: string;
  source: CrmSettingsSource;
}

export interface CrmSettingsUpdateRequest {
  expectedRevision: number;
  quoteTemplateKey: string;
  contractTemplateKey: string;
  dmsHandoffEnabled: boolean;
  pmsHandoffEnabled: boolean;
  accountingHandoffEnabled: boolean;
  accountingProviderMode: CrmAccountingProviderMode;
  stalledAfterMinutes: number;
  attemptRetentionDays: number;
  memo?: string;
}

export interface CrmSettingsHistoryItem extends CrmSettings {
  historySequence: string;
  eventType: 'C' | 'U' | 'D';
  eventAt: string;
  eventBy?: string;
}

export type CrmReadinessCheckKey =
  | 'database'
  | 'settings-persistence'
  | 'access-policy'
  | 'required-codes'
  | 'business-year'
  | 'seller-profile'
  | 'dms-quote-template'
  | 'dms-contract-template'
  | 'pms-handoff'
  | 'accounting-handoff';

export interface CrmReadinessCheck {
  key: CrmReadinessCheckKey;
  label: string;
  status: CrmLaunchReadinessStatus;
  reason: string;
  owner: CrmOperationsPreviewOwner;
  targetSurface?: string;
  checkedAt: string;
}

export interface CrmReadiness {
  status: Exclude<CrmLaunchReadinessStatus, 'not-required'>;
  checkedAt: string;
  blockerCount: number;
  degradedCount: number;
  checks: CrmReadinessCheck[];
}

export interface CrmLaunchReadinessSnapshot extends LaunchReadinessSnapshot {
  owner: 'crm';
  source: 'crm.operations.live-probe';
}

export type CrmDataQualityCheckKey =
  | 'opportunity-latest-version'
  | 'confirmed-contract-wbs'
  | 'contract-billing-total'
  | 'quote-dms-active-handoff'
  | 'contract-dms-active-handoff';

export interface CrmDataQualityCheck {
  key: CrmDataQualityCheckKey;
  label: string;
  status: 'ready' | 'degraded' | 'blocked';
  violationCount: number;
  findingCount: number;
  acceptedExceptionCount: number;
  entityIds: string[];
  reason: string;
  targetSurface: string;
}

export interface CrmDataQualityReport {
  status: 'ready' | 'degraded' | 'blocked';
  checkedAt: string;
  violationCount: number;
  findingCount: number;
  acceptedExceptionCount: number;
  checks: CrmDataQualityCheck[];
}

export type CrmOperationAttemptTarget = 'dms' | 'pms' | 'accounting';
export type CrmOperationAttemptAction =
  | 'quote-dms-lifecycle'
  | 'opportunity-contract-document-lifecycle'
  | 'contract-dms-lifecycle'
  | 'pms-contract-handoff'
  | 'accounting-payment-execution';
export type CrmOperationAttemptStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type CrmOperationRecoveryStatus = 'not-needed' | 'unresolved' | 'recovering' | 'recovered';

export interface CrmOperationAttempt {
  id: string;
  target: CrmOperationAttemptTarget;
  action: CrmOperationAttemptAction;
  sourceEntityType: string;
  sourceEntityId: string;
  status: CrmOperationAttemptStatus;
  rootAttemptId?: string;
  retryOfAttemptId?: string;
  attemptNumber: number;
  correlationId: string;
  ownerHref: string;
  sourceHref: string;
  retryable: boolean;
  recoveryStatus: CrmOperationRecoveryStatus;
  recoverySummary: string;
  idempotencyKey: string;
  payloadFingerprint: string;
  errorCode?: string;
  errorMessage?: string;
  evidence?: Record<string, unknown>;
  requestedBy?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmOperationAttemptListQuery {
  target?: CrmOperationAttemptTarget;
  status?: CrmOperationAttemptStatus;
  sourceEntityId?: string;
  limit?: number;
}

export interface CrmOperationAttemptListResponse {
  items: CrmOperationAttempt[];
  totalCount: number;
  failedCount: number;
  unresolvedFailedCount: number;
  recoveringFailedCount: number;
  recoveredFailedCount: number;
  runningCount: number;
  stalledCount: number;
  stalledAfterMinutes: number;
}

export type CrmOperationsPreviewReadiness = 'ready' | 'partial' | 'planned' | 'external';
export type CrmOperationsPreviewOwner = 'crm' | 'shared-admin' | 'shared-auth' | 'dms' | 'pms';
export type CrmOperationsCodeGroupKey =
  | 'business-type'
  | 'industry-line'
  | 'payment-term'
  | 'region'
  | 'opportunity-status'
  | 'contract-status';

export interface CrmOperationsPreviewQuery {
  year?: number;
}

export interface CrmOperationsCodeOption {
  code: string;
  label: string;
  usageCount: number;
  source: 'ledger' | 'fixed';
}

export interface CrmOperationsCodeGroup {
  key: CrmOperationsCodeGroupKey;
  label: string;
  owner: CrmOperationsPreviewOwner;
  readiness: CrmOperationsPreviewReadiness;
  options: CrmOperationsCodeOption[];
  boundaryNote: string;
  unavailableActions: string[];
}

export interface CrmOperationsBusinessYear {
  year: number;
  opportunityCount: number;
  contractCount: number;
  billingPlanCount: number;
  selected: boolean;
  owner: CrmOperationsPreviewOwner;
  readiness: CrmOperationsPreviewReadiness;
}

export interface CrmOperationsAdminBoundaryItem {
  key: string;
  label: string;
  owner: CrmOperationsPreviewOwner;
  readiness: CrmOperationsPreviewReadiness;
  crmActionAvailable: boolean;
  targetSurface: string;
  boundaryNote: string;
}

export interface CrmOperationsSellerProfileStatus {
  profile: CrmQuoteSellerProfile;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  readiness: CrmOperationsPreviewReadiness;
  missingFields: string[];
  owner: CrmOperationsPreviewOwner;
  boundaryNote: string;
}

export interface CrmOperationsPreviewSummary {
  selectedYear: number;
  codeGroupCount: number;
  codeOptionCount: number;
  businessYearCount: number;
  adminBoundaryCount: number;
  crmOwnedCount: number;
  sharedOwnedCount: number;
  dmsOwnedCount: number;
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmOperationsPreviewResponse {
  generatedAt: string;
  summary: CrmOperationsPreviewSummary;
  sellerProfile: CrmOperationsSellerProfileStatus;
  codeGroups: CrmOperationsCodeGroup[];
  businessYears: CrmOperationsBusinessYear[];
  adminBoundaries: CrmOperationsAdminBoundaryItem[];
}
