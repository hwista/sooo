import type {
  CrmOpportunityDiscountType,
  CrmIntegrationStatus,
  CrmQuoteWorkflowStatus,
  CrmOpportunityServiceType,
  CrmOpportunityStatus,
} from './opportunity.js';
import type {
  DmsCrmQuoteLifecycleExecutionResult,
} from '../dms/crm-quote-lifecycle.js';
import type { CrmDmsDocumentTemplateOption } from './document-template.js';

export type CrmQuotePreviewStatus = 'candidate' | 'blocked';
export type CrmQuotePreviewLineSection = 'product' | 'service';
export type CrmQuoteSellerCiStatus = 'not-configured' | 'dms-planned' | 'configured';
export type CrmQuoteSellerCiReferenceStatus =
  | 'not-configured'
  | 'planned'
  | 'verified'
  | 'missing'
  | 'invalid'
  | 'unverified';
export type CrmQuotePreviewSellerInfoStatus = 'not-configured' | 'dms-ci-planned' | 'configured';
export type CrmQuotePreviewOwnerContactStatus =
  | 'opportunity-owner-profile'
  | 'opportunity-owner-profile-missing'
  | 'session-user-profile'
  | 'session-user-profile-missing';
export type CrmQuoteDmsDocumentReadiness = 'ready' | 'blocked';
export type CrmQuoteDmsDocumentType = 'quote';
export type CrmQuoteDmsDocumentVariableSource =
  | 'opportunity'
  | 'quote-workflow'
  | 'seller-profile'
  | 'owner-profile'
  | 'dms-boundary';
export type CrmQuoteDmsDocumentHandoffStatus = 'draft-created' | 'execution-evidence-updated' | 'replaced';
export type CrmQuoteDmsTemplateEvidenceState = 'available' | 'missing' | 'unavailable';
export type CrmQuoteDmsTemplateStatus = 'active' | 'archived';
export type CrmQuoteDmsDocumentLifecycleStepKey =
  | 'markdown-draft'
  | 'template-review'
  | 'word-export'
  | 'pdf-export';
export type CrmQuoteDmsDocumentExecutionStepKey = Exclude<
  CrmQuoteDmsDocumentLifecycleStepKey,
  'markdown-draft'
>;
export type CrmQuoteDmsDocumentLifecycleOwner = 'crm' | 'dms';
export type CrmQuoteDmsDocumentLifecycleStatus = 'ready' | 'pending' | 'blocked' | 'completed';

export interface CrmQuoteSellerProfile {
  id: string;
  profileCode: string;
  companyName: string;
  ceoName?: string;
  businessRegistrationNo?: string;
  address?: string;
  tel?: string;
  fax?: string;
  website?: string;
  email?: string;
  ciStatus: CrmQuoteSellerCiStatus;
  ciStorageRef?: string;
  ciReferenceStatus?: CrmQuoteSellerCiReferenceStatus;
  ciReferenceCheckedAt?: string;
  ciReferenceReason?: string;
  memo?: string;
  updatedAt: string;
  lastActivity?: string;
}

export interface CrmQuoteSellerProfileUpsertRequest {
  companyName: string;
  ceoName?: string;
  businessRegistrationNo?: string;
  address?: string;
  tel?: string;
  fax?: string;
  website?: string;
  email?: string;
  ciStatus?: CrmQuoteSellerCiStatus;
  ciStorageRef?: string;
  memo?: string;
}

export interface CrmQuoteOwnerContactProfile {
  userId: string;
  displayName: string;
  departmentName?: string;
  phone?: string;
  email?: string;
}

export interface CrmQuoteWorkflowUpdateRequest {
  status: CrmQuoteWorkflowStatus;
  clientContactName?: string;
  quoteMemo?: string;
  issuedAt?: string;
  validUntil?: string;
}

export interface CrmQuotePreviewLine {
  id: string;
  section: CrmQuotePreviewLineSection;
  label: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  department?: string;
  memberName?: string;
  grade?: string;
  serviceType?: CrmOpportunityServiceType;
}

export interface CrmQuotePreviewParty {
  customerName: string;
  clientContactName?: string;
  sellerName: string;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  sellerProfile?: CrmQuoteSellerProfile;
  ownerName: string;
  ownerContactStatus: CrmQuotePreviewOwnerContactStatus;
  ownerContact?: CrmQuoteOwnerContactProfile;
}

export interface CrmQuotePreviewSummary {
  productSubtotal: number;
  serviceSubtotal: number;
  revenueSubtotal: number;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: number;
  specialDiscountAmount: number;
  quoteTotal: number;
  vatIncluded: false;
  vatNotice: string;
}

export interface CrmQuotePreviewWorkflow {
  sourceOpportunityId: string;
  sourceOpportunityVersion: number;
  sourceOpportunityStatus: CrmOpportunityStatus;
  confirmed: boolean;
  previewStatus: CrmQuotePreviewStatus;
  workflowStatus: CrmQuoteWorkflowStatus;
  quoteNumber: string;
  issuedAt: string;
  validUntil: string;
  validityDays: number;
  paymentTermCode?: string;
  paymentTermLabel: string;
  quoteMemo?: string;
  readOnly: true;
  unavailableActions: string[];
  boundaryNotice: string;
}

