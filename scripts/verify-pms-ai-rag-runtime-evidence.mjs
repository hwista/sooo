#!/usr/bin/env node

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const requireFromDatabasePackage = createRequire(new URL('../packages/database/package.json', import.meta.url));
const { PrismaClient } = requireFromDatabasePackage('@prisma/client');

process.env.DATABASE_URL ??= 'postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const providerMode = readOption('provider-mode', 'PMS_AI_RAG_PROVIDER_MODE', 'unavailable');

const config = {
  help: argv.includes('--help'),
  dryRun,
  baseUrl: readOption('base-url', 'PMS_AI_RAG_BASE_URL', 'http://localhost:4000/api'),
  loginId: readOption('login-id', 'PMS_AI_RAG_LOGIN_ID', 'admin'),
  password: readOption('password', 'PMS_AI_RAG_PASSWORD', 'admin123!'),
  projectId: pickString(readOption('project-id', 'PMS_AI_RAG_PROJECT_ID', '')),
  taskId: pickString(readOption('task-id', 'PMS_AI_RAG_TASK_ID', '')),
  projectQuery: pickString(readOption('project-query', 'PMS_AI_RAG_PROJECT_QUERY', '')),
  taskQuery: pickString(readOption('task-query', 'PMS_AI_RAG_TASK_QUERY', '')),
  reportPath: pickString(readOption(
    'report-path',
    'PMS_AI_RAG_REPORT_PATH',
    process.env.PMS_AI_RAG_PROVIDER_READY_REPORT_PATH || '',
  )),
  summaryPath: pickString(readOption(
    'summary-path',
    'PMS_AI_RAG_SUMMARY_PATH',
    process.env.PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH || '',
  )),
  providerMode,
  jobLimit: readPositiveIntegerOption('job-limit', 'PMS_AI_RAG_JOB_LIMIT', 100),
  checkProviderEnv: readBooleanOption(
    'check-provider-env',
    'PMS_AI_RAG_CHECK_PROVIDER_ENV',
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
  console.log('PMS AI/RAG runtime evidence dry-run');
  console.table({
    baseUrl: config.baseUrl,
    loginId: config.loginId,
    projectId: config.projectId ?? '(auto evidence-ready project)',
    taskId: config.taskId ?? '(auto)',
    projectQuery: config.projectQuery ?? '(derived from selected project)',
    taskQuery: config.taskQuery ?? '(derived from selected task)',
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
    summaryPath: config.summaryPath ?? '(none)',
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

const PROJECT_BACKFILL_REASON = 'pms_provider_ready_evidence_project';
const TASK_BACKFILL_REASON = 'pms_provider_ready_evidence_task';
const MEMBER_BACKFILL_REASON = 'pms_provider_ready_evidence_project_member';
const STATUS_BACKFILL_REASON = 'pms_provider_ready_evidence_project_status';
const prisma = new PrismaClient();

try {
  const report = await runEvidence(config);
  writeReport(config.reportPath, report);
  writeMarkdownSummary(config.summaryPath, report, config.reportPath);
  console.log('✓ PMS AI/RAG runtime evidence verification passed');
} catch (error) {
  console.error(`✗ PMS AI/RAG runtime evidence verification failed: ${error instanceof Error ? error.message : String(error)}`);
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

  console.log('→ verify: PMS AI source status bootstrap');
  const sourceStatus = await fetchSuccessData(
    `${options.baseUrl}/ai-index/status?sourceApp=pms`,
    headers,
    [200],
    '/ai-index/status?sourceApp=pms',
  );
  const pmsSourceStatus = assertPmsSourceStatus(sourceStatus, options.providerMode);

  console.log('→ resolve: PMS project and task');
  const project = await resolveProject(options, headers);
  const task = await resolveTask(options, headers, project.id);
  const projectId = String(project.id);
  const taskId = String(task.id);
  const member = await resolveProjectMember(projectId);
  const status = await resolveProjectStatus(projectId);
  const memberId = `${projectId}:${member.userId}:${member.roleCode}`;
  const statusId = `${projectId}:${status.statusCode}`;
  const projectQuery = options.projectQuery ?? String(project.projectName || projectId);
  const taskQuery = options.taskQuery ?? String(task.taskName || taskId);
  const memberQuery = String(member.displayName || member.userName || member.roleCode || memberId);
  const statusQuery = String(status.statusGoal || status.statusCode || statusId);

  console.log(`→ queue: project AI backfill (${projectId})`);
  const projectBackfill = await fetchSuccessData(
    `${options.baseUrl}/projects/ai-index/backfill`,
    jsonHeaders,
    [200, 201],
    '/projects/ai-index/backfill',
    {
      method: 'POST',
      body: JSON.stringify({
        projectIds: [projectId],
        limit: 1,
        reasonCode: PROJECT_BACKFILL_REASON,
      }),
    },
  );
  assertBackfill(projectBackfill, {
    entityType: 'project',
    idKey: 'projectId',
    id: projectId,
    reasonCode: PROJECT_BACKFILL_REASON,
  });
  const projectJobTarget = await findLatestBackfillJob({
    entityType: 'project',
    entityId: projectId,
    reasonCode: PROJECT_BACKFILL_REASON,
  });

  console.log(`→ queue: task AI backfill (${taskId})`);
  const taskBackfill = await fetchSuccessData(
    `${options.baseUrl}/projects/${projectId}/tasks/ai-index/backfill`,
    jsonHeaders,
    [200, 201],
    `/projects/${projectId}/tasks/ai-index/backfill`,
    {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [taskId],
        limit: 1,
        reasonCode: TASK_BACKFILL_REASON,
      }),
    },
  );
  assertBackfill(taskBackfill, {
    entityType: 'task',
    idKey: 'taskId',
    id: taskId,
    reasonCode: TASK_BACKFILL_REASON,
  });
  const taskJobTarget = await findLatestBackfillJob({
    entityType: 'task',
    entityId: taskId,
    reasonCode: TASK_BACKFILL_REASON,
  });

  console.log(`→ queue: project member AI backfill (${memberId})`);
  const memberJob = await queueGenericAiJob(jsonHeaders, {
    entityType: 'projectMember',
    entityId: memberId,
    reasonCode: MEMBER_BACKFILL_REASON,
    payload: {
      backfill: true,
      projectId,
      userId: String(member.userId),
      roleCode: member.roleCode,
    },
  });

  console.log(`→ queue: project status AI backfill (${statusId})`);
  const statusJob = await queueGenericAiJob(jsonHeaders, {
    entityType: 'projectStatus',
    entityId: statusId,
    reasonCode: STATUS_BACKFILL_REASON,
    payload: {
      backfill: true,
      projectId,
      statusCode: status.statusCode,
    },
  });

  console.log('→ run: common AI index pending jobs');
  const jobRun = await runPendingJobsUntilTargetsProcessed(options, headers, [
    projectJobTarget,
    taskJobTarget,
    memberJob,
    statusJob,
  ]);

  console.log('→ verify: PMS source status after backfill');
  const sourceStatusAfterBackfill = await fetchSuccessData(
    `${options.baseUrl}/ai-index/status?sourceApp=pms`,
    headers,
    [200],
    '/ai-index/status?sourceApp=pms after backfill',
  );
  const pmsSourceStatusAfterBackfill = assertPmsSourceStatus(sourceStatusAfterBackfill, options.providerMode);

  console.log('→ query: PMS project retrieval');
  const projectRetrieval = await runRetrieval(options, jsonHeaders, {
    query: projectQuery,
    entityTypes: ['project'],
  });

  console.log('→ query: PMS task retrieval');
  const taskRetrieval = await runRetrieval(options, jsonHeaders, {
    query: taskQuery,
    entityTypes: ['task'],
  });

  console.log('→ query: PMS project member retrieval');
  const memberRetrieval = await runRetrieval(options, jsonHeaders, {
    query: memberQuery,
    entityTypes: ['projectMember'],
  });

  console.log('→ query: PMS project status retrieval');
  const statusRetrieval = await runRetrieval(options, jsonHeaders, {
    query: statusQuery,
    entityTypes: ['projectStatus'],
  });

  console.log('→ verify: common AI database rows');
  const database = await verifyDatabaseRows({
    providerMode: options.providerMode,
    projectId,
    projectTitle: String(project.projectName || ''),
    projectQuery,
    taskId,
    taskTitle: String(task.taskName || ''),
    taskQuery,
    memberId,
    memberTitle: String(member.displayName || member.userName || ''),
    memberQuery,
    statusId,
    statusTitle: String(status.statusGoal || status.statusCode || ''),
    statusQuery,
    projectRetrieval,
    taskRetrieval,
    memberRetrieval,
    statusRetrieval,
    projectJobId: projectJobTarget.jobId,
    taskJobId: taskJobTarget.jobId,
    memberJobId: memberJob.jobId,
    statusJobId: statusJob.jobId,
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
    project: {
      id: projectId,
      name: project.projectName ?? undefined,
      query: projectQuery,
    },
    task: {
      id: taskId,
      projectId,
      name: task.taskName ?? undefined,
      query: taskQuery,
    },
    projectMember: {
      id: memberId,
      projectId,
      userId: String(member.userId),
      roleCode: member.roleCode,
      name: member.displayName ?? member.userName ?? undefined,
      query: memberQuery,
    },
    projectStatus: {
      id: statusId,
      projectId,
      statusCode: status.statusCode,
      query: statusQuery,
    },
    sourceStatus: {
      before: summarizeSourceStatus(pmsSourceStatus),
      after: summarizeSourceStatus(pmsSourceStatusAfterBackfill),
    },
    backfill: {
      project: summarizeBackfill(projectBackfill),
      task: summarizeBackfill(taskBackfill),
      projectMember: summarizeQueuedJob(memberJob),
      projectStatus: summarizeQueuedJob(statusJob),
    },
    jobRun,
    retrieval: {
      project: summarizeRetrieval(projectRetrieval),
      task: summarizeRetrieval(taskRetrieval),
      projectMember: summarizeRetrieval(memberRetrieval),
      projectStatus: summarizeRetrieval(statusRetrieval),
    },
    database,
  };
}

async function resolveProject(options, headers) {
  if (options.projectId) {
    const project = await fetchSuccessData(
      `${options.baseUrl}/projects/${encodeURIComponent(options.projectId)}`,
      headers,
      [200],
      '/projects/:id',
    );
    assertObject(project, 'configured PMS project');
    assertTruthy(project.id, 'configured PMS project exposes id');
    return project;
  }

  const projects = await fetchSuccessData(
    `${options.baseUrl}/projects?limit=20`,
    headers,
    [200],
    '/projects?limit=20',
  );
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('PMS AI/RAG evidence requires at least one readable PMS project.');
  }
  return selectEvidenceProject(projects);
}

async function selectEvidenceProject(projects) {
  const projectIds = projects
    .map((project) => {
      try {
        return parseBigIntId(project?.id, 'readable project id');
      } catch {
        return null;
      }
    })
    .filter((projectId) => projectId !== null);

  if (projectIds.length === 0) {
    throw new Error('PMS AI/RAG evidence could not resolve numeric ids from readable PMS projects.');
  }

  const now = new Date();
  const rows = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
      isActive: true,
      tasks: { some: { isActive: true } },
      projectStatuses: { some: { isActive: true } },
      projectMembers: {
        some: {
          isActive: true,
          OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
        },
      },
    },
    select: { id: true },
  });
  const eligibleIds = new Set(rows.map((row) => row.id.toString()));
  const selectedProject = projects.find((project) => eligibleIds.has(String(project.id)));

  if (!selectedProject) {
    throw new Error(
      'PMS AI/RAG evidence requires a readable PMS project with at least one active task, member, and status row.',
    );
  }

  return selectedProject;
}

