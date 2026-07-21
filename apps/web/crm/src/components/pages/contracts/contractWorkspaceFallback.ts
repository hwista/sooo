import type { CrmContractListResponse } from '@ssoo/types/crm';

export const contractFallback: CrmContractListResponse = {
  summary: {
    totalCount: 0,
    filteredCount: 0,
    reviewCount: 0,
    activeCount: 0,
    completedCount: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalExternalCost: 0,
    totalMargin: 0,
    grossMarginRate: 0,
    boundaryNotice: 'CRM은 계약/청구 원장과 계약 금액 기준값을 소유하고 PMS는 수행 스냅샷만 소비합니다.',
    unimplementedIntegrations: ['DMS 계약서 저장', 'PMS 프로젝트 생성'],
    activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
  },
  items: [],
};
