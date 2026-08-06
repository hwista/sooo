# DMS / SSOO Docker 배포 가이드

> 최종 업데이트: 2026-08-06

DMS를 **모노레포 통합 런타임 기준**으로 Docker 컨테이너에 배포하는 가이드입니다.  
지원 경로는 **repo root `compose.yaml`** 하나로 정리하며, 기본 배포 단위는 `postgres + server + admin + crm + pms + dms + sns` 전체 스택입니다.

> `compose.yaml` 의 Compose project name 은 `ssoo` 로 고정됩니다. 체크아웃 폴더명이 달라도 Docker Desktop 앱/리소스 이름이 `ssoo-*` 컨테이너 기준으로 일관되게 유지되도록 하기 위한 설정입니다.

---

## 전제 조건

- Docker Engine 24+
- Docker Compose v2+
- Git (소스 클론용)

---

## 아키텍처

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ssoo-admin     │ │  ssoo-crm       │ │  ssoo-pms       │
│  Port: 3000     │ │  Port: 3001     │ │  Port: 3002     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                      ┌───────────────┐
                      │  ssoo-server  │
                      │  Port: 4000   │
                      └──────┬────────┘
                             │
┌─────────────────┐ ┌────────┴────────┐ ┌───────────────────────┐
│  ssoo-dms       │ │  ssoo-sns       │ │  ssoo-postgres        │
│  Port: 3003     │ │  Port: 3004     │ │  Port: 5432           │
│  same-origin    │ │  standalone UI  │ │  (pgvector/pg17)      │
│  proxy / UI     │ │                 │ │                       │
└─────────────────┘ └─────────────────┘ └───────────────────────┘
```

### 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| `postgres` | `pgvector/pgvector:pg17` | 5432 | PostgreSQL + pgvector 확장 |
| `server` | `apps/server/Dockerfile` | 4000 | NestJS API + 공통 auth + DMS server module |
| `admin` | `apps/web/admin/Dockerfile` | 3000 | Admin Next.js 앱 |
| `crm` | `apps/web/crm/Dockerfile` | 3001 | CRM Next.js 앱 |
| `pms` | `apps/web/pms/Dockerfile` | 3002 | PMS Next.js 앱 |
| `dms` | `apps/web/dms/Dockerfile` | 3003 | DMS Next.js 앱 |
| `sns` | `apps/web/sns/Dockerfile` | 3004 | SNS Next.js 앱 |

> **참고**: `pgvector/pgvector:pg17`은 표준 PostgreSQL 17에 pgvector 확장이 포함된 이미지입니다.
> DMS의 AI 임베딩/시맨틱 검색 기능에 필요합니다.
> DMS의 server-backed path는 기본적으로 compose 내부 `server`(`http://server:4000/api`)를 사용합니다.

---

## 빠른 시작

### 1. 환경 변수 설정

```bash
# repo root 기준
cp .env.example .env
cp apps/web/dms/.env.example apps/web/dms/.env.local

# .env / .env.local에서 아래 값 수정:
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_DEPLOYMENT
# - AZURE_OPENAI_EMBEDDING_DEPLOYMENT (임베딩/시맨틱 검색 사용 시)
# - 인증: AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET 또는 AZURE_OPENAI_API_KEY
```

> AI 기능을 쓰지 않더라도 `.env.local` 파일은 같은 자리에서 유지하는 것을 권장합니다.  
> `compose.yaml`은 root `.env`를 shared baseline으로 사용하고, `apps/web/dms/.env.local`을 **web-dms와 server 컨테이너가 함께 읽는 DMS-local override**로 취급합니다. 로컬에서 DMS/Azure 겹치는 키를 `.env.local`에 두면 web UI와 server 요약 경로가 같은 값을 사용합니다.

### 2. 빌드 & 실행

```bash
# repo root 기준 - 전체 스택
pnpm docker:up

# 최초 1회 또는 DB 초기화가 필요할 때
pnpm db:setup

# 로그 확인
pnpm docker:logs
```

### 3. 확인

```bash
# Admin / CRM / PMS / DMS / SNS 접속
curl http://localhost:3000
curl http://localhost:3001
curl http://localhost:3002
curl http://localhost:3003
curl http://localhost:3004

# Server health
curl http://localhost:4000/api/health

# PostgreSQL 연결 확인
docker compose exec postgres pg_isready -U ssoo -d ssoo_dev
```

---

## Dockerfile 구조

`apps/web/dms/Dockerfile` — 3단계 멀티스테이지 빌드:

