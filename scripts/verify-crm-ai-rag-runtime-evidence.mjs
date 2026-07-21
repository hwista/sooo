#!/usr/bin/env node

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const requireFromDatabasePackage = createRequire(new URL('../packages/database/package.json', import.meta.url));
const { PrismaClient } = requireFromDatabasePackage('@prisma/client');

process.env.DATABASE_URL ??= 'postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const providerMode = readOption('provider-mode', 'CRM_AI_RAG_PROVIDER_MODE', 'unavailable');

const config = {
  help: argv.includes('--help'),
  dryRun,
  baseUrl: readOption('base-url', 'CRM_AI_RAG_BASE_URL', 'http://localhost:4000/api'),
  loginId: readOption('login-id', 'CRM_AI_RAG_LOGIN_ID', 'admin'),
  password: readOption('password', 'CRM_AI_RAG_PASSWORD', 'admin123!'),
  opportunityId: pickString(readOption('opportunity-id', 'CRM_AI_RAG_OPPORTUNITY_ID', '')),
  customerId: pickString(readOption('customer-id', 'CRM_AI_RAG_CUSTOMER_ID', '')),
  activityId: pickString(readOption('activity-id', 'CRM_AI_RAG_ACTIVITY_ID', '')),
  opportunityQuery: pickString(readOption('opportunity-query', 'CRM_AI_RAG_OPPORTUNITY_QUERY', '')),
  customerQuery: pickString(readOption('customer-query', 'CRM_AI_RAG_CUSTOMER_QUERY', '')),
  activityQuery: pickString(readOption('activity-query', 'CRM_AI_RAG_ACTIVITY_QUERY', '')),
  reportPath: pickString(readOption('report-path', 'CRM_AI_RAG_REPORT_PATH', '')),
  providerMode,
  jobLimit: readPositiveIntegerOption('job-limit', 'CRM_AI_RAG_JOB_LIMIT', 100),
  checkProviderEnv: readBooleanOption(
    'check-provider-env',
    'CRM_AI_RAG_CHECK_PROVIDER_ENV',
    providerMode === 'ready' && !dryRun,
  ),
};

if (config.help) {
  printUsage();
  process.exit(0);
}

try {
  validateConfig(config);
} catch (error) {
  failConfig(error);
}

if (config.dryRun) {
  const providerEnvStatus = getProviderEnvStatus();
  console.log('CRM AI/RAG runtime evidence dry-run');
  console.table({
    baseUrl: config.baseUrl,
    loginId: config.loginId,
    opportunityId: config.opportunityId ?? '(auto readable CRM opportunity)',
    customerId: config.customerId ?? '(auto readable CRM customer with activity)',
    activityId: config.activityId ?? '(auto selected CRM customer activity)',
    opportunityQuery: config.opportunityQuery ?? '(derived from selected opportunity)',
    customerQuery: config.customerQuery ?? '(derived from selected customer)',
    activityQuery: config.activityQuery ?? '(derived from selected activity)',
    providerMode: config.providerMode,
    checkProviderEnv: config.checkProviderEnv,
    providerEnvReady: providerEnvStatus.ready,
    providerCredentialMode: providerEnvStatus.credentialMode ?? '(missing)',
    providerEnvMissing: providerEnvStatus.missing.join(', ') || '(none)',
    providerEnvPlaceholders: providerEnvStatus.placeholders.join(', ') || '(none)',
    providerEnvInvalid: providerEnvStatus.invalid.join(', ') || '(none)',
    databaseUrl: maskDatabaseUrl(process.env.DATABASE_URL),
    jobLimit: config.jobLimit,
    reportPath: config.reportPath ?? '(none)',
  });
  if (config.providerMode === 'ready' && config.checkProviderEnv) {
    try {
      assertProviderReadyEnv(providerEnvStatus);
    } catch (error) {
      failConfig(error);
    }
  }
  process.exit(0);
}

if (config.providerMode === 'ready' && config.checkProviderEnv) {
  try {
    assertProviderReadyEnv(getProviderEnvStatus());
  } catch (error) {
    failConfig(error);
  }
}

const OPPORTUNITY_BACKFILL_REASON = 'crm_provider_ready_evidence_opportunity';
const CUSTOMER_ACTIVITY_BACKFILL_REASON = 'crm_provider_ready_evidence_customer_activity';
const prisma = new PrismaClient();

