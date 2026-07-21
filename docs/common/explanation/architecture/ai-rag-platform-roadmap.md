# AI/RAG Platform Roadmap

> Status: active platform workstream
> Scope: server common AI/RAG data plane, shared type contracts, domain index adapters, retrieval, conversation/run logging
> Progress snapshot: 2026-07-07, 78.30% weighted implementation progress; central common foundation 89.26%

## Target Shape

SSOO AI/RAG 공용화의 기준은 앱별 DB를 같은 형태로 바꾸는 것이 아니라, 각 도메인이 소유한 데이터를 AI가 소비할 수 있는 projection으로 변환해 공용 data plane에 적재하는 것이다.

도메인 원본은 계속 각 모듈이 소유한다.

- DMS: 문서, 첨부, 문서 ACL, 문서 메타데이터
- CRM: 영업기회, 고객, 활동
- PMS: 프로젝트, 태스크, 멤버, 상태
- SNS: 게시물, 댓글, 보드
- Admin: 제한된 사용자/시스템 설정 메타데이터

공용 계층은 다음을 소유한다.

- `common.cm_ai_source_m`: source app / adapter / capability registry
- `common.cm_ai_object_m`: AI 검색 가능한 원본 객체 projection
- `common.cm_ai_chunk_m`: RAG context 후보 chunk
- `common.cm_ai_embedding_m`: embedding profile별 vector
- `common.cm_ai_acl_snapshot_m`: 검색/RAG pre-filter용 권한 snapshot
- `common.cm_ai_index_job_m`: reindex queue / retry / status
- `common.cm_ai_index_state_m`: object별 indexing state
- `common.cm_ai_retrieval_log_m`: retrieval/request audit
- `common.cm_ai_conversation_m`, `cm_ai_message_m`, `cm_ai_reference_m`, `cm_ai_run_m`, `cm_ai_run_source_r`: AI 대화와 model run 기록

## Architecture Alignment Baseline

2026-07-02 설계 점검 결과, AI/RAG platform의 기준 방향을 다음처럼 고정한다.

- 도메인 oriented data는 각 도메인의 RDB schema가 정본이다. 공용 AI/RAG schema는 업무 원장을 대체하지 않는다.
- 공용 AI/RAG 계층은 도메인 RDB 위에 얹는 projection/index/audit 계층이다. 각 adapter는 원본 row를 직접 넘기지 않고 `AiIndexObjectProjection`과 ACL snapshot만 반환한다.
- 현재 vector store는 별도 vector DB 제품이 아니라 PostgreSQL `pgvector`를 사용하는 `common.cm_ai_embedding_m`이다. 별도 vector DB 도입은 운영 요구가 확인될 때 재검토한다.
- embedding provider는 profile 단위로 교체 가능해야 한다. 현재 레포에는 특정 운영 embedding model/deployment가 확정되어 있지 않으므로 provider unavailable 상태와 legacy fallback은 정상 운영 경로로 문서화한다.
- AI-RAG-10A runtime smoke, DMS reference path, CRM/PMS/SNS/Admin adapter expansion 범위에서는 LangChain/LangGraph를 도입하지 않는다. SSOO는 custom pipeline으로 chunking, embedding, vector search, keyword fallback, ACL pre-filter, context assembly, model gateway, conversation/run audit를 소유한다.
- 도메인 저장/동기화 지점은 adapter registry와 index job/sync API에 연결한다. 공용 service가 CRM/PMS/DMS/SNS/Admin 도메인 DB를 직접 import하지 않는다.
- 검색 가능성(`searchEligible`)과 RAG context 가능성(`contextEligible`)은 분리한다. 읽기/발견 권한이 있어도 prompt context로 넣을 수 없는 객체는 context 후보에서 제외한다.
- production-ready 판정은 문서/빌드 통과가 아니라 Docker Postgres runtime에서 DB apply, DMS reindex, retrieval, DMS Ask audit가 한 번에 증명될 때만 가능하다.

## Technology Decision: LangChain/LangGraph

Decision: **do not adopt LangChain or LangGraph for the current AI/RAG platform implementation.**

이 결정은 검토 후보 보류가 아니라 현재 구현 기준이다. 현 workstream은 `custom pipeline + AI SDK provider/model boundary + PostgreSQL pgvector`로 진행한다.

근거:

- 현재 핵심 문제는 generic RAG chain 조립보다 SSOO 도메인 RDB 정본, projection, ACL snapshot, source capability, index state, retrieval audit, conversation/run audit를 한 DB/control-plane에서 일관되게 운영하는 것이다.
- LangChain의 vector store/retriever를 쓰더라도 ACL pre-filter, search/context eligibility, source capability, stale/profile mismatch gate, audit write는 SSOO custom 계층으로 남는다.
- 이미 `ai`/`@ai-sdk/azure`를 통해 embedding/chat provider boundary를 갖고 있어, model 호출 추상화를 위해 LangChain을 추가할 필요가 현재는 낮다.
- LangGraph의 장점인 durable/stateful agent orchestration은 지금 범위인 DMS retrieval smoke와 domain adapter expansion의 선행 조건이 아니다.

금지/허용 범위:

- `AI-RAG-10A`, `AI-RAG-04A`, `AI-RAG-05D`, `AI-RAG-08A~08D` 구현 중 LangChain/LangGraph 병행 구현을 만들지 않는다.
- LangChain/LangGraph 도입은 future assistant workflow가 multi-step agent, human-in-the-loop, external tool orchestration을 요구할 때 별도 새 ADR로 다시 결정한다. 그 전까지는 현재 결정이 유효하다.

## Current Baseline

2026-07-02 기준으로 다음 기준선을 유지한다.

