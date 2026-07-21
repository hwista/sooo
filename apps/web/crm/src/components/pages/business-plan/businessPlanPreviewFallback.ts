import type { CrmBusinessPlanPreviewResponse } from '@ssoo/types/crm';

const currentYear = new Date().getFullYear();

export const businessPlanPreviewFallback: CrmBusinessPlanPreviewResponse = {
  summary: {
    baseYear: currentYear,
    yearCount: 3,
    rowCount: 0,
    pipelineAmountTotal: 0,
    contractPlanAmountTotal: 0,
    contractActualAmountTotal: 0,
    planCandidateAmountTotal: 0,
    actualGapAmountTotal: 0,
    activeFilters: {
      baseYear: currentYear,
      businessType: '',
      industryLine: '',
      region: 'all',
      search: '',
    },
    businessTypeOptions: [],
    industryLineOptions: [],
    sourceTypes: ['pipeline', 'contract-plan', 'contract-actual'],
    boundaryNotice: 'CRM 사업계획 preview는 영업기회 pipeline과 확정 계약 청구계획/실적을 조합한 계획 후보입니다.',
    unavailableActions: [
      '내부원가/AMS 원가 저장',
    ],
  },
  years: Array.from({ length: 3 }, (_, index) => ({
    year: currentYear + index,
    pipelineAmount: 0,
    contractPlanAmount: 0,
    contractActualAmount: 0,
    planCandidateAmount: 0,
    actualGapAmount: 0,
  })),
  rows: [],
};
