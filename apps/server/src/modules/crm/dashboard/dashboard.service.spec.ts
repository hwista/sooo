import type {
  CrmContract,
  CrmContractListResponse,
  CrmOpportunity,
  CrmOpportunityListResponse,
  CrmQuoteSellerProfile,
} from '@ssoo/types/crm';
import type { ContractService } from '../contract/contract.service.js';
import type { OpportunityService } from '../opportunity/opportunity.service.js';
import type { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { DashboardService } from './dashboard.service.js';

function createOpportunity(seed: Partial<CrmOpportunity>): CrmOpportunity {
  return {
    id: 'crm-opp-001',
    groupId: 'crm-opp-001',
    customerName: 'LS Electric',
    opportunityName: '스마트 배전반 통합 관제',
    ownerName: '김민준',
    businessType: 'SI 구축',
    industryLine: '전력/제조',
    region: 'domestic',
    status: 'won',
    priority: 'high',
    version: 1,
    versionCount: 1,
    isLatest: true,
    confirmed: true,
    contractCreated: false,
    expectedStartDate: '2026-08-01',
    expectedEndDate: '2026-12-31',
    quoteStatus: 'approved',
    revenueSubtotal: 820000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 820000000,
    costTotal: 560000000,
    marginTotal: 260000000,
    marginRate: 31.7,
    revenueLines: [],
    costLines: [],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '계약 전환 조건 검토',
    updatedAt: '2026-07-07T01:00:00.000Z',
    ...seed,
  };
}

function createContract(seed: Partial<CrmContract>): CrmContract {
  return {
    id: 'crm-ct-001',
    code: 'crm-ct-001',
    customerName: 'LS ITC',
    contractName: 'PMS/DMS readiness 검증 계약',
    ownerName: '이현우',
    businessType: '업무 시스템',
    industryLine: '설비/정비',
    region: 'domestic',
    status: 'active',
    confirmed: true,
    contractStartDate: '2026-09-01',
    contractEndDate: '2026-10-31',
    wbsCode: 'WBS-CRM-001',
    paymentTermCode: 'NET30',
    revenueSubtotal: 200000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 200000000,
    costTotal: 60000000,
    externalCostTotal: 60000000,
    marginTotal: 140000000,
    marginRate: 70,
    revenueLines: [],
    costLines: [],
    billingPlan: [
      { id: '1', billingYm: '2026/09', revenueAmount: 100000000, externalCostAmount: 30000000 },
      { id: '2', billingYm: '2026/10', revenueAmount: 100000000, externalCostAmount: 30000000 },
    ],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: 'PMS 인계와 DMS 문서 패킷 확인',
    updatedAt: '2026-07-07T02:00:00.000Z',
    ...seed,
  };
}

function createOpportunityResponse(items: CrmOpportunity[]): CrmOpportunityListResponse {
  const totalRevenue = items.reduce((sum, item) => sum + item.revenueTotal, 0);
  const totalCost = items.reduce((sum, item) => sum + item.costTotal, 0);
  return {
    summary: {
      totalCount: items.length,
      filteredCount: items.length,
      qualifiedCount: items.filter((item) => item.status === 'qualified').length,
      proposalCount: items.filter((item) => item.status === 'proposal').length,
      wonCount: items.filter((item) => item.status === 'won').length,
      totalRevenue,
      totalCost,
      totalMargin: totalRevenue - totalCost,
      grossMarginRate: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : 0,
      boundaryNotice: 'CRM opportunity boundary',
      unimplementedIntegrations: ['견적 생성', 'DMS 연결'],
      activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
    },
    items,
  };
}

function createContractResponse(items: CrmContract[]): CrmContractListResponse {
  const totalRevenue = items.reduce((sum, item) => sum + item.revenueTotal, 0);
  const totalCost = items.reduce((sum, item) => sum + item.costTotal, 0);
  return {
    summary: {
      totalCount: items.length,
      filteredCount: items.length,
      reviewCount: items.filter((item) => item.status === 'review').length,
      activeCount: items.filter((item) => item.status === 'active').length,
      completedCount: items.filter((item) => item.status === 'completed').length,
      totalRevenue,
      totalCost,
      totalExternalCost: items.reduce((sum, item) => sum + item.externalCostTotal, 0),
      totalMargin: totalRevenue - totalCost,
      grossMarginRate: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100 : 0,
      boundaryNotice: 'CRM contract boundary',
      unimplementedIntegrations: ['DMS 계약서 저장', 'PMS 프로젝트 생성'],
      activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
    },
    items,
  };
}

function createService(params?: {
  opportunities?: CrmOpportunity[];
  contracts?: CrmContract[];
  sellerProfile?: CrmQuoteSellerProfile;
}) {
  const opportunities = params?.opportunities ?? [createOpportunity({})];
  const contracts = params?.contracts ?? [createContract({})];
  const sellerProfile = params?.sellerProfile ?? {
    id: 'seller-1',
    profileCode: 'default',
    companyName: 'SSOO 주식회사',
    ceoName: '홍길동',
    businessRegistrationNo: '123-45-67890',
    address: '서울특별시 중구 세종대로 1',
    ciStatus: 'configured',
    updatedAt: '2026-07-07T00:00:00.000Z',
  };
  const opportunityService: Pick<OpportunityService, 'listResponse'> = {
    listResponse: async () => createOpportunityResponse(opportunities),
  };
  const contractService: Pick<ContractService, 'listResponse'> = {
    listResponse: async () => createContractResponse(contracts),
  };
  const quoteSettingsService: Pick<QuoteSettingsService, 'getSellerProfile' | 'toSellerInfoStatus'> = {
    getSellerProfile: async () => sellerProfile,
    toSellerInfoStatus: (profile) => {
      if (!profile || profile.ciStatus === 'not-configured') {
        return 'not-configured';
      }
      if (profile.ciStatus === 'dms-planned') {
        return 'dms-ci-planned';
      }
      return 'configured';
    },
  };

  return new DashboardService(
    opportunityService as OpportunityService,
    contractService as ContractService,
    quoteSettingsService as QuoteSettingsService,
  );
}

describe('DashboardService', () => {
  it('combines opportunity, contract, PMS, and DMS readiness into a CRM home summary', async () => {
    const service = createService();

    const result = await service.getDashboard();

    expect(result.opportunitySummary.totalCount).toBe(1);
    expect(result.contractSummary.totalCount).toBe(1);
    expect(result.pipeline.find((stage) => stage.status === 'won')).toMatchObject({
      count: 1,
      revenueTotal: 820000000,
    });
    expect(result.queues).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'quote', readyCount: 1, blockedCount: 0 }),
      expect.objectContaining({ key: 'contract-conversion', readyCount: 1, blockedCount: 0 }),
      expect.objectContaining({ key: 'pms-handoff', readyCount: 1, blockedCount: 0 }),
      expect.objectContaining({ key: 'dms-document', readyCount: 1, blockedCount: 0 }),
    ]));
    expect(result.nextActions[0]).toMatchObject({
      kind: 'contract',
      title: 'PMS/DMS readiness 검증 계약',
    });
    expect(result.unimplementedIntegrations).toEqual(['견적 생성', 'DMS 연결', 'DMS 계약서 저장', 'PMS 프로젝트 생성']);
  });

  it('keeps DMS document packets blocked when seller legal information is incomplete', async () => {
    const service = createService({
      sellerProfile: {
        id: 'seller-1',
        profileCode: 'default',
        companyName: 'SSOO 영업팀',
        ciStatus: 'dms-planned',
        updatedAt: '2026-07-07T00:00:00.000Z',
      },
    });

    const result = await service.getDashboard();
    const dmsQueue = result.queues.find((queue) => queue.key === 'dms-document');

    expect(result.sellerInfoStatus).toBe('dms-ci-planned');
    expect(dmsQueue).toMatchObject({
      readyCount: 0,
      blockedCount: 1,
      state: 'blocked',
    });
  });
});
