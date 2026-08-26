import type { DatabaseService } from '../../../database/database.service.js';
import { CrmOperationAttemptService } from './operation-attempt.service.js';

function baseRow(patch: Record<string, unknown> = {}) {
  return {
    id: 1n,
    targetTypeCode: 'dms',
    actionCode: 'quote-dms-lifecycle',
    sourceEntityType: 'crm.opportunity',
    sourceEntityId: 'OP-1',
    statusCode: 'running',
    rootAttemptId: null,
    retryOfAttemptId: null,
    attemptNumber: 1,
    idempotencyKey: 'hash',
    payloadFingerprint: 'fingerprint',
    errorCode: null,
    errorMessage: null,
    evidenceJson: null,
    requestedBy: 7n,
    startedAt: new Date('2026-08-13T00:00:00.000Z'),
    finishedAt: null,
    isActive: true,
    memo: null,
    createdBy: 7n,
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
    updatedBy: 7n,
    updatedAt: new Date('2026-08-13T00:00:00.000Z'),
    lastSource: 'crm.operation-attempt',
    lastActivity: 'operation-start',
    transactionId: null,
    ...patch,
  };
}

function createService() {
  const calls = { creates: [] as unknown[], updates: [] as unknown[] };
  const db = {
    client: {
      crmOperationAttempt: {
        findUnique: async () => null,
        findFirst: async () => null,
        aggregate: async () => ({ _max: { attemptNumber: 1 } }),
        create: async (args: { data: unknown }) => {
          calls.creates.push(args.data);
          return baseRow(args.data as Record<string, unknown>);
        },
        update: async (args: { data: unknown }) => {
          calls.updates.push(args.data);
          return baseRow(args.data as Record<string, unknown>);
        },
        findMany: async () => [],
        count: async () => 0,
      },
      crmConfig: { findUnique: async () => ({ stalledAfterMinutes: 30 }) },
    },
  } as unknown as DatabaseService;
  return { service: new CrmOperationAttemptService(db), calls };
}

describe('CrmOperationAttemptService', () => {
  it('records running and succeeded states around an external-boundary execution', async () => {
    const { service, calls } = createService();

    const result = await service.run({
      target: 'dms',
      action: 'quote-dms-lifecycle',
      sourceEntityType: 'crm.opportunity',
      sourceEntityId: 'OP-1',
      requestedBy: 7n,
      fingerprintInput: { opportunityId: 'OP-1' },
      context: { idempotencyKey: 'browser-action-1' },
      execute: async () => ({ artifact: 'quote.docx' }),
      evidence: (value) => value,
    });

    expect(result).toEqual({ artifact: 'quote.docx' });
    expect(calls.creates[0]).toMatchObject({ statusCode: 'running', attemptNumber: 1, requestedBy: 7n });
    expect(calls.updates[0]).toMatchObject({ statusCode: 'succeeded', errorMessage: null });
  });

  it('uses the supplied correlation for the whole operation boundary', async () => {
    const { service, calls } = createService();
    const correlationId = '11111111-1111-4111-8111-111111111111';

    await service.run({
      target: 'dms',
      action: 'quote-dms-lifecycle',
      sourceEntityType: 'crm.opportunity',
      sourceEntityId: 'OP-1',
      requestedBy: 7n,
      fingerprintInput: { opportunityId: 'OP-1' },
      context: { correlationId },
      execute: async () => ({ artifact: 'quote.docx' }),
      evidence: (value) => value,
    });

    expect(calls.creates[0]).toMatchObject({ transactionId: correlationId });
  });

  it('stores a sanitized failure and throws only the sanitized HTTP error', async () => {
    const { service, calls } = createService();
    const failure = new Error('token=top-secret https://user:password@example.com failed');

    let thrown: unknown;
    try {
      await service.run({
        target: 'dms',
        action: 'contract-dms-lifecycle',
        sourceEntityType: 'crm.contract',
        sourceEntityId: 'CT-1',
        requestedBy: 7n,
        fingerprintInput: { contractId: 'CT-1' },
        execute: async () => { throw failure; },
        evidence: () => ({}),
      });
    } catch (error) {
      thrown = error;
    }

    expect(calls.updates[0]).toMatchObject({ statusCode: 'failed', errorCode: 'Error' });
    expect(JSON.stringify(calls.updates[0])).not.toContain('top-secret');
    expect(JSON.stringify(calls.updates[0])).not.toContain('password@example.com');
    expect(thrown).not.toBe(failure);
    expect(String(thrown)).not.toContain('top-secret');
    expect(String(thrown)).not.toContain('password@example.com');
  });

  it('separates immutable failed rows from unresolved, recovering, and recovered chains', async () => {
    const chainRows = [
      { id: 1n, rootAttemptId: null, statusCode: 'failed' },
      { id: 2n, rootAttemptId: 1n, statusCode: 'succeeded' },
      { id: 3n, rootAttemptId: null, statusCode: 'failed' },
      { id: 4n, rootAttemptId: 3n, statusCode: 'running' },
      { id: 5n, rootAttemptId: null, statusCode: 'failed' },
    ];
    let findManyCall = 0;
    const unresolvedRow = baseRow({
      id: 5n,
      statusCode: 'failed',
      transactionId: '11111111-1111-4111-8111-111111111111',
    });
    const db = {
      client: {
        crmOperationAttempt: {
          findMany: async () => (++findManyCall === 1 ? [unresolvedRow] : chainRows),
          count: async () => 0,
        },
        crmConfig: { findUnique: async () => ({ stalledAfterMinutes: 30 }) },
      },
    } as unknown as DatabaseService;

    const result = await new CrmOperationAttemptService(db).list();

    expect(result).toMatchObject({
      failedCount: 0,
      unresolvedFailedCount: 1,
      recoveringFailedCount: 1,
      recoveredFailedCount: 1,
    });
    expect(result.items[0]).toMatchObject({
      correlationId: '11111111-1111-4111-8111-111111111111',
      ownerHref: '/settings/operations/git',
      sourceHref: '/?selected=OP-1',
      retryable: true,
      recoveryStatus: 'unresolved',
    });
  });
});
