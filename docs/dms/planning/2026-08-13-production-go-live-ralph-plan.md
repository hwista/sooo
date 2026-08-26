# DMS 프로덕션 Go-live Ralph 계획 및 테스트 명세

> 기준일: 2026-08-13 KST
> 범위: DMS 프로덕션 인프라, 백업·복구, Git/릴리즈 정합성, 브라우저 런칭 증거
> AI/RAG disposition: `exempted_external_provider`

> 2026-08-14 보완: 이 문서의 네 트랙에 누락됐던 Admin/DMS 운영 기능 전체 수용 기준은 [DMS·Admin 운영 완결성 Launch Ralph 계획](./2026-08-14-operational-launch-ralph-plan.md)을 다섯 번째 blocking 트랙으로 적용합니다.

## 1. 목표와 판정 경계

이 계획의 목표는 외부 실운영 비밀값과 승인된 공개 HTTPS endpoint를 주입하고 동일 release SHA의 이미지를 배포한 직후, 단일 fail-closed gate로 DMS 최종 `GO`를 판정할 수 있게 만드는 것입니다.

현재 코드·자동화가 완료됐다는 사실만으로 프로덕션 `GO`를 선언하지 않습니다. 최종 판정은 아래 다섯 트랙이 동일 release SHA와 실제 운영 환경에서 모두 통과한 증거가 있어야 합니다.

AI/RAG provider/model은 현재 즉시 준비할 수 없는 외부 입력이므로 `DMS_AI_RAG_LAUNCH_MODE=exempted_external_provider`로 명시합니다. 이 예외는 AI provider-ready smoke만 연기하며, 다른 트랙의 실패나 누락을 면제하지 않습니다. `provider_ready`로 전환할 때는 embedding deployment와 provider-backed runtime smoke가 다시 blocking gate가 됩니다.

## 2. 다섯 개의 blocking 트랙

| 트랙 | 통과 조건 | authoritative evidence | 실패 시 |
|------|-----------|------------------------|---------|
| A. 릴리즈 아티팩트·Git 정합성 | clean/non-detached worktree, 필수 모노레포 gate 통과, local HEAD = GitHub `main` = GitLab `development` = last published SHA | `verify:workspace-release-state`와 통합 report | No-Go |
| B. 프로덕션 인프라·공개 endpoint | placeholder 없는 production env, HTTPS/TLS 1.2+, 인증서 14일 이상, HSTS/보안 헤더/secure cookie, API·DMS readiness, server/DMS/Admin baked SHA 일치 | `docker:production:verify-env`, `verify:dms-public-endpoints` | No-Go |
| C. 백업·격리 복구 | PostgreSQL custom dump와 Markdown Git/ingest/storage snapshot 생성, source 안정성·manifest/hash 확인, 임시 DB 복원 후 canonical DB contract와 schema drift 0 | `verify:dms-backup-restore:production` evidence JSON | No-Go |
| D. 격리 운영 제어 증명 | 전용 DB/runtime/SMTP에서 Admin·DMS 설정, 권한 거부, 저장소 선택, password-reset 전달을 실제 mutation하고 reload·복원 | `admin-operational-readiness.spec.ts`, `dms-operational-settings.spec.ts` | No-Go |
| E. 배포 브라우저 Ralph | 실제 로그인 후 DMS readiness 9/9와 전체 settings direct entry, Admin 운영 route/SMTP/AI disposition, console warning/error 0, page error 0, HTTP 5xx 0 | production readiness와 operational Playwright specs, CLI snapshot/screenshot/console/network 증거 | No-Go |

모든 트랙은 `scripts/run-dms-go-live-gate.mjs`에서 순차 실행되며 하나라도 실패하면 최종 report는 `GO`가 될 수 없습니다.

## 3. 환경과 아티팩트 동결 절차

