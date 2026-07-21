# AI/RAG Platform Handoff

> Last updated: 2026-07-08
> Status: active, overall implementation progress 78.30%; central common foundation 89.26%
> Next selected work: central `AI-RAG-10A provider-ready runtime proof`; service rollout backlog remains `AI-RAG-08A residual CRM provider-ready evidence`, `AI-RAG-08C residual SNS board/comment/backfill + AI-RAG-08D Admin adapter expansion`

This document is the handoff point for continuing the AI/RAG commonization workstream without reconstructing the previous session history.

## Current Status

The AI/RAG platform work is no longer only a schema or roadmap baseline. The current implementation has a common AI data plane, common retrieval, DMS reference projection, PMS project/task RDB projection plus write-hook queueing, PMS project/task controlled backfill queueing, CRM opportunity/customer/activity RDB ledger projection plus write-hook queueing, CRM customer/activity controlled backfill queueing, CRM customer/activity API access guard/snapshot first slice, DMS Ask common retrieval consumption, conversation/run audit, and a common model gateway for DMS Ask.

Central common foundation progress is tracked separately from service rollout backlog. The central view counts common data plane, shared types, registry/status, guarded job operations, worker execution boundary, disabled-by-default scheduler binding, retry observability, embedding/retrieval/conversation/model gateway, static verifier, central completion verifier, and runtime smoke entrypoints. It does not count CRM provider-ready evidence, SNS board/comment, Admin adapter, or web assistant feature rollout as central foundation blockers.

Completed in the current slice:

- `AI-RAG-05A` common Azure embedding provider foundation.
- `AI-RAG-05B` chunk diff and `cm_ai_embedding_m` upsert.
- `AI-RAG-05C` embedding job safety metadata and retry/backoff policy.
- `AI-RAG-05E` embedding provider placeholder guard.
- `AI-RAG-06A` common retrieval query service with vector search, keyword fallback, hybrid ranking, and ACL pre-filter.
- `AI-RAG-06B` retrieval log, context item, citation assembly, and logged-context `ragReady` gate.
- `AI-RAG-07A` common conversation/message/reference/run/run-source service and controller.
- `AI-RAG-07B` DMS Ask common retrieval and run audit migration.
- `AI-RAG-07C` common model gateway integration for DMS Ask.
- `AI-RAG-03A` common index operations hardening: `/ai-index/jobs` and `/ai-index/jobs/run` now require system-override/admin guard, job execution goes through `AiIndexWorkerService`, `AiIndexSchedulerService` provides env-gated scheduler binding, and `/ai-index/jobs/metrics` exposes runnable/pending/running/failed/exhausted/retry-waiting queue metrics.
- Central completion guard: `verify:ai-rag-central-foundation` checks central-only static evidence, while `verify:ai-rag-central-foundation:complete` fails unless a provider-ready runtime report proves embeddings, common retrieval `ragReady`, Ask run-source audit, and legacy/common comparison.
- Planned source status coverage: `/ai-index/status` now returns DMS/CRM/PMS/SNS as registered adapters and Admin as `registrationStatus: "missing_adapter"` instead of hiding unimplemented domain adapters.
- `AI-RAG-08A` partial: CRM now has `crm.crm_opportunity_m`/`crm.crm_opportunity_line_d` opportunity ledger tables, `crm.crm_customer_m`/`crm.crm_customer_activity_d` customer/activity ledger tables, history triggers, seed/backfill data, RDB-backed opportunity/customer read/write services, opportunity create/update/confirm/reopen/add-version AI index queueing, customer create/update and activity create AI index queueing, system-override/admin controlled customer/activity backfill queueing, owner-aware customer/activity ACL snapshots, customer/activity API access guards/snapshots, and `CrmAiIndexAdapter` for provider-gated opportunity/customer/activity projection. Provider-ready CRM vector evidence remains open.
- `AI-RAG-08B` partial: `PmsAiIndexAdapter` projects PMS project RDB rows, stage/detail/status text, member/org ACL snapshot, task RDB rows, WBS/assignee text, and PMS target metadata into the common AI index contract. `ProjectService` now queues common AI index jobs after project create/update/delete, detail upsert, and stage transition storage points, and exposes a system-override/admin controlled backfill endpoint for existing project rows. `TaskService` queues common AI index jobs after task create/update/delete and exposes a project-scoped controlled backfill endpoint for existing task rows. Provider readiness still gates PMS semantic/vector/RAG capability.
- `AI-RAG-08C` partial: `SnsAiIndexAdapter` projects SNS post RDB rows, board/category/tag/count metadata, and conservative visibility ACL snapshots into the common AI index contract. `PostService` queues common AI index jobs after post create/update/delete storage points. SNS board/comment projection, controlled backfill, and provider-ready SNS vector evidence remain open.