try {
  const report = await runEvidence(config);
  writeReport(config.reportPath, report);
  console.log('✓ CRM AI/RAG runtime evidence verification passed');
} catch (error) {
  console.error(`✗ CRM AI/RAG runtime evidence verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

async function runEvidence(options) {
  const startedAt = new Date();
  console.log(`→ login: ${options.loginId}`);
  const accessToken = await login(options);
  const headers = authHeaders(accessToken);
  const jsonHeaders = authHeaders(accessToken, { 'Content-Type': 'application/json' });

  console.log('→ verify: CRM AI source status bootstrap');
  const sourceStatus = await fetchSuccessData(
    `${options.baseUrl}/ai-index/status?sourceApp=crm`,
    headers,
    [200],
    '/ai-index/status?sourceApp=crm',
  );
  const crmSourceStatus = assertCrmSourceStatus(sourceStatus, options.providerMode);

  console.log('→ resolve: CRM opportunity, customer, and activity');
  const opportunity = await resolveOpportunity(options, headers);
  const customer = await resolveCustomer(options, headers);
  const activity = await resolveActivity(options, headers, customer);
  const opportunityId = opportunity.dbId;
  const customerId = customer.id;
  const activityId = activity.id;
  const opportunityQuery = options.opportunityQuery ?? String(opportunity.opportunityName || opportunity.customerName || opportunity.code);
  const customerQuery = options.customerQuery ?? String(customer.customerName || customer.code);
  const activityQuery = options.activityQuery ?? String(activity.subject || activity.summary || activity.code);

  console.log(`→ queue: CRM opportunity AI backfill (${opportunityId})`);
  const opportunityJob = await queueGenericAiJob(options, jsonHeaders, {
    entityType: 'opportunity',
    entityId: opportunityId,
    reasonCode: OPPORTUNITY_BACKFILL_REASON,
    payload: {
      backfill: true,
      opportunityCode: opportunity.code,
    },
  });

  console.log(`→ queue: CRM customer/activity AI backfill (${customerId}, ${activityId})`);
  const customerActivityBackfill = await fetchSuccessData(
    `${options.baseUrl}/crm/customers/ai-index/backfill`,
    jsonHeaders,
    [200, 201],
    '/crm/customers/ai-index/backfill',
    {
      method: 'POST',
      body: JSON.stringify({
        customerIds: [customerId],
        activityIds: [activityId],
        limit: 2,
        reasonCode: CUSTOMER_ACTIVITY_BACKFILL_REASON,
      }),
    },
  );
  assertCustomerActivityBackfill(customerActivityBackfill, {
    customerId,
    activityId,
    reasonCode: CUSTOMER_ACTIVITY_BACKFILL_REASON,
  });
  const customerJob = await findLatestBackfillJob({
    entityType: 'customer',
    entityId: customerId,
    reasonCode: CUSTOMER_ACTIVITY_BACKFILL_REASON,
  });
  const activityJob = await findLatestBackfillJob({
    entityType: 'activity',
    entityId: activityId,
    reasonCode: CUSTOMER_ACTIVITY_BACKFILL_REASON,
  });

  console.log('→ run: common AI index pending jobs');
  const jobRun = await runPendingJobsUntilTargetsProcessed(options, headers, [
    opportunityJob,
    customerJob,
    activityJob,
  ]);

  console.log('→ verify: CRM source status after backfill');
  const sourceStatusAfterBackfill = await fetchSuccessData(
    `${options.baseUrl}/ai-index/status?sourceApp=crm`,
    headers,
    [200],
    '/ai-index/status?sourceApp=crm after backfill',
  );
  const crmSourceStatusAfterBackfill = assertCrmSourceStatus(sourceStatusAfterBackfill, options.providerMode);

  console.log('→ query: CRM opportunity retrieval');
  const opportunityRetrieval = await runRetrieval(options, jsonHeaders, {
    query: opportunityQuery,
    entityTypes: ['opportunity'],
  });

  console.log('→ query: CRM customer retrieval');
  const customerRetrieval = await runRetrieval(options, jsonHeaders, {
    query: customerQuery,
    entityTypes: ['customer'],
  });

  console.log('→ query: CRM activity retrieval');
  const activityRetrieval = await runRetrieval(options, jsonHeaders, {
    query: activityQuery,
    entityTypes: ['activity'],
  });

  console.log('→ verify: common AI database rows');
  const database = await verifyDatabaseRows({
    providerMode: options.providerMode,
    opportunity,
    opportunityQuery,
    opportunityRetrieval,
    opportunityJobId: opportunityJob.jobId,
    customer,
    customerQuery,
    customerRetrieval,
    customerJobId: customerJob.jobId,
    activity,
    activityQuery,
    activityRetrieval,
    activityJobId: activityJob.jobId,
  });

  const finishedAt = new Date();
  return {
    schemaVersion: 1,
    status: 'passed',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    providerMode: options.providerMode,
    baseUrl: options.baseUrl,
    opportunity: {
      id: opportunityId,
      code: opportunity.code,
      name: opportunity.opportunityName,
      query: opportunityQuery,
    },
    customer: {
      id: customerId,
      code: customer.code,
      name: customer.customerName,
      query: customerQuery,
    },
    activity: {
      id: activityId,
      code: activity.code,
      customerId: activity.customerId,
      subject: activity.subject,
      query: activityQuery,
    },
    sourceStatus: {
      before: summarizeSourceStatus(crmSourceStatus),
      after: summarizeSourceStatus(crmSourceStatusAfterBackfill),
    },
    backfill: {
      opportunity: summarizeQueuedJob(opportunityJob),
      customerActivity: summarizeCustomerActivityBackfill(customerActivityBackfill),
    },
    jobRun,
    retrieval: {
      opportunity: summarizeRetrieval(opportunityRetrieval),
      customer: summarizeRetrieval(customerRetrieval),
      activity: summarizeRetrieval(activityRetrieval),
    },
    database,
  };
}

async function resolveOpportunity(options, headers) {
  if (options.opportunityId) {
    const data = await fetchSuccessData(
      `${options.baseUrl}/crm/opportunities/${encodeURIComponent(options.opportunityId)}`,
      headers,
      [200],
      '/crm/opportunities/:id',
    );
    assertObject(data, 'configured CRM opportunity');
    const row = await findOpportunityRow(String(data.id ?? options.opportunityId));
    return toOpportunityEvidence(data, row);
  }

  const data = await fetchSuccessData(
    `${options.baseUrl}/crm/opportunities`,
    headers,
    [200],
    '/crm/opportunities',
  );
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error('CRM AI/RAG evidence requires at least one readable CRM opportunity.');
  }
  const row = await selectEvidenceOpportunity(items);
  const item = items.find((entry) => String(entry?.id) === row.opportunityCode) ?? items[0];
  return toOpportunityEvidence(item, row);
}

async function selectEvidenceOpportunity(items) {
  const codes = items
    .map((item) => pickString(String(item?.id ?? '')))
    .filter(Boolean);
  if (codes.length === 0) {
    throw new Error('CRM AI/RAG evidence could not resolve opportunity codes from readable CRM opportunities.');
  }

  const row = await prisma.crmOpportunity.findFirst({
    where: {
      opportunityCode: { in: codes },
      isActive: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      opportunityCode: true,
      customerName: true,
      opportunityName: true,
    },
  });
  if (!row) {
    throw new Error('CRM AI/RAG evidence requires a readable opportunity backed by an active CRM ledger row.');
  }
  return row;
}

async function findOpportunityRow(idOrCode) {
  const numericId = parseBigIntIdOrNull(idOrCode);
  const row = await prisma.crmOpportunity.findFirst({
    where: {
      isActive: true,
      OR: [
        { opportunityCode: idOrCode },
        ...(numericId ? [{ id: numericId }] : []),
      ],
    },
    select: {
      id: true,
      opportunityCode: true,
      customerName: true,
      opportunityName: true,
    },
  });
  if (!row) {
    throw new Error(`Missing active CRM opportunity ledger row for ${idOrCode}.`);
  }
  return row;
}

function toOpportunityEvidence(apiOpportunity, row) {
  return {
    dbId: row.id.toString(),
    code: row.opportunityCode,
    customerName: String(apiOpportunity?.customerName ?? row.customerName ?? ''),
    opportunityName: String(apiOpportunity?.opportunityName ?? row.opportunityName ?? ''),
  };
}

async function resolveCustomer(options, headers) {
  if (options.customerId) {
    const data = await fetchSuccessData(
      `${options.baseUrl}/crm/customers/${encodeURIComponent(options.customerId)}`,
      headers,
      [200],
      '/crm/customers/:id',
    );
    assertObject(data, 'configured CRM customer');
    const row = await findCustomerRow(String(data.id ?? options.customerId));
    return toCustomerEvidence(data, row);
  }

  const data = await fetchSuccessData(
    `${options.baseUrl}/crm/customers?limit=20`,
    headers,
    [200],
    '/crm/customers?limit=20',
  );
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error('CRM AI/RAG evidence requires at least one readable CRM customer.');
  }
  const row = await selectEvidenceCustomer(items);
  const item = items.find((entry) => String(entry?.id) === row.id.toString()) ?? items[0];
  return toCustomerEvidence(item, row);
}

async function selectEvidenceCustomer(items) {
  const ids = items
    .map((item) => parseBigIntIdOrNull(String(item?.id ?? '')))
    .filter((id) => id !== null);
  if (ids.length === 0) {
    throw new Error('CRM AI/RAG evidence could not resolve numeric ids from readable CRM customers.');
  }

  const row = await prisma.crmCustomer.findFirst({
    where: {
      id: { in: ids },
      isActive: true,
      activities: { some: { isActive: true } },
    },
    include: {
      activities: {
        where: { isActive: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 1,
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  });
  if (!row) {
    throw new Error('CRM AI/RAG evidence requires a readable customer with at least one active activity row.');
  }
  return row;
}

async function findCustomerRow(idOrCode) {
  const numericId = parseBigIntIdOrNull(idOrCode);
  const row = await prisma.crmCustomer.findFirst({
    where: {
      isActive: true,
      OR: [
        { customerCode: idOrCode },
        ...(numericId ? [{ id: numericId }] : []),
      ],
    },
    include: {
      activities: {
        where: { isActive: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 1,
      },
    },
  });
  if (!row) {
    throw new Error(`Missing active CRM customer ledger row for ${idOrCode}.`);
  }
  return row;
}

function toCustomerEvidence(apiCustomer, row) {
  return {
    id: row.id.toString(),
    code: row.customerCode,
    customerName: String(apiCustomer?.customerName ?? row.customerName ?? ''),
  };
}

async function resolveActivity(options, headers, customer) {
  if (options.activityId) {
    const row = await findActivityRow(options.activityId);
    await assertCustomerActivitiesEndpoint(options, headers, row.customerId.toString());
    return toActivityEvidence(row);
  }

  const activities = await fetchSuccessData(
    `${options.baseUrl}/crm/customers/${encodeURIComponent(customer.id)}/activities?limit=20`,
    headers,
    [200],
    `/crm/customers/${customer.id}/activities?limit=20`,
  );
  const items = Array.isArray(activities) ? activities : Array.isArray(activities?.items) ? activities.items : [];
  if (items.length === 0) {
    throw new Error('CRM AI/RAG evidence requires at least one readable CRM customer activity.');
  }
  const row = await findActivityRow(String(items[0]?.id));
  return toActivityEvidence(row);
}

async function assertCustomerActivitiesEndpoint(options, headers, customerId) {
  await fetchSuccessData(
    `${options.baseUrl}/crm/customers/${encodeURIComponent(customerId)}/activities?limit=20`,
    headers,
    [200],
    `/crm/customers/${customerId}/activities?limit=20`,
  );
}

async function findActivityRow(idOrCode) {
  const numericId = parseBigIntIdOrNull(idOrCode);
  const row = await prisma.crmCustomerActivity.findFirst({
    where: {
      isActive: true,
      customer: { isActive: true },
      OR: [
        { activityCode: idOrCode },
        ...(numericId ? [{ id: numericId }] : []),
      ],
    },
    include: {
      customer: true,
    },
  });
  if (!row) {
    throw new Error(`Missing active CRM customer activity ledger row for ${idOrCode}.`);
  }
  return row;
}

function toActivityEvidence(row) {
  return {
    id: row.id.toString(),
    code: row.activityCode,
    customerId: row.customerId.toString(),
    customerCode: row.customer.customerCode,
    subject: row.subject,
    summary: row.summary,
  };
}

async function queueGenericAiJob(options, headers, request) {
  const data = await fetchSuccessData(
    `${options.baseUrl}/ai-index/jobs`,
    headers,
    [200, 201],
    '/ai-index/jobs',
    {
      method: 'POST',
      body: JSON.stringify({
        sourceApp: 'crm',
        entityType: request.entityType,
        entityId: request.entityId,
        jobType: 'backfill',
        priority: 30,
        payload: {
          source: 'crm.ai-rag-runtime-evidence',
          reasonCode: request.reasonCode,
          ...request.payload,
        },
      }),
    },
  );
  assertQueuedJob(data, request);

  return {
    jobId: data.jobId,
    entityType: data.entityType,
    entityId: data.entityId,
    reasonCode: request.reasonCode,
    jobStatusCode: data.jobStatus,
    requestedAt: data.requestedAt,
  };
}

async function runRetrieval(options, headers, request) {
  return fetchSuccessData(
    `${options.baseUrl}/ai-index/retrieval/query`,
    headers,
    [200, 201],
    '/ai-index/retrieval/query',
    {
      method: 'POST',
      body: JSON.stringify({
        query: request.query,
        sourceApp: 'crm',
        entityTypes: request.entityTypes,
        limit: 5,
        contextLimit: 3,
        includeContext: true,
      }),
    },
  );
}

async function runPendingJobsUntilTargetsProcessed(options, headers, targets) {
  const runs = [];
  let targetJobs = [];

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const run = await fetchSuccessData(
      `${options.baseUrl}/ai-index/jobs/run?limit=${options.jobLimit}`,
      headers,
      [200, 201],
      '/ai-index/jobs/run',
      { method: 'POST' },
    );
    runs.push({
      attempt,
      ...summarizeJobRun(run),
    });

    targetJobs = await getBackfillJobStatuses(targets);
    const pending = targetJobs.filter((job) => job.jobStatusCode === 'pending' || job.jobStatusCode === 'running');
    if (pending.length === 0) {
      return {
        attempts: attempt,
        runs,
        targetJobs,
      };
    }
  }

  throw new Error(
    `CRM AI/RAG backfill jobs were not processed after repeated runs: ${JSON.stringify(targetJobs)}`,
  );
}

async function verifyDatabaseRows(context) {
  const opportunity = await verifyAiObject({
    entityType: 'opportunity',
    entityId: context.opportunity.dbId,
    title: context.opportunity.opportunityName,
    query: context.opportunityQuery,
    retrieval: context.opportunityRetrieval,
    reasonCode: OPPORTUNITY_BACKFILL_REASON,
    jobId: context.opportunityJobId,
    policy: 'crm.opportunity.read',
    providerMode: context.providerMode,
  });
  const customer = await verifyAiObject({
    entityType: 'customer',
    entityId: context.customer.id,
    title: context.customer.customerName,
    query: context.customerQuery,
    retrieval: context.customerRetrieval,
    reasonCode: CUSTOMER_ACTIVITY_BACKFILL_REASON,
    jobId: context.customerJobId,
    policy: 'crm.customer.read',
    providerMode: context.providerMode,
  });
  const activity = await verifyAiObject({
    entityType: 'activity',
    entityId: context.activity.id,
    title: context.activity.subject,
    query: context.activityQuery,
    retrieval: context.activityRetrieval,
    reasonCode: CUSTOMER_ACTIVITY_BACKFILL_REASON,
    jobId: context.activityJobId,
    policy: 'crm.customer.activity.read',
    providerMode: context.providerMode,
  });

  return { opportunity, customer, activity };
}

async function verifyAiObject(options) {
  const objectRows = await prisma.$queryRawUnsafe(
    `
    SELECT
      o.ai_object_id,
      o.title,
      o.search_eligible,
      o.context_eligible,
      o.target_path,
      o.metadata_jsonb,
      st.index_status_code,
      st.chunk_count,
      st.indexed_chunk_count,
      st.last_error_message,
      acl.access_scope_code,
      acl.search_eligible AS acl_search_eligible,
      acl.context_eligible AS acl_context_eligible,
      acl.acl_snapshot_jsonb
    FROM common.cm_ai_object_m o
    LEFT JOIN common.cm_ai_index_state_m st
      ON st.ai_object_id = o.ai_object_id
     AND st.is_active = true
    LEFT JOIN LATERAL (
      SELECT access_scope_code, search_eligible, context_eligible, acl_snapshot_jsonb
        FROM common.cm_ai_acl_snapshot_m
       WHERE ai_object_id = o.ai_object_id
         AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 1
    ) acl ON true
    WHERE o.source_app_code = 'crm'
      AND o.entity_type_code = $1
      AND o.entity_id = $2
      AND o.is_active = true
    ORDER BY o.updated_at DESC
    LIMIT 1
    `,
    options.entityType,
    options.entityId,
  );
  const object = firstRow(objectRows, `common.cm_ai_object_m CRM ${options.entityType} ${options.entityId}`);
  assertBooleanEquals(object.search_eligible, true, `${options.entityType}.search_eligible`);
  assertBooleanEquals(object.context_eligible, true, `${options.entityType}.context_eligible`);
  if (String(object.target_path ?? '').trim().length === 0) {
    throw new Error(`CRM ${options.entityType} target_path is empty.`);
  }
  if (String(object.title ?? '').trim().length === 0) {
    throw new Error(`CRM ${options.entityType} AI object title is empty.`);
  }

  assertBooleanEquals(object.acl_search_eligible, true, `${options.entityType}.acl_search_eligible`);
  assertBooleanEquals(object.acl_context_eligible, true, `${options.entityType}.acl_context_eligible`);
  if (object.access_scope_code !== 'policy') {
    throw new Error(`CRM ${options.entityType} ACL scope expected policy, got ${String(object.access_scope_code)}`);
  }
  assertAclSnapshot(object.acl_snapshot_jsonb, options);

  const chunkRows = await prisma.$queryRawUnsafe(
    `
    SELECT
      COUNT(*)::int AS chunk_count,
      COUNT(*) FILTER (WHERE chunk_text ILIKE $2)::int AS query_chunk_count
      FROM common.cm_ai_chunk_m
     WHERE ai_object_id = $1
       AND is_active = true
    `,
    object.ai_object_id,
    `%${options.query}%`,
  );
  const chunk = firstRow(chunkRows, `common.cm_ai_chunk_m CRM ${options.entityType} count`);
  const chunkCount = Number(chunk.chunk_count);
  if (!Number.isFinite(chunkCount) || chunkCount < 1) {
    throw new Error(`Expected at least one active CRM ${options.entityType} AI chunk, got ${chunkCount}`);
  }

  const embeddingRows = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*)::int AS embedding_count
      FROM common.cm_ai_embedding_m e
      JOIN common.cm_ai_chunk_m c
        ON c.ai_chunk_id = e.ai_chunk_id
     WHERE c.ai_object_id = $1
       AND c.is_active = true
       AND e.is_active = true
    `,
    object.ai_object_id,
  );
  const embeddingCount = Number(firstRow(embeddingRows, `common.cm_ai_embedding_m CRM ${options.entityType} count`).embedding_count);
  const stateChunkCount = Number(object.chunk_count);
  const indexedChunkCount = Number(object.indexed_chunk_count);

  if (options.providerMode === 'ready') {
    if (object.index_status_code !== 'indexed') {
      throw new Error(`Provider-ready CRM ${options.entityType} expected indexed state, got ${String(object.index_status_code)}`);
    }
    if (embeddingCount < chunkCount || indexedChunkCount < chunkCount) {
      throw new Error(
        `Provider-ready CRM ${options.entityType} expected embeddings for every chunk, `
        + `got embeddings=${embeddingCount}, indexed=${indexedChunkCount}, chunks=${chunkCount}`,
      );
    }
    assertRetrievalContainsObject(options.retrieval, {
      entityType: options.entityType,
      entityId: options.entityId,
    });
  } else if (object.index_status_code !== 'stale') {
    throw new Error(`Provider-unavailable CRM ${options.entityType} expected stale state, got ${String(object.index_status_code)}`);
  }

  const latestJob = await verifyLatestBackfillJob(options);
  const retrievalAudit = await verifyRetrievalAuditRows(options);

  return {
    objectId: object.ai_object_id.toString(),
    title: object.title,
    indexStatusCode: object.index_status_code,
    targetPath: object.target_path,
    chunkCount,
    queryChunkCount: Number(chunk.query_chunk_count),
    stateChunkCount,
    indexedChunkCount,
    embeddingCount,
    aclScope: object.access_scope_code,
    latestJob,
    retrievalAudit,
  };
}

