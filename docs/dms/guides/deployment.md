# DMS / SSOO Docker 배포 가이드

> 최종 업데이트: 2026-07-16

DMS를 **모노레포 통합 런타임 기준**으로 Docker 컨테이너에 배포하는 가이드입니다.  
지원 경로는 repo root `compose.yaml`을 공용 base로 두고, 로컬은 `compose.local.yaml`, 공개 배포는 `compose.production.yaml`을 반드시 함께 사용하는 방식입니다. 기본 배포 단위는 `postgres + server + admin + crm + pms + dms + sns` 전체 스택입니다.

> `compose.yaml` 의 Compose project name 은 `ssoo` 로 고정됩니다. 체크아웃 폴더명이 달라도 Docker Desktop 앱/리소스 이름이 `ssoo-*` 컨테이너 기준으로 일관되게 유지되도록 하기 위한 설정입니다.

---

## 전제 조건

- Docker Engine 24+
- Docker Compose v2.24.4+ (`!reset`/`!override` overlay tags 필요)
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

## 로컬 빠른 시작

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
> `pnpm docker:*`는 `compose.yaml + compose.local.yaml`을 사용합니다. 이 로컬 경로만 root `.env`와 `apps/web/dms/.env.local`을 읽고, localhost용 `AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS=true`를 명시합니다. 공개 배포에 로컬 overlay나 로컬 env 파일을 재사용하지 않습니다.

### 2. 빌드 & 실행

```bash
# repo root 기준 - 전체 스택
pnpm docker:up

# 최초 1회 또는 DB 초기화가 필요할 때
pnpm db:setup

# 로그 확인
pnpm docker:logs
```

조직 TLS 프록시가 dependency/Prisma binary endpoint를 중계하면 root `.env`의 `SSOO_TLS_CA_CERT_FILE`에 보안팀 승인 PEM root CA의 절대 경로를 설정합니다. 이 파일은 7개 이미지 build에 BuildKit secret으로만 노출되고, runtime secret은 outbound Node TLS가 필요한 server/db-init에만 mount되며 이미지 layer에는 포함되지 않습니다. 공개 CA 환경은 값을 비워 두며 `NODE_TLS_REJECT_UNAUTHORIZED=0` 같은 검증 우회는 금지합니다. 모든 deps stage는 전체 workspace manifest를 먼저 복사한 뒤 대상만 filtered install하고 pnpm v11 store와 lockfile-keyed verification metadata를 잠금형 BuildKit cache로 공유합니다. pnpm 11 pre-run 상태 검사와 최초 release-age/frozen lockfile/install-script allowlist 검증은 유지되고, 검증된 동일 lockfile의 반복 registry 조회만 줄어듭니다.

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
docker compose -f compose.yaml -f compose.local.yaml exec postgres pg_isready -U ssoo -d ssoo_dev
```

## 공개 배포 경로

공개/클로즈 베타 배포는 로컬 Compose 경로와 분리합니다.

```bash
cp .env.production.example .env.production

# .env.production에서 placeholder를 모두 실제 secret/URL/path로 교체한 뒤
pnpm docker:production:verify-env
pnpm docker:production:config
pnpm docker:production:up
```

프로덕션 gate의 강제 조건:

- 네 개의 auth secret과 PostgreSQL password는 충분한 길이의 비-placeholder 값이어야 하고 auth secret끼리 서로 달라야 합니다.
- 공개 API/앱/CORS/WebSocket URL은 non-local HTTPS/WSS여야 하며 secure cookie를 사용합니다.
- PostgreSQL은 host port를 공개하지 않고, API와 웹 포트는 `127.0.0.1`에만 bind합니다. 외부 공개는 같은 호스트의 승인된 TLS reverse proxy가 담당합니다.
- DMS markdown/ingest/local storage host path는 미리 생성된 읽기·쓰기 가능한 서로 다른 절대 경로여야 합니다.
- `SSOO_TLS_CA_CERT_FILE`을 설정했다면 읽을 수 있는 유효 PEM 인증서의 절대 경로여야 하며, Compose secret mount로만 전달됩니다.
- `DMS_INSTANCE_ENV=prod`와 SSH 또는 credential 비포함 HTTPS Git remote를 사용합니다.
- `.env.production`은 gitignored이며 verifier는 secret 값을 출력하지 않습니다.

> 프로덕션 구성 검증 통과는 TLS/HSTS, secret manager, 방화벽/WAF, 이미지 스캔, PostgreSQL 및 DMS runtime path의 백업·복구 증거를 대신하지 않습니다. 이 증거가 없으면 public internet 공개는 No-Go입니다.

기존 DB를 승격하거나 복원할 때는 `AUTH_CONFIG_ENCRYPTION_KEY`를 임의로 교체하지 않습니다. Admin에서 저장된 Microsoft client secret은 이 키로 AES-GCM 암호화되어 있으므로, 키 변경 전에 통제된 secret 재입력 또는 재암호화 절차가 필요합니다. JWT/refresh secret 변경은 기존 세션을 무효화하므로 별도 배포 공지와 검증을 거칩니다.

---

## Dockerfile 구조

`apps/web/dms/Dockerfile` — 3단계 멀티스테이지 빌드:

| Stage | 베이스 | 역할 |
|-------|--------|------|
| `deps` | `node:22` | pnpm 11.13.1로 `pnpm install --filter web-dms...` workspace 의존성 설치 |
| `builder` | `node:22` | `@ssoo/types` + `@ssoo/web-auth` + `web-dms` 빌드 후 standalone 산출물 생성 |
| `runner` | `node:22` | 최소 런타임 + 기본 JSON config 2종 포함 |

**주요 특성**:
- `output: 'standalone'` — monorepo root tracing 기준으로 standalone 산출 생성
- 비root 유저 실행 (`nextjs:nodejs`, UID 1001)
- runtime data 는 image 내부 `apps/web/dms/data/` 가 아니라 external runtime path mount 를 통해 server 컨테이너에 주입

---

## 볼륨 & 영속 데이터

Compose는 DMS 운영 데이터를 **빌드 이미지 밖의 external runtime paths** 로 분리합니다. 로컬 overlay는 repo의 `.runtime` 기본값을 허용하지만, 프로덕션 overlay는 아래 세 host path를 절대 경로로 강제합니다.

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

### compose base/overlay에서 설정

| 변수 | 값 | 설명 |
|------|-----|------|
| `DATABASE_URL` | `DOCKER_DATABASE_URL` 값으로 주입 | compose 내부 server/DMS 런타임 공용 PostgreSQL 연결 |
| `DMS_DATABASE_URL` | `DOCKER_DMS_DATABASE_URL` 값으로 주입 | DMS-local persistence 호환 키 |
| `DMS_SERVER_API_URL` | `http://server:4000/api` | compose 내부 server 검색/질문/요약 슬라이스 브리지 |
| `DMS_NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | DMS 브라우저 번들용 API 주소. build argument로 주입 |
| `DMS_NEXT_PUBLIC_WS_URL` | 빈 값 | 선택적 DMS 브라우저 Socket.IO origin. 비우면 absolute `DMS_NEXT_PUBLIC_API_URL`의 origin에서 파생 |
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

로컬 `compose.yaml + compose.local.yaml`은 root `.env`를 shared baseline으로 사용하고, `apps/web/dms/.env.local`을 DMS-local override로 함께 읽습니다. `apps/web/dms/.env.local`에 있는 DMS/Azure 겹치는 키는 `web-dms`와 `server` 컨테이너에 동시에 반영됩니다. 프로덕션 `compose.yaml + compose.production.yaml`은 두 env_file 주입을 모두 reset하고 `.env.production` interpolation으로 명시된 값만 전달합니다.

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

- 지원 compose base는 repo root `compose.yaml` 하나이며, 실행 환경에 따라 `compose.local.yaml` 또는 `compose.production.yaml` 중 하나를 반드시 병합합니다.
- 레거시 root / app-local `docker-compose.yml` 경로는 제거했습니다.
- Docker DMS는 workspace 빌드(`pnpm`, `@ssoo/types`, `@ssoo/web-auth`)를 전제로 합니다.
- 기본 compose는 DMS 단독이 아니라 **모노레포 full-stack**을 띄웁니다.

---

## 트러블슈팅

### 컨테이너 시작 실패
```bash
# 로그 확인
docker compose -f compose.yaml -f compose.local.yaml logs dms