export interface CrmQuoteDmsDocumentVariable {
  key: string;
  label: string;
  value: string;
  required: boolean;
  source: CrmQuoteDmsDocumentVariableSource;
}

export interface CrmQuoteDmsDocumentHandoffSummary {
  id: string;
  status: CrmQuoteDmsDocumentHandoffStatus;
  documentTitle: string;
  templateKey: string;
  draftPath: string;
  savedAt: string;
  savedBy?: string;
  memo?: string;
}

export interface CrmQuoteDmsTemplateEvidence {
  state: CrmQuoteDmsTemplateEvidenceState;
  templateKey: string;
  templateName?: string;
  sourcePath?: string;
  status?: CrmQuoteDmsTemplateStatus;
  updatedAt?: string;
  reason?: string;
}

export interface CrmQuoteDmsDocumentLifecycleStep {
  key: CrmQuoteDmsDocumentLifecycleStepKey;
  label: string;
  owner: CrmQuoteDmsDocumentLifecycleOwner;
  status: CrmQuoteDmsDocumentLifecycleStatus;
  evidenceLabel: string;
  evidencePath?: string;
  note: string;
  blockingReasons?: string[];
}

export interface CrmQuoteDmsDocumentPreview {
  opportunityId: string;
  opportunityCode: string;
  quoteNumber: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  documentType: CrmQuoteDmsDocumentType;
  documentTitle: string;
  templateKey: string;
  templateEvidence: CrmQuoteDmsTemplateEvidence;
  templateOptions: CrmDmsDocumentTemplateOption[];
  folderHint: string;
  fileNameHint: string;
  draftPathHint: string;
  savedDraftPath?: string;
  readOnly: true;
  readiness: CrmQuoteDmsDocumentReadiness;
  blockedReasons: string[];
  dmsLinkStatus: CrmIntegrationStatus;
  sellerName: string;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  sellerProfile?: CrmQuoteSellerProfile;
  variables: CrmQuoteDmsDocumentVariable[];
  lifecycle: CrmQuoteDmsDocumentLifecycleStep[];
  latestHandoff: CrmQuoteDmsDocumentHandoffSummary | null;
  boundaryNotice: string;
  unavailableActions: string[];
  nextAction: string;
}

export interface CrmQuoteDmsDocumentHandoff extends CrmQuoteDmsDocumentHandoffSummary {
  opportunityId: string;
  opportunityCode: string;
  quoteNumber: string;
  documentType: CrmQuoteDmsDocumentType;
  folderHint: string;
  fileNameHint: string;
  documentSnapshot: Omit<CrmQuoteDmsDocumentPreview, 'latestHandoff'>;
  variablesSnapshot: CrmQuoteDmsDocumentVariable[];
  lifecycleSnapshot: CrmQuoteDmsDocumentLifecycleStep[];
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmQuoteDmsDocumentDraftRequest {
  templateKey?: string;
  memo?: string;
}

export interface CrmQuoteDmsDocumentDraft {
  opportunityId: string;
  opportunityCode: string;
  quoteNumber: string;
  documentTitle: string;
  templateKey: string;
  savedPath: string;
  dmsLinkStatus: CrmIntegrationStatus;
  savedAt: string;
  boundaryNotice: string;
  nextAction: string;
  handoff: CrmQuoteDmsDocumentHandoff;
  preview: CrmQuoteDmsDocumentPreview;
}

export interface CrmQuoteDmsDocumentExecutionEvidenceStep {
  key: CrmQuoteDmsDocumentExecutionStepKey;
  evidencePath: string;
  evidenceLabel?: string;
  note?: string;
}

export interface CrmQuoteDmsDocumentExecutionEvidenceRequest {
  steps: CrmQuoteDmsDocumentExecutionEvidenceStep[];
  memo?: string;
}

export interface CrmQuoteDmsDocumentLifecycleExecutionRequest {
  memo?: string;
}

export interface CrmQuoteDmsDocumentExecutionEvidenceResult {
  opportunityId: string;
  opportunityCode: string;
  quoteNumber: string;
  templateKey: string;
  appliedStepKeys: CrmQuoteDmsDocumentExecutionStepKey[];
  recordedAt: string;
  handoff: CrmQuoteDmsDocumentHandoff;
  preview: CrmQuoteDmsDocumentPreview;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmQuoteDmsDocumentLifecycleExecutionResult extends CrmQuoteDmsDocumentExecutionEvidenceResult {
  dmsExecution: DmsCrmQuoteLifecycleExecutionResult;
}

export interface CrmOpportunityQuotePreview {
  workflow: CrmQuotePreviewWorkflow;
  party: CrmQuotePreviewParty;
  productLines: CrmQuotePreviewLine[];
  serviceLines: CrmQuotePreviewLine[];
  summary: CrmQuotePreviewSummary;
  dmsDocument: CrmQuoteDmsDocumentPreview;
  notes: string[];
}