async function verifyLatestBackfillJob(options) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT ai_index_job_id, job_status_code, requested_at, finished_at, payload_jsonb
      FROM common.cm_ai_index_job_m
     WHERE ai_index_job_id = $1
     LIMIT 1
    `,
    parseBigIntId(options.jobId, `${options.entityType}.jobId`),
  );
  const job = firstRow(rows, `common.cm_ai_index_job_m CRM ${options.entityType} backfill job`);
  if (job.job_status_code !== 'indexed') {
    throw new Error(`CRM ${options.entityType} backfill job expected indexed status, got ${String(job.job_status_code)}`);
  }
  const reasonCode = job.payload_jsonb?.reasonCode;
  if (reasonCode !== options.reasonCode) {
    throw new Error(`CRM ${options.entityType} backfill reason expected ${options.reasonCode}, got ${String(reasonCode)}`);
  }
  return {
    jobId: job.ai_index_job_id.toString(),
    jobStatusCode: job.job_status_code,
    requestedAt: job.requested_at?.toISOString?.() ?? String(job.requested_at),
    finishedAt: job.finished_at?.toISOString?.() ?? undefined,
    reasonCode: options.reasonCode,
  };
}

async function verifyRetrievalAuditRows(options) {
  if (!options.retrieval?.retrievalLogId) {
    throw new Error(`Expected CRM ${options.entityType} retrievalLogId for query audit.`);
  }

  const retrievalLogId = parseBigIntId(options.retrieval.retrievalLogId, `${options.entityType}.retrievalLogId`);
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT
      log.ai_retrieval_log_id,
      log.source_app_code,
      log.query_text,
      log.result_count,
      log.context_count,
      COUNT(item.ai_retrieval_log_item_id)::int AS item_count,
      COUNT(item.ai_retrieval_log_item_id) FILTER (WHERE item.included_in_context = true)::int AS context_item_count
    FROM common.cm_ai_retrieval_log_m log
    LEFT JOIN common.cm_ai_retrieval_log_item_m item
      ON item.ai_retrieval_log_id = log.ai_retrieval_log_id
    WHERE log.ai_retrieval_log_id = $1
    GROUP BY log.ai_retrieval_log_id, log.source_app_code, log.query_text, log.result_count, log.context_count
    `,
    retrievalLogId,
  );
  const audit = firstRow(rows, `common.cm_ai_retrieval_log_m CRM ${options.entityType} audit`);
  if (audit.source_app_code !== 'crm') {
    throw new Error(`Expected CRM retrieval source_app_code crm, got ${String(audit.source_app_code)}`);
  }
  if (audit.query_text !== options.query) {
    throw new Error(`Expected CRM retrieval query_text ${options.query}, got ${String(audit.query_text)}`);
  }

  return {
    retrievalLogId: options.retrieval.retrievalLogId,
    sourceApp: audit.source_app_code,
    queryText: audit.query_text,
    resultCount: Number(audit.result_count),
    contextCount: Number(audit.context_count),
    itemCount: Number(audit.item_count),
    contextItemCount: Number(audit.context_item_count),
  };
}

