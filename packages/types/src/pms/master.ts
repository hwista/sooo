export interface PmsMasterSummary {
  sites: number;
  systemCatalogs: number;
  systemInstances: number;
  integrations: number;
}

export interface PlantSite {
  siteId: string;
  customerId?: string | null;
  customerName?: string | null;
  siteCode: string;
  siteName: string;
  siteTypeCode?: string | null;
  regionCode?: string | null;
  address?: string | null;
  timezone?: string | null;
  operationOwnerName?: string | null;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlantSiteDto {
  siteCode: string;
  siteName: string;
  customerId?: string | null;
  siteTypeCode?: string | null;
  regionCode?: string | null;
  address?: string | null;
  timezone?: string | null;
  operationOwnerName?: string | null;
  memo?: string | null;
}

export interface UpdatePlantSiteDto {
  customerId?: string | null;
  siteName?: string;
  siteTypeCode?: string | null;
  regionCode?: string | null;
  address?: string | null;
  timezone?: string | null;
  operationOwnerName?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

export interface SystemCatalog {
  systemCatalogId: string;
  parentSystemCatalogId?: string | null;
  catalogCode: string;
  catalogName: string;
  categoryCode?: string | null;
  vendorName?: string | null;
  description?: string | null;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemCatalogDto {
  catalogCode: string;
  catalogName: string;
  parentSystemCatalogId?: string | null;
  categoryCode?: string | null;
  vendorName?: string | null;
  description?: string | null;
  memo?: string | null;
}

export interface UpdateSystemCatalogDto {
  parentSystemCatalogId?: string | null;
  catalogName?: string;
  categoryCode?: string | null;
  vendorName?: string | null;
  description?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

export interface SystemInstance {
  systemInstanceId: string;
  customerId?: string | null;
  customerName?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  systemCatalogId?: string | null;
  catalogName?: string | null;
  instanceCode: string;
  instanceName: string;
  environmentCode?: string | null;
  operationOwnerTypeCode?: string | null;
  operationOwnerName?: string | null;
  lifecycleStatusCode: string;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemInstanceDto {
  instanceCode: string;
  instanceName: string;
  customerId?: string | null;
  siteId?: string | null;
  systemCatalogId?: string | null;
  environmentCode?: string | null;
  operationOwnerTypeCode?: string | null;
  operationOwnerName?: string | null;
  lifecycleStatusCode?: string | null;
  memo?: string | null;
}

export interface UpdateSystemInstanceDto {
  customerId?: string | null;
  siteId?: string | null;
  systemCatalogId?: string | null;
  instanceName?: string;
  environmentCode?: string | null;
  operationOwnerTypeCode?: string | null;
  operationOwnerName?: string | null;
  lifecycleStatusCode?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

export interface SystemIntegration {
  integrationId: string;
  integrationCode: string;
  integrationName: string;
  sourceSystemInstanceId: string;
  sourceSystemInstanceName?: string | null;
  targetSystemInstanceId: string;
  targetSystemInstanceName?: string | null;
  directionCode?: string | null;
  interfaceTypeCode?: string | null;
  statusCode: string;
  description?: string | null;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemIntegrationDto {
  integrationCode: string;
  integrationName: string;
  sourceSystemInstanceId: string;
  targetSystemInstanceId: string;
  directionCode?: string | null;
  interfaceTypeCode?: string | null;
  statusCode?: string | null;
  description?: string | null;
  memo?: string | null;
}

export interface UpdateSystemIntegrationDto {
  integrationName?: string;
  sourceSystemInstanceId?: string | null;
  targetSystemInstanceId?: string | null;
  directionCode?: string | null;
  interfaceTypeCode?: string | null;
  statusCode?: string | null;
  description?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

export type PmsMasterImportMode = 'preview' | 'apply';
export type PmsMasterImportEntityType = 'site' | 'systemCatalog' | 'systemInstance' | 'integration';
export type PmsMasterImportRowStatus = 'create' | 'update' | 'skip' | 'error';
export type PmsMasterImportProfileEntityType = 'sites' | 'systemCatalogs' | 'systemInstances' | 'integrations';

export interface PmsMasterImportProfile {
  profileId: string;
  entityType: PmsMasterImportProfileEntityType;
  profileName: string;
  columnMapping: Record<string, string>;
  isDefault: boolean;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PmsMasterImportProfileHistoryEventType = 'C' | 'U' | 'D';

export interface PmsMasterImportProfileHistory {
  profileId: string;
  historySeq: string;
  eventType: PmsMasterImportProfileHistoryEventType;
  eventAt: string;
  entityType: PmsMasterImportProfileEntityType;
  profileName: string;
  columnMapping: Record<string, string>;
  isDefault: boolean;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePmsMasterImportProfileDto {
  entityType: PmsMasterImportProfileEntityType;
  profileName: string;
  columnMapping: Record<string, string>;
  isDefault?: boolean;
  memo?: string | null;
}

export interface UpdatePmsMasterImportProfileDto {
  profileName?: string;
  columnMapping?: Record<string, string>;
  isDefault?: boolean;
  memo?: string | null;
}

export interface RestorePmsMasterImportProfileDto {
  historySeq: string;
}

export interface PmsMasterImportOptions {
  updateExisting?: boolean;
  reactivateExisting?: boolean;
}

export interface ImportPlantSiteDto extends CreatePlantSiteDto {
  customerCode?: string | null;
  isActive?: boolean;
}

export interface ImportSystemCatalogDto extends CreateSystemCatalogDto {
  parentCatalogCode?: string | null;
  isActive?: boolean;
}

export interface ImportSystemInstanceDto extends CreateSystemInstanceDto {
  customerCode?: string | null;
  siteCode?: string | null;
  systemCatalogCode?: string | null;
  isActive?: boolean;
}

export interface ImportSystemIntegrationDto {
  integrationCode: string;
  integrationName: string;
  sourceSystemInstanceId?: string | null;
  sourceSystemInstanceCode?: string | null;
  targetSystemInstanceId?: string | null;
  targetSystemInstanceCode?: string | null;
  directionCode?: string | null;
  interfaceTypeCode?: string | null;
  statusCode?: string | null;
  description?: string | null;
  isActive?: boolean;
  memo?: string | null;
}

export interface PmsMasterImportRequest {
  mode?: PmsMasterImportMode;
  options?: PmsMasterImportOptions;
  sites?: ImportPlantSiteDto[];
  systemCatalogs?: ImportSystemCatalogDto[];
  systemInstances?: ImportSystemInstanceDto[];
  integrations?: ImportSystemIntegrationDto[];
}

export interface PmsMasterImportRowResult {
  entityType: PmsMasterImportEntityType;
  index: number;
  code: string;
  name?: string | null;
  status: PmsMasterImportRowStatus;
  message: string;
}

export interface PmsMasterImportSummary {
  total: number;
  create: number;
  update: number;
  skip: number;
  error: number;
}

export interface PmsMasterImportResponse {
  mode: PmsMasterImportMode;
  applied: boolean;
  summary: PmsMasterImportSummary;
  rows: PmsMasterImportRowResult[];
}
