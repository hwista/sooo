# DMS 프로덕션 Go-live Ralph 작업 핸드오프

> 최초 중단점: 2026-08-13 11:20 KST
> 최신 중단점: 2026-08-13 11:34 KST
> 브랜치: `launch/rebaseline-20260721`
> 기준 HEAD: `208acbe27d4509c4a41eeb6cb68073a4edbd378c`
> 상태: 안전 중단, goal 미완료, commit/push/deploy 미실행, dependency install 미실행

> 2026-08-14 후속 정본: 이 문서는 2026-08-13 당시의 중단 상태를 보존합니다. 현행 goal·다섯 트랙·완료 조건은 [DMS·Admin 운영 완결성 Launch Ralph 계획](./2026-08-14-operational-launch-ralph-plan.md)을 우선 적용합니다.

## 1. 재개할 goal

AI/RAG provider 준비는 명시적 런칭 예외로 유지하면서, SSOO DMS의 프로덕션 인프라·백업/복구·Git 배포 정합성·모노레포 릴리즈 게이트를 분석하고 자동화·문서화·Ralph 브라우저 검증으로 닫아, 외부 실운영 비밀값과 승인된 공개 엔드포인트를 주입하면 즉시 최종 Go를 선언할 수 있는 수준까지 완성한다.

AI/RAG 예외는 `DMS_AI_RAG_LAUNCH_MODE=exempted_external_provider`로만 명시하며, 프로덕션 설정·복구·릴리즈·브라우저 트랙의 실패를 면제하지 않는다.

## 2. 현재 판정

- 자동화 구현과 실제 격리 복구 드릴은 상당 부분 완료됐다.
- 아직 최종 `GO`는 아니다.
- 남은 핵심은 문서 정본 동기화, 전체 모노레포 게이트, 실제 브라우저 Ralph 실행, clean commit 및 양 원격 SHA 일치, 운영 비밀값·공개 HTTPS 엔드포인트를 사용한 최종 증거 생성이다.
- 현재 작업트리는 다른 DMS/CRM 작업을 포함해 매우 dirty 상태다. 이 작업에서 임의로 전체 commit 또는 push하지 않는다.

## 3. 완료된 구현

### 3.1 프로덕션 설정과 배포 증명

- `scripts/verify-production-compose-env.mjs`
  - 백업 루트/파일명/보존일, AI 런칭 모드, `SSOO_RELEASE_SHA`를 fail-closed 검증한다.
  - 백업 루트가 세 런타임 루트와 겹치거나 포함 관계이면 실패한다.
- `.env.production.example`
  - `SSOO_RELEASE_SHA`, 백업 설정, AI 예외 모드를 추가했다.
- `apps/server/Dockerfile`, `apps/web/dms/Dockerfile`, `apps/web/admin/Dockerfile`
  - 동일한 release SHA를 이미지/빌드에 주입하도록 보강했다.
- `packages/web-shell/next-security-headers.cjs`
  - 유효한 SHA에 한해 `X-SSOO-Release-SHA`를 응답에 노출한다.
- 서버 health 응답은 `releaseSha`를 반환한다.
- `scripts/verify-dms-public-endpoints.mjs`
  - HTTPS/TLS/HSTS/보안 헤더, 보안 쿠키, API readiness, DMS readiness 9개 항목, API/DMS/Admin release SHA 일치를 확인한다.
- `scripts/verify-workspace-release-state.mjs`
  - clean worktree와 `local HEAD == GitHub main == GitLab development == codex.gitlabLastPublished`를 요구한다.
- `.codex/scripts/workspace-publish.sh`
  - dirty worktree에서는 publish를 거부한다.

### 3.2 실제 백업→격리 복원 증명

- `scripts/verify-dms-backup-restore.mjs`
  - PostgreSQL custom dump와 Markdown Git/ingest/storage 런타임 루트를 함께 snapshot한다.
  - 파일 manifest·크기·SHA-256, 실제 Git 저장소, ingest 상태 파일을 검증한다.
  - 임시 DB에 격리 복원 후 canonical DB runtime contract를 실행하고 임시 DB를 정리한다.
- `docker/db-init.Dockerfile`, `compose.production.yaml`
  - profile 전용 `dms-restore-verify` one-shot 운영 서비스를 추가했다.
- 실제 PostgreSQL 16 드릴 통과:
  - launch migration 7개
  - DB trigger 81개
  - schema drift 0
  - runtime roots 32 files / 22 directories / 27,605 bytes
  - 성공 증거: `/tmp/ssoo-dms-restore-real.tXnjNW/backup/dms-launch-real-proof-v3.evidence.json`