async function findLatestBackfillJob(options) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT ai_index_job_id, source_app_code, entity_type_code, entity_id, job_status_code, requested_at, payload_jsonb
      FROM common.cm_ai_index_job_m
     WHERE source_app_code = 'crm'
       AND entity_type_code = $1
       AND entity_id = $2
       AND job_type_code = 'backfill'
       AND payload_jsonb->>'reasonCode' = $3
     ORDER BY requested_at DESC
     LIMIT 1
    `,
    options.entityType,
    options.entityId,
    options.reasonCode,
  );
  const job = firstRow(rows, `queued CRM ${options.entityType} backfill job`);
  return {
    jobId: job.ai_index_job_id.toString(),
    entityType: job.entity_type_code,
    entityId: job.entity_id,
    reasonCode: options.reasonCode,
    jobStatusCode: job.job_status_code,
    requestedAt: job.requested_at?.toISOString?.() ?? String(job.requested_at),
  };
}

async function getBackfillJobStatuses(targets) {
  const rows = [];
  for (const target of targets) {
    const result = await prisma.$queryRawUnsafe(
      `
      SELECT ai_index_job_id, entity_type_code, entity_id, job_status_code, last_error_message, finished_at
        FROM common.cm_ai_index_job_m
       WHERE ai_index_job_id = $1
       LIMIT 1
      `,
      parseBigIntId(target.jobId, `${target.entityType}.jobId`),
    );
    const row = firstRow(result, `CRM ${target.entityType} backfill job ${target.jobId}`);
    rows.push({
      jobId: row.ai_index_job_id.toString(),
      entityType: row.entity_type_code,
      entityId: row.entity_id,
      jobStatusCode: row.job_status_code,
      lastErrorMessage: row.last_error_message ?? undefined,
      finishedAt: row.finished_at?.toISOString?.() ?? undefined,
    });
  }
  return rows;
}

function assertCrmSourceStatus(data, providerMode) {
  const rows = Array.isArray(data) ? data : [];
  const crm = rows.find((row) => row?.sourceApp === 'crm');
  if (!crm) {
    throw new Error('/ai-index/status did not return CRM source status.');
  }
  if (crm.registered !== true || crm.registrationStatus !== 'registered') {
    throw new Error(
      `/ai-index/status expected CRM to be registered, got ${JSON.stringify({
        registered: crm.registered,
        registrationStatus: crm.registrationStatus,
      })}`,
    );
  }
  assertBooleanEquals(crm.indexingEnabled, true, 'crm.indexingEnabled');
  assertBooleanEquals(crm.keywordSearchEnabled, true, 'crm.keywordSearchEnabled');
  assertBooleanEquals(crm.metadataSearchEnabled, true, 'crm.metadataSearchEnabled');
  assertBooleanEquals(crm.semanticSearchEnabled, providerMode === 'ready', 'crm.semanticSearchEnabled');
  assertBooleanEquals(crm.vectorSearchEnabled, providerMode === 'ready', 'crm.vectorSearchEnabled');
  assertBooleanEquals(crm.ragContextEnabled, providerMode === 'ready', 'crm.ragContextEnabled');
  return crm;
}

function assertCustomerActivityBackfill(data, expected) {
  assertObject(data, 'CRM customer/activity backfill response');
  if (data.sourceApp !== 'crm' || data.jobType !== 'backfill') {
    throw new Error(`Unexpected CRM customer/activity backfill response: ${JSON.stringify(data)}`);
  }
  if (!Array.isArray(data.entityTypes) || !data.entityTypes.includes('customer') || !data.entityTypes.includes('activity')) {
    throw new Error(`CRM customer/activity backfill must include customer and activity entityTypes: ${JSON.stringify(data)}`);
  }
  if (data.reasonCode !== expected.reasonCode) {
    throw new Error(`CRM customer/activity backfill reason expected ${expected.reasonCode}, got ${String(data.reasonCode)}`);
  }
  if (Number(data.queuedCount) < 2 || Number(data.failedCount) !== 0) {
    throw new Error(
      `CRM customer/activity backfill expected queuedCount >= 2 and failedCount 0, `
      + `got queued=${String(data.queuedCount)}, failed=${String(data.failedCount)}`,
    );
  }
  const items = Array.isArray(data.items) ? data.items : [];
  const customer = items.find((item) => item?.entityType === 'customer' && String(item?.customerId) === expected.customerId);
  const activity = items.find((item) => item?.entityType === 'activity' && String(item?.activityId) === expected.activityId);
  if (!customer || customer.status !== 'queued') {
    throw new Error(`CRM customer/activity backfill did not queue selected customer ${expected.customerId}.`);
  }
  if (!activity || activity.status !== 'queued') {
    throw new Error(`CRM customer/activity backfill did not queue selected activity ${expected.activityId}.`);
  }
}

function assertQueuedJob(data, expected) {
  assertObject(data, `CRM ${expected.entityType} generic AI job response`);
  if (
    data.sourceApp !== 'crm'
    || data.entityType !== expected.entityType
    || data.entityId !== expected.entityId
    || data.jobType !== 'backfill'
  ) {
    throw new Error(`Unexpected CRM ${expected.entityType} AI job response: ${JSON.stringify(data)}`);
  }
  if (data.jobStatus !== 'pending') {
    throw new Error(`CRM ${expected.entityType} AI job expected pending status, got ${String(data.jobStatus)}`);
  }
  if (!/^\d+$/.test(String(data.jobId))) {
    throw new Error(`CRM ${expected.entityType} AI job response did not include a numeric jobId.`);
  }
}

function assertAclSnapshot(value, options) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`CRM ${options.entityType} ACL snapshot must be an object.`);
  }
  if (value.policy !== options.policy) {
    throw new Error(`CRM ${options.entityType} ACL policy expected ${options.policy}, got ${String(value.policy)}`);
  }
  if (String(value.adminBoundary ?? '').length === 0) {
    throw new Error(`CRM ${options.entityType} ACL snapshot must expose adminBoundary.`);
  }
}

function assertRetrievalContainsObject(retrieval, expected) {
  const matches = [...findRetrievalMatches(retrieval?.results, expected), ...findRetrievalMatches(retrieval?.contextItems, expected)];
  if (matches.length < 1) {
    throw new Error(
      `Provider-ready CRM ${expected.entityType} retrieval did not include entity ${expected.entityId}.`,
    );
  }
  if (!retrieval?.retrievalLogId || !Array.isArray(retrieval.contextItems) || retrieval.contextItems.length < 1) {
    throw new Error(`Provider-ready CRM ${expected.entityType} retrieval expected retrievalLogId and contextItems.`);
  }
}

function findRetrievalMatches(items, expected) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item) => (
    item?.sourceApp === 'crm'
      && item?.entityType === expected.entityType
      && String(item?.entityId) === expected.entityId
  ));
}

async function login(options) {
  const { response, data } = await requestJson(`${options.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ssoo-app': 'crm',
    },
    body: JSON.stringify({
      loginId: options.loginId,
      password: options.password,
    }),
  });

  assertStatus(response, 200, '/auth/login', data);
  const accessToken = data?.data?.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('/auth/login response did not include data.accessToken.');
  }
  return accessToken;
}

