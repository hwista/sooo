import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pmsMasterApi } from '@/lib/api/endpoints/master';
import type {
  CreatePmsMasterImportProfileRequest,
  CreatePlantSiteRequest,
  CreateSystemCatalogRequest,
  CreateSystemInstanceRequest,
  CreateSystemIntegrationRequest,
  ImportProfileFilters,
  ImportPmsMasterRequest,
  MasterFilters,
  RestorePmsMasterImportProfileRequest,
  UpdatePmsMasterImportProfileRequest,
  UpdatePlantSiteRequest,
  UpdateSystemCatalogRequest,
  UpdateSystemInstanceRequest,
  UpdateSystemIntegrationRequest,
} from '@/lib/api/endpoints/master';

export const pmsMasterKeys = {
  all: ['pms-master'] as const,
  summary: () => [...pmsMasterKeys.all, 'summary'] as const,
  sites: (filters?: MasterFilters) => [...pmsMasterKeys.all, 'sites', filters] as const,
  systemCatalogs: (filters?: MasterFilters) => [...pmsMasterKeys.all, 'system-catalogs', filters] as const,
  systemInstances: (filters?: MasterFilters) => [...pmsMasterKeys.all, 'system-instances', filters] as const,
  integrations: (filters?: MasterFilters) => [...pmsMasterKeys.all, 'integrations', filters] as const,
  importProfiles: (filters?: ImportProfileFilters) => [...pmsMasterKeys.all, 'import-profiles', filters] as const,
  importProfileHistory: (profileId?: string) => [...pmsMasterKeys.all, 'import-profile-history', profileId] as const,
};

function useInvalidateMaster() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: pmsMasterKeys.all }),
    invalidateSites: () => {
      queryClient.invalidateQueries({ queryKey: pmsMasterKeys.summary() });
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'sites'] });
    },
    invalidateSystemCatalogs: () => {
      queryClient.invalidateQueries({ queryKey: pmsMasterKeys.summary() });
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'system-catalogs'] });
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'system-instances'] });
    },
    invalidateSystemInstances: () => {
      queryClient.invalidateQueries({ queryKey: pmsMasterKeys.summary() });
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'system-instances'] });
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'integrations'] });
    },
    invalidateIntegrations: () => {
      queryClient.invalidateQueries({ queryKey: pmsMasterKeys.summary() });
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'integrations'] });
    },
  };
}

