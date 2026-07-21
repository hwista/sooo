import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';
import type {
  CreatePmsMasterImportProfileDto,
  CreatePlantSiteDto,
  CreateSystemCatalogDto,
  CreateSystemInstanceDto,
  CreateSystemIntegrationDto,
  PlantSite,
  PmsMasterImportProfile,
  PmsMasterImportProfileHistory,
  PmsMasterImportProfileEntityType,
  PmsMasterImportRequest,
  PmsMasterImportResponse,
  RestorePmsMasterImportProfileDto,
  PmsMasterSummary,
  SystemCatalog,
  SystemInstance,
  SystemIntegration,
  UpdatePmsMasterImportProfileDto,
  UpdatePlantSiteDto,
  UpdateSystemCatalogDto,
  UpdateSystemInstanceDto,
  UpdateSystemIntegrationDto,
} from '@ssoo/types/pms';

export type CreatePmsMasterImportProfileRequest = CreatePmsMasterImportProfileDto;
export type UpdatePmsMasterImportProfileRequest = UpdatePmsMasterImportProfileDto;
export type RestorePmsMasterImportProfileRequest = RestorePmsMasterImportProfileDto;
export type CreatePlantSiteRequest = CreatePlantSiteDto;
export type UpdatePlantSiteRequest = UpdatePlantSiteDto;
export type CreateSystemCatalogRequest = CreateSystemCatalogDto;
export type UpdateSystemCatalogRequest = UpdateSystemCatalogDto;
export type CreateSystemInstanceRequest = CreateSystemInstanceDto;
export type UpdateSystemInstanceRequest = UpdateSystemInstanceDto;
export type CreateSystemIntegrationRequest = CreateSystemIntegrationDto;
export type UpdateSystemIntegrationRequest = UpdateSystemIntegrationDto;
export type ImportPmsMasterRequest = PmsMasterImportRequest;

export interface MasterFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  siteId?: string;
  systemCatalogId?: string;
  systemInstanceId?: string;
}

export interface ImportProfileFilters {
  entityType?: PmsMasterImportProfileEntityType;
}

interface MasterListApiResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  error?: { message: string };
  message?: string;
}

function toRequestParams(params?: MasterFilters) {
  if (!params) return undefined;

  const { pageSize, ...rest } = params;
  return {
    ...rest,
    ...(pageSize !== undefined && { limit: pageSize }),
  };
}

async function listMasterItems<T>(
  path: string,
  params?: MasterFilters,
): Promise<ApiResponse<PaginatedResponse<T>>> {
  const response = await apiClient.get<MasterListApiResponse<T>>(path, {
    params: toRequestParams(params),
  });

  if (!response.data.success || !response.data.data || !response.data.meta) {
    return {
      success: false,
      data: null,
      message: response.data.error?.message || '요청 처리 중 오류가 발생했습니다.',
    };
  }

  const pageSize = response.data.meta.limit || params?.pageSize || 20;
  const totalPages = pageSize ? Math.ceil(response.data.meta.total / pageSize) : 0;

  return {
    success: true,
    data: {
      items: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.page,
      pageSize,
      totalPages,
    },
    message: '',
  };
}