- `@ssoo/types/common`에 `ai`, `ai-index`, `ai-retrieval` 계약을 복원했다.
- Prisma schema와 migration에 `common.cm_ai_*` data plane을 추가했다.
- `cm_ai_source_m`, `cm_ai_object_m`, `cm_ai_index_state_m`는 history trigger 대상이다.
- 서버 `CommonAiIndexModule`은 adapter registry, source status, job queue/run, object projection apply를 제공한다.
- `CommonAiIndexModule`의 운영 job endpoint는 system-override/admin 권한 guard를 통과해야 하며, job 실행은 controller가 `AiIndexingService`를 직접 호출하지 않고 `AiIndexWorkerService` worker boundary를 통과한다.
- `CommonAiIndexModule`은 `/ai-index/jobs/metrics`에서 runnable/pending/running/failed/exhausted/retry-waiting queue metrics를 반환해 retry backlog를 공용 관측성 surface로 노출한다.
- `CommonAiIndexModule`은 disabled-by-default `AiIndexSchedulerService`를 제공한다. 운영 환경은 `AI_INDEX_WORKER_ENABLED=true`, `AI_INDEX_WORKER_INTERVAL_MS`, `AI_INDEX_WORKER_BATCH_LIMIT`, `AI_INDEX_WORKER_RUN_ON_START`로 공용 worker 주기 실행을 켤 수 있다.
- `CommonAiIndexModule`은 Azure OpenAI embedding provider foundation을 소유하고, provider readiness를 source/state metadata에 기록한다. `AZURE_OPENAI_EMBEDDING_DEPLOYMENT=<embedding-deployment>` 같은 placeholder 값은 configured deployment로 보지 않고 provider unavailable로 처리한다.
- 공용 indexer는 stable chunk identity를 유지하며 active chunk hash 기준으로 `cm_ai_embedding_m`을 upsert한다.
- 공용 index job은 batch size, retry/backoff, max attempt, provider unavailable/runtime failure, profile mismatch reindex metadata를 job/state에 기록한다.
- `CommonAiIndexModule`은 공용 retrieval query service를 제공하며 query embedding, `cm_ai_embedding_m` vector search, keyword fallback, ACL snapshot pre-filter를 처리한다.
- 공용 retrieval query service는 response `contextItems`/`citations`를 조립하고 `common.cm_ai_retrieval_log_m`/item에 request/result/context audit를 남기며, log가 남은 context가 있을 때만 `ragReady`를 true로 올린다.
- `CommonAiIndexModule`은 공용 conversation/message/reference/run/run-source service와 API를 제공하며, model run audit source를 retrieval log/reference/object/chunk로 기록한다.
- DMS AskService는 공용 retrieval을 우선 호출해 `contextItems`/`citations`를 기존 DMS Ask 응답 shape로 매핑하고, conversation/message/run/run-source audit에 `retrievalLogId`와 prompt 포함 source를 기록한다. 공용 retrieval이 비거나 실패하면 기존 DMS SearchService 기반 legacy vector/keyword path로 fallback한다.
- `CommonAiIndexModule`은 공용 model gateway를 제공하며, DMS AskService의 chat model generation/stream 실행과 provider/model/deployment metadata 기록은 이 gateway 경계를 통과한다.
- DMS `DmsAiIndexAdapter`는 markdown 문서를 첫 reference implementation으로 공용 AI index projection에 적재한다.
- PMS `PmsAiIndexAdapter`는 PMS project RDB row, stage/detail/status/member/org ACL snapshot과 task RDB row/WBS/assignee/project ACL snapshot을 `AiIndexObjectProjection`으로 투영하는 첫 RDB-domain adapter다. PMS `ProjectService`는 project create/update/delete/detail upsert/stage transition 저장 지점에서 공용 AI index job queue를 호출하고, 관리자용 controlled backfill endpoint로 기존 project row도 `backfill` job으로 enqueue할 수 있다. PMS `TaskService`는 task create/update/delete 저장 지점에서 공용 AI index job queue를 호출하며, project-scoped task controlled backfill endpoint로 기존 task row도 제한된 batch로 enqueue할 수 있다. PMS 업무 원장과 상태 전이 판단은 계속 PMS RDB/service가 소유하고, adapter는 AI index projection만 제공한다.
- CRM은 `crm.crm_opportunity_m`/`crm.crm_opportunity_line_d` RDB 원장과 `crm.crm_customer_m`/`crm.crm_customer_activity_d` 고객/활동 원장, history trigger, seed/backfill, service read/write model을 갖고, `CrmAiIndexAdapter`가 opportunity/customer/activity row를 `AiIndexObjectProjection`으로 투영한다. `OpportunityService`는 opportunity create/update/confirm/reopen/add-version 저장 지점에서, `CustomerService`는 customer create/update와 activity create 및 controlled backfill 지점에서 공용 AI index job queue를 호출한다. CRM customer/activity projection은 owner-aware ACL snapshot을 포함하고, 고객/활동 API는 공용 access 기반 customer/activity guard와 object access snapshot 1차를 사용한다. provider-ready vector evidence는 아직 남아 있다.
- SNS post first slice는 `SnsAiIndexAdapter`가 active post row, board/category/tag/count metadata, conservative visibility ACL snapshot을 `AiIndexObjectProjection`으로 투영하고, `PostService`가 post create/update/delete 저장 지점에서 `sourceApp: "sns"`/`entityType: "post"` job을 queue한다. Organization visibility는 `organizationIds` ACL snapshot으로 제한하고, followers/self visibility는 owner-only snapshot으로 축소한다. SNS board/comment projection과 backfill은 아직 남아 있다.
- `AiIndexingService`는 adapter projection을 DB/object/chunk/embedding write 전에 `assertAiIndexObjectProjection`으로 검증한다. 이 gate는 source/target drift, ACL search/context eligibility 역전, duplicate chunk identity 같은 도메인 adapter 오류를 DB write 이전에 차단한다.
- 기존 DMS `dms_document_embeddings` runtime store는 당장 제거하지 않고, 공용 `cm_ai_*` 이관이 완료될 때까지 legacy vector store로 남긴다. 전환 기준은 `docs/common/guides/ai-rag-runtime-runbook.md`의 `Legacy DMS Vector Store Transition`에 고정했다.

## Reconfirmed Gaps

2026-07-02 설계 점검에서 다음 gap을 잔여 작업으로 명시했다.

