import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type {
  CrmContract,
  CrmContractListResponse,
  CrmContractPmsHandoffPreview,
  CrmContractPmsHandoffReadiness,
  CrmContractStatus,
} from '@ssoo/types/crm';

export interface CrmContractHandoffCandidateFilters {
  search?: string;
  status?: CrmContractStatus | 'all';
  readyOnly?: boolean;
}

export interface CrmContractPmsHandoffCandidate {
  contractId: string;
  contractCode: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  status: CrmContractStatus;
  confirmed: boolean;
  readiness: CrmContractPmsHandoffReadiness;
  blockedReasons: string[];
  wbsCode?: string;
  contractStartDate: string;
  contractEndDate: string;
  revenueTotal: number;
  externalCostTotal: number;
  marginRate: number;
  billingPlanCount: number;
  pmsHandoffStatus: CrmContract['pmsHandoffStatus'];
  updatedAt: string;
}

function buildCandidate(contract: CrmContract): CrmContractPmsHandoffCandidate {
  const billingRevenueTotal = contract.billingPlan.reduce(
    (sum, line) => sum + line.revenueAmount,
    0,
  );
  const billingExternalCostTotal = contract.billingPlan.reduce(
    (sum, line) => sum + line.externalCostAmount,
    0,
  );
  const blockedReasons = [
    ...(!contract.confirmed ? ['계약 확정 전'] : []),
    ...(!contract.wbsCode ? ['WBS 미지정'] : []),
    ...(contract.billingPlan.length === 0 ? ['청구계획 없음'] : []),
    ...(billingRevenueTotal !== contract.revenueTotal ? ['청구계획 매출 합계 불일치'] : []),
    ...(billingExternalCostTotal !== contract.externalCostTotal ? ['청구계획 외부원가 합계 불일치'] : []),
  ];

  return {
    contractId: contract.id,
    contractCode: contract.code,
    customerName: contract.customerName,
    contractName: contract.contractName,
    ownerName: contract.ownerName,
    status: contract.status,
    confirmed: contract.confirmed,
    readiness: blockedReasons.length === 0 ? 'ready' : 'blocked',
    blockedReasons,
    wbsCode: contract.wbsCode,
    contractStartDate: contract.contractStartDate,
    contractEndDate: contract.contractEndDate,
    revenueTotal: contract.revenueTotal,
    externalCostTotal: contract.externalCostTotal,
    marginRate: contract.marginRate,
    billingPlanCount: contract.billingPlan.length,
    pmsHandoffStatus: contract.pmsHandoffStatus,
    updatedAt: contract.updatedAt,
  };
}

export const crmHandoffApi = {
  listCandidates: async (
    filters?: CrmContractHandoffCandidateFilters,
  ): Promise<ApiResponse<CrmContractPmsHandoffCandidate[]>> => {
    const response = await apiClient.get<ApiResponse<CrmContractListResponse>>('/crm/contracts', {
      params: {
        search: filters?.search?.trim() || undefined,
        status: filters?.status ?? 'all',
        sort: 'updated-desc',
      },
    });

    if (!response.data.success || !response.data.data) {
      return {
        success: false,
        data: null,
        message: response.data.message || 'CRM 계약 후보를 불러오지 못했습니다.',
      };
    }

    const candidates = response.data.data.items
      .map(buildCandidate)
      .filter((candidate) => !filters?.readyOnly || candidate.readiness === 'ready');

    return {
      success: true,
      data: candidates,
      message: response.data.message || '',
    };
  },

  getPreview: async (
    contractId: string,
  ): Promise<ApiResponse<CrmContractPmsHandoffPreview>> => {
    const response = await apiClient.get<ApiResponse<CrmContractPmsHandoffPreview>>(
      `/crm/contracts/${encodeURIComponent(contractId)}/pms-handoff-preview`,
    );
    return response.data;
  },
};
