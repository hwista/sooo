import type { CrmDataQualityService } from './data-quality.service.js';
import type { CrmOperationAttemptService } from './operation-attempt.service.js';
import { CrmLaunchReadinessService } from './launch-readiness.service.js';
import type { CrmReadinessService } from './readiness.service.js';

function createService(options?: { failDataQuality?: boolean }) {
  const calls = { readiness: 0, dataQuality: 0, attempts: 0 };
  const readinessService = {
    getReadiness: async () => {
      calls.readiness += 1;
      return { status: 'ready', checkedAt: new Date().toISOString(), blockerCount: 0, degradedCount: 0, checks: [{ key: 'database' }] };
    },
  } as unknown as CrmReadinessService;
  const dataQualityService = {
    getReport: async () => {
      calls.dataQuality += 1;
      if (options?.failDataQuality) throw new Error('probe failed');
      return { status: 'degraded', checkedAt: new Date().toISOString(), violationCount: 0, findingCount: 2, checks: [{ key: 'contract-billing-total' }] };
    },
  } as unknown as CrmDataQualityService;
  const attemptService = {
    list: async () => {
      calls.attempts += 1;
      return { unresolvedFailedCount: 1, stalledCount: 0 };
    },
  } as unknown as CrmOperationAttemptService;
  return {
    calls,
    service: new CrmLaunchReadinessService(readinessService, dataQualityService, attemptService),
  };
}

describe('CrmLaunchReadinessService', () => {
  it('shares one owner snapshot inside the refresh window and re-probes after invalidation', async () => {
    const { calls, service } = createService();

    const [first, concurrent] = await Promise.all([service.getSnapshot(), service.getSnapshot()]);
    const cached = await service.getSnapshot();

    expect(first.snapshotId).toBe(concurrent.snapshotId);
    expect(first.snapshotId).toBe(cached.snapshotId);
    expect(calls).toEqual({ readiness: 1, dataQuality: 1, attempts: 1 });
    expect(first).toMatchObject({
      owner: 'crm',
      source: 'crm.operations.live-probe',
      status: 'degraded',
      blockerCount: 0,
      degradedCount: 3,
      totalCount: 4,
    });

    service.invalidate();
    const refreshed = await service.getSnapshot();
    expect(refreshed.snapshotId).not.toBe(first.snapshotId);
    expect(calls).toEqual({ readiness: 2, dataQuality: 2, attempts: 2 });
  });

  it('returns unknown with null counts when a component probe fails', async () => {
    const { service } = createService({ failDataQuality: true });

    const result = await service.getSnapshot();

    expect(result.status).toBe('unknown');
    expect(result.blockerCount).toBeNull();
    expect(result.degradedCount).toBeNull();
    expect(result.totalCount).toBeNull();
    expect(result.reason).toContain('완료하지 못했습니다');
  });
});