async function fetchSuccessData(url, headers, expectedStatuses, label, options = {}) {
  const { response, data } = await requestJson(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  });
  assertStatusOneOf(response, expectedStatuses, label, data);
  assertSuccessEnvelope(data, label);
  return data.data;
}

async function requestJson(url, init = {}) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const cause = error?.cause instanceof Error
      ? ` (${error.cause.message})`
      : error?.cause
        ? ` (${String(error.cause)})`
        : '';
    throw new Error(`fetch ${url} failed: ${error instanceof Error ? error.message : String(error)}${cause}`);
  }
  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { response, data };
}

function authHeaders(accessToken, extraHeaders = undefined) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-ssoo-app': 'crm',
    ...(extraHeaders ?? {}),
  };
}

function assertSuccessEnvelope(data, label) {
  if (!data || typeof data !== 'object' || data.success !== true || !('data' in data)) {
    throw new Error(`${label} response is not a success envelope: ${JSON.stringify(data)}`);
  }
}

function assertStatus(response, expectedStatus, label, data = undefined) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned ${response.status}, expected ${expectedStatus}${formatResponseBody(data)}`);
  }
}

function assertStatusOneOf(response, expectedStatuses, label, data = undefined) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${label} returned ${response.status}, expected one of ${expectedStatuses.join(', ')}${formatResponseBody(data)}`,
    );
  }
}

