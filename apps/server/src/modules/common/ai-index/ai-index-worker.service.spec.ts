import { AiIndexWorkerService } from './ai-index-worker.service.js';
import type { AiIndexingService } from './ai-indexing.service.js';

describe('AiIndexWorkerService', () => {
  it('delegates pending job execution through the worker boundary', async () => {
    const runSummary = {
      requestedCount: 1,
      processedCount: 1,
      indexedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      retriedCount: 0,
      safety: {
        jobBatchLimit: 5,
        maxJobBatchLimit: 100,
        embeddingBatchSize: 16,
        maxAttempts: 3,
        retryDelayMs: 300000,
        retryBackoffMultiplier: 2,
        maxRetryDelayMs: 3600000,
      },
      results: [],
    };
    const calls: number[] = [];
    const indexingService = {
      runPendingJobs: async (limit?: number) => {
        calls.push(limit ?? 0);
        return runSummary;
      },
    } as unknown as AiIndexingService;
    const worker = new AiIndexWorkerService(indexingService);

    await expect(worker.runPendingJobs(5)).resolves.toBe(runSummary);
    expect(calls).toEqual([5]);
  });
});