- 이 드릴에서 발견한 CRM launch migration/trigger 불일치를 수정했다.
  - launch migration `20260813100000`, `20260813110000`, `20260813120000` 추가
  - trigger apply 목록에 `79`, `80` 추가
  - Prisma 관계/FK/constraint/timestamp 정합성 보정
- 임시 PostgreSQL 프로세스는 현재 실행 중이지 않다. `postmaster.pid`는 남아 있지만 PID는 존재하지 않는다.

### 3.3 통합 Go 게이트와 브라우저 명세

- `scripts/run-dms-go-live-gate.mjs`
  - 릴리즈 아티팩트, 프로덕션 인프라, 복구 증명, 브라우저 Ralph의 네 트랙을 하나의 fail-closed 판정으로 묶었다.
  - `.env.production`의 SHA가 현재 HEAD와 다르면 실패한다.
  - AI provider-ready 모드만 AI smoke를 요구하고, 외부 provider 예외는 별도 상태로 기록한다.
- `automation/tests/e2e/dms-production-readiness.spec.ts`
  - DMS 로그인→설정→readiness 9개 Ready→수집 운영 화면
  - Admin 로그인→대시보드→AI 운영 경계 확인
  - console error/warning, page error, HTTP 5xx가 하나라도 있으면 실패
- `automation/playwright.config.ts`
  - 외부/로컬 검증을 위한 `PLAYWRIGHT_BASE_URL`을 지원한다.
- 공유 사용자 메뉴에 비시각적 접근성 라벨을 추가했다.
- `package.json`에 새 verifier/self-test/final Go 명령을 연결했다.

## 4. 이미 통과한 검증

- 이 turn 시작 시 `pnpm run codex:preflight`
- `pnpm run verify:production-compose-env:self-test`
- `pnpm run verify:dms-backup-restore:self-test`
- `pnpm run verify:dms-public-endpoints:self-test`
- `pnpm run verify:workspace-release-state:self-test`
- `pnpm run verify:dms-go-live:self-test`
- public endpoint 로컬 HTTP fixture self-test
- `docker compose -f compose.yaml -f compose.production.yaml config --no-interpolate --quiet`
- Prisma schema validation
- 실제 PostgreSQL backup→isolated restore→runtime contract 드릴
- 네 개 신규 `.mjs` 파일의 `node --check`

위 결과는 구현 중간 증거다. 이후 다른 작업의 동시 변경이 있었으므로 재개 후 최종 전체 게이트를 다시 실행해야 한다.

## 5. 다음 세션의 정확한 재개 순서

### 5.1 컨텍스트 복구

```bash
cd /home/a0122024330/src/ssoo
sed -n '1,320p' docs/dms/planning/2026-08-13-production-go-live-ralph-handoff.md
git status --short --branch
git rev-parse HEAD
pnpm run codex:preflight
```

`HEAD`나 관련 파일이 이 문서의 중단점 이후 바뀌었다면 변경분을 먼저 재검토한다. 다른 작업자의 변경을 되돌리거나 전체 staging하지 않는다.

### 5.2 남은 코드 마감

1. `scripts/verify-production-compose-env.mjs`의 repository contract에 세 Dockerfile의 `ARG SSOO_RELEASE_SHA`와 shared header의 `X-SSOO-Release-SHA` 존재 확인을 추가한다.
2. `scripts/verify-dms-backup-restore.mjs`에서 최종 archive를 `0600`으로 chmod한다.
3. `automation/tests/e2e/dms-production-readiness.spec.ts`의 `수집 큐 상태` locator를 필요하면 `.first()`로 고정해 strict-mode 중복을 피한다.
4. 서버 health DTO 변경분에 맞춰 OpenAPI를 재생성하고 contract를 검증한다.

### 5.3 문서 정본 동기화

새 실행/판정 계획을 `docs/dms/planning/2026-08-13-production-go-live-ralph-plan.md`에 작성하고 아래를 동기화한다.

- `docs/dms/README.md`
- `docs/dms/guides/deployment.md`
- `docs/dms/planning/README.md`
- `docs/dms/planning/roadmap.md`
- `docs/dms/planning/backlog.md`
- `docs/dms/planning/changelog.md`
- 필요 시 `docs/common/explanation/architecture/security-standards.md`

문서에는 네 트랙의 정확한 pass/fail, AI 외부 provider 예외, 운영 설정 순서, 증거 파일, rollback/No-Go 조건을 포함한다. 실제 공개 endpoint 검증 전에는 완료로 과장하지 않는다.

### 5.4 전체 정적 게이트

최소 실행 대상:

