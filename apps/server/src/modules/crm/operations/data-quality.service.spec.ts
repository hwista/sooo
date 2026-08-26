import type { DatabaseService } from '../../../database/database.service.js';
import { CrmDataQualityService } from './data-quality.service.js';

function createService(options?: { violations?: boolean }) {
  const db = {
    client: {
      crmOpportunity: {
        findMany: async () => options?.violations
          ? [
            { opportunityCode: 'OP-1-V1', opportunityGroupCode: 'OP-1', versionNo: 1 },
            { opportunityCode: 'OP-1-V3', opportunityGroupCode: 'OP-1', versionNo: 3 },
          ]
          : [{ opportunityCode: 'OP-1-V1', opportunityGroupCode: 'OP-1', versionNo: 1 }],
      },
      crmContract: {
        findMany: async () => [{
          contractCode: 'CT-1',
          confirmed: options?.violations === true,
          wbsCode: options?.violations ? null : 'WBS-1',
          revenueTotal: 100n,
          lastSource: null,
          billingPlans: [{ revenueAmount: options?.violations ? 90n : 100n }],
        }],
      },
      crmQuoteDmsHandoff: {
        findMany: async () => options?.violations
          ? [{ opportunityCode: 'OP-1' }, { opportunityCode: 'OP-1' }]
          : [{ opportunityCode: 'OP-1' }],
      },
      crmContractDmsHandoff: {
        findMany: async () => options?.violations
          ? [{ contractCode: 'CT-1' }, { contractCode: 'CT-1' }]
          : [{ contractCode: 'CT-1' }],
      },
    },
  } as unknown as DatabaseService;
  return new CrmDataQualityService(db);
}

describe('CrmDataQualityService', () => {
  it('reports ready when CRM ledger invariants hold', async () => {
    const result = await createService().getReport();

    expect(result.status).toBe('ready');
    expect(result.violationCount).toBe(0);
  });

  it('keeps source-demo billing differences visible without treating them as an operating ledger violation', async () => {
    const db = {
      client: {
        crmOpportunity: { findMany: async () => [] },
        crmContract: { findMany: async () => [{ contractCode: 'crm-source-ct-001', confirmed: false, wbsCode: null, revenueTotal: 100n, lastSource: 'SOURCE-DEMO', billingPlans: [{ revenueAmount: 90n }] }] },
        crmQuoteDmsHandoff: { findMany: async () => [] },
        crmContractDmsHandoff: { findMany: async () => [] },
      },
    } as unknown as DatabaseService;

    const result = await new CrmDataQualityService(db).getReport();

    expect(result).toMatchObject({ status: 'degraded', violationCount: 0, findingCount: 1, acceptedExceptionCount: 1 });
  });

  it('reports exact violations and drilldown identifiers', async () => {
    const result = await createService({ violations: true }).getReport();

    expect(result.status).toBe('blocked');
    expect(result.violationCount).toBe(5);
    expect(result.checks.find((check) => check.key === 'confirmed-contract-wbs')?.entityIds).toContain('CT-1');
    expect(result.checks.find((check) => check.key === 'quote-dms-active-handoff')?.entityIds).toContain('OP-1');
  });
});
