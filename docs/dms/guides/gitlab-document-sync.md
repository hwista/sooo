# DMS GitLab 문서 자동 싱크 운영 가이드

> 최종 업데이트: 2026-08-19
> 최종 업데이트: 2026-08-27
> 범위: DMS 서버가 runtime markdown root를 어떤 문서 GitLab 저장소에 연결하는지 운영/개발/테스트 역할별로 고정하는 절차.

이 문서는 코드 구현이 아니라 운영 handoff 문서입니다. 현재 DMS 서버는 시작 시 이미 `gitService.initialize()` 를 호출하며, 운영자는 `.env` 와 배포 runtime 역할만 올바르게 고정하면 됩니다.

---

## 1. 코드 적용 상태

자동 싱크 진입점과 역할 검증은 이미 서버 부팅 경로에 포함되어 있습니다.

- `apps/server/src/modules/dms/dms.module.ts`
  - `onModuleInit()` 에서 DB 설정 초기화 후 `configService.assertGitBootstrapContract()` 와 `gitService.initialize()` 호출
  - `DMS_INSTANCE_ENV` 누락/오류 또는 역할-설정 mismatch 는 startup-fatal 로 중단
  - 기존 repo의 실제 `origin` 이 기대 remote 와 다르거나 Git 초기화가 실패하면 서버 기동을 중단
  - 최초 document control-plane 동기화 실패도 startup-fatal로 처리
- `apps/server/src/modules/dms/runtime/dms-config.service.ts`
  - `DMS_INSTANCE_ENV=prod|dev|local-test` 역할 계약을 해석
  - 역할별 canonical remote / branch / explicit-empty override 를 계산
- `apps/server/src/modules/dms/runtime/git.service.ts`
  - empty dir clone, 기존 repo fast-forward, wrong-remote blocking 을 수행
  - 기존 repo의 `origin` 을 자동으로 덮어쓰지 않고 mismatch 를 진단 상태로 남김
  - bind-mounted 문서 root의 host/container 소유자가 달라도, DMS가 해석한 정확한 문서 root만 command-local `safe.directory`로 허용

따라서 역할별 overlay / `.env.production` / SSH 운영 기준과 readiness가 모두 맞아야 서버가 healthy로 승격됩니다.

---

## 2. 역할 계약 정본

현재 기준의 canonical binding 은 아래와 같습니다.

| `DMS_INSTANCE_ENV` | 대상 역할 | canonical remote | 기본 branch | 메모 |
|---|---|---|---|---|
| `prod` | 현재 서버/배포 운영 | `http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git` | `master` | 기존에 사용하던 문서 repo 유지 |
| `dev` | 일반 로컬 실행 / 개발 서버 | `git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git` | `master` | ordinary local run 은 이 역할을 따라감 |
| `local-test` | Playwright/direct-run 격리 테스트 | remote 없음 | `master` | 문서 repo는 항상 격리 상태 유지 |

운영 원칙:

- `DMS_INSTANCE_ENV=prod` 런타임은 `LSWIKI_DOC.git` 문서 저장소를 canonical remote 로 사용합니다.
- `DMS_INSTANCE_ENV=dev` 런타임은 `LSWIKI_DOC_DEV.git` 문서 저장소를 canonical remote 로 사용합니다.
- 현재 "서버에 올라가는" 배포 런타임은 `DMS_INSTANCE_ENV=prod` 로 취급합니다.
- ordinary local run(`pnpm dev`, `pnpm dev:server`, local compose)은 `DMS_INSTANCE_ENV=dev` 로 취급합니다.
- Playwright / local-test 는 `DMS_INSTANCE_ENV=local-test` 로 고정하고 remote 를 비워 둡니다.
- 향후 운영 서버와 개발 서버가 명확히 분리되더라도 같은 역할 계약을 그대로 사용합니다.

---

## 3. 운영자가 관리해야 할 `.env` 값

공통 `compose.yaml`은 `DMS_INSTANCE_ENV`와 `DMS_GIT_BOOTSTRAP_REMOTE_URL`을 빈 값으로 두어 단독 실행을 fail-closed합니다. 로컬은 `compose.local.yaml`이 literal `dev`, Docker 격리 테스트는 마지막 `compose.local-test.yaml`이 literal `local-test`와 remote-empty를 강제합니다. 실제 운영에서는 `.env.production`에 값을 둔 뒤 `compose.production.yaml`과 함께 사용하며 로컬 `.env`는 운영 역할의 입력으로 사용하지 않습니다.

```dotenv
# 필수 역할 선택
DMS_INSTANCE_ENV=prod

# 역할별 canonical remote
DMS_GIT_PROD_REMOTE_URL=http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git
DMS_GIT_DEV_REMOTE_URL=git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git

# branch 기본값
DMS_GIT_BOOTSTRAP_BRANCH=master

# 선택: stale persisted bootstrap remote 를 지우거나 같은 remote 로만 override 할 때 사용
DMS_GIT_BOOTSTRAP_REMOTE_URL=
```