- DMS adapter는 source capability를 embedding provider readiness 기준으로 올리도록 정리됐다. provider unavailable/placeholder 환경의 stale/fallback은 Docker Postgres runtime smoke로 통과했고, provider configured 환경의 vector retrieval은 아직 증명해야 한다.
- embedding provider foundation은 있지만 운영 embedding model/deployment는 아직 확정되지 않았다. 비어 있거나 placeholder인 deployment 값은 unavailable로 고정하며, provider unavailable 상태에서 stale index와 legacy fallback이 기대 동작이다.
- 도메인 저장 지점과 common AI index sync 연결은 DMS 일부 경로, PMS project/task write-hook, PMS project/task backfill queue, CRM opportunity/customer/activity write-hook과 customer/activity controlled backfill queue, SNS post write-hook이 기준선이다. CRM은 provider-ready vector evidence가 남아 있다. SNS는 post first slice만 등록됐으며 board/comment projection과 backfill은 남아 있다. Admin adapter는 아직 없다.
- `/ai-index/status`는 registered DMS/CRM/PMS/SNS source뿐 아니라 admin planned source를 `missing_adapter`로 드러낸다. 따라서 남은 adapter 미구현 도메인이 status에서 숨지 않는다.
- 공통 projection validator와 PMS project/task adapter, CRM opportunity/customer/activity adapter, SNS post adapter가 들어갔다. 이 validator는 adapter expansion의 선행 안전장치이며, 남은 SNS board/comment, Admin adapter도 각 도메인 원장 row를 `AiIndexObjectProjection`으로 바꾸기 전에 같은 gate를 통과해야 한다.
- index job은 admin/system-override guarded API 기반 queue/run 경로, worker execution boundary, disabled-by-default scheduler binding, retry backlog metrics를 갖는다. 남은 중앙 운영 gap은 provider-ready smoke 증거다.
- `@ssoo/types/common/ai.ts`의 legacy retrieval contract와 `ai-retrieval.ts`의 common retrieval contract는 병존한다. `AiLegacyRetrieval*`와 `CommonAiRetrieval*` explicit alias를 추가해 web assistant 확장 시 common retrieval 계약을 명시적으로 선택할 수 있게 했다. 기존 `AiRetrieval*` 이름은 호환을 위해 남긴다.
- 현재 verifier는 구조/문자열/빌드 중심이고, runtime smoke는 별도 스크립트다. DB compat apply, trigger, DMS 저장 지점 common projection, retrieval log header/item, Ask run audit의 provider-unavailable path는 통과했다. `docs/common/guides/ai-rag-runtime-runbook.md`, `DB_INIT_PRISMA_PUSH_MODE=auto`, AI/RAG 변경 시 `codex:preflight`/`codex:push-guard`의 `verify:ai-rag-platform` 자동 실행 기준, provider-ready env precheck, provider-ready retrieval log item/run-source audit 검증 기준, provider-ready legacy/common retrieval comparison assertion, runtime smoke JSON report, planned source coverage evidence, `verify:ai-rag-runtime-report` structured report verifier와 Markdown evidence summary, `complete:ai-rag-central-foundation` ordered completion flow와 artifact dry-run evidence mode, provider-ready `--env-file`/compose Azure interpolation support, opt-in Docker runtime start/health-check/cleanup mode, provider mode별 `.env` 분리, `.github/workflows/ai-rag-runtime.yml` provider-ready 수동 CI/운영 gate가 같은 completion runner로 live smoke/report/evidence artifact를 생성하는 기준, legacy `dms_document_embeddings` 전환 기준은 고정됐다. 실제 Azure embedding deployment로 provider-ready live smoke를 통과시키고 검증된 결과 artifact를 확인하는 작업은 남아 있다.

## Progress Accounting

진척도는 사용자에게 보이는 검색 UI 진척도가 아니라 platform implementation 기준이다. 각 항목의 weight는 최종 AI/RAG 공용화 완료에 대한 상대 비중이고, overall progress는 `weight * status`의 합으로 계산한다.

| Phase | Weight | Status | Weighted | Evidence | Remaining |
| --- | ---: | ---: | ---: | --- | --- |
| AI-RAG-00 Roadmap/Guardrails | 5% | 100% | 5.0% | roadmap, changelog, verifier 기준선 | 세션 단절 대비 상태판 유지 |
| AI-RAG-01 Common Data Plane | 12% | 85% | 10.2% | Prisma models, migration, history triggers | 실제 DB 적용 smoke, pgvector index 운영 점검 |
| AI-RAG-02 Shared Type Contract | 8% | 90% | 7.2% | `@ssoo/types/common/ai*` exports, `AiLegacyRetrieval*`/`CommonAiRetrieval*` explicit aliases | web assistant surface 적용 시 import contract 정렬 |
| AI-RAG-03 Index Adapter Registry | 10% | 90% | 9.0% | registry, status API, admin/system-override guarded job queue/run, worker boundary, disabled-by-default scheduler binding, retry backlog metrics, planned source `missing_adapter` coverage, projection runtime validator | provider-ready 운영 증거와 배포별 worker enablement 값 확정 |
| AI-RAG-04 DMS Reference Adapter | 10% | 75% | 7.5% | DMS markdown projection, chunk/ACL snapshot, provider-aware vector/RAG capability gate, provider-unavailable runtime smoke | 첨부/문서 ACL 정밀화, legacy vector store 이관 |
| AI-RAG-05 Embedding Pipeline | 12% | 85% | 10.2% | common Azure embedding provider foundation, placeholder deployment guard, chunk hash diff, `cm_ai_embedding_m` upsert, job safety metadata | provider runtime smoke, migration/reindex runbook |
| AI-RAG-06 Retrieval Service | 12% | 85% | 10.2% | common retrieval query service, query embedding, vector search, keyword fallback, ACL pre-filter, retrieval log header/item audit, citation/context assembly, DMS Ask common retrieval consumption, provider-unavailable runtime smoke | provider-ready vector smoke, DMS legacy comparison |
| AI-RAG-07 Conversation and Run Service | 10% | 95% | 9.5% | conversation/run tables, common service/controller, message/reference append, run start/complete audit, run-source recording, DMS Ask run audit, common model gateway for DMS Ask, runtime smoke audit rows | broader DMS AI path migration |
| AI-RAG-08 Domain Adapter Expansion | 8% | 60% | 4.8% | PMS project/task RDB projection adapter, PMS project/task write-hook queue, PMS project/task controlled backfill queue, CRM opportunity/customer/activity RDB ledger/projection adapter/write-hook queue/customer-activity controlled backfill queue/owner-aware ACL snapshot, SNS post projection adapter/write-hook, DMS reference adapter | SNS board/comment/backfill and Admin projection adapters, provider-ready PMS/CRM/SNS vector evidence |
| AI-RAG-09 Web Assistant Surface | 8% | 5% | 0.4% | `/ssoo/search` search surface baseline | common assistant surface, streaming, citations, task actions |
| AI-RAG-10 Verification and Ops | 5% | 95% | 4.75% | `verify:ai-rag-platform`, server build, Docker build, `verify:ai-rag-runtime` provider-unavailable Docker Postgres pass with retrieval log item audit, runtime runbook, non-destructive legacy DB init mode, preflight/push-guard static AI/RAG guard, provider-ready env precheck, dedicated provider-ready/unavailable scripts, `verify:ai-rag-runtime-report`, Markdown evidence summary, provider mode-separated `.github/workflows/ai-rag-runtime.yml` runtime workflow, runtime audit row coverage, planned source coverage artifact evidence, provider-ready legacy/common retrieval comparison assertion, runtime smoke JSON report verification/artifact upload, legacy `dms_document_embeddings` transition criteria | provider-ready workflow pass with real Azure embedding deployment and verified artifact review |

