# GitLab workspace 의도 보존 통합 및 Ralph 실행 계획

> 작성일: 2026-08-27  
> 상태: 통합 전 설계 확정  
> 대상: GitLab `development` (`cbd9d7e07a2693f3f531c2c8173260260d695c24`) → `launch/rebaseline-20260721`  
> 공통 조상: `025eaa0e2ceba0f12821889a06cbea5005d0bbef`

## 1. 목표와 완료 정의

GitLab `development`의 16개 커밋을 기계적으로 덮어쓰지 않고, 각 커밋이 해결하려던 장애와 운영 위험을 현재 SSOO 정본에 맞게 보존한다. 현재 CRM 데모·운영 기능, DMS 운영 완결성, 공용 인증·셸, 공급망·DB 런칭 기준을 회귀시키지 않은 상태에서만 merge commit과 원격 게시를 허용한다.

이 작업에서 `무결 100%`는 아래 조건의 논리곱이다.

1. 원격 15개 비-merge 커밋의 문제 해결 의도가 모두 구현 또는 현재의 더 강한 계약으로 대체된다.
2. 예상 충돌과 자동 병합 파일을 모두 의미 단위로 감사하고, conflict marker와 누락 파일이 0건이다.
3. 현재 정본 포트·Node/pnpm·Docker secret/cache·runtime role·CRM/DMS 기능 계약이 유지된다.
4. 정적 검증, lint, build, server/DMS/CI 회귀, CRM current-demo strict gate가 모두 통과한다.
5. 실제 브라우저에서 DMS 빈 트리·오류 재시도·WS-021 파일 흐름과 Admin/CRM/DMS 공용 인증·주요 진입을 desktop/mobile로 확인하고 console/page/request/HTTP failure가 0건이다.
6. 최종 원격 재조회 뒤 push guard와 workspace publish가 통과하고 GitHub 대상 브랜치, GitLab `development`, local HEAD가 동일하며 worktree가 clean이다.

일부 gate의 성공이나 화면 렌더만으로는 100%라 선언하지 않는다. 한 항목이라도 실패하면 merge commit 또는 push를 중단하고 Ralph 수정 루프를 계속한다.

## 2. 원격 작업 의도와 적용 결정

| 원격 범위 | 해결하려던 문제 | 현재 적용 결정 | 의도 보존 증거 |
|-----------|-----------------|----------------|----------------|
| `0a79ee87` WS-021 | 한글/특수 파일명, storage URL, binary proxy header/redirect, 요약 추출 무한 대기, 잠금 제목, 반복 세션 복원 | filename normalization, path containment, safe external URL, binary header allowlist·safe redirect, extraction timeout, 잠금 제목을 현재 코드에 합성한다. 현재 `storage/open?download=1`의 server binary 계약은 유지한다. | server unit/access verifier, WS-021 browser spec, 직접 다운로드의 MIME·Disposition·bytes |
| `7759a578` WS-022 | 신규 계정의 정상 `200 + []`를 실패로 오인하고 숨은 재시도로 bootstrap이 지연됨 | 숨은 빈 결과 재시도를 제거하고 `[]`를 즉시 initialized로 처리한다. 현재 사용자-scope stale 응답 폐기, page lifecycle 취소, settings-route preload 생략은 보존한다. 원격 full-page 복구 화면은 현재 Behavior Impact Gate와 충돌하므로 도입하지 않고 기존 shell/sidebar 오류+retry를 사용한다. | 요청 1회, shell 유지, empty state, 실패 상태 retry, 사용자 전환 race 브라우저/정적 회귀 |
| `53b6acc5` | DMS Git 작업경로가 Git safe-directory 검사에 막힘 | 전역 신뢰가 아니라 명령별 `safe.directory=<configured document root>` client를 도입하고, 현재 Git 관리대상 path filter와 결합한다. | git-client unit, git service 회귀, configured root 외 신뢰 확대 0 |
| `4b87d0a1`~`cbd9d7e0` CI 11개 | persistent runner의 stale source, 잘못된 image 배포, rollback 부재, 손상 image, 디스크/BuildKit 병렬 빌드 실패 | exact `CI_COMMIT_SHA`, provenance, commit tag, preflight snapshot/rollback manifest, stale image·cache 복구, compose-derived Buildx 직렬 target을 수용한다. 실행 container/volume/DB 삭제 금지와 실패 사실 보존을 유지한다. | `verify:gitlab-pipeline`, shell negative fixtures, compose config, CI 스크립트 구문 검사 |
| `aafaa01e` + `59c98bb2` | Compose project 이름과 환경별 host port를 일관되게 제어하지 못함 | `name: ssoo`, 환경 변수형 host port와 volume naming 의도는 수용한다. 원격의 PMS/DMS/SNS/Admin/CRM=`3000..3004` 순서는 현재 플랫폼 정본보다 오래됐으므로 수용하지 않는다. | canonical Admin/CRM/PMS/DMS/SNS=`3000/3001/3002/3003/3004`, Dockerfile/package/compose/CI/browser URL 일치 검사 |
| auth session throttle | binary proxy가 `/auth/session`을 반복 호출할 때 10/min으로 429 발생 | 원격의 문제 원인은 해결하되 숫자 120을 그대로 복사하지 않는다. 현재 공용 5앱 정상 bootstrap을 반영한 정본 60/min과 credential login 5/min을 유지한다. | auth hardening verifier와 browser session/download 반복에서 429 0 |

