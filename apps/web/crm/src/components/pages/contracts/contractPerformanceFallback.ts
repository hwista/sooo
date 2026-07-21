import type { CrmContractPerformanceResponse } from '@ssoo/types/crm';

const currentYear = new Date().getFullYear();

export const contractPerformanceFallback: CrmContractPerformanceResponse = {
  summary: {
    year: currentYear,
    contractCount: 0,
    planRevenueTotal: 0,
    planExternalCostTotal: 0,
    planMarginTotal: 0,
    actualRevenueTotal: 0,
    actualExternalCostTotal: 0,
    actualMarginTotal: 0,
    revenueDelta: 0,
    externalCostDelta: 0,
    marginDelta: 0,
    revenueAchievementRate: 0,
    externalCostAchievementRate: 0,
    activeFilters: {
      year: currentYear,
      businessType: '',
      industryLine: '',
      region: 'all',
      search: '',
    },
    businessTypeOptions: [],
    industryLineOptions: [],
    boundaryNotice: 'CRM은 계약/청구 원장과 계약 금액 기준값을 소유하고 PMS는 수행 스냅샷만 소비합니다.',
  },
  items: [],
};