Overall progress: **78.30%**.
Common retrieval can now report `ragReady` when logged context assembly exists, and DMS Ask consumes that context through common retrieval while recording conversation/run audit through the common model gateway. Provider-unavailable runtime smoke passed, and provider-ready CI/operational entrypoint is fixed, but platform assistant/DMS Ask production readiness remains **not production-ready** until the provider-ready workflow passes with a real Azure embedding deployment.

## Central Common Foundation View

사용자가 말한 "AI/RAG 중앙화 공용 기반"은 서비스별 화면/도메인 기능 완성률과 분리해서 본다. 이 기준은 `AI-RAG-00/01/02/03/05/06/07/10`만 중앙 기반 denominator로 계산하며, DMS reference adapter(`AI-RAG-04`), CRM/PMS/SNS/Admin domain adapter expansion(`AI-RAG-08`), web assistant surface(`AI-RAG-09`)는 service rollout backlog로 별도 관리한다.

Central common foundation progress: **89.26%**.

공용 기반에 포함되는 것:

- common `cm_ai_*` data plane, shared type contracts, adapter registry/status API.
- admin/system-override guarded index queue/run endpoint, `AiIndexWorkerService` worker boundary, disabled-by-default scheduler binding, retry backlog metrics.
- embedding provider/model gateway boundary, chunk diff/embedding upsert, job safety/retry metadata.
- common retrieval query/vector/keyword/hybrid/ACL pre-filter, retrieval log/context/citation assembly.
- common conversation/message/reference/run/run-source audit and DMS Ask common retrieval/model gateway consumption as the reference path.
- static verifier, provider-unavailable runtime smoke, provider-ready workflow/runbook entrypoint.
- `verify:ai-rag-central-foundation` static central foundation gate, `record:ai-rag-provider-ready-evidence` docs evidence recorder, `complete:ai-rag-central-foundation` ordered completion runner, and `verify:ai-rag-central-foundation:complete` provider-ready report/summary/docs completion gate.

공용 기반에 포함하지 않는 것:

- SNS board/comment, Admin adapter처럼 각 서비스의 원장 row를 projection으로 바꾸는 residual adapter.
- 각 서비스 화면이나 assistant UI의 업무 기능 구현.
- PMS/CRM/SNS의 provider-ready vector evidence. 이는 각 service rollout의 evidence이며 중앙 공용 module 자체의 구조 완성률과 분리한다.

공용 기반 100%의 남은 기준은 실제 Azure embedding deployment에서 provider-ready runtime smoke가 통과하고 검증된 summary artifact가 roadmap/handoff에 기록되는 것이다. 기본 완료 경로는 `pnpm run complete:ai-rag-central-foundation`이며, 이 runner가 provider-ready precheck, live smoke, report 검증, evidence 기록, `verify:ai-rag-central-foundation:complete -- --provider-ready-report=<ready-report.json> --provider-ready-summary=<ready-summary.md>`를 순서대로 통과해야 한다. completion gate를 직접 실행해도 내부에서 `verify:ai-rag-runtime-report --provider-mode=ready`를 다시 통과해야 하므로 source coverage, retrieval audit, Ask audit, legacy/common comparison schema가 약해진 artifact로는 완료 처리되지 않는다. live server를 함께 관리하는 검증 VM에서는 `--docker-runtime --docker-runtime-cleanup`을 붙여 Docker server runtime start/health-check/cleanup까지 같은 runner가 수행할 수 있다. Azure provider 값을 shell env가 아니라 별도 파일로 관리하는 검증 VM은 `--env-file=<path>`를 함께 사용해 smoke runner와 Docker Compose interpolation에 같은 endpoint/deployment/credential 입력을 제공한다. 운영 배포에서는 `AI_INDEX_WORKER_ENABLED=true`로 scheduler를 켤지, 외부 scheduler가 `AiIndexWorkerService.runPendingJobs()`/`POST /ai-index/jobs/run`을 호출할지 enablement 값을 확정해 기록한다.

<!-- AI_RAG_PROVIDER_READY_EVIDENCE:START -->
Provider-ready evidence status: pending

- Required report: `output/ai-rag-runtime-smoke-ready.json`
- Required summary: `output/ai-rag-runtime-smoke-ready.md`
- Completion command: `pnpm run complete:ai-rag-central-foundation`
- Recording command: `pnpm run record:ai-rag-provider-ready-evidence -- --report=output/ai-rag-runtime-smoke-ready.json --summary=output/ai-rag-runtime-smoke-ready.md`
<!-- AI_RAG_PROVIDER_READY_EVIDENCE:END -->

## Execution Plan

### AI-RAG-00. Roadmap and Guardrail Baseline

공용 AI/RAG 작업은 통합 검색 UI 공용화와 구분한다. `/api/search`와 `/ssoo/search`는 검색 표면 기준선이고, AI/RAG platform 완료 기준은 아니다.

### AI-RAG-01. Common Data Plane

`packages/database/prisma/schema.prisma`와 migration에 `common.cm_ai_*` 테이블을 둔다. 새 도메인 adapter는 원본 도메인 테이블을 직접 공용 service에 노출하지 않고 `AiIndexObjectProjection`만 반환한다.

### AI-RAG-02. Shared Type Contract