1. 릴리즈 대상 변경을 검토하고 의도한 파일만 commit해 clean SHA를 확정합니다.
2. dirty worktree에서는 GitLab sync나 workspace publish를 실행하지 않습니다.
3. GitLab `development`가 앞서 있으면 `pnpm run codex:workspace-sync-from-gitlab`로 병합한 뒤 모든 gate를 다시 실행합니다.
4. 승인을 받은 뒤 `pnpm run codex:workspace-publish`로 GitHub와 GitLab에 동일 SHA를 게시합니다.
5. `.env.production.example`을 기반으로 운영 host의 gitignored `.env.production`을 작성합니다.
6. `SSOO_RELEASE_SHA`는 40자 lowercase commit SHA와 정확히 일치시킵니다.
7. 인증·DB secret은 서로 독립적인 운영값으로 주입하고 공개 API/DMS/Admin URL은 승인된 HTTPS hostname을 사용합니다.
8. Markdown, ingest, local storage root는 서로 포함하지 않는 별도 절대 경로로 만들고, backup root도 세 runtime root와 완전히 분리합니다.
9. `DMS_BACKUP_ARCHIVE_NAME`은 실행마다 고유한 `.tar.gz` 또는 `.tgz` 이름을 사용합니다.
10. `DMS_AI_RAG_LAUNCH_MODE=exempted_external_provider`를 명시하고 묵시적 skip은 허용하지 않습니다.
11. production Compose로 server/DMS/Admin을 포함한 스택을 빌드·배포하고 승인된 TLS reverse proxy 뒤에 둡니다.

## 4. 사전 릴리즈 게이트

릴리즈 SHA를 게시하기 전에 아래 명령을 최신 작업트리에서 모두 통과시킵니다.

```bash
pnpm run codex:verify-sync
pnpm run codex:preflight
pnpm run docs:verify
pnpm run lint
pnpm run test:server
pnpm run security:audit
pnpm run db:contract:test
pnpm run docs:openapi
pnpm run verify:openapi-contract
pnpm run build
pnpm run codex:dms-guard
pnpm run codex:push-guard
```

gate가 관측형 wrapper를 사용하다 machine-local observer 없이 raw fallback해도 exit status와 실제 출력이 통과해야 합니다. registry/advisory 연결 실패는 security 통과로 해석하지 않습니다.

## 5. 프로덕션 실행 순서

```bash
# 1. 값과 Compose 구조 검증
pnpm run docker:production:verify-env
pnpm run docker:production:config

# 2. 동일 SHA 이미지 배포
pnpm run docker:production:up

# 3. 공개 endpoint와 baked SHA 검증
pnpm run verify:dms-public-endpoints

# 4. PostgreSQL + 세 runtime root 백업·격리 복원
pnpm run verify:dms-backup-restore:production

# 5. 다섯 트랙 최종 판정
pnpm run verify:dms-go-live
```

통합 gate는 배포나 트래픽 전환 자체를 수행하지 않습니다. 운영자가 승인된 환경을 먼저 배포한 다음 읽기·검증 작업으로 최종 판정을 생성합니다.

## 6. 브라우저 Ralph 테스트 명세

### 6.1 DMS 흐름

1. 공개 DMS `/login`에 launch verifier admin 계정으로 로그인합니다.
2. DMS 홈의 대표 landmark가 표시되는지 확인합니다.
3. 사용자 메뉴에서 `문서 운영·진단`으로 이동합니다.
4. `DMS 운영 readiness`가 `런칭 준비됨`을 표시하고 `Ready`가 정확히 9개인지 확인합니다.
5. `Blocked`와 `Degraded`가 0개인지 확인합니다.
6. `수집 큐 상태`를 열고 `수집 작업 처리` 화면과 정상 queue 조회를 확인합니다.

### 6.2 Admin 흐름

1. 새 browser context에서 공개 Admin `/login`에 같은 검증 계정으로 로그인합니다.
2. `대시보드`가 표시되는지 확인합니다.
3. `/ai-operations`로 이동해 `Provider 준비 상태`를 확인합니다.
4. AI launch mode가 예외이면 provider `blocked` 상태와 “비밀값을 조회하거나 수정하지 않는다”는 제어 경계를 확인합니다.
5. AI launch mode가 `provider_ready`이면 세 provider readiness가 모두 `ready`인지 확인합니다.