```bash
pnpm docs:openapi
pnpm run verify:openapi-contract
pnpm run codex:verify-sync
pnpm run docs:verify
pnpm run lint
pnpm run test:server
pnpm run security:audit:prod
pnpm run db:contract:test
pnpm run build
pnpm run codex:dms-guard
pnpm run codex:push-guard
```

CRM 동시 변경 때문에 실패하면 DMS 게이트를 우회하지 말고 원인을 분리해 고친 후 전체를 재실행한다.

### 5.5 브라우저 Ralph

1. `.codex/scripts/dms-local-test-start.sh`와 `automation/scripts/playwright/start-dms-e2e-stack.sh`를 먼저 읽어 격리 포트·계정·정리 방법을 확인한다.
2. 프로덕션 유사 로컬 stack에서 새 `dms-production-readiness.spec.ts`를 실행한다.
3. Playwright CLI로 DMS 설정/readiness와 Admin AI 운영 화면을 직접 확인하고 데스크톱 증거를 남긴다.
4. console warning/error 0, page error 0, HTTP 5xx 0을 확인한다.
5. 시작한 stack/process만 종료한다.

### 5.6 실제 프로덕션 최종 Go

1. clean commit SHA를 확정한다.
2. GitLab 선행 변경을 안전하게 병합하고 전체 게이트를 다시 실행한다.
3. 승인 후 GitHub `main`과 GitLab `development`에 동일 SHA를 publish한다.
4. `.env.production`에 실제 secret, public HTTPS URLs, 세 runtime root, 분리된 backup root, 고유 archive name, 확정 SHA를 입력한다.
5. TLS reverse proxy 뒤에 같은 SHA의 server/DMS/Admin 이미지를 배포한다.
6. `pnpm run verify:dms-go-live`를 운영 호스트에서 실행한다.
7. 네 트랙이 모두 PASS이고 AI 상태만 `EXEMPTED_EXTERNAL_PROVIDER`일 때 최종 `GO`를 선언한다.

## 6. 즉시 No-Go 조건

- dirty 또는 detached worktree
- local/GitHub/GitLab/last-published SHA 불일치
- 운영 이미지 응답 SHA 불일치
- HTTP 사용, TLS 1.2 미만, 인증서 잔여 14일 미만, HSTS/보안 헤더/보안 쿠키 누락
- API readiness 또는 DMS readiness 9개 중 하나라도 비정상
- backup source가 snapshot 중 변경되거나 복원 DB contract/schema drift 실패
- browser console warning/error, page error, HTTP 5xx 발생
- AI 예외가 아닌 다른 런칭 실패를 예외로 처리하려는 경우

## 7. 중단 안전성

- 이 핸드오프 작성 시 새 build/test/browser 작업은 실행 중이지 않다.
- 임시 PostgreSQL PID `65920`은 존재하지 않아 stop 명령이 `No such process`로 확인됐다.
- commit, push, merge, deploy, 외부 서비스 변경은 수행하지 않았다.
- `/tmp/ssoo-dms-restore-real.tXnjNW`는 복구 드릴 증거를 위해 그대로 보존했다. PC 재부팅 또는 OS 정리로 사라질 수 있으므로 최종 증거는 다시 생성 가능해야 한다.
- 다음 세션은 이 문서의 5.1부터 그대로 재개한다.

## 8. 11:34 KST 최신 중단점 추가 진행

이 절이 위 5장의 남은 순서를 최신 상태로 보정합니다. 사용자의 중단 의도를 재개 지시로 잘못 해석해 일부 작업이 추가 진행됐으며, 현재는 모든 실행을 멈췄습니다.

### 8.1 추가 완료

- 남은 fail-closed 보강:
  - production env repository contract가 server/DMS/Admin Dockerfile의 `SSOO_RELEASE_SHA` build/runtime 반영과 공용 `X-SSOO-Release-SHA` header를 검사합니다.
  - backup archive를 생성 직후 mode `0600`으로 고정합니다.
  - DMS Ralph spec의 `수집 큐 상태` locator를 strict-mode 안전하게 보정했습니다.
  - sandbox가 child command를 status 0으로 완료하고도 `spawnSync`에 `EPERM` metadata를 함께 주는 경우, 실제 status가 0이면 통과하되 status null/non-zero는 계속 실패하도록 backup command wrapper를 보정했습니다.
- 정본 문서:
  - `2026-08-13-production-go-live-ralph-plan.md`를 추가했습니다.
  - DMS README/planning index/deployment/roadmap/backlog/changelog와 common security/auth, root changelog를 동기화했습니다.
  - AI/RAG는 `exempted_external_provider` post-launch acceptance로 분류하되 다른 네 트랙을 면제하지 않도록 고정했습니다.
