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
import { OperationsService } from './operations.service.js';

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
    status: 'proposal',
    priority: 'high',
    version: 1,
    versionCount: 1,
    isLatest: true,
    confirmed: false,
    contractCreated: false,
    expectedStartDate: '2026-03-01',
    expectedEndDate: '2026-08-31',
    quoteStatus: 'review',
    paymentTermCode: 'NET30',
    revenueSubtotal: 500000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 500000000,
    costTotal: 140000000,
    marginTotal: 360000000,
    marginRate: 72,
    revenueLines: [],
    costLines: [],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '운영 기준 검토',
    updatedAt: '2026-07-07T01:00:00.000Z',
    ...seed,
  };
}

function createContract(seed: Partial<CrmContract>): CrmContract {
  return {
    id: 'crm-ct-001',
    code: 'CT-2026-001',
    customerName: 'LS ITC',
    contractName: '운영 기준 검증 계약',
    ownerName: '김민준',
    businessType: 'SI 구축',
    industryLine: '전력/제조',
    region: 'domestic',
    status: 'active',
    confirmed: true,
    contractStartDate: '2026-01-01',
    contractEndDate: '2026-12-31',
    wbsCode: 'WBS-OPS-001',
    paymentTermCode: 'NET30',
    revenueSubtotal: 300000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 300000000,
    costTotal: 130000000,
    externalCostTotal: 80000000,
    marginTotal: 170000000,
    marginRate: 56.67,
    revenueLines: [],
    costLines: [],
    billingPlan: [
      { id: 'bp-1', billingYm: '2026/01', revenueAmount: 300000000, externalCostAmount: 80000000 },
      { id: 'bp-2', billingYm: '2027/01', revenueAmount: 100000000, externalCostAmount: 20000000 },
    ],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '공용 Admin 경계 검토',
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
      unimplementedIntegrations: [],
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
      unimplementedIntegrations: [],
      activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
    },
    items,
  };
}

function createService(params?: { sellerProfile?: CrmQuoteSellerProfile }) {
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
    listResponse: async () => createOpportunityResponse([
      createOpportunity({}),
      createOpportunity({ id: 'crm-opp-002', businessType: 'SM 운영', industryLine: '공공', region: 'overseas', expectedStartDate: '2027-04-01', paymentTermCode: 'MILESTONE' }),
    ]),
  };
  const contractService: Pick<ContractService, 'listResponse'> = {
    listResponse: async () => createContractResponse([
      createContract({}),
      createContract({ id: 'crm-ct-002', code: 'CT-2027-002', businessType: 'SM 운영', industryLine: '공공', region: 'overseas', status: 'review', confirmed: false, contractStartDate: '2027-02-01', paymentTermCode: 'MILESTONE', billingPlan: [] }),
    ]),
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

  return new OperationsService(
    opportunityService as OpportunityService,
    contractService as ContractService,
    quoteSettingsService as QuoteSettingsService,
  );
}

describe('OperationsService', () => {
  it('builds a CRM operations preview without cloning shared admin features into CRM', async () => {
    const service = createService();

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.selectedYear).toBe(2026);
    expect(result.summary.codeGroupCount).toBe(6);
    expect(result.sellerProfile.readiness).toBe('ready');
    expect(result.codeGroups.find((group) => group.key === 'business-type')?.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SI 구축', usageCount: 2 }),
      expect.objectContaining({ code: 'SM 운영', usageCount: 2 }),
    ]));
    expect(result.codeGroups.find((group) => group.key === 'payment-term')?.readiness).toBe('partial');
    expect(result.businessYears.map((item) => item.year)).toEqual([2026, 2027]);
    expect(result.businessYears.find((item) => item.year === 2026)).toMatchObject({
      selected: true,
      opportunityCount: 1,
      contractCount: 1,
      billingPlanCount: 1,
    });
    expect(result.adminBoundaries).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'account-management', owner: 'shared-admin', crmActionAvailable: false }),
      expect.objectContaining({ key: 'password-reset', owner: 'shared-auth', crmActionAvailable: false }),
      expect.objectContaining({ key: 'ci-file-storage', owner: 'dms', crmActionAvailable: false }),
    ]));
  });

  it('marks seller profile as partial when DMS CI or required document fields are not ready', async () => {
    const service = createService({
      sellerProfile: {
        id: 'seller-1',
        profileCode: 'default',
        companyName: 'SSOO 주식회사',
        ciStatus: 'dms-planned',
        updatedAt: '2026-07-07T00:00:00.000Z',
      },
    });

    const result = await service.getPreview();

    expect(result.sellerProfile.sellerInfoStatus).toBe('dms-ci-planned');
    expect(result.sellerProfile.readiness).toBe('partial');
    expect(result.sellerProfile.missingFields).toEqual(['ceoName', 'businessRegistrationNo', 'address']);
  });
});
