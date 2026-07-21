import type { CrmCustomerListResponse } from '@ssoo/types/crm';

export const customerFallback: CrmCustomerListResponse = {
  summary: {
    totalCount: 0,
    filteredCount: 0,
    prospectCount: 0,
    activeCount: 0,
    partnerCount: 0,
    inactiveCount: 0,
    activityBackfillCount: 0,
    activeFilters: { search: '', type: 'all', sort: 'updated-desc' },
  },
  items: [],
};
