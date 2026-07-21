import type { ConfigService } from '@nestjs/config';
import { AiIndexSchedulerService } from './ai-index-scheduler.service.js';
import type { AiIndexWorkerService } from './ai-index-worker.service.js';

function createConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('AiIndexSchedulerService', () => {
  it('is disabled by default and exposes bounded scheduler config', () => {
    const worker = {
      runPendingJobs: async () => {
        throw new Error('unexpected scheduler run');
      },
    } as unknown as AiIndexWorkerService;
    const service = new AiIndexSchedulerService(createConfig({}), worker);

    expect(service.getStatus()).toMatchObject({
      enabled: false,
      running: false,
      intervalMs: 60000,
      batchLimit: 20,
      runOnStart: false,
    });
  });

  it('runs the worker once with the configured batch limit', async () => {
    const calls: number[] = [];
    const runSummary = {
      requestedCount: 2,
      processedCount: 2,
      indexedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      retriedCount: 1,
      safety: {
        jobBatchLimit: 7,
        maxJobBatchLimit: 100,
        embeddingBatchSize: 16,
        maxAttempts: 3,
        retryDelayMs: 300000,
        retryBackoffMultiplier: 2,
        maxRetryDelayMs: 3600000,
      },
      results: [],
    };
    const worker = {
      runPendingJobs: async (limit?: number) => {
        calls.push(limit ?? 0);
        return runSummary;
      },
    } as unknown as AiIndexWorkerService;
    const service = new AiIndexSchedulerService(createConfig({
      AI_INDEX_WORKER_BATCH_LIMIT: '7',
    }), worker);

    const status = await service.runOnce('manual');

    expect(calls).toEqual([7]);
    expect(status).toMatchObject({
      running: false,
      lastTrigger: 'manual',
      lastRun: runSummary,
    });
    expect(status.lastStartedAt).toEqual(expect.any(String));
    expect(status.lastFinishedAt).toEqual(expect.any(String));
  });
});