export const pmsMasterApi = {
  summary: async (): Promise<ApiResponse<PmsMasterSummary>> => {
    const response = await apiClient.get<ApiResponse<PmsMasterSummary>>('/master/summary');
    return response.data;
  },

  sites: async (params?: MasterFilters): Promise<ApiResponse<PaginatedResponse<PlantSite>>> =>
    listMasterItems<PlantSite>('/master/sites', params),

  createSite: async (data: CreatePlantSiteRequest): Promise<ApiResponse<PlantSite>> => {
    const response = await apiClient.post<ApiResponse<PlantSite>>('/master/sites', data);
    return response.data;
  },

  updateSite: async (
    siteId: string,
    data: UpdatePlantSiteRequest,
  ): Promise<ApiResponse<PlantSite>> => {
    const response = await apiClient.put<ApiResponse<PlantSite>>(`/master/sites/${siteId}`, data);
    return response.data;
  },

  deactivateSite: async (siteId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/master/sites/${siteId}`);
    return response.data;
  },

  systemCatalogs: async (
    params?: MasterFilters,
  ): Promise<ApiResponse<PaginatedResponse<SystemCatalog>>> =>
    listMasterItems<SystemCatalog>('/master/system-catalogs', params),

  createSystemCatalog: async (
    data: CreateSystemCatalogRequest,
  ): Promise<ApiResponse<SystemCatalog>> => {
    const response = await apiClient.post<ApiResponse<SystemCatalog>>('/master/system-catalogs', data);
    return response.data;
  },

  updateSystemCatalog: async (
    systemCatalogId: string,
    data: UpdateSystemCatalogRequest,
  ): Promise<ApiResponse<SystemCatalog>> => {
    const response = await apiClient.put<ApiResponse<SystemCatalog>>(
      `/master/system-catalogs/${systemCatalogId}`,
      data,
    );
    return response.data;
  },

  deactivateSystemCatalog: async (systemCatalogId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/master/system-catalogs/${systemCatalogId}`,
    );
    return response.data;
  },

  systemInstances: async (
    params?: MasterFilters,
  ): Promise<ApiResponse<PaginatedResponse<SystemInstance>>> =>
    listMasterItems<SystemInstance>('/master/system-instances', params),

  createSystemInstance: async (
    data: CreateSystemInstanceRequest,
  ): Promise<ApiResponse<SystemInstance>> => {
    const response = await apiClient.post<ApiResponse<SystemInstance>>(
      '/master/system-instances',
      data,
    );
    return response.data;
  },

  updateSystemInstance: async (
    systemInstanceId: string,
    data: UpdateSystemInstanceRequest,
  ): Promise<ApiResponse<SystemInstance>> => {
    const response = await apiClient.put<ApiResponse<SystemInstance>>(
      `/master/system-instances/${systemInstanceId}`,
      data,
    );
    return response.data;
  },

  deactivateSystemInstance: async (systemInstanceId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/master/system-instances/${systemInstanceId}`,
    );
    return response.data;
  },

  integrations: async (
    params?: MasterFilters,
  ): Promise<ApiResponse<PaginatedResponse<SystemIntegration>>> =>
    listMasterItems<SystemIntegration>('/master/integrations', params),

  createIntegration: async (
    data: CreateSystemIntegrationRequest,
  ): Promise<ApiResponse<SystemIntegration>> => {
    const response = await apiClient.post<ApiResponse<SystemIntegration>>(
      '/master/integrations',
      data,
    );
    return response.data;
  },

  updateIntegration: async (
    integrationId: string,
    data: UpdateSystemIntegrationRequest,
  ): Promise<ApiResponse<SystemIntegration>> => {
    const response = await apiClient.put<ApiResponse<SystemIntegration>>(
      `/master/integrations/${integrationId}`,
      data,
    );
    return response.data;
  },

  deactivateIntegration: async (integrationId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/master/integrations/${integrationId}`,
    );
    return response.data;
  },

  importMaster: async (
    data: ImportPmsMasterRequest,
  ): Promise<ApiResponse<PmsMasterImportResponse>> => {
    const response = await apiClient.post<ApiResponse<PmsMasterImportResponse>>('/master/import', data);
    return response.data;
  },

  importProfiles: async (
    params?: ImportProfileFilters,
  ): Promise<ApiResponse<PmsMasterImportProfile[]>> => {
    const response = await apiClient.get<ApiResponse<PmsMasterImportProfile[]>>(
      '/master/import-profiles',
      { params },
    );
    return response.data;
  },

  createImportProfile: async (
    data: CreatePmsMasterImportProfileRequest,
  ): Promise<ApiResponse<PmsMasterImportProfile>> => {
    const response = await apiClient.post<ApiResponse<PmsMasterImportProfile>>(
      '/master/import-profiles',
      data,
    );
    return response.data;
  },

  importProfileHistory: async (
    profileId: string,
  ): Promise<ApiResponse<PmsMasterImportProfileHistory[]>> => {
    const response = await apiClient.get<ApiResponse<PmsMasterImportProfileHistory[]>>(
      `/master/import-profiles/${profileId}/history`,
    );
    return response.data;
  },

  updateImportProfile: async (
    profileId: string,
    data: UpdatePmsMasterImportProfileRequest,
  ): Promise<ApiResponse<PmsMasterImportProfile>> => {
    const response = await apiClient.put<ApiResponse<PmsMasterImportProfile>>(
      `/master/import-profiles/${profileId}`,
      data,
    );
    return response.data;
  },

  restoreImportProfile: async (
    profileId: string,
    data: RestorePmsMasterImportProfileRequest,
  ): Promise<ApiResponse<PmsMasterImportProfile>> => {
    const response = await apiClient.post<ApiResponse<PmsMasterImportProfile>>(
      `/master/import-profiles/${profileId}/restore`,
      data,
    );
    return response.data;
  },

  deactivateImportProfile: async (profileId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/master/import-profiles/${profileId}`,
    );
    return response.data;
  },
};