`packages/types/src/common/ai*.ts`가 서버와 웹의 공용 계약이다. 런타임 로직은 넣지 않고 explicit type re-export만 유지한다.
Legacy retrieval compatibility는 `AiLegacyRetrieval*`, common RAG retrieval은 `CommonAiRetrieval*` alias를 사용한다. 새 assistant/web surface는 `CommonAiRetrieval*`만 소비하고, 기존 `AiRetrieval*` 이름은 과거 계약 호환용으로만 남긴다.

### AI-RAG-03. Index Adapter Registry

`CommonAiIndexModule`은 source app별 adapter registry를 소유한다. DMS, CRM, PMS, SNS, Admin adapter는 각 도메인 모듈에서 등록한다.
Status API는 등록된 adapter뿐 아니라 planned source app을 반환하고, 아직 adapter가 없는 도메인은 `registrationStatus: "missing_adapter"`로 표시한다. 이 상태는 후속 adapter expansion의 작업 대상을 숨기지 않기 위한 운영 guard다.

### AI-RAG-04. DMS Reference Adapter

DMS markdown projection은 `DmsAiIndexAdapter`가 담당한다. 문서 본문, title, content hash, metadata, visibility 기반 ACL snapshot, chunk projection을 공용 indexer에 넘긴다.

DMS reference adapter의 완료 기준은 projection 등록만이 아니다. provider가 준비된 환경에서는 source capability가 vector/RAG retrieval을 실제로 허용해야 하고, provider가 없는 환경에서는 unavailable metadata와 legacy fallback이 재현 가능해야 한다.

### AI-RAG-05. Embedding Pipeline

공용 indexer가 chunk hash 비교, embedding generation, `cm_ai_embedding_m` upsert, job safety metadata를 맡는다. 모델/provider/dimension은 embedding profile로 관리하고, profile 변경은 profile mismatch reindex metadata와 active embedding 비활성화 경로로 처리한다.

### AI-RAG-06. Retrieval Service

공용 retrieval service는 query embedding, vector search, keyword fallback, hybrid ranking, ACL filter를 처리한다. response citation/context assembly와 `cm_ai_retrieval_log_m`/item audit를 남기며, 검색 capability의 `ragReady`는 logged context assembly가 실제 제공될 때만 true다.

### AI-RAG-07. Conversation and Run Service

AI 대화는 공용 conversation/message/reference/run/run-source 테이블 위에 둔다. 공용 service/controller는 conversation CRUD, message/reference append, run start/complete audit를 제공한다. DMS AskService는 공용 retrieval, conversation/run audit, model gateway를 우선 사용한다.

### AI-RAG-08. Domain Adapter Expansion

CRM, PMS, SNS, Admin은 projection/권한/target resolver만 제공한다. 공용 AI service가 각 도메인 DB를 직접 import하지 않는다.

### AI-RAG-09. Web Assistant Surface

검색 결과, RAG citation, conversation stream, domain task 실행 UI는 `web-shell` 공용 assistant surface로 중앙화한다. 앱은 task adapter와 open target adapter만 주입한다.

### AI-RAG-10. Verification and Ops

검증은 다음 항목을 최소 기준으로 둔다.

- type package build
- Prisma schema validation
- server build
- `codex:preflight`
- DMS 변경 포함 시 `codex:dms-guard`
- Docker rebuild

추가 verifier는 `cm_ai_*` schema, `CommonAiIndexModule`, DMS adapter registration, `ragReady` 과장 금지를 함께 확인해야 한다.

## Remaining Task Register