export function usePmsMasterSummary() {
  return useQuery({
    queryKey: pmsMasterKeys.summary(),
    queryFn: () => pmsMasterApi.summary(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlantSites(filters?: MasterFilters, enabled = true) {
  return useQuery({
    queryKey: pmsMasterKeys.sites(filters),
    queryFn: () => pmsMasterApi.sites(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemCatalogs(filters?: MasterFilters, enabled = true) {
  return useQuery({
    queryKey: pmsMasterKeys.systemCatalogs(filters),
    queryFn: () => pmsMasterApi.systemCatalogs(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemInstances(filters?: MasterFilters, enabled = true) {
  return useQuery({
    queryKey: pmsMasterKeys.systemInstances(filters),
    queryFn: () => pmsMasterApi.systemInstances(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemIntegrations(filters?: MasterFilters, enabled = true) {
  return useQuery({
    queryKey: pmsMasterKeys.integrations(filters),
    queryFn: () => pmsMasterApi.integrations(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePmsMasterImportProfiles(filters?: ImportProfileFilters, enabled = true) {
  return useQuery({
    queryKey: pmsMasterKeys.importProfiles(filters),
    queryFn: () => pmsMasterApi.importProfiles(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePmsMasterImportProfileHistory(profileId?: string, enabled = true) {
  return useQuery({
    queryKey: pmsMasterKeys.importProfileHistory(profileId),
    queryFn: () => pmsMasterApi.importProfileHistory(profileId ?? ''),
    enabled: enabled && Boolean(profileId),
    staleTime: 60 * 1000,
  });
}

export function useCreatePlantSite() {
  const { invalidateSites } = useInvalidateMaster();

  return useMutation({
    mutationFn: (data: CreatePlantSiteRequest) => pmsMasterApi.createSite(data),
    onSuccess: invalidateSites,
  });
}

export function useUpdatePlantSite() {
  const { invalidateSites, invalidateSystemInstances } = useInvalidateMaster();

  return useMutation({
    mutationFn: ({ siteId, data }: { siteId: string; data: UpdatePlantSiteRequest }) =>
      pmsMasterApi.updateSite(siteId, data),
    onSuccess: () => {
      invalidateSites();
      invalidateSystemInstances();
    },
  });
}

export function useDeactivatePlantSite() {
  const { invalidateSites, invalidateSystemInstances } = useInvalidateMaster();

  return useMutation({
    mutationFn: (siteId: string) => pmsMasterApi.deactivateSite(siteId),
    onSuccess: () => {
      invalidateSites();
      invalidateSystemInstances();
    },
  });
}

export function useCreateSystemCatalog() {
  const { invalidateSystemCatalogs } = useInvalidateMaster();

  return useMutation({
    mutationFn: (data: CreateSystemCatalogRequest) => pmsMasterApi.createSystemCatalog(data),
    onSuccess: invalidateSystemCatalogs,
  });
}

export function useUpdateSystemCatalog() {
  const { invalidateSystemCatalogs } = useInvalidateMaster();

  return useMutation({
    mutationFn: ({ systemCatalogId, data }: { systemCatalogId: string; data: UpdateSystemCatalogRequest }) =>
      pmsMasterApi.updateSystemCatalog(systemCatalogId, data),
    onSuccess: invalidateSystemCatalogs,
  });
}

export function useDeactivateSystemCatalog() {
  const { invalidateSystemCatalogs } = useInvalidateMaster();

  return useMutation({
    mutationFn: (systemCatalogId: string) => pmsMasterApi.deactivateSystemCatalog(systemCatalogId),
    onSuccess: invalidateSystemCatalogs,
  });
}

export function useCreateSystemInstance() {
  const { invalidateSystemInstances } = useInvalidateMaster();

  return useMutation({
    mutationFn: (data: CreateSystemInstanceRequest) => pmsMasterApi.createSystemInstance(data),
    onSuccess: invalidateSystemInstances,
  });
}

export function useUpdateSystemInstance() {
  const { invalidateSystemInstances } = useInvalidateMaster();

  return useMutation({
    mutationFn: ({ systemInstanceId, data }: { systemInstanceId: string; data: UpdateSystemInstanceRequest }) =>
      pmsMasterApi.updateSystemInstance(systemInstanceId, data),
    onSuccess: invalidateSystemInstances,
  });
}

export function useDeactivateSystemInstance() {
  const { invalidateSystemInstances } = useInvalidateMaster();

  return useMutation({
    mutationFn: (systemInstanceId: string) => pmsMasterApi.deactivateSystemInstance(systemInstanceId),
    onSuccess: invalidateSystemInstances,
  });
}

export function useCreateSystemIntegration() {
  const { invalidateIntegrations } = useInvalidateMaster();

  return useMutation({
    mutationFn: (data: CreateSystemIntegrationRequest) => pmsMasterApi.createIntegration(data),
    onSuccess: invalidateIntegrations,
  });
}

export function useUpdateSystemIntegration() {
  const { invalidateIntegrations } = useInvalidateMaster();

  return useMutation({
    mutationFn: ({ integrationId, data }: { integrationId: string; data: UpdateSystemIntegrationRequest }) =>
      pmsMasterApi.updateIntegration(integrationId, data),
    onSuccess: invalidateIntegrations,
  });
}

export function useDeactivateSystemIntegration() {
  const { invalidateIntegrations } = useInvalidateMaster();

  return useMutation({
    mutationFn: (integrationId: string) => pmsMasterApi.deactivateIntegration(integrationId),
    onSuccess: invalidateIntegrations,
  });
}

export function useImportPmsMaster() {
  const { invalidateAll } = useInvalidateMaster();

  return useMutation({
    mutationFn: (data: ImportPmsMasterRequest) => pmsMasterApi.importMaster(data),
    onSuccess: (response) => {
      if (response.success && response.data?.applied) {
        invalidateAll();
      }
    },
  });
}

export function useCreatePmsMasterImportProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePmsMasterImportProfileRequest) => pmsMasterApi.createImportProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'import-profiles'] });
    },
  });
}

export function useUpdatePmsMasterImportProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: UpdatePmsMasterImportProfileRequest }) =>
      pmsMasterApi.updateImportProfile(profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'import-profiles'] });
    },
  });
}

export function useRestorePmsMasterImportProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: RestorePmsMasterImportProfileRequest }) =>
      pmsMasterApi.restoreImportProfile(profileId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'import-profiles'] });
      queryClient.invalidateQueries({ queryKey: pmsMasterKeys.importProfileHistory(variables.profileId) });
    },
  });
}

export function useDeactivatePmsMasterImportProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => pmsMasterApi.deactivateImportProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...pmsMasterKeys.all, 'import-profiles'] });
    },
  });
}
