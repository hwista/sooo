export type DmsCrmQuoteLifecycleStepKey =
  | 'template-review'
  | 'word-export'
  | 'pdf-export';

export type DmsCrmQuoteLifecycleOwner = 'crm' | 'dms';
export type DmsCrmQuoteLifecycleStatus = 'ready' | 'pending' | 'blocked' | 'completed';
export type DmsCrmQuoteArtifactKind =
  | 'template-version-snapshot'
  | 'template-review-record'
  | 'word-export'
  | 'pdf-export';

export interface DmsCrmQuoteLifecycleVariable {
  key: string;
  label: string;
  value: string;
  required: boolean;
  source: string;
}

export interface DmsCrmQuoteLifecycleStep {
  key: 'markdown-draft' | DmsCrmQuoteLifecycleStepKey;
  label: string;
  owner: DmsCrmQuoteLifecycleOwner;
  status: DmsCrmQuoteLifecycleStatus;
  evidenceLabel: string;
  evidencePath?: string;
  note: string;
  blockingReasons?: string[];
}

export interface DmsCrmQuoteLifecycleExecutionRequest {
  opportunityId: string;
  opportunityCode: string;
  quoteNumber: string;
  documentTitle: string;
  templateKey: string;
  draftPath: string;
  variables: DmsCrmQuoteLifecycleVariable[];
  lifecycle: DmsCrmQuoteLifecycleStep[];
  memo?: string;
}

export interface DmsCrmQuoteLifecycleTemplateVersion {
  templateKey: string;
  templateName: string;
  status: string;
  sourcePath?: string;
  versionId: string;
  capturedAt: string;
}

export interface DmsCrmQuoteLifecycleGovernance {
  templateVersion: DmsCrmQuoteLifecycleTemplateVersion;
  templateReviewPath: string;
  reviewedAt: string;
  reviewerLoginId: string;
  boundaryNotice: string;
}

export interface DmsCrmQuoteLifecycleArtifact {
  kind: DmsCrmQuoteArtifactKind;
  label: string;
  path: string;
  storageUri?: string;
  checksum?: string;
  size?: number;
}

export interface DmsCrmQuoteLifecycleEvidenceStep {
  key: DmsCrmQuoteLifecycleStepKey;
  evidencePath: string;
  evidenceLabel?: string;
  note?: string;
}

export interface DmsCrmQuoteLifecycleExecutionResult {
  opportunityId: string;
  opportunityCode: string;
  quoteNumber: string;
  templateKey: string;
  executedAt: string;
  governance: DmsCrmQuoteLifecycleGovernance;
  artifacts: DmsCrmQuoteLifecycleArtifact[];
  evidenceSteps: DmsCrmQuoteLifecycleEvidenceStep[];
  boundaryNotice: string;
  nextAction: string;
}
