import type {
  SettingsAccessMode,
  SettingsProfileKey,
  SettingsScope,
} from '@/types/settings';
import type { DmsCrmContractApprovalRoutePolicy, DmsCrmContractExportPolicy } from '@ssoo/types/dms';
import type { LaunchReadinessSnapshot } from '@ssoo/types/common';
import type { GitSyncStatusClient } from './collaborationApi';
import { request, type ApiResponse } from './core';

export interface DmsSystemConfigClient {
  git: {
    repositoryPath: string;
    bootstrapRemoteUrl?: string;
    bootstrapBranch?: string;
    autoInit: boolean;
  };
  storage: {
    defaultProvider: 'local' | 'nas';
    local: { enabled: boolean; basePath: string; webBaseUrl?: string };
    nas: { enabled: boolean; basePath: string; webBaseUrl?: string };
  };
  ingest: {
    queuePath: string;
    autoPublish: boolean;
    maxConcurrentJobs: number;
    retentionDays: number;
  };
  templates: {
    rootPath: string;
  };
  extraction: {
    maxTextLength: number;
    maxImages: number;
    maxImageSizeMb: number;
    pdfMaxRenderPages: number;
    pdfRenderScale: number;
  };
  uploads: {
    attachmentMaxSizeMb: number;
    imageMaxSizeMb: number;
  };
  search: {
    maxResults: number;
    semanticThreshold: number;
    chunkSize: number;
    chunkOverlap: number;
    summaryConcurrency: number;
  };
  docAssist: {
    maxCurrentContentChars: number;
    maxTemplateChars: number;
    maxSummaryFileCount: number;
    maxSummaryFileChars: number;
    maxImagesPerRequest: number;
  };
  crmContractApprovalRoute: DmsCrmContractApprovalRoutePolicy;
  crmContractExportPolicy: DmsCrmContractExportPolicy;
}

export interface DmsPersonalSettingsClient {
  identity: {
    displayName: string;
    email: string;
  };
  workspace: {
    defaultSettingsScope: SettingsScope;
    preferredStorageProvider: 'system-default' | 'local' | 'nas';
  };
  viewer: {
    defaultZoom: number;
  };
  sidebar: {
    sections: {
      bookmarks: boolean;
      openTabs: boolean;
      fileTree: boolean;
      changes: boolean;
    };
  };
  home: {
    lastSeenAt?: string;
  };
}

export interface DmsSettingsConfigClient {
  system?: DmsSystemConfigClient;
  personal: DmsPersonalSettingsClient;
}

export type DeepPartialClient<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartialClient<T[P]> : T[P];
};

export interface SettingsAccessClient {
  mode: SettingsAccessMode;
  profileKey: SettingsProfileKey;
  canManageSystem: boolean;
  canManagePersonal: boolean;
}

export type GitBindingStateClient =
  | 'ready'
  | 'uninitialized'
  | 'reconcile-needed'
  | 'git-unavailable';

export type DmsInstanceEnvClient =
  | 'prod'
  | 'dev'
  | 'local-test';

export type GitBindingSeverityClient =
  | 'ok'
  | 'blocking'
  | 'fatal';

export type GitRootRelationClient =
  | 'exact'
  | 'configured-subdirectory'
  | 'not-inside-repository';

export interface GitParityStatusClient {
  remote: string;
  verified: boolean;
  canTreatLocalAsCanonical: boolean;
  syncStatus?: GitSyncStatusClient;
  reason?: string;
}

export interface SettingsRuntimeGitClient {
  instanceEnv: DmsInstanceEnvClient;
  expectedRemoteUrl?: string;
  appRoot: string;
  configuredRootInput: string;
  configuredRoot: string;
  configuredRootExists: boolean;
  configuredRootRelativeToAppRoot: boolean;
  actualGitRoot?: string;
  rootRelation: GitRootRelationClient;
  rootMismatch: boolean;
  state: GitBindingStateClient;
  reason?: string;
  bindingSeverity: GitBindingSeverityClient;
  bindingReason?: string;
  actualRemoteMatchesExpected: boolean | null;
  gitAvailable: boolean;
  isRepository: boolean;
  hasGitMetadata: boolean;
  visibleEntryCount: number;
  branch?: string;
  remoteName: string;
  remoteUrl?: string;
  syncState: GitSyncStatusClient['state'] | 'unavailable';
  syncStatus?: GitSyncStatusClient;
  parityStatus: GitParityStatusClient;
  bootstrapRemoteUrl?: string;
  bootstrapBranch?: string;
  autoInit: boolean;
  reconcileRequired: boolean;
}

export interface SettingsRuntimePathClient {
  configuredPath: string;
  effectiveInput: string;
  resolvedPath: string;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  writable: boolean;
  required: boolean;
  status: 'ready' | 'blocked' | 'not-required';
  reason?: string;
  relativeToAppRoot: boolean;
  source: 'config' | 'env';
  envVar?: string;
}

export interface SettingsRuntimePathsClient {
  markdownRoot: SettingsRuntimePathClient;
  ingestQueue: SettingsRuntimePathClient;
  storageRoots: {
    local: SettingsRuntimePathClient;
    nas: SettingsRuntimePathClient;
  };
  /** 템플릿 경로 — markdownRoot/_templates 에서 파생 (read-only) */
  templateDir: string;
  template: SettingsRuntimePathClient;
}

export interface DmsRuntimeReadinessCheckClient {
  key: 'database' | 'settings-persistence' | 'git-binding' | 'control-plane' | 'markdown-root' | 'ingest-queue' | 'storage-local' | 'storage-nas' | 'template-root';
  label: string;
  status: 'ready' | 'degraded' | 'blocked';
  reason: string;
}

export interface DmsRuntimeReadinessClient extends LaunchReadinessSnapshot {
  owner: 'dms';
  source: 'dms.settings.live-probe';
  checks: DmsRuntimeReadinessCheckClient[];
}

export interface SettingsRuntimeClient {
  git: SettingsRuntimeGitClient;
  paths: SettingsRuntimePathsClient;
  readiness: DmsRuntimeReadinessClient;
}

export interface SettingsResponse {
  config: DmsSettingsConfigClient;
  docDir: string;
  access: SettingsAccessClient;
  runtime: SettingsRuntimeClient | null;
}

export const settingsApi = {
  getSettings: async (includeRuntime = false): Promise<ApiResponse<SettingsResponse>> => {
    const query = includeRuntime ? '?includeRuntime=1' : '';
    return request<SettingsResponse>(`/api/settings${query}`);
  },

  updateSettings: async (
    config: DeepPartialClient<DmsSettingsConfigClient>
  ): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: { action: 'update', config },
    });
  },
};