| ID | Task | Scope | Exit Criteria |
| --- | --- | --- | --- |
| AI-RAG-04A | DMS vector/RAG capability gate | DMS adapter, common source status, retrieval | Done. DMS source capability의 `semantic`/`vector`/`ragContext` 값은 embedding provider readiness를 따른다. provider unavailable 환경은 false/stale/fallback으로 두고, provider configured 환경은 true/vector retrieval 대상으로 삼는다. |
| AI-RAG-05A | Common embedding provider foundation | server common AI index | Done. DMS 전용 Azure OpenAI embedding 초기화 경로를 공용 provider/gateway로 추출하고, provider 미설정 시 deterministic unavailable status를 기록한다. |
| AI-RAG-05B | Chunk diff and embedding upsert | `cm_ai_chunk_m`, `cm_ai_embedding_m` | Done. active chunk hash 기준으로 신규/변경 chunk만 `embedMany` 후 `cm_ai_embedding_m`에 upsert한다. |
| AI-RAG-05C | Embedding job safety | index jobs | Done. batch size, retry/backoff, last error, provider unavailable/runtime failure, profile mismatch reindex 경로를 job/state metadata에 반영한다. |
| AI-RAG-05E | Embedding provider placeholder guard | server common AI provider, tests, verifier | Done. placeholder deployment 값은 provider ready로 보지 않고 `placeholder_embedding_deployment` unavailable status로 고정한다. |
| AI-RAG-05D | Embedding provider runtime proof | embedding provider, pgvector | 운영 embedding deployment가 지정된 환경에서 chunk embedding 생성, `cm_ai_embedding_m` upsert, profile/dimension metadata, stale embedding 비활성화가 재현되어야 한다. |
| AI-RAG-06A | Common retrieval query service | server common AI retrieval | Done. query embedding, `cm_ai_embedding_m` vector search, keyword fallback, hybrid ranking, ACL pre-filter를 공용 service와 `/ai-index/retrieval/query` endpoint로 제공한다. |
| AI-RAG-06B | Retrieval log and citation assembly | retrieval logs | Done. `cm_ai_retrieval_log_m`/item 기록, citation/context item 반환, logged context assembly 기준 `ragReady` capability 연결을 완료했다. |
| AI-RAG-07A | Conversation/run service | conversation tables | Done. conversation/message/reference/run/run-source CRUD와 model run audit를 공용 service/controller로 제공한다. |
| AI-RAG-07B | DMS Ask retrieval/run audit migration | DMS ask/search | Done. DMS AskService가 common retrieval/conversation/run audit를 우선 호출하고, 공용 retrieval 무결과/실패 시 legacy vector/keyword path로 fallback한다. |
| AI-RAG-07C | Common model gateway integration | server common AI gateway, DMS ask | Done. DMS AskService의 chat model provider 호출을 공용 model gateway로 이동하고 run provider/model/deployment metadata를 gateway 결과 기준으로 기록한다. |
| AI-RAG-08A | CRM adapter | CRM server module | Partial. CRM opportunity/customer/activity RDB ledger, revenue/cost line seed/history trigger, customer/activity history trigger, opportunity row 기반 customer/activity seed/backfill, RDB-backed read/write service, opportunity create/update/confirm/reopen/add-version write-hook queue, customer create/update 및 activity create write-hook queue, admin/system-override controlled customer/activity backfill endpoint, provider-gated opportunity/customer/activity projection adapter, owner-aware customer/activity ACL snapshot, customer/activity API access guard/snapshot, target resolver를 등록했다. 남은 기준은 provider-ready vector evidence다. |
| AI-RAG-08B | PMS adapter | PMS server module | Partial. PMS project/task RDB projection adapter, project member/org ACL snapshot, task WBS/assignee/project ACL snapshot, provider-gated capability, target resolver, project create/update/delete/detail upsert/stage transition queue hook, task create/update/delete queue hook, 관리자용 project controlled backfill queue endpoint, project-scoped task controlled backfill queue endpoint를 등록했다. 남은 기준은 provider-ready vector smoke evidence다. |
| AI-RAG-08C | SNS adapter | SNS server module | Partial. SNS post projection adapter와 post create/update/delete write-hook queue를 등록했다. Public은 public ACL, organization은 `organizationIds` ACL snapshot, followers/self는 owner-only ACL로 투영한다. 남은 기준은 board/comment projection, controlled backfill, provider-ready vector evidence다. |
| AI-RAG-08D | Admin adapter | Admin/common module | 허용된 system/user metadata만 제한 projection으로 등록한다. |
| AI-RAG-09A | Common assistant web surface | `web-shell`, apps | search result, RAG citations, conversation stream, domain action entry를 공용 surface로 제공한다. |
| AI-RAG-03A | Index worker/ops guard | server common AI index | Done. `/ai-index/jobs`와 `/ai-index/jobs/run`은 system-override/admin guard를 요구하고, 실행 경로는 `AiIndexWorkerService` worker boundary를 통과한다. `AiIndexSchedulerService`는 env-gated scheduler binding을 제공하고, `/ai-index/jobs/metrics`는 runnable/pending/running/failed/exhausted/retry-waiting queue 상태를 반환한다. |
| AI-RAG-10A | Runtime smoke and runbook | scripts/docs/docker | Partial. `pnpm run verify:ai-rag-runtime`이 Docker Postgres에서 placeholder embedding provider-unavailable mode를 통과했다. 확인된 범위는 DMS fixture 저장, common object/chunk/state stale projection, zero common embedding, retrieval log header/item, DMS Ask conversation/run audit다. `docs/common/guides/ai-rag-runtime-runbook.md`, `DB_INIT_PRISMA_PUSH_MODE=auto`, preflight/push-guard 정적 AI/RAG guard, provider-ready env precheck, retrieval log item/run-source audit 검증 기준, planned source coverage artifact 검증, provider-ready legacy/common retrieval comparison assertion, runtime smoke JSON report, `verify:ai-rag-runtime-report` report verifier, Markdown evidence summary, `complete:ai-rag-central-foundation` ordered completion runner와 dry-run evidence/Docker runtime mode, provider-ready workflow의 runner 기반 live smoke/evidence artifact upload, provider mode-separated `.github/workflows/ai-rag-runtime.yml`, legacy `dms_document_embeddings` 전환 기준을 추가했다. 남은 기준은 실제 Azure embedding deployment에서 provider-ready workflow 통과 결과와 검증된 artifact 확인이다. |

## Next Selected Work

다음 작업은 중앙 공용 기반 기준으로는 **AI-RAG-10A provider-ready runtime proof**다. **AI-RAG-08A residual CRM provider-ready evidence**, **AI-RAG-08C residual SNS board/comment/backfill + AI-RAG-08D Admin adapter expansion**는 공용 module을 소비하는 service rollout backlog로 분리한다. 외부 Azure embedding deployment가 준비된 환경에서는 AI-RAG-10A를 먼저 증명하고, 로컬 구현 진행에서는 별도 service rollout backlog로 CRM provider-ready evidence와 SNS residual/Admin adapter 확장을 이어간다.

선정 이유:

- 공용 retrieval query service는 logged context/citation assembly까지 연결됐다.
- DMS AskService는 common retrieval, conversation/run audit, common model gateway를 쓰기 시작했다.
- provider-unavailable 경로의 DB compat, DMS reindex, retrieval query, DMS Ask run audit는 `verify:ai-rag-runtime`과 runbook으로 고정됐다. 이제 provider-ready 환경에서 vector/RAG capability 전환과 embedding row 생성을 증명해야 한다.

AI-RAG-10A 작업 원칙:

- DMS legacy vector search는 삭제하지 않는다.
- DB compat apply, trigger apply, DMS 저장 지점 common projection, common retrieval query, retrieval log header/item audit, DMS Ask JSON, conversation/run audit 최소 경로를 `pnpm run verify:ai-rag-runtime`으로 재현 가능한 순서에 묶는다. provider-ready mode에서는 run-source audit까지 필수로 검증한다.
- 기존 local volume에 pre-roadmap AI/RAG legacy 컬럼이 남아 있으면 `DB_INIT_PRISMA_PUSH_MODE=auto`가 compat apply 뒤 `prisma db push`를 건너뛰고 seed/trigger를 계속 적용한다. `prisma db push --accept-data-loss`는 사용하지 않는다.
- 외부 Azure OpenAI 설정이 없거나 embedding deployment가 placeholder인 환경에서는 provider unavailable 상태와 stale/legacy fallback이 기록되는지 확인한다. 이 경로는 2026-07-02 로컬 Docker Postgres에서 통과했다.
- provider 설정 후에는 먼저 `pnpm run verify:ai-rag-runtime:ready-precheck`로 Azure OpenAI embedding 환경을 확인한 뒤, DMS source capability가 vector/RAG capable로 전환되고 `cm_ai_embedding_m` 기반 retrieval이 동작하는지 `pnpm run verify:ai-rag-runtime:ready`로 확인한다.
- provider-ready smoke는 같은 DMS fixture에 대해 legacy `dms_document_embeddings` chunk와 common retrieval result/context가 모두 query needle을 포함하는지 비교한다.
- runtime smoke report와 Markdown summary는 DMS/CRM/PMS/SNS registered source capability와 Admin planned source의 `missing_adapter` 상태를 `sourceCoverage` evidence로 남긴다.
- adapter expansion 전에는 모든 도메인 adapter projection이 `assertAiIndexObjectProjection`을 통과해야 한다. source app, entity id, ACL snapshot, search/context eligibility, target source, chunk key/seq/text invariant를 이 gate가 먼저 검증한다.
- GitHub Actions에서는 `.github/workflows/ai-rag-runtime.yml`을 `provider_mode=ready`로 수동 실행해 같은 기준을 검증하고, `pnpm run verify:ai-rag-runtime-report`를 통과한 `ai-rag-runtime-smoke-ready.json` 및 `ai-rag-runtime-smoke-ready.md` artifact를 확인한다.
- provider-ready workflow 통과 결과와 검증된 Markdown summary 요약을 roadmap/handoff에 기록한다.
- legacy `dms_document_embeddings`는 runbook의 `parallel read/write -> common default -> legacy read disable -> archival/drop` 순서로만 전환한다. provider-ready workflow green과 검증된 legacy/common retrieval artifact 전에는 삭제하지 않는다.