The platform remains not production-ready until provider-ready runtime smoke proves configured embeddings, vector retrieval, and DMS Ask context assembly against a live Docker stack.
Provider-unavailable runtime smoke passed on 2026-07-02 against local Docker Postgres with placeholder embedding deployment semantics. The smoke was rerun after retrieval log item audit coverage was strengthened, and it passed again. Provider-ready smoke with a real embedding deployment remains open.
Static AI/RAG guard integration is in place: `codex:preflight` and `codex:push-guard` run `verify:ai-rag-platform` when AI/RAG platform paths change. `verify:ai-rag-runtime` ready mode now prechecks Azure OpenAI endpoint/deployment/credential inputs before live calls and keeps retrieval log item plus DMS Ask run-source audit checks active after provider-mode assertions. Live provider-ready smoke is still separate because it requires a running server, Docker Postgres, and Azure OpenAI embedding configuration.
Provider-ready CI/operational entrypoint is now fixed in `.github/workflows/ai-rag-runtime.yml`. It is manual `workflow_dispatch` only. The workflow writes Azure OpenAI values into the server `.env` only for `provider_mode=ready`; `provider_mode=unavailable` forces placeholder/empty provider env so fallback smoke is deterministic even when repository secrets exist. In ready mode the workflow now delegates the live proof to `complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run`, so provider-ready precheck, Docker runtime start, `/api/health` wait, live smoke, report verification, Markdown summary, and evidence block artifact generation all use the same ordered runner. In unavailable mode, the workflow keeps the fallback/stale runtime smoke and report verification path. For local or artifact replay closeout, `pnpm run complete:ai-rag-central-foundation` without `--dry-run` remains the ordered completion runner across provider-ready precheck, live smoke, report verification, evidence recording, and central completion gate. On a verification host, `--docker-runtime --docker-runtime-cleanup` starts the server stack through explicit `compose.yaml + compose.local.yaml`, waits for `/api/health`, and stops the runtime without deleting volumes. If provider-ready Azure values live in a separate file, `--env-file=<path>` / `AI_RAG_PROVIDER_READY_ENV_FILE=<path>` feeds the same values to the smoke runner and Docker Compose interpolation; `compose.yaml` exposes the server Azure OpenAI env keys explicitly. This is a local verification profile, not the public deployment profile; public deployment uses the fail-closed `.env.production + compose.production.yaml` path. The report and Markdown summary include `sourceCoverage` evidence showing DMS/CRM/PMS/SNS registered and Admin still `missing_adapter`. A successful ready run with real Azure embedding secrets and a verified summary/evidence block artifact is still the open proof.

<!-- AI_RAG_PROVIDER_READY_EVIDENCE:START -->
Provider-ready evidence status: pending

- Required report: `output/ai-rag-runtime-smoke-ready.json`
- Required summary: `output/ai-rag-runtime-smoke-ready.md`
- Completion command: `pnpm run complete:ai-rag-central-foundation`
- Recording command: `pnpm run record:ai-rag-provider-ready-evidence -- --report=output/ai-rag-runtime-smoke-ready.json --summary=output/ai-rag-runtime-smoke-ready.md`
<!-- AI_RAG_PROVIDER_READY_EVIDENCE:END -->