### 6.3 공통 실패 조건

- console `error` 또는 `warning` 1건 이상
- uncaught `pageerror` 1건 이상
- 관련 API/proxy HTTP 5xx 1건 이상
- 로그인·라우팅·landmark·readiness assertion 실패
- screenshot만 있고 console/network 확인이 없는 경우

자동 spec 통과 뒤 Playwright CLI로 같은 핵심 경로를 새 세션에서 다시 열어 snapshot, console, network와 데스크톱 screenshot을 `output/playwright/`에 남깁니다. 사용자-visible 변경이 생겼다면 모바일 viewport도 추가 검증합니다.

## 7. 백업·복구 증거 계약

백업 archive는 운영 DB 내용을 포함하므로 mode `0600`으로 생성하고 backup root 접근을 운영자에게 제한합니다. evidence JSON에는 secret이나 DB password를 기록하지 않습니다.

증거에는 다음이 포함되어야 합니다.

- archive path, bytes, SHA-256
- database dump SHA-256
- runtime file/directory/byte 수와 manifest SHA-256
- Markdown root가 실제 Git working tree라는 확인
- ingest `jobs.json` 상태와 job 수
- snapshot 중 source가 변경되지 않았다는 확인
- 임시 restore DB 사용과 canonical `db:runtime:verify` 통과
- restore DB가 종료 시 제거됐다는 실행 결과

복구 드릴은 실제 쓰기 freeze 중 실행합니다. `DMS_BACKUP_RETENTION_DAYS`는 최소 보존 기준이며, 만료 archive 삭제는 승인된 외부 retention job이 소유합니다.

## 8. 최종 판정과 증거 보존

최종 report의 다섯 트랙이 모두 `passed`이고 AI disposition만 `EXEMPTED_EXTERNAL_PROVIDER`일 때 `GO`를 선언할 수 있습니다. report, backup evidence, Playwright artifact, 배포 SHA와 실행 시각을 같은 launch evidence bundle에 보존합니다.

다음 중 하나라도 발생하면 트래픽 전환을 중단하거나 이전 검증 SHA로 rollback합니다.

- local/GitHub/GitLab/runtime SHA 불일치
- 공개 endpoint 또는 browser flow failure
- DB readiness, DMS 9개 readiness, backup restore contract 실패
- 배포 뒤 새 high/critical vulnerability 발견
- runtime root나 Git remote가 검증 시점 이후 변경
- AI 외부 provider 예외를 다른 기능 장애의 예외로 확대

rollback 후에는 원인을 고치고 새 SHA를 게시·배포한 뒤 다섯 트랙 전체를 처음부터 다시 실행합니다. 이전 SHA의 부분 증거를 새 SHA의 통과 증거로 재사용하지 않습니다.

## 9. 현재 증거와 남은 외부 입력

2026-08-13 현재 verifier self-test와 실제 PostgreSQL 16 backup→isolated restore 드릴은 통과했습니다. 해당 드릴은 launch migration 7개, application trigger 81개, schema drift 0을 확인했습니다.

아직 실제 프로덕션 `GO` 증거로 남은 것은 다음 외부 입력과 실행입니다.

- clean·승인된 release commit 및 양 원격 게시
- 운영 secret과 공개 HTTPS endpoint
- 동일 SHA production image 배포
- 운영 host에서 생성한 backup/restore evidence
- 공개 URL에 대한 endpoint verifier와 브라우저 Ralph evidence

따라서 현재 판정은 “외부 입력 주입 즉시 최종 gate 실행 가능”이며, 공개 endpoint 증거 전에는 “이미 프로덕션 GO”로 표기하지 않습니다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-14 | Admin/DMS 운영 mutation과 SMTP 전달·설정 deep link를 독립 blocking 트랙으로 추가해 최종 gate를 다섯 트랙으로 확장 |
| 2026-08-13 | AI/RAG 외부 provider 예외를 명시하고 네 개 blocking 트랙, 실행 순서, 브라우저·복구 증거 계약, 최종 Go/No-Go 기준을 고정 |