async function resolveTask(options, headers, projectId) {
  if (options.taskId) {
    const task = await fetchSuccessData(
      `${options.baseUrl}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(options.taskId)}`,
      headers,
      [200],
      '/projects/:projectId/tasks/:taskId',
    );
    assertObject(task, 'configured PMS task');
    assertTruthy(task.id, 'configured PMS task exposes id');
    return task;
  }

  const tasks = await fetchSuccessData(
    `${options.baseUrl}/projects/${encodeURIComponent(projectId)}/tasks`,
    headers,
    [200],
    '/projects/:projectId/tasks',
  );
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('PMS AI/RAG evidence requires at least one task for the selected project.');
  }
  return tasks[0];
}

async function resolveProjectMember(projectId) {
  const member = await prisma.projectMember.findFirst({
    where: {
      projectId: parseBigIntId(projectId, 'projectMember.projectId'),
      isActive: true,
      OR: [{ releasedAt: null }, { releasedAt: { gte: new Date() } }],
      project: {
        isActive: true,
      },
    },
    select: {
      userId: true,
      roleCode: true,
      user: {
        select: {
          userName: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ isPhaseOwner: 'desc' }, { sortOrder: 'asc' }, { roleCode: 'asc' }],
  });

  if (!member) {
    throw new Error(`PMS AI/RAG evidence requires at least one active project member for project ${projectId}.`);
  }

  return {
    userId: member.userId.toString(),
    roleCode: member.roleCode,
    userName: member.user?.userName ?? null,
    displayName: member.user?.displayName ?? null,
  };
}

async function resolveProjectStatus(projectId) {
  const status = await prisma.projectStatus.findFirst({
    where: {
      projectId: parseBigIntId(projectId, 'projectStatus.projectId'),
      isActive: true,
      project: {
        isActive: true,
      },
    },
    select: {
      statusCode: true,
      statusGoal: true,
    },
    orderBy: [{ statusCode: 'asc' }],
  });

  if (!status) {
    throw new Error(`PMS AI/RAG evidence requires at least one active project status row for project ${projectId}.`);
  }

  return {
    statusCode: status.statusCode,
    statusGoal: status.statusGoal,
  };
}

async function queueGenericAiJob(headers, request) {
  const data = await fetchSuccessData(
    `${config.baseUrl}/ai-index/jobs`,
    headers,
    [200, 201],
    '/ai-index/jobs',
    {
      method: 'POST',
      body: JSON.stringify({
        sourceApp: 'pms',
        entityType: request.entityType,
        entityId: request.entityId,
        jobType: 'backfill',
        priority: 30,
        payload: {
          source: 'pms.ai-rag-runtime-evidence',
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
        sourceApp: 'pms',
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
    `PMS AI/RAG backfill jobs were not processed after repeated runs: ${JSON.stringify(targetJobs)}`,
  );
}

async function verifyDatabaseRows(context) {
  const project = await verifyAiObject({
    entityType: 'project',
    entityId: context.projectId,
    title: context.projectTitle,
    query: context.projectQuery,
    retrieval: context.projectRetrieval,
    reasonCode: PROJECT_BACKFILL_REASON,
    jobId: context.projectJobId,
    providerMode: context.providerMode,
  });
  const task = await verifyAiObject({
    entityType: 'task',
    entityId: context.taskId,
    title: context.taskTitle,
    query: context.taskQuery,
    retrieval: context.taskRetrieval,
    reasonCode: TASK_BACKFILL_REASON,
    jobId: context.taskJobId,
    providerMode: context.providerMode,
  });
  const projectMember = await verifyAiObject({
    entityType: 'projectMember',
    entityId: context.memberId,
    title: context.memberTitle,
    query: context.memberQuery,
    retrieval: context.memberRetrieval,
    reasonCode: MEMBER_BACKFILL_REASON,
    jobId: context.memberJobId,
    providerMode: context.providerMode,
  });
  const projectStatus = await verifyAiObject({
    entityType: 'projectStatus',
    entityId: context.statusId,
    title: context.statusTitle,
    query: context.statusQuery,
    retrieval: context.statusRetrieval,
    reasonCode: STATUS_BACKFILL_REASON,
    jobId: context.statusJobId,
    providerMode: context.providerMode,
  });

  return { project, task, projectMember, projectStatus };
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
      st.metadata_jsonb AS state_metadata_jsonb,
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
    WHERE o.source_app_code = 'pms'
      AND o.entity_type_code = $1
      AND o.entity_id = $2
      AND o.is_active = true
    ORDER BY o.updated_at DESC
    LIMIT 1
    `,
    options.entityType,
    options.entityId,
  );
  const object = firstRow(objectRows, `common.cm_ai_object_m PMS ${options.entityType} ${options.entityId}`);
  assertBooleanEquals(object.search_eligible, true, `${options.entityType}.search_eligible`);
  assertBooleanEquals(object.context_eligible, true, `${options.entityType}.context_eligible`);
  if (object.target_path !== '/project/detail') {
    throw new Error(`PMS ${options.entityType} target_path expected /project/detail, got ${String(object.target_path)}`);
  }
  if (String(object.title ?? '').trim().length === 0) {
    throw new Error(`PMS ${options.entityType} AI object title is empty.`);
  }

  assertBooleanEquals(object.acl_search_eligible, true, `${options.entityType}.acl_search_eligible`);
  assertBooleanEquals(object.acl_context_eligible, true, `${options.entityType}.acl_context_eligible`);
  if (object.access_scope_code !== 'acl') {
    throw new Error(`PMS ${options.entityType} ACL scope expected acl, got ${String(object.access_scope_code)}`);
  }
  assertAclSnapshot(object.acl_snapshot_jsonb, options.entityType);

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
  const chunk = firstRow(chunkRows, `common.cm_ai_chunk_m PMS ${options.entityType} count`);
  const chunkCount = Number(chunk.chunk_count);
  if (!Number.isFinite(chunkCount) || chunkCount < 1) {
    throw new Error(`Expected at least one active PMS ${options.entityType} AI chunk, got ${chunkCount}`);
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
  const embeddingCount = Number(firstRow(embeddingRows, `common.cm_ai_embedding_m PMS ${options.entityType} count`).embedding_count);
  const stateChunkCount = Number(object.chunk_count);
  const indexedChunkCount = Number(object.indexed_chunk_count);

  if (options.providerMode === 'ready') {
    if (object.index_status_code !== 'indexed') {
      throw new Error(`Provider-ready PMS ${options.entityType} expected indexed state, got ${String(object.index_status_code)}`);
    }
    if (embeddingCount < chunkCount || indexedChunkCount < chunkCount) {
      throw new Error(
        `Provider-ready PMS ${options.entityType} expected embeddings for every chunk, `
        + `got embeddings=${embeddingCount}, indexed=${indexedChunkCount}, chunks=${chunkCount}`,
      );
    }
    assertRetrievalContainsObject(options.retrieval, {
      entityType: options.entityType,
      entityId: options.entityId,
      query: options.query,
    });
  } else if (object.index_status_code !== 'stale') {
    throw new Error(`Provider-unavailable PMS ${options.entityType} expected stale state, got ${String(object.index_status_code)}`);
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
  const rows = options.jobId
    ? await prisma.$queryRawUnsafe(
      `
      SELECT ai_index_job_id, job_status_code, requested_at, finished_at, payload_jsonb
        FROM common.cm_ai_index_job_m
       WHERE ai_index_job_id = $1
       LIMIT 1
      `,
      parseBigIntId(options.jobId, `${options.entityType}.jobId`),
    )
    : await prisma.$queryRawUnsafe(
      `
      SELECT ai_index_job_id, job_status_code, requested_at, finished_at, payload_jsonb
        FROM common.cm_ai_index_job_m
       WHERE source_app_code = 'pms'
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
  const job = firstRow(rows, `common.cm_ai_index_job_m PMS ${options.entityType} backfill job`);
  if (job.job_status_code !== 'indexed') {
    throw new Error(`PMS ${options.entityType} backfill job expected indexed status, got ${String(job.job_status_code)}`);
  }
  return {
    jobId: job.ai_index_job_id.toString(),
    jobStatusCode: job.job_status_code,
    requestedAt: job.requested_at?.toISOString?.() ?? String(job.requested_at),
    finishedAt: job.finished_at?.toISOString?.() ?? undefined,
    reasonCode: options.reasonCode,
  };
}

async function findLatestBackfillJob(options) {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT ai_index_job_id, source_app_code, entity_type_code, entity_id, job_status_code, requested_at, payload_jsonb
      FROM common.cm_ai_index_job_m
     WHERE source_app_code = 'pms'
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
  const job = firstRow(rows, `queued PMS ${options.entityType} backfill job`);
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
    const row = firstRow(result, `PMS ${target.entityType} backfill job ${target.jobId}`);
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

async function verifyRetrievalAuditRows(options) {
  if (!options.retrieval?.retrievalLogId) {
    throw new Error(`Expected PMS ${options.entityType} retrievalLogId for query audit.`);
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
  const audit = firstRow(rows, `common.cm_ai_retrieval_log_m PMS ${options.entityType} audit`);
  if (audit.source_app_code !== 'pms') {
    throw new Error(`Expected PMS retrieval source_app_code pms, got ${String(audit.source_app_code)}`);
  }
  if (audit.query_text !== options.query) {
    throw new Error(`Expected PMS retrieval query_text ${options.query}, got ${String(audit.query_text)}`);
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

function assertRetrievalContainsObject(retrieval, expected) {
  const matches = [...findRetrievalMatches(retrieval?.results, expected), ...findRetrievalMatches(retrieval?.contextItems, expected)];
  if (matches.length < 1) {
    throw new Error(
      `Provider-ready PMS ${expected.entityType} retrieval did not include entity ${expected.entityId}.`,
    );
  }
  if (!retrieval?.retrievalLogId || !Array.isArray(retrieval.contextItems) || retrieval.contextItems.length < 1) {
    throw new Error(`Provider-ready PMS ${expected.entityType} retrieval expected retrievalLogId and contextItems.`);
  }
}

function findRetrievalMatches(items, expected) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item) => (
    item?.sourceApp === 'pms'
      && item?.entityType === expected.entityType
      && String(item?.entityId) === expected.entityId
  ));
}

function assertPmsSourceStatus(data, providerMode) {
  const rows = Array.isArray(data) ? data : [];
  const pms = rows.find((row) => row?.sourceApp === 'pms');
  if (!pms) {
    throw new Error('/ai-index/status did not return PMS source status.');
  }
  if (pms.registered !== true || pms.registrationStatus !== 'registered') {
    throw new Error(
      `/ai-index/status expected PMS to be registered, got ${JSON.stringify({
        registered: pms.registered,
        registrationStatus: pms.registrationStatus,
      })}`,
    );
  }
  assertBooleanEquals(pms.indexingEnabled, true, 'pms.indexingEnabled');
  assertBooleanEquals(pms.keywordSearchEnabled, true, 'pms.keywordSearchEnabled');
  assertBooleanEquals(pms.metadataSearchEnabled, true, 'pms.metadataSearchEnabled');
  assertBooleanEquals(pms.semanticSearchEnabled, providerMode === 'ready', 'pms.semanticSearchEnabled');
  assertBooleanEquals(pms.vectorSearchEnabled, providerMode === 'ready', 'pms.vectorSearchEnabled');
  assertBooleanEquals(pms.ragContextEnabled, providerMode === 'ready', 'pms.ragContextEnabled');
  return pms;
}

function assertBackfill(data, expected) {
  assertObject(data, `PMS ${expected.entityType} backfill response`);
  if (data.sourceApp !== 'pms' || data.entityType !== expected.entityType || data.jobType !== 'backfill') {
    throw new Error(`Unexpected PMS ${expected.entityType} backfill response: ${JSON.stringify(data)}`);
  }
  if (data.reasonCode !== expected.reasonCode) {
    throw new Error(`PMS ${expected.entityType} backfill reason expected ${expected.reasonCode}, got ${String(data.reasonCode)}`);
  }
  if (Number(data.queuedCount) < 1 || Number(data.failedCount) !== 0) {
    throw new Error(
      `PMS ${expected.entityType} backfill expected queuedCount >= 1 and failedCount 0, `
      + `got queued=${String(data.queuedCount)}, failed=${String(data.failedCount)}`,
    );
  }
  const item = Array.isArray(data.items)
    ? data.items.find((entry) => String(entry?.[expected.idKey]) === expected.id)
    : undefined;
  if (!item || item.status !== 'queued') {
    throw new Error(`PMS ${expected.entityType} backfill did not queue selected id ${expected.id}.`);
  }
}

function assertQueuedJob(data, expected) {
  assertObject(data, `PMS ${expected.entityType} generic AI job response`);
  if (
    data.sourceApp !== 'pms'
    || data.entityType !== expected.entityType
    || data.entityId !== expected.entityId
    || data.jobType !== 'backfill'
  ) {
    throw new Error(`Unexpected PMS ${expected.entityType} AI job response: ${JSON.stringify(data)}`);
  }
  if (data.jobStatus !== 'pending') {
    throw new Error(`PMS ${expected.entityType} AI job expected pending status, got ${String(data.jobStatus)}`);
  }
  if (!/^\d+$/.test(String(data.jobId))) {
    throw new Error(`PMS ${expected.entityType} AI job response did not include a numeric jobId.`);
  }
}

function assertAclSnapshot(value, entityType) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`PMS ${entityType} ACL snapshot must be an object.`);
  }
  if (!Array.isArray(value.readableUserIds) || !Array.isArray(value.userIds) || !Array.isArray(value.organizationIds)) {
    throw new Error(`PMS ${entityType} ACL snapshot must expose readableUserIds, userIds, and organizationIds arrays.`);
  }
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

function summarizeBackfill(data) {
  return {
    sourceApp: data.sourceApp,
    entityType: data.entityType,
    jobType: data.jobType,
    selectedCount: Number(data.selectedCount),
    queuedCount: Number(data.queuedCount),
    failedCount: Number(data.failedCount),
    reasonCode: data.reasonCode,
  };
}

function summarizeQueuedJob(job) {
  return {
    sourceApp: 'pms',
    entityType: job.entityType,
    entityId: job.entityId,
    jobType: 'backfill',
    jobId: job.jobId,
    queuedCount: 1,
    failedCount: 0,
    reasonCode: job.reasonCode,
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
    for (const key of ['processedCount', 'succeededCount', 'failedCount', 'skippedCount', 'total', 'limit']) {
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
  console.log(`→ wrote PMS AI/RAG runtime evidence report: ${reportPath}`);
}

function writeMarkdownSummary(summaryPath, report, reportPath) {
  if (!summaryPath) {
    return;
  }

  const absolutePath = path.resolve(summaryPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buildMarkdownSummary(report, reportPath), 'utf-8');
  console.log(`→ wrote PMS AI/RAG runtime evidence summary: ${summaryPath}`);
}

function buildMarkdownSummary(report, reportPath) {
  const rows = [
    entityEvidenceRow('Project', report.database?.project),
    entityEvidenceRow('Task', report.database?.task),
    entityEvidenceRow('Project member', report.database?.projectMember),
    entityEvidenceRow('Project status', report.database?.projectStatus),
  ];
  const after = report.sourceStatus?.after ?? {};
  const providerReadyNote = report.providerMode === 'ready'
    ? 'Provider-ready mode passed: vector embeddings, indexed chunks, and retrieval/context assertions were verified for the selected PMS evidence rows.'
    : 'Provider-unavailable mode passed: PMS projection, chunking, ACL snapshots, job execution, and retrieval audit rows were verified while semantic/vector/RAG capabilities intentionally remain disabled.';

  return [
    '# PMS AI/RAG Runtime Evidence',
    '',
    `- Status: ${report.status}`,
    `- Provider mode: ${report.providerMode}`,
    `- Started at: ${report.startedAt}`,
    `- Finished at: ${report.finishedAt}`,
    `- Duration ms: ${report.durationMs}`,
    `- Base URL: ${report.baseUrl}`,
    reportPath ? `- JSON report: ${reportPath}` : undefined,
    '',
    '## Capability State',
    '',
    `- PMS source registered: ${boolText(after.registered)}`,
    `- Keyword indexing enabled: ${boolText(after.keywordSearchEnabled)}`,
    `- Metadata indexing enabled: ${boolText(after.metadataSearchEnabled)}`,
    `- Semantic search enabled: ${boolText(after.semanticSearchEnabled)}`,
    `- Vector search enabled: ${boolText(after.vectorSearchEnabled)}`,
    `- RAG context enabled: ${boolText(after.ragContextEnabled)}`,
    '',
    '## Evidence Targets',
    '',
    `- Project: ${report.project?.name ?? '(unknown)'} (${report.project?.id ?? '(unknown)'})`,
    `- Task: ${report.task?.name ?? '(unknown)'} (${report.task?.id ?? '(unknown)'})`,
    `- Project member: ${report.projectMember?.name ?? '(unknown)'} (${report.projectMember?.id ?? '(unknown)'})`,
    `- Project status: ${report.projectStatus?.statusCode ?? '(unknown)'} (${report.projectStatus?.id ?? '(unknown)'})`,
    '',
    '## Database Evidence',
    '',
    '| Entity | Object | Index state | Chunks | Indexed chunks | Embeddings | ACL | Retrieval audit |',
    '|--------|--------|-------------|--------|----------------|------------|-----|-----------------|',
    ...rows,
    '',
    '## Result Interpretation',
    '',
    providerReadyNote,
    '',
  ].filter((line) => line !== undefined).join('\n');
}

function entityEvidenceRow(label, evidence) {
  if (!evidence) {
    return `| ${label} | missing | missing | missing | missing | missing | missing | missing |`;
  }

  return `| ${label} | ${evidence.objectId ?? '(missing)'} | ${evidence.indexStatusCode ?? '(missing)'} | ${String(evidence.chunkCount ?? '(missing)')} | ${String(evidence.indexedChunkCount ?? '(missing)')} | ${String(evidence.embeddingCount ?? '(missing)')} | ${evidence.aclScope ?? '(missing)'} | ${evidence.retrievalAudit?.retrievalLogId ?? '(missing)'} |`;
}

function boolText(value) {
  return value === true ? 'true' : 'false';
}

async function login(options) {
  const { response, data } = await requestJson(`${options.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ssoo-app': 'pms',
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
    'x-ssoo-app': 'pms',
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

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}.`);
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
    throw new Error(`PMS_AI_RAG_PROVIDER_MODE must be unavailable or ready, got ${options.providerMode}`);
  }
  if (!options.baseUrl.startsWith('http://') && !options.baseUrl.startsWith('https://')) {
    throw new Error(`PMS_AI_RAG_BASE_URL must be an absolute http(s) URL, got ${options.baseUrl}`);
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
    `PMS provider-ready evidence requires Azure OpenAI embedding environment. ${details}. `
    + 'Set PMS_AI_RAG_CHECK_PROVIDER_ENV=false only when the smoke runner environment intentionally differs from the server environment.',
  );
}

function failConfig(error) {
  console.error(`✗ PMS AI/RAG runtime evidence configuration invalid: ${error instanceof Error ? error.message : String(error)}`);
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
  pnpm run verify:pms-ai-rag-runtime -- [options]

Options:
  --dry-run
  --base-url=<url>            Default: PMS_AI_RAG_BASE_URL or http://localhost:4000/api
  --login-id=<id>             Default: PMS_AI_RAG_LOGIN_ID or admin
  --password=<password>       Default: PMS_AI_RAG_PASSWORD or admin123!
  --project-id=<id>           Default: PMS_AI_RAG_PROJECT_ID or first readable project with active task/member/status evidence
  --task-id=<id>              Default: PMS_AI_RAG_TASK_ID or first task in selected project
  --project-query=<query>     Default: PMS_AI_RAG_PROJECT_QUERY or selected project name
  --task-query=<query>        Default: PMS_AI_RAG_TASK_QUERY or selected task name
  --provider-mode=<mode>      unavailable | ready. Default: PMS_AI_RAG_PROVIDER_MODE or unavailable
  --check-provider-env        Validate Azure OpenAI embedding env before ready-mode execution
  --job-limit=<count>         Default: PMS_AI_RAG_JOB_LIMIT or 100
  --report-path=<path.json>   Optional JSON evidence report output
  --summary-path=<path.md>    Optional Markdown evidence summary output

Provider-ready artifact aliases:
  PMS_AI_RAG_PROVIDER_READY_REPORT_PATH
  PMS_AI_RAG_PROVIDER_READY_SUMMARY_PATH
`);
}
