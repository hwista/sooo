import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api/endpoints/customers';
import type { CustomerFilters } from '@/lib/api/endpoints/customers';

// ============================================
// Query Keys
// ============================================

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// ============================================
// Queries
// ============================================

export function useCustomerList(filters?: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => customersApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
}
