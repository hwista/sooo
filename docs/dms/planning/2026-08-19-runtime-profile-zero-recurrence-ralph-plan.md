# DMS 런타임 프로필 Zero-Recurrence Ralph 계획

> 작성일: 2026-08-19  
> 범위: 실행 프로필 오염 → Git/control-plane 초기화 실패 → healthy 위장 → 문서 목록 HTTP 500 재발 경로

## 목표와 보증 범위

이 작업의 목표는 관측된 원인과 동일 계열의 알려진 재발 경로를 자동 계약으로 모두 차단하는 것입니다. 소프트웨어 전체의 미지의 장애 확률을 수학적으로 0%라고 보증하는 뜻은 아닙니다. 대신 아래 불변조건을 코드·Compose·테스트·문서·브라우저 증거가 동시에 강제해, 같은 결함이 정상 기동과 500으로 다시 나타나는 경우를 허용하지 않습니다.

## 확인된 원인 사슬

1. root `.env`의 `DMS_INSTANCE_ENV=prod`가 `compose.local.yaml`의 `${DMS_INSTANCE_ENV:-dev}`보다 우선했습니다.
2. 로컬 컨테이너가 의도와 달리 prod Git role을 선택했습니다.
3. 격리된 working tree에 prod `origin`이 없어 `gitService.initialize()`가 실패했습니다.
4. `DmsModule.onModuleInit()`가 Git과 최초 control-plane 실패를 warning으로만 남기고 기동을 계속했습니다.
5. Compose healthcheck와 플랫폼 readiness는 이 실패를 관측하지 못해 서버를 healthy로 분류했습니다.
6. 최초 실제 문서 요청인 `/api/files?force=1`에서 내부 미준비 상태가 HTTP 500으로 노출됐습니다.

사건은 로컬에서 관측됐지만 결함 클래스는 로컬 전용이 아닙니다. 운영에서도 잘못된 remote, credential/network 문제, 손상된 working tree, control-plane 초기화 실패가 같은 위장 경로를 만들 수 있었습니다.

## 구조적 불변조건

| 계층 | 불변조건 | 자동 차단 |
|---|---|---|
| Compose base | 실행 역할을 선택하지 않음 | role/cleanup remote 빈 값 |
| local | 항상 `dev`, cleanup remote-empty | literal overlay |
| local-test | 항상 `local-test`, remote-empty, 전용 DB+storage | literal overlay + PostgreSQL/문서 named volume |
| user handoff | 사용자 인수 테스트는 `dev`, `local-test`는 자동 회귀 전용 | `pnpm docker:up` 복귀 + role/readiness/file tree 확인 |
| dev Git auth | HTTPS credential은 URL·Compose env·`.git/config`에 저장하지 않고 단일 origin에만 적용 | mode `0600` Docker secret + scoped credential helper |
| dev storage | 활성 provider만 실제 runtime path가 준비된 상태에서 사용 | readiness fail-closed + 미사용 NAS 비활성화 |
| production | 명시적 `prod`와 승인 remote 필요 | production env verifier |
| startup | Git 결과 실패/예외 또는 최초 control-plane 실패 시 프로세스 기동 실패 | startup contract + Jest failure injection |
| traffic | DB와 DMS aggregate가 모두 ready일 때만 healthy | `/api/health/readiness` + Compose healthcheck |
| user recovery | 기동 후 일시 오류의 error/retry UI 유지 | 기존 sidebar retry flow + Ralph |
| regression | 프로필 계약 변경은 preflight/DMS guard에서 차단 | static verifier + self-test |

## 실패주입 행렬

| 주입 | 기대 결과 |
|---|---|
| local role을 root `.env` interpolation으로 변경 | 정적 계약 실패 |
| local-test role을 prod로 변경 | 정적 계약 실패 |
| 공통 base가 prod 기본값 소유 | 정적 계약 실패 |
| local-test bootstrap remote interpolation 허용 | 정적 계약 실패 |
| local-test가 dev PostgreSQL volume 재사용 | 정적 계약 실패 |
| HTTPS credential secret이 있는데 scope가 비어 있거나 HTTP(S) origin이 아님 | entrypoint startup reject |
| Git initialize가 `{ success:false }` 반환 | startup reject |
| Git initialize가 예외 throw | startup reject |
| 최초 control-plane sync 예외 | startup reject |
| DMS aggregate가 blocked | readiness `503 DMS_RUNTIME_NOT_READY` |
| DB probe 실패 | readiness `503 PLATFORM_NOT_READY` |

