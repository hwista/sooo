import type {
  AiIndexSourceApp,
  AiIndexSourceStatus,
} from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';
import type { AiIndexAdapter } from './ai-index-adapter.js';
import { AiIndexRegistryService } from './ai-index-registry.service.js';
import { AiIndexingService } from './ai-indexing.service.js';

type QueryRawUnsafe = (query: string, ...params: unknown[]) => Promise<unknown[]>;

interface QueryRawUnsafeMock {
  calls: [string, ...unknown[]][];
  queryRawUnsafe: QueryRawUnsafe;
}

function createQueryRawUnsafeMock(results: unknown[][]): QueryRawUnsafeMock {
  const pendingResults = [...results];
  const calls: [string, ...unknown[]][] = [];
  const queryRawUnsafe: QueryRawUnsafe = async (query, ...params) => {
    calls.push([query, ...params]);
    const nextResult = pendingResults.shift();
    if (!nextResult) {
      throw new Error('Unexpected AI index raw query in test');
    }
    return nextResult;
  };

  return { calls, queryRawUnsafe };
}

function findStatus(statuses: AiIndexSourceStatus[], sourceApp: AiIndexSourceApp): AiIndexSourceStatus {
  const status = statuses.find((item) => item.sourceApp === sourceApp);
  if (!status) {
    throw new Error(`Missing source status: ${sourceApp}`);
  }
  return status;
}

function createDmsAdapter(): AiIndexAdapter {
  return {
    sourceApp: 'dms',
    label: 'DMS',
    sourceKind: 'file',
    adapterCode: 'dms.document',
    capabilities: {
      keyword: true,
      metadata: true,
      semantic: false,
      vector: false,
      ragContext: false,
      indexing: true,
    },
    syncObject: async () => ({ status: 'skipped' }),
  };
}

function createService(queryRawUnsafe: QueryRawUnsafe): AiIndexingService {
  const db = {
    client: {
      $queryRawUnsafe: queryRawUnsafe,
    },
  } as unknown as DatabaseService;

  const registry = new AiIndexRegistryService();
  registry.register(createDmsAdapter());

  const embeddingProvider = {
    getStatus: () => ({
      profileCode: 'default',
      providerCode: 'azure-openai',
      ready: false,
      reasonCode: 'not_configured',
    }),
  } as unknown as AiEmbeddingProviderService;

  return new AiIndexingService(db, registry, embeddingProvider);
}

describe('AiIndexingService source status coverage', () => {
  it('returns registered sources together with planned sources that still need adapters', async () => {
    const queryMock = createQueryRawUnsafeMock([
      [{ ai_source_id: 1n }],
      [{
        source_app_code: 'admin',
        source_name: 'Admin',
        source_kind_code: 'system',
        adapter_code: 'stale.admin',
        source_status_code: 'active',
        indexing_enabled: true,
        keyword_search_enabled: true,
        metadata_search_enabled: true,
        semantic_search_enabled: false,
        vector_search_enabled: false,
        rag_context_enabled: false,
        is_active: true,
        object_count: 1n,
        pending_count: 0n,
        indexed_count: 1n,
        skipped_count: 0n,
        failed_count: 0n,
        stale_count: 0n,
        deleted_count: 0n,
        last_indexed_at: new Date('2026-07-01T00:00:00.000Z'),
        last_failed_at: null,
      }, {
        source_app_code: 'dms',
        source_name: 'DMS',
        source_kind_code: 'file',
        adapter_code: 'dms.document',
        source_status_code: 'active',
        indexing_enabled: true,
        keyword_search_enabled: true,
        metadata_search_enabled: true,
        semantic_search_enabled: false,
        vector_search_enabled: false,
        rag_context_enabled: false,
        is_active: true,
        object_count: 2n,
        pending_count: 0n,
        indexed_count: 1n,
        skipped_count: 0n,
        failed_count: 0n,
        stale_count: 1n,
        deleted_count: 0n,
        last_indexed_at: new Date('2026-07-02T00:00:00.000Z'),
        last_failed_at: null,
      }],
    ]);
    const service = createService(queryMock.queryRawUnsafe);

    const statuses = await service.getSourceStatuses();

    expect(statuses.map((status) => status.sourceApp)).toEqual(['admin', 'crm', 'dms', 'pms', 'sns']);
    expect(findStatus(statuses, 'admin')).toMatchObject({
      sourceApp: 'admin',
      registered: false,
      registrationStatus: 'missing_adapter',
      active: false,
      objectCount: 0,
    });
    expect(findStatus(statuses, 'dms')).toMatchObject({
      sourceApp: 'dms',
      label: 'DMS',
      registered: true,
      registrationStatus: 'registered',
      sourceKind: 'file',
      adapterCode: 'dms.document',
      active: true,
      indexingEnabled: true,
      keywordSearchEnabled: true,
      objectCount: 2,
      indexedCount: 1,
      staleCount: 1,
      lastIndexedAt: '2026-07-02T00:00:00.000Z',
    });
    expect(findStatus(statuses, 'crm')).toMatchObject({
      sourceApp: 'crm',
      label: 'CRM',
      registered: false,
      registrationStatus: 'missing_adapter',
      sourceKind: 'domain',
      active: false,
      indexingEnabled: false,
      keywordSearchEnabled: false,
      semanticSearchEnabled: false,
      vectorSearchEnabled: false,
      ragContextEnabled: false,
      objectCount: 0,
    });
  });

  it('returns the filtered planned source when that adapter has not been registered yet', async () => {
    const queryMock = createQueryRawUnsafeMock([
      [{ ai_source_id: 1n }],
      [],
    ]);
    const service = createService(queryMock.queryRawUnsafe);

    const statuses = await service.getSourceStatuses('crm');

    expect(statuses).toEqual([expect.objectContaining({
      sourceApp: 'crm',
      label: 'CRM',
      registered: false,
      registrationStatus: 'missing_adapter',
      sourceKind: 'domain',
      objectCount: 0,
    })]);
    expect(queryMock.calls[1]?.[1]).toBe('crm');
  });
});