| Stage | 베이스 | 역할 |
|-------|--------|------|
| `deps` | `node:20` | `pnpm install --filter web-dms...` 로 workspace 의존성 설치 |
| `builder` | `node:20` | `@ssoo/types` + `@ssoo/web-auth` + `web-dms` 빌드 후 standalone 산출물 생성 |
| `runner` | `node:20` | 최소 런타임 + 기본 JSON config 2종 포함 |

**주요 특성**:
- `output: 'standalone'` — monorepo root tracing 기준으로 standalone 산출 생성
- 비root 유저 실행 (`nextjs:nodejs`, UID 1001)
- runtime data 는 image 내부 `apps/web/dms/data/` 가 아니라 external runtime path mount 를 통해 server 컨테이너에 주입

---

## 볼륨 & 영속 데이터

기본 compose 는 DMS 운영 데이터를 **빌드 이미지 밖의 external runtime paths** 로 분리합니다.

| 호스트 변수 | 컨테이너 변수 | 기본 컨테이너 경로 | 용도 |
|------------|---------------|-------------------|------|
| `DMS_MARKDOWN_HOST_PATH` | `DMS_MARKDOWN_ROOT` | `/var/lib/ssoo/documents` | markdown working tree (Git-managed). 템플릿은 이 경로의 `_templates/` 하위에 배치됩니다 |
| `DMS_INGEST_HOST_PATH` | `DMS_INGEST_QUEUE_PATH` | `/var/lib/ssoo/document-ingest` | ingest queue (`jobs.json`) |
| `DMS_STORAGE_LOCAL_HOST_PATH` | `DMS_STORAGE_LOCAL_BASE_PATH` | `/var/lib/ssoo/document-storage/local` | local binary storage |

핵심 원칙:

- `server` 컨테이너가 markdown / storage / ingest runtime mount 를 소유한다. 템플릿은 markdown root 의 `_templates/` 하위에 포함되므로 별도 mount 가 불필요하다.
- `dms` web 컨테이너는 same-origin proxy/UI 이므로 runtime data mount 를 직접 소유하지 않는다.
- GitLab binding 은 `DMS_MARKDOWN_ROOT` 에만 적용한다. 템플릿은 문서 Git 레포의 `_templates/` 하위에 배치되며 GitLab과 자동 동기화된다.
- attachment / reference / image 는 `DMS_STORAGE_LOCAL_BASE_PATH` 또는 다른 provider root 를 사용하며 Git 비대상이다.

### 백업 권장

운영 환경에서는 위 host path 들을 기준으로 백업한다. 예:

```bash
tar czf dms-runtime-backup-$(date +%Y%m%d).tar.gz \
  "${DMS_MARKDOWN_HOST_PATH}" \
  "${DMS_INGEST_HOST_PATH}" \
  "${DMS_STORAGE_LOCAL_HOST_PATH}"
```

---

## 데이터베이스 초기화

- `apps/server`의 DMS 검색 모듈이 필요 시 `dms_document_embeddings` 테이블과 vector 인덱스를 준비합니다.
- `apps/web/dms`는 더 이상 pgvector 임베딩 테이블을 직접 초기화하지 않으며, 로컬 DB 연결은 채팅 세션 같은 app-local persistence에만 사용합니다.
- full-stack compose 기본값에서는 `server`도 함께 올라오므로, DMS 검색/질문/요약 경로가 별도 host bridge 없이 동작합니다.

---

## 환경 변수

### compose.yaml에서 자동 설정

