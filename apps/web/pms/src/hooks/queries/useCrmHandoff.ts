'use client';

import { useQuery } from '@tanstack/react-query';
import { crmHandoffApi } from '@/lib/api';
import type {
  CrmContractHandoffCandidateFilters,
  CrmContractPmsHandoffCandidate,
} from '@/lib/api/endpoints/crmHandoff';
import type { ApiResponse } from '@/lib/api/types';
import type { CrmContractPmsHandoffPreview } from '@ssoo/types/crm';

export const crmHandoffKeys = {
  all: ['crm-handoff'] as const,
  candidates: (filters?: CrmContractHandoffCandidateFilters) =>
    [...crmHandoffKeys.all, 'candidates', filters] as const,
  preview: (contractId?: string) =>
    [...crmHandoffKeys.all, 'preview', contractId] as const,
};

export function useCrmContractHandoffCandidates(
  filters?: CrmContractHandoffCandidateFilters,
) {
  return useQuery<ApiResponse<CrmContractPmsHandoffCandidate[]>, Error>({
    queryKey: crmHandoffKeys.candidates(filters),
    queryFn: () => crmHandoffApi.listCandidates(filters),
    staleTime: 60 * 1000,
  });
}

export function useCrmContractPmsHandoffPreview(contractId?: string) {
  return useQuery<ApiResponse<CrmContractPmsHandoffPreview>, Error>({
    queryKey: crmHandoffKeys.preview(contractId),
    queryFn: () => crmHandoffApi.getPreview(contractId!),
    enabled: Boolean(contractId),
    staleTime: 30 * 1000,
  });
}
