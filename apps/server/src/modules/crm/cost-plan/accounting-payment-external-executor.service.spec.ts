import { ServiceUnavailableException } from '@nestjs/common';
import { AccountingPaymentExternalExecutorService, type AccountingPaymentExternalExecutionPayload } from './accounting-payment-external-executor.service.js';

const originalFetch = global.fetch;
let fetchCalls: { input: string | URL | Request; init?: RequestInit }[] = [];

function createPayload(): AccountingPaymentExternalExecutionPayload {
  return {
    handoffId: '41',
    executionId: 'crm-exec-001',
    executedAt: '2026-07-10T01:00:00.000Z',
    targetYear: 2026,
    businessTypeFilter: '',
    industryLineFilter: '',
    regionFilter: 'all',
    searchFilter: '',
    lineCount: 1,
    settlementAmountTotal: 94000000,
    lines: [
      {
        key: 'internal',
        source: 'internal-cost',
        sourceId: '11',
        targetYear: 2026,
        businessType: 'SI 구축',
        industryLine: '전력/제조',
        ownerName: '김민준',
        region: 'domestic',
        planAmountTotal: 25000000,
        actualAmountTotal: 21000000,
        gapAmountTotal: -4000000,
        settlementAmount: 21000000,
      },
    ],
    memo: '외부 ERP API 실행',
    requestedBy: '1',
  };
}

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  fetchCalls = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return {
      ok,
      status,
      text: async () => JSON.stringify(body),
    } as Response;
  }) as typeof fetch;
}

describe('AccountingPaymentExternalExecutorService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    fetchCalls = [];
  });

  it('rejects execution when the external API URL is not configured', async () => {
    delete process.env.CRM_ACCOUNTING_PAYMENT_API_URL;
    delete process.env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL;
    const service = new AccountingPaymentExternalExecutorService();

    await expect(service.execute(createPayload())).rejects.toThrow('CRM 외부 회계·지급 API URL이 설정되지 않았습니다.');
  });

  it('normalizes a successful external ERP/API execution response', async () => {
    process.env.CRM_ACCOUNTING_PAYMENT_API_URL = 'https://erp.example.test/accounting-payment';
    process.env.CRM_ACCOUNTING_PAYMENT_API_TOKEN = 'secret-token';
    process.env.CRM_ACCOUNTING_PAYMENT_API_TENANT = 'ssoo-demo';
    mockFetchResponse({
      executionId: 'erp-run-001',
      executedAt: '2026-07-10T02:00:00.000Z',
      providerName: 'sample-erp',
      providerRequestId: 'req-001',
      artifacts: [
        { key: 'accounting-voucher', evidencePath: 'erp://voucher/VCH-001', evidenceLabel: 'ERP voucher', referenceNo: 'VCH-001', amount: 94000000 },
        { key: 'payment-request', evidencePath: 'erp://payment-request/PAYREQ-001', evidenceLabel: 'ERP payment request', referenceNo: 'PAYREQ-001', amount: 94000000 },
        { key: 'payment-execution', evidencePath: 'erp://payment-execution/PAYEXE-001', evidenceLabel: 'ERP payment execution', referenceNo: 'PAYEXE-001', amount: 94000000 },
        { key: 'external-system-sync', evidencePath: 'erp://sync/SYNC-001', evidenceLabel: 'ERP sync', referenceNo: 'SYNC-001', amount: 94000000 },
      ],
    });
    const service = new AccountingPaymentExternalExecutorService();

    const result = await service.execute(createPayload());

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].input).toBe('https://erp.example.test/accounting-payment');
    expect(fetchCalls[0].init?.method).toBe('POST');
    expect(fetchCalls[0].init?.headers).toMatchObject({
      authorization: 'Bearer secret-token',
      'x-ssoo-tenant': 'ssoo-demo',
    });
    expect(result).toMatchObject({
      executionId: 'erp-run-001',
      providerName: 'sample-erp',
      providerRequestId: 'req-001',
      settlementAmountTotal: 94000000,
    });
    expect(result.artifacts.map((artifact) => artifact.key)).toEqual([
      'accounting-voucher',
      'payment-request',
      'payment-execution',
      'external-system-sync',
    ]);
  });

  it('requires every accounting/payment evidence step from the external API response', async () => {
    process.env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL = 'https://erp.example.test';
    mockFetchResponse({
      artifacts: [
        { key: 'accounting-voucher', evidencePath: 'erp://voucher/VCH-001' },
      ],
    });
    const service = new AccountingPaymentExternalExecutorService();

    await expect(service.execute(createPayload())).rejects.toThrow(ServiceUnavailableException);
    await expect(service.execute(createPayload())).rejects.toThrow('외부 회계·지급 API 응답에 필수 evidence 단계가 없습니다');
  });
});