# PostgreSQL 상태 확인
docker compose -f compose.yaml -f compose.local.yaml ps postgres
```

### Docker Desktop에 `lswiki`/`sooo` 같은 이전 compose project가 함께 남아 보일 때
- `compose.yaml` 은 `ssoo` project 이름을 기준으로 스택 식별자를 고정합니다.
- 과거에 다른 project 이름으로 띄운 컨테이너와 `ssoo-*` 고정 `container_name` 이 충돌하면, 아래 한 번의 정리 후 전체 스택을 다시 올리세요.

```bash
docker rm -f ssoo-postgres ssoo-db-init ssoo-server ssoo-pms ssoo-sns ssoo-dms ssoo-admin ssoo-crm 2>/dev/null || true
pnpm docker:up
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
- 로컬 compose는 host `.runtime/documents`, `.runtime/document-ingest`, `.runtime/document-storage/*`를 server 컨테이너 `/var/lib/ssoo/*` document runtime 경로로 bind mount 합니다. 프로덕션은 `.env.production`의 세 절대 host path만 허용합니다. 필요 시 해당 profile의 Compose 파일을 명시해 `exec server`로 mounted contents를 확인하세요.
- `dms` web 컨테이너는 UI/same-origin proxy 이므로 `/app/apps/web/dms/data` 를 운영 데이터 경로로 진단하지 않습니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-16 | 로컬/프로덕션 Compose overlay를 분리하고 production env secret/HTTPS/cookie/DB/DMS path/Git remote fail-closed gate, loopback port binding, 전체 교차 앱 URL build contract를 추가 |
| 2026-07-16 | DMS 브라우저 WebSocket origin을 explicit URL → public API origin → browser host `:4000` 순서로 해석하고 Docker build argument를 추가 |
| 2026-06-19 | local compose 에서 `apps/web/dms/.env.local` 의 DMS/Azure 값을 `web-dms`와 `server`가 함께 읽도록 정리해 로컬 요약 경로가 UI 설정과 어긋나지 않게 수정 |
| 2026-06-19 | `compose.yaml` 의 Compose project name 을 `ssoo` 로 고정하고, Docker Desktop 에 남아 있는 이전 project 충돌을 위한 1회 정리 절차를 추가 |
| 2026-04-22 | 데이터 경로 트러블슈팅을 server-owned external runtime mount(`DMS_MARKDOWN_ROOT`, `DMS_TEMPLATE_ROOT`, `DMS_INGEST_QUEUE_PATH`, `DMS_STORAGE_LOCAL_BASE_PATH`) 기준으로 정리 |
| 2026-04-08 | full-stack compose 기준으로 `postgres + server + pms + sns + dms` 기본 배포, DMS internal server bridge, PMS/SNS browser API URL 기준으로 정리 |
| 2026-04-07 | root compose 단일 지원 경로, workspace Dockerfile, monorepo root tracing 기준 standalone runtime, `DMS_SERVER_API_URL` 브리지 기준으로 정규화 |
| 2026-03-17 | 초기 버전 — DMS Docker 독립 배포 가이드 |