function formatResponseBody(data) {
  if (data === undefined || data === null) return '';
  const serialized = JSON.stringify(data);
  return `: ${serialized.length > 1000 ? `${serialized.slice(0, 1000)}...` : serialized}`;
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertBooleanEquals(value, expected, label) {
  if (value !== expected) {
    throw new Error(`${label} expected ${String(expected)}, got ${String(value)}`);
  }
}

function firstRow(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Missing row: ${label}`);
  }
  return rows[0];
}

function parseBigIntId(value, label) {
  const normalized = typeof value === 'bigint' ? value.toString() : String(value);
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a numeric id, got ${normalized}`);
  }
  return BigInt(normalized);
}

function parseBigIntIdOrNull(value) {
  const normalized = typeof value === 'bigint' ? value.toString() : String(value);
  return /^\d+$/.test(normalized) ? BigInt(normalized) : null;
}

function summarizeSourceStatus(status) {
  return {
    sourceApp: status.sourceApp,
    registered: status.registered === true,
    registrationStatus: status.registrationStatus,
    indexingEnabled: status.indexingEnabled === true,
    keywordSearchEnabled: status.keywordSearchEnabled === true,
    metadataSearchEnabled: status.metadataSearchEnabled === true,
    semanticSearchEnabled: status.semanticSearchEnabled === true,
    vectorSearchEnabled: status.vectorSearchEnabled === true,
    ragContextEnabled: status.ragContextEnabled === true,
    objectCount: Number.isFinite(Number(status.objectCount)) ? Number(status.objectCount) : undefined,
  };
}