| 변수 | 값 | 설명 |
|------|-----|------|
| `DATABASE_URL` | `DOCKER_DATABASE_URL` 값으로 주입 | compose 내부 server/DMS 런타임 공용 PostgreSQL 연결 |
| `DMS_DATABASE_URL` | `DOCKER_DMS_DATABASE_URL` 값으로 주입 | DMS-local persistence 호환 키 |
| `DMS_SERVER_API_URL` | `http://server:4000/api` | compose 내부 server 검색/질문/요약 슬라이스 브리지 |
| `PMS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | PMS 브라우저 번들용 API 주소 |
| `PMS_SERVER_API_URL` | `http://server:4000/api` | PMS same-origin auth proxy가 내부 server 컨테이너로 연결할 주소 |
| `SNS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | SNS 브라우저 번들용 API 주소 |
| `SNS_SERVER_API_URL` | `http://server:4000/api` | SNS same-origin auth proxy가 내부 server 컨테이너로 연결할 주소 |
| `DMS_MARKDOWN_ROOT` | `/var/lib/ssoo/documents` | server 컨테이너 내 external markdown working tree. 템플릿은 이 경로의 `_templates/` 하위에 자동 포함 |
| `DMS_INGEST_QUEUE_PATH` | `/var/lib/ssoo/document-ingest` | server 컨테이너 내 ingest queue root |
| `DMS_STORAGE_LOCAL_BASE_PATH` | `/var/lib/ssoo/document-storage/local` | server 컨테이너 내 local binary storage root |
| `DMS_STORAGE_SHAREPOINT_BASE_PATH` | `/sites/documents/shared-documents` | SharePoint provider base path override |
| `DMS_STORAGE_NAS_BASE_PATH` | `/mnt/nas/documents` | NAS provider base path override |
| `DMS_GIT_PUBLISH_IGNORED_PATH_PREFIXES` | `launch-smoke/,codex-lock-ui/,codex-lock-probe/,verify-access/` | 쉼표로 구분한 local-only 검증 문서 디렉터리 prefix. 일반 운영/개발 런타임에서는 이 prefix 의 문서를 파일 트리/검색/편집 잠금 알림 사용자 표면에서 숨기고 DMS Git publish/실패 알림 대상에서도 제외. `local-test` 하네스에서는 브라우저 스모크 검증을 위해 사용자 표면 숨김을 적용하지 않음 |

### AI 기능 사용 시 추가 필요

| 변수 | 필수 | 설명 |
|------|------|------|
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure OpenAI 엔드포인트 |
| `AZURE_OPENAI_DEPLOYMENT` | ✅ | 채팅 모델 배포명 |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | ◐ | 임베딩 모델 배포명. 임베딩/시맨틱 검색에는 필요하지만 챗봇 단독 호출에는 필수 아님 |
| `OPENAI_API_VERSION` | ✅ | Azure OpenAI API version |
| `AZURE_USE_MANAGED_IDENTITY` | ⭕ | Managed Identity 사용 여부 (`true`/`false`) |
| `AZURE_OPENAI_API_KEY` | ⭕ | API 키 (Entra ID 미사용 시) |
| `AZURE_TENANT_ID` | ⭕ | Entra ID 인증 시 |
| `AZURE_CLIENT_ID` | ⭕ | Entra ID 인증 시 |
| `AZURE_CLIENT_SECRET` | ⭕ | Entra ID 인증 시 |
| `AZURE_MANAGED_IDENTITY_CLIENT_ID` | ⭕ | user-assigned managed identity 사용 시 |

루트 `compose.yaml` 은 root `.env`를 shared baseline으로 사용하고, `apps/web/dms/.env.local` 을 local compose 기준 DMS-local override로 함께 읽습니다. `apps/web/dms/.env.local` 에 있는 DMS/Azure 겹치는 키는 `web-dms`와 `server` 컨테이너에 동시에 반영되므로, 로컬 요약/검색/질의 경로를 UI와 같은 설정으로 맞출 수 있습니다. Docker 내부 DB 주소 override가 필요하면 root `.env`의 `DOCKER_DATABASE_URL` / `DOCKER_DMS_DATABASE_URL` 을 수정하세요.

예시:
```yaml
server:
  environment:
    DMS_MARKDOWN_ROOT: /var/lib/ssoo/documents
    DMS_STORAGE_LOCAL_BASE_PATH: /var/lib/ssoo/document-storage/local
  volumes:
    - /srv/documents:/var/lib/ssoo/documents
    - /srv/document-storage/local:/var/lib/ssoo/document-storage/local
```

---

## 지원 범위

- 지원 compose 파일은 repo root `compose.yaml` 하나입니다.
- 레거시 root / app-local `docker-compose.yml` 경로는 제거했습니다.
- Docker DMS는 workspace 빌드(`pnpm`, `@ssoo/types`, `@ssoo/web-auth`)를 전제로 합니다.
- 기본 compose는 DMS 단독이 아니라 **모노레포 full-stack**을 띄웁니다.

### GitLab pipeline 배포 계약