## 3. 현재 정본 우선 불변식

- 앱 포트는 Admin `3000`, CRM `3001`, PMS `3002`, DMS `3003`, SNS `3004`다.
- Node.js는 `.nvmrc`의 `22.13.0` 이상, package manager는 `pnpm@11.13.1`이다.
- 웹/서버 Dockerfile의 승인 CA secret, 잠금형 pnpm store, release SHA, runtime secret 분리, fail-closed DMS role을 약화하지 않는다.
- CRM 코드·스키마·운영/설정 surface와 strict `SRC 28/28 + UX 17/17` current-revision 판정을 삭제·축소하지 않는다.
- DMS 정상 빈 목록은 오류가 아니며, API 오류는 shell 안에서 표시하고 사용자가 retry할 수 있어야 한다.
- DMS Git discard/stage/publish는 markdown Git 관리대상만 다루고 binary runtime 자산을 삭제하지 않는다.
- `.gitignore`는 현재 env/runtime/evidence 정책에 원격 operator backup ignore만 합집합으로 추가한다.

## 4. 예상 충돌 해소 설계

현재 tracked 작업을 체크포인트한 뒤 원격을 `--no-commit --no-ff`로 적용한다. 사전 synthetic merge에서 확인한 19개 충돌은 다음 방식으로 해소한다.

| 묶음 | 대상 | 해소 원칙 |
|------|------|-----------|
| ignore/manifest | `.gitignore`, `package.json` | 현재 스크립트와 ignore를 보존하고 backup ignore 및 `verify:gitlab-pipeline`만 합집합 추가 |
| 인증 | `auth.controller.ts` | 현재 DTO/change-password/OpenAPI 계약 + session 60/min 유지; login 5/min 불변 |
| DMS server | `git.service.ts`, `storage-adapter.service.ts`, `storage.controller.ts` | 현재 containment/provider/runtime-role 계약과 원격 filename/safe URL/safe-directory를 합성 |
| DMS web | `(main)/layout.tsx`, `file.store.ts` | shell 유지, hidden empty retry 제거, settings/page lifecycle/user scope 계약 보존 |
| Docker/compose | 5개 web Dockerfile, `compose.yaml` | 현재 Node 22/pnpm 11/port/secret/cache/release 계약 유지; project/host-port/volume parameterization만 수용 |
| test harness | `start-dms-e2e-stack.sh` | 현재 격리 PostgreSQL+pgvector/runtime profile harness를 유지하고 새 WS fixture 요구만 추가 |
| docs | `docs/CHANGELOG.md`, DMS deployment/GitLab sync/changelog | 현재 8월 최신 기록에 원격의 해결 의도와 현행화된 값을 추가; 과거 문서로 되돌리지 않음 |

충돌이 나지 않은 52개 변경도 자동 승인하지 않는다. 특히 `.gitlab-ci.yml`, `docker/ci-verify.Dockerfile`, 5개 app `package.json`, Docker `PORT/EXPOSE`, local-port-map, binary proxy helper, WS-021/022 spec의 URL·toolchain assertion을 별도 재감사한다.

## 5. 실행 순서

1. `codex:preflight`와 GitHub/GitLab fetch로 기준 SHA를 확정한다.
2. 이 계획과 현재 CRM/DMS/운영 작업 전체를 하나의 복구 가능한 체크포인트 commit으로 만든다. unignored CRM 증거는 폐쇄 원장으로 포함하고 `.gitignore`가 명시한 transient residue는 포함하지 않는다.
3. `git merge --no-commit --no-ff refs/remotes/gitlab/development`로 통합 후보를 만들고, merge commit은 아직 생성하지 않는다.
4. 위 충돌 설계대로 해결한 뒤 자동 병합 파일과 원격 신규 파일을 전수 감사한다.
5. 정적/단위/build/브라우저 Ralph 루프를 실행한다. 실패하면 원인을 수정하고 가장 좁은 검증부터 전체 gate 순서로 재실행한다.
6. 모든 gate가 green일 때만 merge commit을 생성한다.
7. GitLab을 다시 fetch해 새 원격 commit이 생기지 않았는지 확인한다. 새 commit이 있으면 이 계획의 의도 분석과 검증을 새 head에 대해 반복한다.
8. `codex:push-guard` 후 `codex:workspace-publish`로 GitHub 현재 브랜치와 GitLab `development`를 같은 HEAD로 게시한다.
9. release-state와 `git status --short --branch`로 원격 SHA 일치·worktree clean을 확인한다.