## Ralph 수용 명세

완료는 다음을 모두 만족할 때만 선언합니다.

1. 정적 계약 self-test, startup/readiness Jest, server build, Compose local/local-test config가 통과합니다.
2. DMS guard와 관련 문서/규칙 sync가 통과합니다.
3. 새 Docker local-test runtime에서 `/api/health/readiness`와 `/api/files?force=1`이 200입니다.
4. local-test 회귀 검증 뒤 `pnpm docker:up`으로 사용자 인계용 `dev` runtime을 복원합니다.
5. 복원된 runtime의 역할이 `dev`이고 별도 dev working tree와 `LSWIKI_DOC_DEV.git` remote를 사용하며 `/api/health/readiness`가 200인지 확인합니다. HTTPS transport면 mode `0600` Docker secret과 origin-scoped helper만 허용합니다.
6. Firefox 새 세션에서 로그인 → 파일 트리 hydrate → 실제 Markdown 문서 열기를 수행합니다.
7. 1440×1000 desktop과 390×844 mobile에서 화면을 확인합니다.
8. 두 viewport 모두 page error 0, console error/warning 0, 관련 API 5xx 0입니다.
9. architect/deslop 검토 후 발견된 결함을 수정하고 영향 검증을 다시 실행합니다.

## 증거 상태

| 증거 | 상태 |
|---|---|
| 프로필 정적 계약 + 오염 5종 self-test | 통과 |
| startup/readiness 단위 실패주입 7건 | 통과 |
| server build | 통과 |
| Compose local/local-test 최종 config | 통과 |
| 최종 Docker server 이미지 build/recreate | 통과 |
| local-test startup (`local-test` role → Git → control-plane) | 통과 |
| 사용자 인계용 dev 복원 (`dev` role → dev Git remote → readiness) | 통과 — `LSWIKI_DOC_DEV.git` 별도 working tree, Markdown 86건 동기화, `database=ready`, `dms=ready` |
| dev HTTPS Git 인증 경계 | 통과 — mode `0600` Docker secret, origin-scoped helper, URL/Compose env/`.git/config` credential 없음 |
| dev 활성 storage readiness | 통과 — local ready, 실제 mount가 없는 NAS는 disabled |
| `/api/health/readiness` (`database=ready`, `dms=ready`) | 통과 |
| DMS guard / Codex preflight / docs sync | 통과 |
| local-test fresh desktop Ralph (1440×1000) | 통과 — `final-desktop-1440x1000.png`, console warning/error 0, 관련 API 5xx 0 |
| local-test fresh mobile Ralph (390×844) | 통과 — `final-mobile-390x844.png`, console warning/error 0, 관련 API 5xx 0 |
| dev handoff fresh desktop Ralph (1440×1000) | 통과 — `output/playwright/dms-dev-handoff/desktop-1440x1000.png`, dev 파일 트리/실제 Markdown 열람, console warning/error 0, `/api/files?force=1` 및 관련 API 5xx 0 |
| dev handoff fresh mobile Ralph (390×844) | 통과 — `output/playwright/dms-dev-handoff/mobile-390x844.png`, 실제 Markdown 열람, console warning/error 0 |
| architect/deslop 최종 검토 | 통과 — local-test DB 격리 누락과 readiness Swagger 503 계약 불일치를 발견·수정 후 재검증 |

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-19 | 관측된 500 원인 사슬, fail-closed 불변조건, 실패주입 행렬, desktop/mobile Ralph 수용 명세와 증거 상태를 최초 기록 |
| 2026-08-19 | 전용 local-test DB/storage, 최종 Docker 이미지, readiness, DMS guard/preflight, desktop/mobile Firefox 재검증 증거를 모두 통과로 확정 |
| 2026-08-19 | local-test를 자동 회귀 전용으로 한정하고 실제 로컬 사용자 인계는 dev 복원 및 role/remote/readiness/file tree 확인 후 완료하도록 기준 추가 |
| 2026-08-19 | dev 별도 working tree·HTTPS secret·storage readiness를 인계 불변조건으로 추가하고 86개 Markdown 동기화, aggregate readiness, desktop/mobile fresh Firefox 증거를 통과로 확정 |
