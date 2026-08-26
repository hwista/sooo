import type { DmsFeatureAccess } from './access';

export type DmsHomeSectionStatus = 'ready' | 'empty' | 'degraded';

export interface DmsHomeSection<TItem> {
  status: DmsHomeSectionStatus;
  items: TItem[];
  reason?: string;
}

export interface DmsHomeDocumentItem {
  documentId: string;
  path: string;
  title: string;
  ownerName?: string;
  updatedAt: string;
  syncStatusCode: string;
  lastOpenedAt?: string;
  openCount?: number;
}

export type DmsHomeActionKind = 'access-request' | 'document-repair';

export interface DmsHomeActionTarget {
  kind: 'document' | 'settings';
  path?: string;
  scope?: 'personal' | 'system';
  sectionId?: string;
}

export interface DmsHomeActionItem {
  id: string;
  kind: DmsHomeActionKind;
  title: string;
  description: string;
  occurredAt: string;
  target: DmsHomeActionTarget;
}

export type DmsHomeOperationalExceptionKind = 'readiness' | 'publish' | 'ingest';
export type DmsHomeOperationalSeverity = 'info' | 'warning' | 'critical';

export interface DmsHomeOperationalExceptionItem {
  id: string;
  kind: DmsHomeOperationalExceptionKind;
  severity: DmsHomeOperationalSeverity;
  title: string;
  description: string;
  occurredAt?: string;
  target: DmsHomeActionTarget;
}

export interface DmsHomeMetrics {
  continueWorking: number;
  changedSinceLastVisit: number;
  pendingActions: number;
  operationalExceptions: number;
}

export interface DmsHomeSummary {
  generatedAt: string;
  lastSeenAt?: string;
  hasPreviousVisit: boolean;
  features: DmsFeatureAccess;
  metrics: DmsHomeMetrics;
  sections: {
    continueWorking: DmsHomeSection<DmsHomeDocumentItem>;
    changes: DmsHomeSection<DmsHomeDocumentItem>;
    actions: DmsHomeSection<DmsHomeActionItem>;
    operations: DmsHomeSection<DmsHomeOperationalExceptionItem>;
  };
}

export interface DmsRecordDocumentVisitPayload {
  path: string;
}

export interface DmsRecordDocumentVisitResult {
  documentId: string;
  lastOpenedAt: string;
  openCount: number;
}

export interface DmsAcknowledgeHomeSeenPayload {
  seenAt: string;
}

export interface DmsAcknowledgeHomeSeenResult {
  lastSeenAt: string;
}
