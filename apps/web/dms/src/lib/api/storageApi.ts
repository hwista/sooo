import { request, type ApiResponse } from './core';
import type { SourceFileMeta } from '@/types';

export interface StorageReferenceClient {
  storageUri: string;
  provider: 'local' | 'nas';
  path: string;
  name: string;
  size: number;
  versionId: string;
  etag: string;
  checksum: string;
  origin: 'manual' | 'ingest' | 'teams' | 'network_drive';
  status: 'draft' | 'pending_confirm' | 'published';
  webUrl?: string;
}

export interface StorageOpenResultClient {
  provider: 'local' | 'nas';
  path: string;
  storageUri: string;
  openUrl: string;
  webUrl?: string;
}

export interface IngestJobClient {
  id: string;
  title: string;
  content: string;
  provider: 'local' | 'nas';
  relativePath: string;
  requestedBy: string;
  origin: 'manual' | 'ingest' | 'teams' | 'network_drive';
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'pending_confirm' | 'processing' | 'published' | 'failed' | 'cancelled';
  attemptCount: number;
  lastAttemptAt?: string;
  publishedAt?: string;
  cancelledAt?: string;
  lastOperatedBy?: string;
  error?: string;
  storageUri?: string;
  docPath?: string;
  commitHash?: string;
  publishedBranch?: string;
}

export interface IngestQueueMetricsClient {
  generatedAt: string;
  queueFilePath: string;
  queueFileBytes: number;
  maxConcurrentJobs: number;
  activeJobs: number;
  retentionDays: number;
  totalCount: number;
  counts: Record<IngestJobClient['status'], number>;
  oldestPendingAt?: string;
  latestFailure?: { jobId: string; at: string; error: string };
}

export const storageApi = {
  upload: async (payload: {
    fileName: string;
    content: string;
    provider?: 'local' | 'nas';
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
    status?: 'draft' | 'pending_confirm' | 'published';
  }): Promise<ApiResponse<StorageReferenceClient>> => {
    return request('/api/storage/upload', {
      method: 'POST',
      body: payload,
    });
  },

  open: async (payload: {
    storageUri?: string;
    provider?: 'local' | 'nas';
    path?: string;
    documentPath?: string;
  }): Promise<ApiResponse<StorageOpenResultClient>> => {
    return request('/api/storage/open', {
      method: 'POST',
      body: payload,
    });
  },

  resync: async (payload: {
    storageUri?: string;
    provider?: 'local' | 'nas';
    path?: string;
    documentPath: string;
  }): Promise<ApiResponse<SourceFileMeta>> => {
    return request('/api/storage/resync', {
      method: 'POST',
      body: payload,
    });
  },
};

export const ingestApi = {
  submit: async (payload: {
    title: string;
    content: string;
    requestedBy?: string;
    provider?: 'local' | 'nas';
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
  }): Promise<ApiResponse<IngestJobClient>> => {
    return request('/api/ingest/submit', {
      method: 'POST',
      body: payload,
    });
  },

  jobs: async (): Promise<ApiResponse<{ jobs: IngestJobClient[] }>> => {
    return request('/api/ingest/jobs');
  },

  confirm: async (id: string): Promise<ApiResponse<IngestJobClient>> => {
    return request(`/api/ingest/jobs/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
    });
  },

  retry: async (id: string): Promise<ApiResponse<IngestJobClient>> => {
    return request(`/api/ingest/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' });
  },

  cancel: async (id: string): Promise<ApiResponse<IngestJobClient>> => {
    return request(`/api/ingest/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  },

  metrics: async (): Promise<ApiResponse<IngestQueueMetricsClient>> => {
    return request('/api/ingest/jobs/metrics');
  },

  cleanup: async (olderThanDays?: number): Promise<ApiResponse<{
    cutoff: string;
    removedCount: number;
    retainedCount: number;
    removedJobIds: string[];
  }>> => {
    return request('/api/ingest/jobs/cleanup', {
      method: 'POST',
      body: olderThanDays ? { olderThanDays } : {},
    });
  },
};
