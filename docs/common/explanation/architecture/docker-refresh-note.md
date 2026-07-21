# Docker Refresh Note

> 최종 업데이트: 2026-07-07

## 2026-07-07 CRM quote/contract protected baseline coverage

CRM 견적/계약 1차 확장 후 full compose 재빌드에서 legacy AI/RAG local volume이 감지되면 `DB_INIT_PRISMA_PUSH_MODE=auto`가 `prisma db push`를 건너뛴다. 이때 CRM seed는 견적 상태 컬럼과 견적 공급자 정보 테이블을 사용하므로, Prisma push 없이도 seed 전에 CRM 확장 migration이 적용되어야 한다.

현재 기준:

- `db-init` protected baseline은 CRM opportunity 원장, CRM 계약 원장, CRM 견적 workflow, CRM 견적 공급자 표시 정보 migration을 seed 전에 적용한다.
- 이 보강은 CRM 영업/계약/재무 원장 재현성 보강이며, PMS가 계약/청구/매출/원가 원장을 소유한다는 의미가 아니다.
- PMS는 계속 실행 프로젝트와 읽기용 계약/인계 스냅샷만 소비한다.
- `DB_INIT_PRISMA_PUSH_MODE=auto`의 destructive `db push` 회피 기준과 `--accept-data-loss` 금지 기준은 그대로 유지한다.

## 2026-07-03 CRM ledger protected baseline migration

PMS/CRM boundary 정렬 후 full compose 재빌드에서 legacy AI/RAG local volume이 감지되어 `DB_INIT_PRISMA_PUSH_MODE=auto`가 `prisma db push`를 건너뛰었다. 이 경로에서 CRM seed가 `crm.crm_opportunity_m`을 요구했지만, CRM opportunity ledger migration이 아직 적용되지 않은 volume에서는 `db-init`이 실패했다.

현재 기준:

- `db-init`은 compat SQL 적용 후 seed 전에 protected baseline migration을 적용한다.
- 2026-07-03 기준 protected baseline 대상은 `20260702090000_add_crm_opportunity_ledger/migration.sql`였고, 2026-07-07 기준 CRM 계약/견적 확장 migration까지 같은 경로에 포함한다.
- 이 migration은 `CREATE ... IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 중심으로 구성되어 legacy 보호 모드에서 반복 적용 가능하다.
- `DB_INIT_PRISMA_PUSH_MODE=auto`의 destructive `db push` 회피 기준과 `--accept-data-loss` 금지 기준은 그대로 유지한다.

## 2026-07-02 AI/RAG legacy DB init guard

AI/RAG runtime smoke 중 기존 local Docker volume의 pre-roadmap `common.cm_ai_*` WIP schema가 Prisma `db push`에서 destructive column drop 후보로 잡히는 것을 확인했다.

현재 기준:

- `db-init`은 먼저 `packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql`을 적용한다.
- 기본 `DB_INIT_PRISMA_PUSH_MODE=auto`에서는 legacy AI/RAG extra column/table이 감지되면 `prisma db push`를 건너뛰고 seed/trigger apply를 계속한다.
- `DB_INIT_PRISMA_PUSH_MODE=force`는 `db push` 실행 여부만 강제하며, `--accept-data-loss`는 붙이지 않는다.
- 자세한 절차는 `docs/common/guides/ai-rag-runtime-runbook.md`를 따른다.

## 2026-06-23 AI/RAG platform rebuild

AI/RAG platform commonization slice 이후 full compose image rebuild를 완료했다.

관찰:
- 기본 `pnpm docker:build`는 Docker Desktop credential helper(`credsStore: desktop.exe`)가 WSL vsock 오류(`UtilAcceptVsock: accept4 failed 110`)로 실패할 수 있다.
- 이번 rebuild는 credential helper를 우회하기 위해 임시 Docker config를 명시했다.
- `env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose build`로 `ssoo-server`, `ssoo-dms`, `ssoo-pms`, `ssoo-crm`, `ssoo-sns`, `ssoo-admin`, `ssoo-db-init` 이미지가 모두 `Built` 상태로 완료됐다.
- 기존 로컬 DB volume에 pre-roadmap `common.cm_ai_*` WIP row/schema가 남아 있으면 `prisma db push`가 required column 추가나 destructive column drop 후보로 실패할 수 있다. 2026-07-02 기준 `db-init`은 compat SQL을 먼저 적용하고, legacy AI/RAG extra column이 감지되면 기본 auto mode에서 `db push`를 건너뛴다.
- Next.js web app build 중 stale Browserslist data warning은 계속 출력되지만 functional blocker는 아니다.

다음 액션:
1. Docker Desktop credential helper 오류가 재발하면 다음 명령을 사용한다.

```bash
mkdir -p /tmp/ssoo-docker-no-creds
env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose build
env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose up -d --build
```

2. `AI-RAG-10A Runtime smoke and runbook`에서 DB migration apply, trigger apply, DMS reindex, common retrieval, DMS Ask audit 확인을 Docker runtime 기준으로 고정한다.
3. Azure embedding secret이 준비된 환경에서는 `.github/workflows/ai-rag-runtime.yml`을 `provider_mode=ready`로 수동 실행해 provider-ready vector/RAG workflow green 결과와 `verify:ai-rag-runtime-report`를 통과한 `ai-rag-runtime-smoke-ready.json` 및 `ai-rag-runtime-smoke-ready.md` artifact의 legacy/common retrieval 비교 결과를 남긴다.

## 2026-04-17 Prisma generate network reset

이전 full-stack compose 최신화 시도에서 `apps/server/Dockerfile` builder 단계의
`pnpm --filter @ssoo/database db:generate` -> `prisma generate` 과정이 container 내부에서
`ECONNRESET` 로 실패했다.

관찰:
- 로컬 WSL 호스트에서 `pnpm --filter @ssoo/database db:generate` 는 정상 통과했다.
- 따라서 해당 실패는 schema 오류보다는 container build 중 Prisma engine download/network reset 가능성이 높았다.
- compose 구조와 Dockerfile 경로 자체는 현재 monorepo 구조를 반영하고 있다.

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-07 | CRM 계약/견적/견적 공급자 migration을 `db-init` protected baseline에 추가해 legacy volume에서도 CRM seed가 견적 컬럼과 공급자 테이블을 찾을 수 있도록 보강 |
| 2026-07-03 | CRM opportunity seed 전에 protected baseline migration을 적용하도록 `db-init` 기준을 보강 |
| 2026-07-02 | runtime smoke Markdown evidence summary artifact 확인 기준을 provider-ready Docker/CI 후속 액션에 반영 |
| 2026-07-02 | runtime smoke report verifier 기준을 provider-ready Docker/CI 후속 액션에 반영 |
| 2026-07-02 | runtime smoke JSON report artifact 확인 기준을 provider-ready Docker/CI 후속 액션에 반영 |
| 2026-07-02 | provider mode별 workflow env 분리와 legacy/common retrieval 비교 결과 기록 기준을 추가 |
| 2026-07-02 | provider-ready AI/RAG runtime smoke를 위한 수동 GitHub Actions workflow 실행 기준을 기록 |
| 2026-07-02 | AI/RAG legacy local volume에서 `DB_INIT_PRISMA_PUSH_MODE=auto`가 compat 적용 뒤 destructive `db push`를 건너뛰는 기준과 runtime runbook 링크를 기록 |
| 2026-06-23 | AI/RAG legacy `cm_ai_*` WIP table row가 남은 로컬 DB에서 `db-init`이 non-null column 추가로 실패하지 않도록 compatibility backfill 경로를 기록 |
| 2026-06-23 | AI/RAG platform slice 이후 Docker compose image rebuild 완료와 Docker Desktop credential helper 우회 방법을 기록 |
| 2026-04-17 | Docker full refresh 중 server builder 의 `prisma generate` 가 `ECONNRESET` 로 일시 실패한 사실과 재시도 방침을 기록 |