PMS project/task adapter, CRM opportunity adapter, SNS post adapter는 provider-ready 이전에도 RDB projection reference로 시작했다. 단, provider-ready workflow가 통과하기 전에는 PMS/CRM/SNS vector/RAG production readiness, DMS legacy vector store 전환, CRM full/SNS residual/Admin adapter production rollout을 완료로 보지 않는다.

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-15 | Made the live `AiIndexRegistryService` the source of truth for `/ai-index/status` registration state. Stale `cm_ai_source_m` rows can no longer advertise an absent adapter as `registered`; Admin remains `missing_adapter` until its adapter is actually registered. |
| 2026-07-08 | Added CRM customer/activity API access guard/snapshot first slice with customer-specific permissions, `crm.customer` object policy, legacy opportunity permission compatibility mapping, web-crm access proxy routes, and static verifier coverage. AI-RAG-08A remains partial because provider-ready vector evidence is still open. |
| 2026-07-08 | Added CRM customer/activity controlled AI index backfill endpoint, shared backfill contracts, queue failure summaries, static verifier coverage, and owner-aware customer/activity ACL snapshots. AI-RAG-08A remains partial because provider-ready vector evidence is still open. |
| 2026-07-03 | Hardened `verify:ai-rag-central-foundation:complete` so direct completion checks rerun `verify:ai-rag-runtime-report --provider-mode=ready` before accepting provider-ready report/summary/evidence digests. |
| 2026-07-03 | Added provider-ready `--env-file` support to the central completion runner and Azure OpenAI interpolation in `compose.yaml` so verification hosts can feed the same provider env to smoke runner and Docker server runtime. |
| 2026-07-07 | Added CRM customer/activity RDB ledger projection and write-hook queueing. AI-RAG-08A remained partial because CRM controlled backfill endpoint, provider-ready vector evidence, and customer/activity object policy refinement were still open. |
| 2026-07-03 | Routed the provider-ready workflow live smoke through `complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run`, leaving provider-unavailable smoke on the fallback path. |
| 2026-07-03 | Added opt-in Docker runtime start/health-check/cleanup mode to `complete:ai-rag-central-foundation` for provider-ready closeout on verification hosts. |
| 2026-07-03 | Routed provider-ready workflow evidence artifact generation through `complete:ai-rag-central-foundation -- --use-existing-artifacts --dry-run` so CI and local closeout share the same runner. |
| 2026-07-03 | Added `complete:ai-rag-central-foundation` as the ordered provider-ready completion flow across precheck, live smoke, report verification, evidence recording, and central completion gate. |
| 2026-07-03 | Added CRM opportunity create/update/confirm/reopen/add-version write-hook queueing into the common AI index job queue. AI-RAG-08A remained partial because CRM customer/activity projection, controlled backfill, and provider-ready evidence were still open. |
| 2026-07-03 | Separated central common foundation progress from service rollout backlog. Added admin/system-override guarded AI index job operations, `AiIndexWorkerService` execution boundary, env-gated `AiIndexSchedulerService`, `/ai-index/jobs/metrics` retry backlog observability, `record:ai-rag-provider-ready-evidence`, provider-ready evidence block workflow artifact, `verify:ai-rag-evidence-recorder` preflight/push self-test, and `verify:ai-rag-central-foundation:complete` provider-ready completion gate. Overall platform progress is 77.90%; central common foundation progress is 89.26%. |
| 2026-07-02 | Added SNS post provider-gated AI index adapter and post create/update/delete AI index queue hooks. AI-RAG-08C remains partial because SNS board/comment projection, controlled backfill, and provider-ready vector evidence are still open. Runtime source coverage now expects DMS/CRM/PMS/SNS registered and Admin `missing_adapter`. |
| 2026-07-02 | Added the CRM opportunity RDB ledger, seed/history triggers, RDB-backed opportunity service, and provider-gated CRM opportunity AI index adapter. AI-RAG-08A remained partial because CRM customer/activity projection, write-hook/backfill, and provider-ready evidence were still open. |
| 2026-07-02 | Added the project-scoped PMS task controlled AI index backfill endpoint and shared task backfill request/response contract. AI-RAG-08B remaining work is provider-ready vector evidence. |
| 2026-07-02 | Added PMS task RDB projection and task create/update/delete AI index queue hooks. AI-RAG-08B remains partial because provider-ready evidence is still open. |
| 2026-07-02 | Added the controlled PMS project AI index backfill endpoint and shared request/response contract. AI-RAG-08B remains partial because provider-ready evidence is still open. |
| 2026-07-02 | Added PMS project create/update/delete/detail/stage write-hook queueing into the common AI index job queue. AI-RAG-08B remains partial because provider-ready evidence is still open. |
| 2026-07-02 | Added PMS project RDB AI index adapter as the first non-DMS domain projection. Source coverage then expected DMS/PMS registered and Admin/CRM/SNS `missing_adapter`. |
| 2026-07-02 | Added common AI index projection runtime validator so future CRM/PMS/SNS/Admin adapters fail before DB writes when source, ACL, target, or chunk invariants drift. |
| 2026-07-02 | Runtime smoke JSON/Markdown evidence now verifies planned source coverage so the remaining Admin adapter gap stays visible in provider-ready/unavailable artifacts while DMS/CRM/PMS/SNS are registered. |
| 2026-07-02 | `/ai-index/status` now exposes planned source coverage with `missing_adapter` status for domains whose adapters are intentionally not implemented yet. |
| 2026-07-02 | Added explicit `AiLegacyRetrieval*` and `CommonAiRetrieval*` type aliases to reduce AI retrieval naming drift before assistant expansion. |
| 2026-07-02 | Runtime smoke report verifier now writes Markdown evidence summaries and the manual workflow uploads them with the JSON report artifact. |
| 2026-07-02 | Runtime smoke report verifier was added and wired into the manual runtime workflow before artifact upload. |
| 2026-07-02 | Runtime smoke now writes structured JSON reports and the manual runtime workflow uploads them as artifacts. |
| 2026-07-02 | Provider-ready runtime smoke now requires a legacy/common retrieval comparison for the DMS fixture. |
| 2026-07-02 | Legacy `dms_document_embeddings` transition criteria and provider mode-separated workflow env policy were fixed; remaining proof is provider-ready workflow green plus legacy/common comparison result. |
| 2026-07-02 | Provider-ready runtime smoke를 위한 전용 package script와 `.github/workflows/ai-rag-runtime.yml` 수동 CI/운영 gate를 추가했다. 실제 Azure embedding deployment로 workflow를 통과시키는 결과 기록은 잔여다. |
| 2026-07-02 | 강화된 retrieval log item audit 기준을 적용한 상태로 `verify:ai-rag-runtime` provider-unavailable Docker Postgres smoke를 재통과했다. DMS Ask run-source audit의 live 필수 검증은 provider-ready 환경 잔여로 유지한다. |
| 2026-07-02 | `verify:ai-rag-runtime`이 provider-ready mode에서도 retrieval log item audit와 DMS Ask run-source audit를 검증하도록 coverage 기준을 보강했다. |
| 2026-07-02 | `verify:ai-rag-runtime` ready mode에 Azure OpenAI endpoint/deployment/credential precheck와 dry-run readiness 출력을 추가했다. |
| 2026-07-02 | AI/RAG 관련 파일 변경 시 `codex:preflight`/`codex:push-guard`가 `verify:ai-rag-platform`을 자동 실행하도록 정적 guard 통합을 추가했다. provider-ready live smoke는 실제 Azure embedding 환경이 필요하므로 별도 잔여로 유지한다. |
| 2026-07-02 | AI/RAG runtime runbook을 `docs/common/guides/ai-rag-runtime-runbook.md`로 추가하고, legacy AI/RAG local volume에서 `DB_INIT_PRISMA_PUSH_MODE=auto`가 destructive `db push` 없이 compat/seed/trigger 경로를 유지하도록 기준을 고정했다. |
| 2026-07-02 | `verify:ai-rag-runtime` provider-unavailable smoke를 Docker Postgres에서 통과시켰다. legacy `common.cm_ai_*` WIP table 호환 SQL을 canonical runtime column/table/trigger 공존 기준으로 보강하고, smoke script의 unique DMS fixture path와 run audit 검증 쿼리를 수정했다. |
| 2026-07-02 | Azure embedding provider readiness가 placeholder deployment 값을 ready로 오판하지 않도록 `placeholder_embedding_deployment` unavailable guard와 서버 단위 테스트, verifier 기준을 추가했다. |
| 2026-07-02 | `AI-RAG-04A` DMS vector/RAG capability gate를 provider readiness 기반으로 구현하고, `AI-RAG-10A`용 `verify:ai-rag-runtime` smoke script를 추가했다. |
| 2026-07-02 | LangChain/LangGraph를 현 AI/RAG workstream에 도입하지 않는 기술 결정을 고정했다. 구현 기준은 custom pipeline + AI SDK provider/model boundary + PostgreSQL pgvector이며, 병행 구현은 만들지 않는다. |
| 2026-07-02 | 사용자 설계 방향을 반영해 도메인 RDB 정본 + common AI projection + pgvector vector store + provider unavailable fallback + custom RAG pipeline 원칙을 고정하고, DMS vector/RAG capability gap과 runtime smoke 선행 조건을 잔여 작업으로 재등록했다. |
| 2026-06-23 | `AI-RAG-07C` common model gateway를 추가해 DMS Ask의 chat generation/stream 실행과 run provider/model/deployment metadata 기록을 공용 gateway 경계로 이동했다. |
| 2026-06-23 | `AI-RAG-07B` DMS Ask common retrieval/run audit migration을 반영하고, model gateway 통합을 `AI-RAG-07C`로 분리했다. |
| 2026-06-23 | `AI-RAG-07A` conversation/message/reference/run/run-source 공용 service/controller와 model run audit 기록을 반영하고 다음 작업을 `AI-RAG-07B`로 갱신했다. |
| 2026-06-23 | `AI-RAG-06B` retrieval log, response context/citation assembly, logged context 기준 `ragReady` gate를 반영하고 다음 작업을 `AI-RAG-07A`로 갱신했다. |
| 2026-06-23 | `AI-RAG-06A` common retrieval query service, vector search, keyword fallback, ACL pre-filter endpoint를 반영하고 다음 작업을 `AI-RAG-06B`로 갱신했다. |
| 2026-06-23 | `AI-RAG-05C` embedding job safety metadata, retry/backoff, batch policy, profile mismatch reindex 기록을 반영하고 다음 작업을 `AI-RAG-06A`로 갱신했다. |
| 2026-06-23 | `AI-RAG-05B` chunk hash diff와 `cm_ai_embedding_m` upsert writer를 반영하고 다음 작업을 `AI-RAG-05C`로 갱신했다. |
| 2026-06-23 | `AI-RAG-05A` common Azure embedding provider foundation을 반영하고 다음 작업을 `AI-RAG-05B`로 갱신했다. |
| 2026-06-23 | 진행률 산정 기준, phase별 상태판, 남은 태스크 register, 다음 작업 `AI-RAG-05A`를 문서에 고정했다. |
| 2026-06-23 | 공용 AI/RAG data plane, shared type contract, `CommonAiIndexModule`, DMS reference adapter 기준선을 재수립했다. |