- `development` push는 `verify -> ai_review -> build`를 자동 실행하고, `deploy_dev`는 `when: manual` + `allow_failure: false`로 유지합니다. 자동 단계가 끝난 pipeline은 배포 전까지 blocked/manual 상태이며, deploy가 성공해야 success, deploy가 실패하면 failed가 됩니다. 이 상태 계약은 배포를 자동 실행하지 않으면서도 실패한 수동 배포를 green pipeline으로 숨기지 않습니다.
- shell runner의 persistent checkout은 각 job 시작 시 remote ref를 fetch한 뒤 exact `CI_COMMIT_SHA`로 reset하며, HEAD 불일치나 non-ignored 잔여 파일이 있으면 build/deploy 전에 실패합니다. 운영자가 checkout 옆에 보존하는 `.env.*`/`compose.yaml.bak*` 백업은 Git과 Docker build context에서 제외되며, 이 명시 패턴 밖의 임의 파일은 허용하지 않습니다.
- `verify`는 shell runner host의 전역 Node/pnpm에 의존하지 않습니다. exact commit source, `pnpm install --frozen-lockfile` 의존성, generated Prisma client를 담은 `node:20`/`pnpm@10.28.0` CI image에서 GitLab pipeline contract, Codex preflight, root lint, server test를 실제로 실행하고 Git metadata만 read-only mount합니다.
- build image는 `app-<service>:<CI_COMMIT_SHA>` 태그로 보존합니다. 수동 deploy는 선택한 pipeline SHA의 image를 `latest`로 복원한 뒤 기존 Compose stack을 `--no-build`로 올립니다.
- deploy 직전에는 먼저 7개 commit image와 모든 기존 container의 rollback source를 전수 분류합니다. 실행 container의 image object가 남아 있으면 그 exact ID를 backup tag로 보존하고, container는 있지만 image object가 사라졌으면 먼저 `docker commit` application-container snapshot을 시도합니다. Docker content store 손상으로 commit도 실패하면 실행 container의 merged filesystem을 `docker export`하고 기존 CMD/ENTRYPOINT/WORKDIR/USER/ENV/EXPOSE/STOPSIGNAL을 `docker import --change`로 재적용한 평탄화 image를 만든 뒤 핵심 실행 metadata와 image ID를 검증합니다. 첫 배포처럼 기존 container가 없을 때만 현재 `latest`를 fallback으로 보존합니다. snapshot/export image는 application image 복구용이며 PostgreSQL, volume, bind-mounted DMS 문서/첨부 데이터의 백업을 대신하지 않습니다.
- 모든 서비스 backup이 성공한 뒤에만 completed manifest와 last-backup marker를 기록합니다. 일부 tag만 만들어진 실패 시도는 유효한 rollback set으로 취급하지 않으며, commit image나 rollback source가 하나라도 준비되지 않으면 image 선택과 Compose 변경 전에 실패합니다.
- build/deploy trace에는 commit image ID와 배포된 `ssoo-<service>` container image ID가 남고, 하나라도 다르면 deploy job이 실패합니다.
- 기본 60초 후 PostgreSQL과 전체 web/server container가 모두 `healthy`가 아니면 deploy job이 실패합니다. commit image 선택 이후 Compose recreation, health, image parity 중 하나라도 실패하면 completed manifest의 backup image를 `latest`로 복원하고 이전 application image set을 같은 Compose topology에서 `--no-build`로 다시 올린 뒤 rollback health와 container/backup-image parity를 검증합니다. Compose topology 또는 DB migration을 바꾸는 배포는 이 image rollback만으로 안전하다고 간주하지 않으며 별도 migration/config rollback 계획이 필요합니다.
- verify/build 직전에는 실행 중 container, tagged image, volume을 삭제하지 않고 unused BuildKit cache와 dangling image만 정리합니다. 먼저 지정된 cache 보존량을 유지하며 정리하고, Docker root의 여유 공간이 기본 8 GiB 미만이면 unused BuildKit cache를 전량 정리한 뒤 재측정합니다. 그래도 부족하면 실제 build 전에 실패합니다. Compose의 다중 타깃 build는 병렬도 1에서도 BuildKit 내부 타깃을 동시에 처리할 수 있으므로 사용하지 않습니다. `server`, `pms`, `dms`, `sns`, `admin`, `crm`, `db-init`을 각각 별도 Compose 명령으로 완전히 순차 빌드하고 다음 서비스 전마다 같은 용량 검사를 반복합니다. 임계값과 1차 cache 보존량은 각각 `CI_BUILD_MIN_FREE_KB`, `CI_BUILD_CACHE_KEEP_STORAGE`로 조정할 수 있습니다.
- 자동 rollback이 성공해도 원래 deploy job은 failed로 유지해 배포 실패 사실을 보존합니다. rollback도 실패하면 trace에 manifest 경로와 manual recovery 필요 상태를 남기고 failed로 종료하며, 운영자가 확인하기 전 추가 배포를 실행하지 않습니다.
- persistent worktree와 shared Docker tag를 사용하는 job은 shell runner host의 `/tmp/ssoo-app-runtime.lock` `flock`으로 직렬화됩니다. 더 최신 pipeline이 `latest`를 갱신한 뒤 과거 pipeline의 manual deploy를 실행해도 선택한 commit tag가 배포 기준입니다.

