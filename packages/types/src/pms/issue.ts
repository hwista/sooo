// Issue — 이슈/위험 관리

export interface Issue {
  id: string;
  projectId: string;
  issueCode: string;
  issueTitle: string;
  description: string | null;
  issueTypeCode: string;
  statusCode: string;
  priorityCode: string;
  reportedByUserId: string | null;
  assigneeUserId: string | null;
  reportedAt: string;
  dueAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  // joined fields
  reportedByName?: string;
  assigneeName?: string;
}

export interface LegacyIssueCleanupStatusCount {
  statusCode: string;
  count: number;
}

export interface LegacyIssueCleanupTypeCount {
  issueTypeCode: string;
  count: number;
}

export interface LegacyIssueCleanupSummary {
  projectId: string;
  activeCleanupCount: number;
  pendingCleanupCount: number;
  terminalCleanupCount: number;
  archivedCleanupCount: number;
  readyForPhysicalRemoval: boolean;
  statusCounts: LegacyIssueCleanupStatusCount[];
  issueTypeCounts: LegacyIssueCleanupTypeCount[];
  generatedAt: string;
}

export interface LegacyIssueCleanupArchiveResult extends LegacyIssueCleanupSummary {
  archivedCount: number;
}

export interface LegacyIssueCleanupCanonicalizeResult extends LegacyIssueCleanupSummary {
  convertedCount: number;
  projectIssueCount: number;
  riskCount: number;
  changeRequestCount: number;
}

export interface UpdateIssueDto {
  issueTitle?: string;
  description?: string;
  issueTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string;
}