Legacy DMS vector store transition criteria are fixed in `docs/common/guides/ai-rag-runtime-runbook.md`. `dms_document_embeddings` and `loadLegacySearchContext` stay in place until provider-ready workflow is green and a legacy/common retrieval comparison result is recorded. The provider-ready runtime smoke now performs the fixture-level comparison by requiring legacy chunks plus common retrieval result/context rows for the same DMS document.

## 2026-07-02 Design Alignment

The user-confirmed direction is now fixed in the roadmap:

- Domain-oriented data remains canonical in each domain RDB schema.
- The AI/RAG layer is a common projection/index/audit layer over those RDB records, not a replacement for domain tables.
- The current vector store is PostgreSQL `pgvector` in `common.cm_ai_embedding_m`, not a separate vector DB product.
- No production embedding model/deployment is assigned yet. Empty or placeholder embedding deployment values are treated as provider unavailable, and stale index state plus DMS legacy fallback are expected until an embedding profile is configured and smoked.
- Current technology decision: do not adopt LangChain or LangGraph for `AI-RAG-10A`, DMS reference path hardening, or CRM/PMS/SNS/Admin adapter expansion. SSOO owns the custom pipeline around chunking, embeddings, vector search, keyword fallback, ACL filtering, context assembly, model gateway, and run audit, with AI SDK as the provider/model boundary.
- Type contract status: legacy retrieval compatibility names are explicit as `AiLegacyRetrieval*`, while canonical common RAG retrieval names are `CommonAiRetrieval*`. New assistant/web surface work should consume `CommonAiRetrieval*`.
- Source coverage status: registered adapters and planned source apps share the `/ai-index/status` surface. DMS, CRM, PMS, and SNS are registered; the missing Admin adapter is explicit as `missing_adapter`, so the roadmap gap remains visible until implemented. CRM remains partial because provider-ready vector evidence is still open, and SNS remains partial because only post projection/write-hook is implemented.
- Projection contract status: `AiIndexingService` validates every adapter `AiIndexObjectProjection` before DB/object/chunk/embedding writes. The validator rejects source/target drift, invalid ACL search/context eligibility, invalid JSON metadata/snapshots, and duplicate or empty chunks so future domain adapters fail at the common boundary.
- Operations contract status: common AI index queue/run endpoints are admin/system-override guarded; queued job execution is separated behind `AiIndexWorkerService`; `AiIndexSchedulerService` can be enabled with `AI_INDEX_WORKER_ENABLED=true`; retry backlog observability is available through `/ai-index/jobs/metrics`.

Immediate implementation gap from the design check:

- DMS is the reference adapter, and its `semantic`/`vector`/`ragContext` source capability now follows embedding provider readiness. Provider-unavailable runtime proof is complete; provider-ready vector proof is still open and must not be treated as production RAG readiness.
- PMS project/task is the first write-hooked RDB-domain adapter path. It proves the intended direction for domain-oriented RDB data and now has storage-point queue hooks plus project/task controlled backfill. Provider-ready vector proof is still open.
- CRM opportunity/customer/activity is the first CRM RDB-domain adapter slice. It proves the CRM direction for sales ledger rows and now queues opportunity create/update/confirm/reopen/add-version, customer create/update, activity create, and controlled customer/activity backfill jobs. Customer/activity API access guards and snapshots have a first slice; provider-ready vector evidence remains open.
- SNS post is registered as the first SNS slice, while SNS board/comment/backfill and Admin adapter remain open.

## Source Of Truth

Primary roadmap and progress accounting:

- `docs/common/explanation/architecture/ai-rag-platform-roadmap.md`
- `docs/common/guides/ai-rag-runtime-runbook.md`
- `.github/workflows/ai-rag-runtime.yml`
- `docs/CHANGELOG.md`
- `scripts/verify-ai-rag-platform.mjs`

