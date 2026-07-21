import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pmsTemplatesApi } from '@/lib/api/endpoints/templates';
import type {
  TemplateGroupApprovalStatusCode,
  UpsertCloseConditionTemplateGroupRequest,
  UpsertDeliverableTemplateGroupRequest,
} from '@/lib/api/endpoints/templates';

export const pmsTemplateKeys = {
  all: ['pms-template-groups'] as const,
  deliverables: () => [...pmsTemplateKeys.all, 'deliverables'] as const,
  deliverableHistory: (groupCode?: string) => [...pmsTemplateKeys.deliverables(), 'history', groupCode] as const,
  closeConditions: () => [...pmsTemplateKeys.all, 'close-conditions'] as const,
  closeConditionHistory: (groupCode?: string) => [...pmsTemplateKeys.closeConditions(), 'history', groupCode] as const,
};

function useInvalidatePmsTemplates() {
  const queryClient = useQueryClient();

  return {
    invalidateDeliverables: (groupCode?: string) => {
      queryClient.invalidateQueries({ queryKey: pmsTemplateKeys.deliverables() });
      if (groupCode) {
        queryClient.invalidateQueries({ queryKey: pmsTemplateKeys.deliverableHistory(groupCode) });
      }
    },
    invalidateCloseConditions: (groupCode?: string) => {
      queryClient.invalidateQueries({ queryKey: pmsTemplateKeys.closeConditions() });
      if (groupCode) {
        queryClient.invalidateQueries({ queryKey: pmsTemplateKeys.closeConditionHistory(groupCode) });
      }
    },
  };
}

export function usePmsDeliverableTemplateGroups() {
  return useQuery({
    queryKey: pmsTemplateKeys.deliverables(),
    queryFn: () => pmsTemplatesApi.deliverableGroups(),
    staleTime: 60 * 1000,
  });
}

export function usePmsDeliverableTemplateGroupHistory(groupCode?: string, enabled = true) {
  return useQuery({
    queryKey: pmsTemplateKeys.deliverableHistory(groupCode),
    queryFn: () => pmsTemplatesApi.deliverableGroupHistory(groupCode ?? ''),
    enabled: enabled && Boolean(groupCode),
    staleTime: 30 * 1000,
  });
}

export function useSavePmsDeliverableTemplateGroup() {
  const { invalidateDeliverables } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: (data: UpsertDeliverableTemplateGroupRequest) => pmsTemplatesApi.saveDeliverableGroup(data),
    onSuccess: (_response, variables) => invalidateDeliverables(variables.groupCode),
  });
}

export function useUpdatePmsDeliverableTemplateGroupApproval() {
  const { invalidateDeliverables } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: ({
      groupCode,
      approvalStatusCode,
    }: {
      groupCode: string;
      approvalStatusCode: TemplateGroupApprovalStatusCode;
    }) => pmsTemplatesApi.updateDeliverableApproval(groupCode, { approvalStatusCode }),
    onSuccess: (_response, variables) => invalidateDeliverables(variables.groupCode),
  });
}

export function useRestorePmsDeliverableTemplateGroup() {
  const { invalidateDeliverables } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: ({ groupCode, historySeq }: { groupCode: string; historySeq: string }) =>
      pmsTemplatesApi.restoreDeliverableGroup(groupCode, historySeq),
    onSuccess: (_response, variables) => invalidateDeliverables(variables.groupCode),
  });
}

export function useDeactivatePmsDeliverableTemplateGroup() {
  const { invalidateDeliverables } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: (groupCode: string) => pmsTemplatesApi.deactivateDeliverableGroup(groupCode),
    onSuccess: (_response, groupCode) => invalidateDeliverables(groupCode),
  });
}

export function usePmsCloseConditionTemplateGroups() {
  return useQuery({
    queryKey: pmsTemplateKeys.closeConditions(),
    queryFn: () => pmsTemplatesApi.closeConditionGroups(),
    staleTime: 60 * 1000,
  });
}

export function usePmsCloseConditionTemplateGroupHistory(groupCode?: string, enabled = true) {
  return useQuery({
    queryKey: pmsTemplateKeys.closeConditionHistory(groupCode),
    queryFn: () => pmsTemplatesApi.closeConditionGroupHistory(groupCode ?? ''),
    enabled: enabled && Boolean(groupCode),
    staleTime: 30 * 1000,
  });
}

export function useSavePmsCloseConditionTemplateGroup() {
  const { invalidateCloseConditions } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: (data: UpsertCloseConditionTemplateGroupRequest) => pmsTemplatesApi.saveCloseConditionGroup(data),
    onSuccess: (_response, variables) => invalidateCloseConditions(variables.groupCode),
  });
}

export function useUpdatePmsCloseConditionTemplateGroupApproval() {
  const { invalidateCloseConditions } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: ({
      groupCode,
      approvalStatusCode,
    }: {
      groupCode: string;
      approvalStatusCode: TemplateGroupApprovalStatusCode;
    }) => pmsTemplatesApi.updateCloseConditionApproval(groupCode, { approvalStatusCode }),
    onSuccess: (_response, variables) => invalidateCloseConditions(variables.groupCode),
  });
}

export function useRestorePmsCloseConditionTemplateGroup() {
  const { invalidateCloseConditions } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: ({ groupCode, historySeq }: { groupCode: string; historySeq: string }) =>
      pmsTemplatesApi.restoreCloseConditionGroup(groupCode, historySeq),
    onSuccess: (_response, variables) => invalidateCloseConditions(variables.groupCode),
  });
}

export function useDeactivatePmsCloseConditionTemplateGroup() {
  const { invalidateCloseConditions } = useInvalidatePmsTemplates();

  return useMutation({
    mutationFn: (groupCode: string) => pmsTemplatesApi.deactivateCloseConditionGroup(groupCode),
    onSuccess: (_response, groupCode) => invalidateCloseConditions(groupCode),
  });
}
