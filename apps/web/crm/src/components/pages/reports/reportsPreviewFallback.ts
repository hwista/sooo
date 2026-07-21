import type { CrmReportsPreviewResponse } from '@ssoo/types/crm';

const currentYear = new Date().getFullYear();

export const reportsPreviewFallback: CrmReportsPreviewResponse = {
  summary: {
    year: currentYear,
    opportunityCount: 0,
    contractCount: 0,
    pipelineRevenueTotal: 0,
    pipelineMarginTotal: 0,
    planRevenueTotal: 0,
    planMarginTotal: 0,
    actualRevenueTotal: 0,
    actualMarginTotal: 0,
    revenueDelta: 0,
    marginDelta: 0,
    revenueAchievementRate: 0,
    marginAchievementRate: 0,
    activeFilters: {
      year: currentYear,
      businessType: '',
      industryLine: '',
      region: 'all',
      search: '',
    },
    businessTypeOptions: [],
    industryLineOptions: [],
    boundaryNotice: 'CRM 보고 Preview는 영업기회 pipeline과 확정 계약 청구계획/실적 read model을 집계합니다.',
    unavailableActions: ['회계 전표 생성', 'PMS 수행 KPI 편집', 'DMS 문서 저장 확정', '사업계획 원장 확정'],
    latestConfirmation: null,
  },
  monthlyTrend: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    planRevenueAmount: 0,
    planExternalCostAmount: 0,
    planMarginAmount: 0,
    actualRevenueAmount: 0,
    actualExternalCostAmount: 0,
    actualMarginAmount: 0,
    revenueDelta: 0,
    marginDelta: 0,
    revenueAchievementRate: 0,
  })),
  breakdowns: [],
  attentionItems: [],
};