function summarizeQueuedJob(job) {
  return {
    sourceApp: 'crm',
    entityType: job.entityType,
    entityId: job.entityId,
    jobType: 'backfill',
    jobId: job.jobId,
    queuedCount: 1,
    failedCount: 0,
    reasonCode: job.reasonCode,
  };
}

function summarizeCustomerActivityBackfill(data) {
  return {
    sourceApp: data.sourceApp,
    entityTypes: data.entityTypes,
    jobType: data.jobType,
    selectedCustomerCount: Number(data.selectedCustomerCount),
    selectedActivityCount: Number(data.selectedActivityCount),
    queuedCount: Number(data.queuedCount),
    failedCount: Number(data.failedCount),
    reasonCode: data.reasonCode,
  };
}

function summarizeJobRun(jobRun) {
  if (Array.isArray(jobRun)) {
    return {
      shape: 'array',
      itemCount: jobRun.length,
    };
  }

  if (jobRun && typeof jobRun === 'object') {
    const summary = {};
    for (const key of ['processedCount', 'indexedCount', 'succeededCount', 'failedCount', 'skippedCount', 'total', 'limit']) {
      if (typeof jobRun[key] === 'number' || typeof jobRun[key] === 'string' || typeof jobRun[key] === 'boolean') {
        summary[key] = jobRun[key];
      }
    }
    return {
      shape: 'object',
      ...summary,
    };
  }

  return {
    shape: typeof jobRun,
  };
}

function summarizeRetrieval(retrieval) {
  return {
    retrievalLogId: typeof retrieval?.retrievalLogId === 'string' ? retrieval.retrievalLogId : undefined,
    total: Number.isFinite(Number(retrieval?.total)) ? Number(retrieval.total) : undefined,
    ranker: typeof retrieval?.ranker === 'string' ? retrieval.ranker : undefined,
    ragReady: retrieval?.ragReady === true,
    resultCount: Array.isArray(retrieval?.results) ? retrieval.results.length : 0,
    contextItemCount: Array.isArray(retrieval?.contextItems) ? retrieval.contextItems.length : 0,
    citationCount: Array.isArray(retrieval?.citations) ? retrieval.citations.length : 0,
    capabilities: retrieval?.capabilities && typeof retrieval.capabilities === 'object'
      ? retrieval.capabilities
      : undefined,
  };
}

function writeReport(reportPath, report) {
  if (!reportPath) {
    return;
  }

  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  console.log(`→ wrote CRM AI/RAG runtime evidence report: ${reportPath}`);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  if (argument) {
    return argument.slice(prefix.length);
  }
  return process.env[envName] || fallback;
}

function readBooleanOption(name, envName, fallback) {
  if (argv.includes(`--${name}`)) {
    return true;
  }

  const prefix = `--${name}=`;
  const argument = argv.find((entry) => entry.startsWith(prefix));
  const rawValue = argument ? argument.slice(prefix.length) : process.env[envName];
  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`${envName} / --${name} must be true or false, got ${rawValue}`);
}