describe('AiIndexingService job queue metrics', () => {
  it('summarizes runnable, retry-waiting, and exhausted AI index jobs', async () => {
    const queryMock = createQueryRawUnsafeMock([
      [{
        source_app_code: 'dms',
        job_type_code: 'upsert',
        job_status_code: 'pending',
        job_count: 3n,
        runnable_count: 2n,
        retry_waiting_count: 1n,
        exhausted_count: 0n,
        oldest_requested_at: new Date('2026-07-02T00:00:00.000Z'),
        next_retry_at: new Date('2026-07-02T00:05:00.000Z'),
        last_error_message: 'embedding provider unavailable',
      }, {
        source_app_code: 'dms',
        job_type_code: 'refresh',
        job_status_code: 'running',
        job_count: 1n,
        runnable_count: 0n,
        retry_waiting_count: 0n,
        exhausted_count: 0n,
        oldest_requested_at: new Date('2026-07-02T00:01:00.000Z'),
        next_retry_at: null,
        last_error_message: null,
      }, {
        source_app_code: 'dms',
        job_type_code: 'backfill',
        job_status_code: 'failed',
        job_count: 2n,
        runnable_count: 0n,
        retry_waiting_count: 0n,
        exhausted_count: 2n,
        oldest_requested_at: new Date('2026-07-02T00:02:00.000Z'),
        next_retry_at: null,
        last_error_message: 'adapter failed',
      }],
    ]);
    const service = createService(queryMock.queryRawUnsafe);

    const metrics = await service.getJobQueueMetrics('dms');

    expect(queryMock.calls[0]?.[1]).toBe('dms');
    expect(metrics).toMatchObject({
      sourceApp: 'dms',
      totalCount: 6,
      pendingCount: 3,
      runnableCount: 2,
      retryWaitingCount: 1,
      runningCount: 1,
      failedCount: 2,
      exhaustedCount: 2,
    });
    expect(metrics.generatedAt).toEqual(expect.any(String));
    expect(metrics.metrics[0]).toMatchObject({
      sourceApp: 'dms',
      jobType: 'upsert',
      jobStatus: 'pending',
      count: 3,
      runnableCount: 2,
      retryWaitingCount: 1,
      oldestRequestedAt: '2026-07-02T00:00:00.000Z',
      nextRetryAt: '2026-07-02T00:05:00.000Z',
      lastErrorMessage: 'embedding provider unavailable',
    });
  });
});
