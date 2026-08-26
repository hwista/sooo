import type {
  DmsAcknowledgeHomeSeenPayload,
  DmsAcknowledgeHomeSeenResult,
  DmsHomeSummary,
  DmsRecordDocumentVisitPayload,
  DmsRecordDocumentVisitResult,
} from '@ssoo/types/dms';
import { get, post } from './core';

export const homeApi = {
  getSummary: () => get<DmsHomeSummary>('/api/home'),
  recordVisit: (payload: DmsRecordDocumentVisitPayload) => (
    post<DmsRecordDocumentVisitResult>('/api/home/visits', payload)
  ),
  acknowledgeSeen: (payload: DmsAcknowledgeHomeSeenPayload) => (
    post<DmsAcknowledgeHomeSeenResult>('/api/home/seen', payload)
  ),
};