주의:

- 운영자 `.env` 에는 먼저 `DMS_INSTANCE_ENV` 를 넣고, 그 다음 역할별 remote 변수를 맞춥니다.
- `DMS_GIT_BOOTSTRAP_REMOTE_URL` 은 기본 스위치가 아닙니다. 역할이 기대하는 remote 와 다른 값을 넣으면 startup-fatal 이거나 mutation-blocking 상태가 됩니다.
- local dev 는 `DMS_INSTANCE_ENV=dev` 를 사용하고, 배포 운영은 `DMS_INSTANCE_ENV=prod` 를 사용합니다.
- local-test 는 `DMS_INSTANCE_ENV=local-test` 이고 `DMS_GIT_BOOTSTRAP_REMOTE_URL` 을 비워 둡니다.
- secret, token, credential 값은 기록하지 않는다. 문서에는 URL shape 와 변수명만 남긴다.
- 개발 remote 는 SSH(`git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git`) 이므로 서버/개발 머신의 SSH key, known_hosts, access policy 를 별도로 준비해야 합니다.

---

## 4. 부팅 시 동작 규칙

역할 계약과 현재 working tree 상태에 따라 DMS 는 아래처럼 동작합니다.

| 상태 | 역할 | 동작 | 운영 의미 |
|---|---|---|---|
| empty dir | `prod`/`dev` | role-bound remote 로 `git clone` | 빈 runtime document root 를 역할별 정본 repo 로 채움 |
| existing `.git` + expected remote | `prod`/`dev` | fetch + fast-forward only auto-pull | 현재 repo binding 을 유지하면서 안전하게 최신화 |
| existing `.git` + wrong remote | `prod`/`dev` | remote rewrite 금지, startup-fatal | 운영자가 새 root cutover 또는 수동 정리 후 재기동 |
| non-empty dir, `.git` 없음 | `prod`/`dev` | reconcile-needed / bootstrap flow | 기존 파일과 remote 기준을 운영자가 점검해야 함 |
| any existing remote | `local-test` | remote 사용 금지, binding 차단 | 테스트 profile 이 운영/개발 repo 를 오염시키지 않음 |

중요한 경계:

- `DMS_INSTANCE_ENV` 누락 또는 invalid 값은 startup-fatal 입니다.
- `DMS_INSTANCE_ENV=prod|dev` 이 기대하는 canonical remote 와 `DMS_GIT_BOOTSTRAP_REMOTE_URL` / persisted config 가 다르면 startup-fatal 입니다.
- 이미 존재하는 working tree 의 실제 `origin` 이 기대 remote 와 다르면 서버는 자동으로 `origin` 을 바꾸지 않고 기동을 실패시킵니다.
- 기동 후 runtime path/Git parity/control-plane이 준비되지 않으면 `/api/health/readiness`가 `503`을 반환하고 Compose는 server를 healthy로 승격하지 않습니다.
- bind mount 소유권 차이는 전역 Git 설정으로 우회하지 않습니다. DMS Git client가 각 명령에 현재 configured root만 전달하며 `safe.directory=*`는 사용하지 않습니다.

---

## 5. local-dev 와 local-test 경계

`pnpm run codex:workspace-sync-from-gitlab` 는 monorepo workspace 동기화용 수동 명령입니다. 문서 runtime repo binding 과 역할이 다릅니다.

- local-dev (`DMS_INSTANCE_ENV=dev`)
  - ordinary local run 이 따르는 기본 profile
  - 문서 Git remote 는 `LSWIKI_DOC_DEV.git`
  - direct-run은 `.env` 또는 `.env.local`에서 역할을 dev로 두고, local Compose는 `compose.local.yaml`이 literal `dev`로 고정합니다
- local-test (`DMS_INSTANCE_ENV=local-test`)
  - `pnpm run dms:local-test:start`
  - `pnpm run docker:local-test:up`
  - `compose.local-test.yaml`의 PostgreSQL·문서 runtime 전용 named volume
  - `.codex/scripts/dms-local-test-start.sh`
  - Playwright bootstrap (`automation/scripts/playwright/start-dms-e2e-stack.sh`)
  - remote-empty isolated profile 이어야 하며 `DMS_GIT_BOOTSTRAP_REMOTE_URL` 은 비워 둡니다

사용자 인계 경계:

- `local-test`는 자동 회귀·실패주입 전용이며 사용자 인수 테스트 환경이 아닙니다.
- 실제 로컬 Docker 배포 후보는 production build 이미지에 `DMS_INSTANCE_ENV=dev`, dev DB, dev working tree를 연결한 상태입니다.
- local-test 실행 뒤에는 `pnpm docker:up`으로 dev를 복구하고 active profile=`dev`, aggregate readiness=`200`, 기존 dev 파일 트리를 확인한 뒤 인계합니다.
- 역할과 다른 remote를 가진 기존 working tree는 origin을 제자리에서 변경하지 않고 보존합니다. 역할에 맞는 별도 working tree를 준비해 `DMS_MARKDOWN_HOST_PATH`로 선택합니다.
- HTTPS dev remote가 필요한 경우 `pnpm run dms:git-http-auth:prepare`로 mode `0600` Docker secret을 만들고 `DMS_GIT_HTTP_AUTH_SCOPE`를 단일 origin으로 제한합니다. credential은 URL, Compose environment, working tree `.git/config`에 저장하지 않습니다.

수동 workspace 동기화 명령과의 경계:

- 서버 부팅 자동 싱크: `DMS_INSTANCE_ENV` + 역할별 remote 기준으로 runtime markdown root 를 문서 repo 에 연결
- `pnpm run codex:workspace-sync-from-gitlab`: monorepo workspace 최신화
- `pnpm run codex:workspace-publish`: 현재 checkout 을 GitHub + GitLab workspace 에 publish

---

## 6. 빠른 검증 체크리스트

```bash
# 환경별 역할/remote 정적 계약과 오염 실패주입
pnpm run verify:dms-runtime-profile-contract:self-test

# local / local-test 최종 Compose shape 확인
pnpm run docker:local:config
pnpm run docker:local-test:config

# local/dev/ops env shape 확인
grep -E 'DMS_INSTANCE_ENV|DMS_GIT_(PROD_REMOTE_URL|DEV_REMOTE_URL|BOOTSTRAP_BRANCH|BOOTSTRAP_REMOTE_URL)' .env

# 격리 server/dms 재기동
pnpm run docker:local-test:up

# 서버 로그에서 역할 확인
docker compose -f compose.yaml -f compose.local.yaml -f compose.local-test.yaml logs --tail 200 server | grep -E 'DMS Git role contract|Git 초기화 완료|Git 초기화 실패|control-plane|dubious ownership'

# DB + DMS runtime readiness
curl --fail http://localhost:4000/api/health/readiness

# DMS runtime API 검증
pnpm run verify:access-dms:raw
```

성공 기준:

- 공통 `compose.yaml`은 역할을 선택하지 않고 환경별 overlay만 `DMS_INSTANCE_ENV`를 고정함
- `prod` 는 `LSWIKI_DOC.git`, `dev` 는 `LSWIKI_DOC_DEV.git`, `local-test` 는 remote-empty 를 가리킴
- wrong-remote existing repo 인 경우 자동 rewrite 가 아니라 blocking reason 이 노출됨
- local-test 는 운영/개발 remote 를 건드리지 않음
- bind-mounted 문서 root에서 `dubious ownership`이 발생하지 않고 authenticated `/api/files`가 정상 응답함

---

## 7. 이번 묶음과 out of scope

이번 묶음은 역할별 문서 repo binding 계약, 운영 변수, local-test 격리 규칙을 정리하는 것입니다. out of scope 는 다음과 같습니다.

- 실제 운영 `.env` 파일에 값을 쓰는 작업
- GitLab token/credential/secret 값을 확인하거나 문서화하는 작업
- SSH key 발급/배포 자체를 자동화하는 작업
- 운영 문서 repo 를 개발/테스트 runtime 에 직접 복제해 넣는 작업

---

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-19 | local-test 이후 dev 인계 게이트, 역할별 별도 working tree 보존, mode `0600` HTTPS Docker secret과 origin-scoped credential helper 계약을 추가 |
| 2026-08-19 | 공통 Compose fail-closed, dev/local-test/prod overlay 역할 격리, Git/control-plane startup-fatal, 통합 readiness와 오염 실패주입 검증 반영 |
| 2026-08-06 | bind-mounted 문서 root 소유권이 container user와 달라도 configured root만 command-local `safe.directory`로 허용하는 운영 계약과 검증 기준을 추가 |
| 2026-06-04 | 역할 매핑 검증 문장을 명시해 docs verify 의 prod/dev canonical remote 점검 기준을 보강 |
| 2026-06-01 | `DMS_INSTANCE_ENV` 기준 prod/dev/local-test 문서 repo 분리 계약, wrong-remote blocking, local-test 격리 규칙을 반영 |
| 2026-05-08 | 사이드바 변경사항 표시를 실패/차단 publish 복구 전용 UI로 조정 |
| 2026-05-08 | 앱 내부 문서/템플릿 변경 자동 publish 기준과 사이드바 변경사항 화면의 진단 역할을 추가 |
| 2026-05-07 | DMS GitLab 문서 자동 싱크 운영 변수, 부팅 분기, 검증 절차를 정리 |