Common data plane:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260623053000_add_common_ai_rag_platform/migration.sql`
- `packages/database/prisma/migrations/20260702090000_add_crm_opportunity_ledger/migration.sql`
- `packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql`
- `packages/database/prisma/triggers/63_cm_ai_source_h_trigger.sql`
- `packages/database/prisma/triggers/64_cm_ai_object_h_trigger.sql`
- `packages/database/prisma/triggers/65_cm_ai_index_state_h_trigger.sql`
- `packages/database/prisma/triggers/66_crm_opportunity_h_trigger.sql`
- `packages/database/prisma/triggers/67_crm_opportunity_line_h_trigger.sql`
- `packages/database/prisma/seeds/52_crm_opportunities.sql`
- `packages/database/scripts/apply-triggers.ts`
- `scripts/db-init-entrypoint.sh`
- `scripts/verify-ai-rag-runtime-smoke.mjs`
- `scripts/verify-ai-rag-central-foundation.mjs`
- `scripts/complete-ai-rag-central-foundation.mjs`

Shared contracts:

- `packages/types/src/common/ai.ts`
- `packages/types/src/common/ai-index.ts`
- `packages/types/src/common/ai-retrieval.ts`
- `packages/types/src/crm/customer.ts`
- `packages/types/src/pms/project.ts`
- `packages/types/src/pms/task.ts`
- `packages/types/src/common/index.ts`
- `packages/types/src/index.ts`

Server implementation:

- `apps/server/src/modules/common/ai-index/ai-index.module.ts`
- `apps/server/src/modules/common/ai-index/ai-azure-provider.ts`
- `apps/server/src/modules/common/ai-index/ai-azure-provider.spec.ts`
- `apps/server/src/modules/common/ai-index/ai-index-projection.validator.ts`
- `apps/server/src/modules/common/ai-index/ai-index-projection.validator.spec.ts`
- `apps/server/src/modules/common/ai-index/ai-index-scheduler.service.ts`
- `apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts`
- `apps/server/src/modules/common/ai-index/ai-indexing.service.ts`
- `apps/server/src/modules/common/ai-index/ai-index-worker.service.ts`
- `apps/server/src/modules/common/ai-index/ai-retrieval.service.ts`
- `apps/server/src/modules/common/ai-index/ai-conversation.service.ts`
- `apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts`
- `apps/server/src/modules/common/ai-index/ai-index.controller.ts`
- `apps/server/src/modules/crm/opportunity/opportunity.service.ts`
- `apps/server/src/modules/crm/opportunity/opportunity.service.spec.ts`
- `apps/server/src/modules/crm/customer/customer.controller.ts`
- `apps/server/src/modules/crm/customer/customer.service.ts`
- `apps/server/src/modules/crm/customer/customer.service.spec.ts`
- `apps/server/src/modules/crm/search/crm-ai-index.adapter.ts`
- `apps/server/src/modules/crm/search/crm-ai-index.adapter.spec.ts`
- `apps/server/src/modules/crm/search/search.module.ts`
- `apps/server/src/modules/pms/project/project.controller.ts`
- `apps/server/src/modules/pms/project/project.module.ts`
- `apps/server/src/modules/pms/project/project.service.ts`
- `apps/server/src/modules/pms/project/project.service.spec.ts`
- `apps/server/src/modules/pms/search/pms-ai-index.adapter.ts`
- `apps/server/src/modules/pms/search/pms-ai-index.adapter.spec.ts`
- `apps/server/src/modules/pms/search/search.module.ts`
- `apps/server/src/modules/pms/task/task.controller.ts`
- `apps/server/src/modules/pms/task/task.module.ts`
- `apps/server/src/modules/pms/task/task.service.ts`
- `apps/server/src/modules/pms/task/task.service.spec.ts`

DMS reference integration:

- `apps/server/src/modules/dms/search/dms-ai-index.adapter.ts`
- `apps/server/src/modules/dms/search/search.service.ts`
- `apps/server/src/modules/dms/search/search.module.ts`
- `apps/server/src/modules/dms/ask/ask.service.ts`
- `apps/server/src/modules/dms/ask/ask.module.ts`

## Behavioral Baseline

DMS Ask now follows this order:

1. Normalize DMS Ask request and messages.
2. Use `AiRetrievalService.retrieve()` scoped to `sourceApp: 'dms'` and `entityTypes: ['document']`.
3. Convert common retrieval `contextItems`, `citations`, and readable results into the existing DMS Ask response shape.
4. Preserve legacy DMS `SearchService` vector/keyword path as fallback when common retrieval is empty or unavailable.
5. Start common conversation/message/run audit before model execution.
6. Generate or stream through `AiModelGatewayService`, not DMS `getChatModel()`.
7. Record provider/model/deployment metadata from the gateway status into run audit metadata.
8. Complete run audit as `succeeded`, `failed`, or `cancelled`.

The existing DMS Ask JSON and stream response shape is intentionally unchanged.

## Verification Evidence

Source and build gates passed on 2026-06-23:

- `pnpm run codex:preflight`
- `pnpm run verify:ai-rag-platform`
- `pnpm run build:server`
- `pnpm run codex:verify-sync`
- `pnpm run codex:dms-guard`

Docker rebuild evidence:

- A plain `pnpm docker:build` can fail on this WSL/Docker Desktop environment because the local Docker config uses `credsStore: desktop.exe`, and the credential helper can fail with `UtilAcceptVsock: accept4 failed 110`.
- Existing local DB volumes can contain pre-roadmap `common.cm_ai_*` WIP rows. `db-init` runs `packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql` before schema reconciliation. In the default `DB_INIT_PRISMA_PUSH_MODE=auto` mode, it detects legacy AI/RAG extra columns and skips `prisma db push` to avoid destructive column drops; seed and trigger apply still run.
- The verified workaround is:

```bash
mkdir -p /tmp/ssoo-docker-no-creds
env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose build
env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose up -d --build
```

Using that workaround, these images were rebuilt successfully:

- `ssoo-server`
- `ssoo-dms`
- `ssoo-pms`
- `ssoo-crm`
- `ssoo-sns`
- `ssoo-admin`
- `ssoo-db-init`

Known non-blocking warning:

- Several Next.js builds print stale Browserslist data warnings. Treat this as dependency maintenance, not as an AI/RAG blocker.

Runtime smoke evidence on 2026-07-02:

- `pnpm run verify:ai-rag-runtime` passed against local Docker Postgres with `AZURE_OPENAI_EMBEDDING_DEPLOYMENT=<embedding-deployment>` treated as provider unavailable.
- The strengthened provider-unavailable rerun used fixture `verify-ai-rag/runtime-smoke-2026-07-02T04-05-56-006Z.md` and passed DMS save, common AI job, retrieval query, DMS Ask audit path, and DB row checks.
- The smoke used unique DMS fixture paths under `verify-ai-rag/runtime-smoke-*.md` to avoid DMS collaboration/publish isolation from previous failed runs.
- Verified rows: DMS common source status false for semantic/vector/RAG, common object/chunk/state with stale status, zero active common embeddings, retrieval log header/item rows, and DMS Ask conversation/run audit rows.
- Local legacy `common.cm_ai_*` tables required `packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql` plus AI history trigger reapply. This is now captured in `docs/common/guides/ai-rag-runtime-runbook.md`, and `prisma db push --accept-data-loss` was not used.
- Static guard integration: `pnpm run codex:preflight` and `pnpm run codex:push-guard` execute `pnpm run verify:ai-rag-platform` for AI/RAG path changes.
- Provider-ready preparation: `pnpm run verify:ai-rag-runtime -- --dry-run --provider-mode=ready --check-provider-env` reports and fails missing/placeholder Azure OpenAI embedding environment before live server calls.
- Runtime audit coverage: provider-unavailable mode verifies retrieval log header/item audit when a retrieval log is returned, and provider-ready mode additionally requires DMS Ask `cm_ai_run_m`/`cm_ai_run_source_r` prompt source rows after embedding/context assertions.
- Provider-ready comparison coverage: `verify-ai-rag-runtime-smoke.mjs` compares legacy `dms_document_embeddings` chunks with common retrieval results/context for the same DMS fixture and fails if either path misses the smoke query.
- Provider-ready CI/operational gate: `.github/workflows/ai-rag-runtime.yml` exists and is wired to `verify:ai-rag-runtime:ready-precheck`, `verify:ai-rag-runtime:ready`, `verify:ai-rag-runtime:unavailable`, and `verify:ai-rag-runtime-report`. Its server `.env` writer is provider-mode separated, so unavailable smoke does not accidentally consume configured Azure secrets. The workflow verifies the structured smoke report JSON, writes a Markdown evidence summary, and uploads both as `ai-rag-runtime-smoke-${provider_mode}`.
- Legacy vector transition gate: `dms_document_embeddings` write/read path and `loadLegacySearchContext` fallback are statically guarded until provider-ready workflow is green, legacy/common retrieval drift is recorded, and the staged `parallel read/write -> common default -> legacy read disable -> archival/drop` sequence is explicitly executed.
- Planned source coverage: `/ai-index/status` includes DMS/CRM/PMS/SNS as registered sources and Admin as an inactive `missing_adapter` row until its adapter is implemented. `verify-ai-rag-runtime-smoke.mjs` copies that coverage into JSON report `sourceCoverage`, and `verify-ai-rag-runtime-report.mjs` requires it before writing the Markdown summary.
- Projection guard: common AI indexing now calls `assertAiIndexObjectProjection` before any adapter projection is persisted. This is the required gate for remaining SNS board/comment/backfill and Admin adapter work.

## Remote Publish Procedure

The repository currently uses:

- GitHub `origin`: `main`
- GitLab `gitlab`: workspace branch `development`

Use this sequence when publishing:

1. `git fetch origin`
2. If `origin/main` has new commits, merge them locally before push and rerun Docker verification.
3. Commit the current workspace.
4. Run `pnpm run codex:push-guard`.
5. Run `pnpm run codex:workspace-publish`.

`codex:workspace-publish` pushes GitHub first and then pushes GitLab `development` with the GitLab credentials stored in local config or environment. If GitLab `development` cannot fast-forward to local `HEAD`, the script aborts before publishing and instructs the operator to run:

```bash
pnpm run codex:workspace-sync-from-gitlab
```

After a GitLab sync merge, rerun validation and Docker rebuild before publishing again.

## Immediate Next Work

For the central common foundation objective, continue `AI-RAG-10A provider-ready runtime proof` when a real Azure embedding deployment is available. Use `pnpm run complete:ai-rag-central-foundation` as the ordered closeout path once the target environment has the provider-ready server/Docker/Azure inputs, or add `--docker-runtime --docker-runtime-cleanup` when the runner should start and stop the Docker server runtime itself. CRM provider-ready evidence, SNS board/comment/backfill, and Admin adapter work remain service rollout backlog: they consume the common AI/RAG module but do not change whether the central module boundary exists.

Recommended scope:

- Keep `DB_INIT_PRISMA_PUSH_MODE=auto` as the default non-destructive local-volume path, and only use `force` after backup/review.
- Run `pnpm run verify:ai-rag-runtime:ready-precheck` in the target environment before live provider-ready smoke.
- Run `pnpm run verify:ai-rag-runtime:ready` in an environment with Azure embedding env and record vector/RAG capability plus embedding row behavior.
- Run `.github/workflows/ai-rag-runtime.yml` with `provider_mode=ready` after Azure secrets are configured, then record the workflow result and verified `ai-rag-runtime-smoke-ready.md` summary here and in the roadmap.
- Compare representative DMS legacy `dms_document_embeddings` retrieval results with common `cm_ai_embedding_m` retrieval before disabling any legacy fallback.
- Execute common retrieval query against `sourceApp: 'dms'`.
- Exercise DMS Ask JSON and stream minimal paths.
- Confirm `cm_ai_retrieval_log_m`, `cm_ai_retrieval_log_item_m`, `cm_ai_conversation_m`, `cm_ai_message_m`, `cm_ai_run_m`, and `cm_ai_run_source_r` rows are written as expected.
- Keep the PMS project controlled backfill endpoint limited to system-override/admin users and bounded batch limits.
- Keep the PMS task controlled backfill endpoint project-scoped through `canManageTasks` and bounded batch limits.
- Keep the CRM customer/activity controlled backfill endpoint limited to system-override/admin users and bounded entity-type batch limits.
- Keep CRM full/SNS residual/Admin production rollout blocked until their adapters have the same projection validator, source coverage, and runtime evidence shape.

Do not claim PMS/CRM/SNS vector/RAG production readiness, DMS legacy vector transition, or CRM full/SNS residual/Admin adapter rollout complete until the provider-ready workflow passes with real Azure embedding configuration and the result is documented.

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-15 | Corrected `/ai-index/status` registration evidence to require a live registry adapter instead of trusting retained `cm_ai_source_m` rows. The runtime smoke now keeps Admin visibly `missing_adapter` even when legacy source metadata remains in the database. |
| 2026-07-08 | Added CRM customer/activity API access guard/snapshot first slice with customer-specific permissions, `crm.customer` object policy, legacy opportunity permission compatibility mapping, web-crm access proxy routes, and verifier coverage. AI-RAG-08A remains partial because provider-ready vector evidence is still open. |
| 2026-07-08 | Added CRM customer/activity controlled AI index backfill queueing, shared backfill contracts, failure summary tests, verifier coverage, and owner-aware ACL snapshots. AI-RAG-08A remains partial because provider-ready vector evidence is still open. |
| 2026-07-07 | Added CRM customer/activity RDB ledger projection and write-hook queueing. AI-RAG-08A remained partial because CRM controlled backfill endpoint, provider-ready vector evidence, and customer/activity object policy refinement were still open. |
| 2026-07-03 | Added provider-ready env-file support to `complete:ai-rag-central-foundation` and Azure OpenAI interpolation in `compose.yaml` for verification hosts. |
| 2026-07-03 | Routed the provider-ready workflow live smoke through `complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run`, leaving provider-unavailable smoke on the fallback path. |
| 2026-07-03 | Added opt-in Docker runtime start/health-check/cleanup mode to `complete:ai-rag-central-foundation` for provider-ready closeout on verification hosts. |
| 2026-07-03 | Routed provider-ready workflow evidence artifact generation through `complete:ai-rag-central-foundation -- --use-existing-artifacts --dry-run` so CI and local closeout share the same runner. |
| 2026-07-03 | Added `complete:ai-rag-central-foundation` as the ordered provider-ready closeout runner across precheck, live smoke, report verification, evidence recording, and central completion gate. |
| 2026-07-03 | Added CRM opportunity create/update/confirm/reopen/add-version write-hook queueing into the common AI index job queue. AI-RAG-08A remained partial because CRM customer/activity projection, controlled backfill, and provider-ready evidence were still open. |
| 2026-07-03 | Split central common foundation progress from service rollout backlog. Added admin/system-override guarded AI index job operations, `AiIndexWorkerService` execution boundary, env-gated `AiIndexSchedulerService`, `/ai-index/jobs/metrics` retry backlog observability, `record:ai-rag-provider-ready-evidence`, provider-ready evidence block workflow artifact, `verify:ai-rag-evidence-recorder` preflight/push self-test, and `verify:ai-rag-central-foundation:complete` provider-ready completion gate. Overall platform progress is 77.90%; central common foundation progress is 89.26%. |
| 2026-07-02 | Added SNS post provider-gated AI index adapter and post create/update/delete AI index queue hooks. AI-RAG-08C remains partial because SNS board/comment projection, controlled backfill, and provider-ready evidence are still open. Runtime source coverage now expects DMS/CRM/PMS/SNS registered and Admin `missing_adapter`. |
| 2026-07-02 | Added CRM opportunity RDB ledger, seed/history triggers, RDB-backed opportunity service, and provider-gated CRM opportunity AI index adapter. AI-RAG-08A remained partial because CRM customer/activity projection, write-hook/backfill, and provider-ready evidence were still open. |
| 2026-07-02 | Added project-scoped PMS task controlled AI index backfill and shared task request/response contract; AI-RAG-08B remaining work is provider-ready vector evidence. |
| 2026-07-02 | Added PMS task RDB projection and task create/update/delete AI index queue hooks; provider-ready evidence remains open. |
| 2026-07-02 | Added a system-override/admin controlled PMS project AI index backfill endpoint and shared request/response contract; provider-ready evidence remains open. |
| 2026-07-02 | Added PMS project create/update/delete/detail/stage write-hook queueing into the common AI index job queue; provider-ready evidence remains open. |
| 2026-07-02 | Added PMS project RDB AI index adapter and updated source coverage expectations at that slice to DMS/PMS registered with Admin/CRM/SNS still `missing_adapter`. |
| 2026-07-02 | Added common AI index projection validator and tests to block source/target, ACL, JSON, and chunk invariant drift before adapter projections hit DB writes. |
| 2026-07-02 | Added runtime smoke `sourceCoverage` evidence and report validation; after SNS post registration, Admin remains `missing_adapter`. |
| 2026-07-02 | Added `/ai-index/status` planned source coverage so adapter gaps appear as `missing_adapter` rows until implemented. Current missing source is Admin. |
| 2026-07-02 | Added explicit legacy/common AI retrieval aliases in `@ssoo/types` and documented `CommonAiRetrieval*` as the assistant-facing contract. |
| 2026-07-02 | Added Markdown evidence summary generation for validated runtime smoke reports and workflow artifacts. |
| 2026-07-02 | Added runtime smoke report verifier and wired the manual workflow to validate JSON evidence before artifact upload. |
| 2026-07-02 | Added structured runtime smoke report JSON and GitHub Actions artifact upload for provider-ready/unavailable manual runs. |
| 2026-07-02 | Added provider-ready runtime smoke comparison between legacy `dms_document_embeddings` chunks and common retrieval result/context for the DMS fixture. |
| 2026-07-02 | Fixed provider-mode-separated server env writing in the manual AI/RAG runtime workflow and documented the legacy `dms_document_embeddings` transition/rollback gate. |
| 2026-07-02 | Added the manual `AI/RAG Runtime Verification` workflow as the provider-ready CI/operational entrypoint; a green run with real Azure embedding secrets remains open proof. |
| 2026-07-02 | Reran provider-unavailable runtime smoke after retrieval log item audit coverage was strengthened; the local Docker Postgres path passed again, while provider-ready run-source live proof remains open. |
| 2026-07-02 | Kept provider-ready runtime smoke audit checks active after embedding/context assertions, including retrieval log item and DMS Ask run-source rows. |
| 2026-07-02 | Added provider-ready env precheck to `verify:ai-rag-runtime` so missing/placeholder Azure OpenAI embedding configuration fails before live smoke calls. |
| 2026-07-02 | Wired `verify:ai-rag-platform` into Codex preflight and push guard for AI/RAG path changes; provider-ready live smoke remains the external-environment gate. |
| 2026-07-02 | Passed `verify:ai-rag-runtime` provider-unavailable smoke against local Docker Postgres. The compat bridge now preserves legacy AI/RAG WIP tables while adding canonical runtime columns/tables/defaults, and the smoke script uses unique DMS fixture paths plus the correct run audit join. |
| 2026-07-02 | Added Azure embedding provider placeholder guard so `<embedding-deployment>` style values keep provider readiness unavailable until a real deployment is configured. |
| 2026-07-02 | Added provider-aware DMS vector/RAG capability gate and `verify-ai-rag-runtime-smoke.mjs` runtime verifier entrypoint. Live Docker unavailable/ready smoke execution remains the next handoff item. |
| 2026-07-02 | Fixed the technology decision that LangChain/LangGraph are not adopted for the current AI/RAG workstream; implementation continues with custom pipeline, AI SDK provider/model boundary, and PostgreSQL pgvector. |
| 2026-07-02 | Added the user-confirmed AI/RAG architecture direction: domain RDB remains canonical, common AI projection owns vector/index/audit, pgvector is the current vector store, embedding provider can be unavailable, and DMS vector/RAG capability remains an explicit gate before domain adapter expansion. |
| 2026-06-23 | Added AI/RAG handoff after completing DMS Ask common retrieval/run audit and common model gateway integration. |