---

## 트러블슈팅

### 컨테이너 시작 실패
```bash
# 로그 확인
docker compose logs dms

# PostgreSQL 상태 확인
docker compose ps postgres
```

### Docker Desktop에 `lswiki`/`sooo` 같은 이전 compose project가 함께 남아 보일 때
- `compose.yaml` 은 `ssoo` project 이름을 기준으로 스택 식별자를 고정합니다.
- 과거에 다른 project 이름으로 띄운 컨테이너와 `ssoo-*` 고정 `container_name` 이 충돌하면, 아래 한 번의 정리 후 전체 스택을 다시 올리세요.

```bash
docker rm -f ssoo-postgres ssoo-db-init ssoo-server ssoo-pms ssoo-sns ssoo-dms ssoo-admin ssoo-crm 2>/dev/null || true
docker compose up -d --build
```

### AI 기능 오류
- `DATABASE_URL` 또는 `DMS_DATABASE_URL` 환경변수 확인
- PostgreSQL 컨테이너 healthy 상태 확인
- Azure OpenAI 키/엔드포인트 유효성 확인

### 서버 검색 오류
- `docker compose ps server` 로 server 상태 확인
- `docker compose logs server` 로 API 부팅/DB 연결 상태 확인
- 필요 시 `DMS_SERVER_API_URL` 을 다른 내부/외부 Nest API 주소로 override

### 데이터 경로 문제
- 실제 runtime data owner는 `server` 컨테이너입니다. 먼저 `docker compose exec server printenv DMS_MARKDOWN_ROOT DMS_INGEST_QUEUE_PATH DMS_STORAGE_LOCAL_BASE_PATH` 로 effective path 를 확인하세요. 템플릿은 `$DMS_MARKDOWN_ROOT/_templates/` 에 자동 포함됩니다.
- 기본 compose 는 host `.runtime/documents`, `.runtime/document-ingest`, `.runtime/document-storage/*` 를 server 컨테이너 `/var/lib/ssoo/*` document runtime 경로로 bind mount 합니다. 필요 시 `docker compose exec server ls -la "$DMS_MARKDOWN_ROOT"` 같이 mounted contents 를 직접 확인하세요.
- `dms` web 컨테이너는 UI/same-origin proxy 이므로 `/app/apps/web/dms/data` 를 운영 데이터 경로로 진단하지 않습니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-08-06 | verify/build 전 unused build cache·dangling image 정리와 8 GiB free-space gate를 추가하고, 7개 image를 서비스별 별도 Compose 명령으로 완전 순차 빌드하며 서비스 사이에도 용량을 재검사해 runner ENOSPC를 사전 복구/차단 |
| 2026-08-06 | missing running-image를 application-container snapshot으로 보존하고 content-store 손상 시 metadata-preserving filesystem export/import로 재구성하는 rollback preflight/completed manifest, post-mutation automatic rollback, manual+non-optional deploy 상태 계약을 추가 |
| 2026-07-15 | 현재 GitLab 버전과 호환되는 host `flock`, exact `CI_COMMIT_SHA` source alignment, 실제 자동 verify, commit-tagged image와 deployed container ID parity 계약을 추가 |
| 2026-06-19 | local compose 에서 `apps/web/dms/.env.local` 의 DMS/Azure 값을 `web-dms`와 `server`가 함께 읽도록 정리해 로컬 요약 경로가 UI 설정과 어긋나지 않게 수정 |
| 2026-06-19 | `compose.yaml` 의 Compose project name 을 `ssoo` 로 고정하고, Docker Desktop 에 남아 있는 이전 project 충돌을 위한 1회 정리 절차를 추가 |
| 2026-04-22 | 데이터 경로 트러블슈팅을 server-owned external runtime mount(`DMS_MARKDOWN_ROOT`, `DMS_TEMPLATE_ROOT`, `DMS_INGEST_QUEUE_PATH`, `DMS_STORAGE_LOCAL_BASE_PATH`) 기준으로 정리 |
| 2026-04-08 | full-stack compose 기준으로 `postgres + server + pms + sns + dms` 기본 배포, DMS internal server bridge, PMS/SNS browser API URL 기준으로 정리 |
| 2026-04-07 | root compose 단일 지원 경로, workspace Dockerfile, monorepo root tracing 기준 standalone runtime, `DMS_SERVER_API_URL` 브리지 기준으로 정규화 |
| 2026-03-17 | 초기 버전 — DMS Docker 독립 배포 가이드 |
