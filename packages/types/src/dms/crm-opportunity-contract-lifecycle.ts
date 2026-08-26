export interface DmsCrmOpportunityContractLifecycleVariable {
  key: string;
  label: string;
  value: string;
  required: boolean;
  source: string;
}

export interface DmsCrmOpportunityContractLifecycleExecutionRequest {
  opportunityId: string;
  opportunityCode: string;
  documentTitle: string;
  fileNameHint: string;
  templateKey: string;
  draftPath: string;
  variables: DmsCrmOpportunityContractLifecycleVariable[];
  memo?: string;
}

export interface DmsCrmOpportunityContractLifecycleTemplateVersion {
  templateKey: string;
  templateName: string;
  status: string;
  sourcePath?: string;
  versionId: string;
  capturedAt: string;
}

export interface DmsCrmOpportunityContractLifecycleArtifact {
  kind: 'template-version-snapshot' | 'template-review-record' | 'word-export';
  label: string;
  path: string;
  storageUri?: string;
  checksum?: string;
  size?: number;
}

export interface DmsCrmOpportunityContractLifecycleExecutionResult {
  opportunityId: string;
  opportunityCode: string;
  templateKey: string;
  executedAt: string;
  governance: {
    templateVersion: DmsCrmOpportunityContractLifecycleTemplateVersion;
    templateReviewPath: string;
    reviewedAt: string;
    reviewerLoginId: string;
    boundaryNotice: string;
  };
  artifacts: DmsCrmOpportunityContractLifecycleArtifact[];
  boundaryNotice: string;
  nextAction: string;
}