function readPositiveIntegerOption(name, envName, fallback) {
  const rawValue = readOption(name, envName, String(fallback));
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} / --${name} must be a positive integer, got ${rawValue}`);
  }
  return parsed;
}

function validateConfig(options) {
  if (!['unavailable', 'ready'].includes(options.providerMode)) {
    throw new Error(`CRM_AI_RAG_PROVIDER_MODE must be unavailable or ready, got ${options.providerMode}`);
  }
  if (!options.baseUrl.startsWith('http://') && !options.baseUrl.startsWith('https://')) {
    throw new Error(`CRM_AI_RAG_BASE_URL must be an absolute http(s) URL, got ${options.baseUrl}`);
  }
}

function getProviderEnvStatus() {
  const endpoint = pickString(process.env.AZURE_OPENAI_ENDPOINT);
  const embeddingDeployment = pickString(process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
  const chatDeployment = pickString(process.env.AZURE_OPENAI_CHAT_DEPLOYMENT)
    ?? pickString(process.env.AZURE_OPENAI_DEPLOYMENT)
    ?? 'gpt-4o-mini';
  const apiKey = pickString(process.env.AZURE_OPENAI_API_KEY);
  const hasEntraCredential = Boolean(
    pickString(process.env.AZURE_TENANT_ID)
      && pickString(process.env.AZURE_CLIENT_ID)
      && pickString(process.env.AZURE_CLIENT_SECRET),
  );
  const managedIdentitySetting = readOptionalBooleanEnv('AZURE_USE_MANAGED_IDENTITY');
  const managedIdentityEnabled = managedIdentitySetting.value === true;

  const missing = [];
  const placeholders = [];
  const invalid = [];

  if (managedIdentitySetting.invalid) {
    invalid.push('AZURE_USE_MANAGED_IDENTITY must be true or false');
  }

  if (!endpoint) {
    missing.push('AZURE_OPENAI_ENDPOINT');
  } else if (isPlaceholderConfigValue(endpoint)) {
    placeholders.push('AZURE_OPENAI_ENDPOINT');
  }

  if (!embeddingDeployment) {
    missing.push('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
  } else if (isPlaceholderConfigValue(embeddingDeployment)) {
    placeholders.push('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
  }

  if (apiKey && looksLikeJwtToken(apiKey)) {
    invalid.push('AZURE_OPENAI_API_KEY looks like an Entra JWT token');
  }

  let credentialMode;
  if (apiKey) {
    credentialMode = 'api-key';
  } else if (hasEntraCredential) {
    credentialMode = 'entra';
  } else if (managedIdentityEnabled) {
    credentialMode = 'managed-identity';
  } else {
    missing.push('AZURE_OPENAI_API_KEY or Entra credential or explicit AZURE_USE_MANAGED_IDENTITY=true');
  }

  return {
    ready: missing.length === 0 && placeholders.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    invalid,
    credentialMode,
    endpointConfigured: Boolean(endpoint),
    embeddingDeploymentConfigured: Boolean(embeddingDeployment),
    chatDeploymentConfigured: Boolean(chatDeployment),
  };
}

function assertProviderReadyEnv(status) {
  if (status.ready) {
    return;
  }

  const details = [
    status.missing.length > 0 ? `missing=${status.missing.join(', ')}` : undefined,
    status.placeholders.length > 0 ? `placeholders=${status.placeholders.join(', ')}` : undefined,
    status.invalid.length > 0 ? `invalid=${status.invalid.join(', ')}` : undefined,
  ].filter(Boolean).join('; ');

  throw new Error(
    `CRM provider-ready evidence requires the SSOO common AI/RAG embedding provider environment. The current verifier reads Azure OpenAI endpoint/deployment credential variables. ${details}. `
    + 'Set CRM_AI_RAG_CHECK_PROVIDER_ENV=false only when the smoke runner environment intentionally differs from the server environment.',
  );
}

function failConfig(error) {
  console.error(`✗ CRM AI/RAG runtime evidence configuration invalid: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function pickString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPlaceholderConfigValue(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('<') && normalized.endsWith('>')) {
    return true;
  }

  return ['placeholder', 'change-me', 'your-'].some((marker) => normalized.includes(marker));
}

function looksLikeJwtToken(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function readOptionalBooleanEnv(name) {
  const rawValue = pickString(process.env[name]);
  if (!rawValue) {
    return { value: undefined, invalid: false };
  }

  const normalized = rawValue.toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return { value: true, invalid: false };
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return { value: false, invalid: false };
  }
  return { value: undefined, invalid: true };
}

function maskDatabaseUrl(value) {
  if (!value) return '(unset)';
  return value.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}

function printUsage() {
  console.log(`
Usage:
  pnpm run verify:crm-ai-rag-runtime -- [options]

Options:
  --dry-run
  --base-url=<url>              Default: CRM_AI_RAG_BASE_URL or http://localhost:4000/api
  --login-id=<id>               Default: CRM_AI_RAG_LOGIN_ID or admin
  --password=<password>         Default: CRM_AI_RAG_PASSWORD or admin123!
  --opportunity-id=<id|code>    Default: CRM_AI_RAG_OPPORTUNITY_ID or first readable opportunity
  --customer-id=<id|code>       Default: CRM_AI_RAG_CUSTOMER_ID or first readable customer with activity
  --activity-id=<id|code>       Default: CRM_AI_RAG_ACTIVITY_ID or first activity in selected customer
  --opportunity-query=<query>   Default: CRM_AI_RAG_OPPORTUNITY_QUERY or selected opportunity name
  --customer-query=<query>      Default: CRM_AI_RAG_CUSTOMER_QUERY or selected customer name
  --activity-query=<query>      Default: CRM_AI_RAG_ACTIVITY_QUERY or selected activity subject
  --provider-mode=<mode>        unavailable | ready. Default: CRM_AI_RAG_PROVIDER_MODE or unavailable
  --check-provider-env          Validate configured embedding provider env before ready-mode execution
  --job-limit=<count>           Default: CRM_AI_RAG_JOB_LIMIT or 100
  --report-path=<path.json>     Optional JSON evidence report output
`);
}