- OpenAPI:
  - 5개 domain 정적 OpenAPI를 재생성했습니다.
  - health `releaseSha`를 critical contract에 추가했습니다.
  - 자기 계정의 읽기 전용 `roleCode` 표시는 보존하되 JWT/browser `AuthIdentity`와 권한 판정에는 사용하지 않는 경계를 문서화했습니다.
  - `verify:openapi-contract` 통과: static domains 5, operations 443.

### 8.2 최신 통과 증거

- `node .github/scripts/check-docs.js --strict-warnings`
- production env / backup-restore / public-endpoint / workspace-release-state / final-go self-test 5종
- server, web-dms, web-admin TypeScript
- 신규 verifier Node syntax와 production Compose no-interpolate config
- server Jest: 60 suites, 424 tests
- DB launch contract: 9 tests
- docs verify와 Codex sync
- workspace lint: 11 packages

OpenAPI HTML 생성 과정의 third-party Redoc/styled-components가 `depth`/`html` unknown prop warning을 출력했지만 generator는 성공했습니다. 이는 실제 DMS/Admin 브라우저 Ralph console 증거가 아니며, 최종 browser gate는 별도로 남아 있습니다.

### 8.3 현재 No-Go와 중요한 중간 상태

`pnpm run security:audit`가 2026-08-13 advisory 기준 high 취약점 11개를 탐지해 실패했습니다.

- Next.js `<15.5.21`
- PostCSS `<8.5.18`
- `socket.io-parser` `<4.2.7`
- `js-yaml` `<4.3.1`
- `pdfjs-dist` `<6.2.108`
- nanoid 3.x `<3.3.17`, 5.x `<5.1.16`

다음 manifest/override는 patched version 대상으로 이미 수정했습니다.

- `pnpm-workspace.yaml`
- `apps/server/package.json`
- `apps/web/admin/package.json`
- `apps/web/crm/package.json`
- `apps/web/pms/package.json`
- `apps/web/dms/package.json`
- `apps/web/sns/package.json`

중요: 사용자가 PC 종료를 요청해 `pnpm install`을 실행하지 않았습니다. 따라서 `pnpm-lock.yaml`과 `node_modules`는 아직 이전 version이며 manifest와 lockfile이 불일치하는 의도된 중간 상태입니다. security audit도 아직 실패 상태입니다.

### 8.4 다음 세션의 첫 실행 순서

```bash
cd /home/a0122024330/src/ssoo
sed -n '1,420p' docs/dms/planning/2026-08-13-production-go-live-ralph-handoff.md
git status --short --branch
git rev-parse HEAD

# manifest를 다시 검토한 뒤 lockfile/node_modules 동기화
pnpm install
pnpm run security:audit
```

dependency install 뒤에는 다음을 우선 확인합니다.

1. `pnpm list -r --depth 0 next postcss pdfjs-dist nanoid`
2. `pnpm why -r socket.io-parser js-yaml postcss nanoid pdfjs-dist`
3. server PDF text extraction 관련 test/typecheck
4. 5개 Next 앱 lint/typecheck/build
5. `pnpm run codex:preflight`, `codex:dms-guard`, `codex:push-guard`
6. 프로덕션 유사 DMS/Admin Playwright Ralph

PDF.js는 5.x에서 patched 6.2.108로 major upgrade하는 중이므로 `pdfjs-dist/legacy/build/pdf.mjs` import와 실제 PDF extraction smoke를 반드시 확인합니다. audit가 green이 되기 전에는 build/browser 단계로 완료 판정하지 않습니다.

### 8.5 프로세스와 외부 상태

- 최신 기준 HEAD는 여전히 `208acbe27d4509c4a41eeb6cb68073a4edbd378c`입니다.
- 추가 commit, push, merge, deploy, 외부 서비스 변경은 없습니다.
- 실행 중인 pnpm/turbo/playwright/Next/Nest/테스트 PostgreSQL 작업은 없습니다.
- goal은 active 상태이며 complete/blocked로 변경하지 않습니다.
- 다음 사용자 신호 전에는 작업을 재개하지 않습니다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-13 | 11:34 KST 추가 중단점: 문서/OpenAPI/정적 gate 진행 상태와 security audit No-Go, manifest만 갱신되고 lockfile/install이 남은 정확한 재개 지점 기록 |
| 2026-08-13 | 프로덕션 Go-live Ralph 작업의 구현·검증·미완료·재개 순서를 안전 중단점으로 고정 |