## 6. Ralph 테스트 명세

### 6.1 정적·빌드·서버 계약

| ID | 검증 | PASS |
|----|------|------|
| R-M01 | conflict/obsolete literal scan | marker 0, 잘못된 포트·Node 20·pnpm 10.28 assertion 0 |
| R-M02 | `pnpm run verify:gitlab-pipeline` | exact SHA/provenance/rollback/disk recovery/serial build positive·negative 전부 통과 |
| R-M03 | DMS filename/storage/Git tests + `verify:access-dms` | containment, Unicode filename, safe URL, safe-directory, binary auth 모두 통과 |
| R-M04 | `pnpm run verify:auth-commonization` | session 60/min, login 5/min, 5앱 auth proxy 계약 통과 |
| R-M05 | `pnpm run lint` + `pnpm run build` | workspace 전체 성공 |
| R-M06 | `pnpm run verify:crm-current-demo` | current identity의 정확한 `SRC 28/28 + UX 17/17` |
| R-M07 | `codex:preflight`, `codex:verify-sync`, `codex:dms-guard` | 모두 exit 0 |

### 6.2 실제 브라우저 상태

모든 flow는 첫 navigation 전 failure monitor를 연결하고 desktop `1440×1000`, mobile `390×844`를 구분해 확인한다.

| ID | 경로/상태 | 실행 | 기대 visible state | 실패 조건 |
|----|-----------|------|--------------------|-----------|
| R-B01 | DMS 신규 사용자, `/` | 로그인 후 files API `200 + []` | 공용 shell/header/sidebar/home 유지, `표시할 문서가 없습니다.` | full-page recovery, 2회 이상 hidden retry, 무한 spinner |
| R-B02 | DMS files API 실패 | 첫 요청 실패 후 sidebar retry | shell 유지, 오류와 `문서 목록 다시 불러오기`; 클릭 후 정상 tree/empty 복구 | action 누락, 재로그인 강제, 오류 은폐 |
| R-B03 | 사용자 scope 전환 | A의 지연 응답 중 B 로그인 | B의 tree/empty만 표시 | A 응답이 B 상태 덮어씀 |
| R-B04 | WS-021 한글/특수 filename | upload/open/download/summary | 정확한 표시명, MIME/Disposition/bytes, timeout 시 지원되지 않음 상태 | 경로 이탈, JSON을 파일로 저장, 무한 pending, 429 |
| R-B05 | 잠긴 문서 tab | 타 사용자 lock 문서 진입 | 잠금 상태 title·읽기 동선 유지 | 잘못된 제목 또는 편집 허용 |
| R-B06 | Admin `:3000`, CRM `:3001`, DMS `:3003` | login/deep-link/refresh | 각 canonical 앱과 공용 auth가 정상 | 포트 교차, 401/403/5xx, shell 손상 |
| R-B07 | DMS settings/home mobile | direct route/reload/retry | 390px overflow 0, 기존 운영/복구 action 유지 | 잘림, 가려진 action, horizontal overflow |

브라우저 전체 공통 실패 조건은 console warning/error, `pageerror`, 관련 `requestfailed`, HTTP 5xx, 예상하지 않은 401/403, uncaught hydration error, body horizontal overflow다. 자동 spec 통과 뒤 Playwright CLI로 DMS empty/error/retry와 Admin/CRM/DMS canonical route를 다시 관찰하고 snapshot·screenshot을 `output/playwright/`의 이번 run 경로에 남긴다.

## 7. merge·publish 차단 조건

- 원격 의도가 누락되거나 현재 계약보다 약한 방식으로 대체됨
- CRM current-demo strict 45/45 또는 DMS/CI 회귀 실패
- browser flow 중 하나라도 failure monitor 이벤트 또는 레이아웃 차단 발생
- GitLab remote head가 분석 SHA에서 바뀜
- secret/credential이 tracked evidence나 log에 포함됨
- merge commit 전 worktree에 미해결 marker, 예기치 않은 삭제, staged/unstaged 분리 누락이 있음
- publish 직전 worktree dirty, push guard 실패, GitHub/GitLab/local SHA 불일치

이 조건은 예외 승인으로 100%에 포함하지 않는다. 모두 제거한 뒤에만 다음 단계로 진행한다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-27 | 원격 변경 의도, 현재 정본 불변식, 충돌 해소 설계, merge 전 Ralph·publish 차단 조건을 최초 확정 |
