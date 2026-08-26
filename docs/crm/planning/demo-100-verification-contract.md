# CRM 데모 100% 이식 검증 계약

> 기준일: 2026-08-24  
> 상태: 검증 설계·strict gate 구현 완료, current 점수는 최신 strict report만 정본으로 판정  
> 범위: 사용자가 제공한 CRM prototype과 `Create Table script.txt`의 SSOO 이식

## 1. 결론

기존 “데모 100%” 점수는 다음 식으로 산정했다.

```text
엄격 데모 패리티 = (완료 SRC + 완료 UX) / 45
                   = (SRC-01~28의 완료 수 + UX-01~17의 완료 수) / 45
```

원천 DDL의 23개 table은 데이터·기능 매핑 입력이며 별도 점수가 아니다. `OPS-01~17` 운영 성숙도와 `EXT-01~02` 실제 배포 입력도 45점에 합산하지 않는다.

2026-08-21에 기록한 45/45는 정본 문서의 모든 `SRC`와 `UX` 행이 완료이고 당시 실행 증거가 있었다는 **폐쇄 원장 점수**다. 그러나 현재 감사에서 다음 freshness 공백을 확인했다.

- `verify:crm-goal-contract`는 원천 prototype 전체 파일, DDL, REF-01, ID·매핑·상태, target UI 증거를 검증하지만 `SRC-01~28`은 완료 행 수를 집계한다.
- `verify:crm-local`은 정적 launch gate, CRM/DMS/PMS 관련 server test, CRM production build를 실행하지만 `BT-01~27` 전체를 새 격리 DB와 브라우저에서 다시 실행하지 않는다.
- 기존 target UI manifest는 source/desktop/mobile/diff 83상태와 파일 hash를 검증하지만 생성 당시 작업 트리 또는 release identity가 없다.
- `BT-01~23` 다수는 정본 문서에 실행 결과가 남아 있으나 현재 revision과 결합된 구조화 artifact가 모두 보존된 형태는 아니다.

따라서 현재 판정은 다음과 같이 두 숫자로 분리한다.

| 판정 | 값 | 의미 |
|---|---:|---|
| 문서상 폐쇄 원장 | 45/45 | 기존 정본의 `SRC` 28개와 `UX` 17개가 모두 완료 상태 |
| 현재 revision에 결합된 엄격 증명 | 최신 strict report 기준 | 같은 파일내용 지문의 기능·UI·DB/API/browser 증거가 모두 묶인 `current-demo-parity-report.json`만 current 45/45 선언 가능 |

strict report가 실패하거나 없다는 것은 구현이 사라졌다는 뜻이 아니라 현재 코드가 기존 폐쇄 증거와 같은 대상임을 자동 증명하지 못했다는 뜻이다. 반대로 report의 PASS만 current revision 완료 판정으로 사용한다.

## 2. 고정 분모

### 2.1 기능 28점

[원천 기능 패리티 매트릭스](./source-parity-matrix.md)의 `SRC-01~28`을 각각 1점으로 센다. 한 기능은 다음 조건이 모두 충족될 때만 1점이다.

1. prototype source anchor와 기대 동작이 고정되어 있다.
2. DDL 23개 table이 SSOO core table 재사용, column 확장, 신규 CRM table 중 하나로 명시 매핑되어 있다.
3. 대응 `BT-*`가 현재 작업 트리와 같은 지문에서 실행되어 통과한다.
4. 해당 기능에 필요한 실제 DB/API allow·deny, 정상·validation·잠금·실패·복구가 확인된다.
5. 파일 다운로드나 문서 생성 기능은 binary를 다시 열어 내용·hash·미해결 placeholder를 검사한다.
6. disposable row, session, file, 설정 변경은 종료 시 원복되거나 격리 runtime 파기로 residue 0이 확인된다.

문서의 `완료` 문자열, unit test 하나, 화면이 열리는 사실만으로는 1점이 아니다. 부분 충족은 0.5점으로 환산하지 않고 0점으로 둔다.

### 2.2 UI/UX 17점

[원천 UI/UX 패리티 명세](./source-uiux-parity-spec.md)의 `UX-01~17`을 각각 1점으로 센다. 한 UI/UX 항목은 다음 조건이 모두 충족될 때만 1점이다.

1. REF-01의 같은 state ID 원천 capture가 존재한다.
2. target desktop 1440×1000과 mobile 390×844 capture가 서로 고유하다.
3. 원천 17개 화면의 필수 83상태가 모두 존재한다.
4. section, field, column, action, label, 기본 filter/sort/selection, dialog, 잠금, empty/error 차이가 0이다.
5. 허용 차이는 `platform-required`, `responsive-only`, `source-bug-compatible` 중 하나로 근거가 있고 `defect`와 미분류 차이는 0이다.
6. 예상 밖 HTTP 실패, console/page error, mobile overflow가 0이다.
7. target manifest의 작업 트리 지문이 검증 시점의 실제 파일내용 지문과 같다.

### 2.3 점수에 포함하지 않는 항목

- DDL 23개 table: `SRC` 기능을 뒷받침하는 입력·추적성 계약이며 별도 23점이 아니다.
- `OPS-01~17`: 운영·제어·통제·설정 성숙도 17/17로 별도 표기한다.
- `OPS-18`, `EXT-01~02`: 승인 법인값/CI와 production endpoint/runtime credential을 요구하는 실제 cutover gate다.
- 회계·지급 외부 provider, CRM AI/RAG provider-ready, 보호 소개자료: 데모 45점 밖의 명시적 extension readiness다.

## 3. 기존 검증기가 실제로 확인한 것

| 검증 | 직접 확인 | 직접 확인하지 않은 것 |
|---|---|---|
| `verify:crm-goal-contract` | `SRC/UX/OPS/IMP/BT/EXT/S` ID와 매핑, 원천 prototype 전체 파일 hash, DDL hash, REF-01, target UI gate 호출 | 모든 `BT-01~27`의 현재 revision 재실행 |
| `verify:crm-uiux-parity:all` | 17화면·83상태, source/desktop/mobile/diff 파일과 hash, 구조·interaction·분류·E0 | target capture 이후 코드가 변하지 않았다는 사실(기존 schema 1) |
| `verify:crm-local` | 정적 launch 계약, CRM/DMS/PMS server test, CRM production build | 실제 DB/API/browser의 전체 28기능 재실행 |
| `verify:crm-source-sample:reseed` | 원천 seed count/value/hash와 2회 적용 동일성 | 전체 mutation/browser flow |
| runtime 개별 gate | 역할 matrix, readiness, retry/recovery, quote artifact, secret masking, route/proxy 등 각 담당 범위 | 하나의 동일 revision·동일 실행으로 묶인 28개 기능 전체 |
| `verify:crm-launch-operations` | 저장된 BT-24~26와 OPS 완료 상태 | 오래된 artifact가 현재 코드와 같은지 여부 |

## 4. 현재 revision 증거 계약

현재 작업 트리 증명에는 `scripts/repository-worktree-identity.mjs`가 생성하는 `worktreeIdentity`를 사용한다. 이 identity는 `.git`, build cache가 아니라 다음 입력을 해시한다.

- Git tracked 파일과 ignore되지 않은 untracked 파일의 전체 경로
- regular file/symlink/missing tracked file 구분
- 실행 비트, 크기, 각 파일 SHA-256
- 현재 `HEAD`

생성되는 CRM 증거 때문에 identity가 자기 자신을 무효화하지 않도록 `.runtime/`, `output/`, `docs/crm/evidence/`만 고정 제외한다. 같은 `M` 또는 `??` 상태라도 파일 내용이 달라지면 fingerprint가 달라진다.

다음 세 증거는 동일 identity여야 한다.

1. schema 2 `crm-local-verification-report.json`: 검증 시작/종료 identity가 같고 local check가 모두 통과.
2. schema 2 `target-uiux-parity-manifest.json`: capture 시작/종료 identity가 같고 검증 시점 current identity와 일치.
3. current demo runtime report: 격리 DB/API/browser 기능 gate의 시작/종료 identity가 같고 `SRC-01~28`의 executable assertion이 모두 통과.

어느 하나라도 없거나 identity가 다르면 문서상 45/45는 표시할 수 있어도 “현재 revision 45/45”는 실패다.

격리 runtime은 schema 2 manifest에 같은 `worktreeIdentity`, server·CRM·Admin·DMS origin, 각 live process PID, 실제 production build artifact fingerprint를 기록한다. `build:crm-ralph-runtime`은 `NEXT_PUBLIC_API_URL`과 DMS `NEXT_PUBLIC_WS_URL`을 runtime 시작 전에 production bundle에 compile하고 `.next/static`·`.next/server` 전체와 server `dist`를 fingerprint한다. verifier는 시작과 모든 runtime check 종료 후 PID, compiled public URL, build fingerprint를 다시 계산하므로 오래된 Docker 이미지, 잘못된 `localhost:4000` client bundle, 검증 중 재빌드된 `.next`/`dist`, 다른 작업본에서 띄운 프로세스는 현재 증거가 될 수 없다.

`verify:crm-local`은 runtime 시작 전에 schema 2 report를 생성한다. strict gate는 이 report를 읽고 identity/check를 검증할 뿐 live process가 시작된 뒤 다시 build하지 않는다. 따라서 검증 명령 자체가 실행 중인 production artifact를 바꾸고도 시작 시점 fingerprint만 통과하는 순환 증거를 허용하지 않는다.

## 5. 구현된 엄격 판정기

| 명령 | 역할 | 완료 대체 가능 여부 |
|---|---|---|
| `pnpm run verify:crm-worktree-identity:self-test` | status 문자열이 같아도 파일 내용이 바뀐 stale evidence를 거부 | 불가 |
| `pnpm run build:crm-ralph-runtime` | server/CRM/Admin/DMS를 격리 public URL로 강제 production build하고 compiled URL·전체 runtime artifact fingerprint report 생성 | 단독 불가 |
| `pnpm run verify:crm-core-runtime` | fresh 격리 DB/API에서 auth/profile, opportunity/quote, contract/billing, business plan/performance, internal cost/report의 source semantics·allow/deny·validation·잠금 실행 | 단독 불가 |
| `pnpm run verify:crm-current-demo:self-test` | 45/45 positive와 core failure, 부분 UX, stale worktree의 fail-closed 산정 회귀 | 불가 |
| `pnpm run verify:crm-current-demo` | source/DDL, schema 2 local/UI evidence, current build/runtime provenance, 모든 DB/API/browser gate를 결합해 SRC 28점·UX 17점을 exact 산정 | 현재 데모 완료의 유일한 strict gate |
| `pnpm run verify:crm-migration-completion` | 기본 완료 판정에서 위 strict gate를 실행하고 report를 남김 | `verify:crm-current-demo`와 동일 기준 |

strict report의 항목 매핑은 `SRC-01~28` 각각에 하나 이상의 실제 check를 요구하고, check 실패·누락·중복 대체·UI 의존 상태 실패를 0점으로 처리한다. DDL 23개는 mapping/runtime 계약을 통과해야 하지만 점수는 계속 0점이다.

## 6. Ralph 실행 순서

### 1단계 — 검증 설계 100%

아래 1~6은 2026-08-24 구현과 self-test까지 완료했다. fresh runtime 실행 결과가 아니라 검증기가 올바르게 실패하고 점수를 계산하는 준비 완료 상태다.

1. 파일내용 기반 worktree identity와 stale evidence 음성 fixture를 구현한다.
2. local report와 target UI manifest를 같은 identity에 fail-closed로 묶는다.
3. `SRC-01~28` 각각을 실제 실행 check에 역매핑하고 빈 매핑, 중복 대체, 부분 증거를 거부한다.
4. clean isolated DB, current server/CRM/Admin/DMS production build, 실제 API, desktop/mobile browser를 한 실행 report로 묶는다.
5. source input, 기능 28점, UI/UX 17점, OPS 17점, EXT 2개를 분리 출력한다.
6. forged status, stale identity, 누락 state/artifact, 실행 중 worktree 변경, cleanup 실패 음성 fixture가 모두 실패하는지 self-test한다.

### 2단계 — 현재 revision 재실행

1. 최종 코드·문서가 고정된 뒤 worktree identity를 생성한다.
2. `verify:crm-local` schema 2 report를 먼저 만들고, 같은 identity에서 `build:crm-ralph-runtime`으로 격리 public URL이 compile된 server/CRM/Admin/DMS production artifact를 만든다.
3. build report의 compiled URL·artifact fingerprint를 검증한 뒤에만 새 isolated database와 runtime/storage namespace를 만든다.
4. schema/migration/seed/trigger, source sample 2회 동일성과 server test를 실행한다.
5. 실제 DB/API에서 auth/profile/Admin, opportunity/quote, contract/billing, business plan/performance, internal cost/AMS, 권한/readiness/failure/recovery를 실행한다.
6. current CRM/Admin build에서 17화면·83상태 desktop/mobile target capture를 새로 만든다.
7. download artifact를 재개방하고 browser/API/proxy/console/runtime failure 0을 확인한다.
8. strict gate 종료 시 production artifact와 PID를 다시 계산하고 cleanup과 isolated runtime 파기 후 residue 0을 확인한다.
9. 시작/종료 identity와 build artifact가 같을 때만 `SRC 28/28`, `UX 17/17`, strict demo `45/45`를 출력한다.

네 production process는 병렬 기동해도 runtime manifest를 잠금 후 다시 읽고 원자 교체하여 server·CRM·Admin·DMS 네 PID를 모두 보존해야 한다. 실제 로그인 endpoint의 분당 5회 제한과 전역 분당 600회 제한은 검증 환경에서도 비활성화하지 않는다. 서로 독립적인 로그인 검증 묶음 사이에는 61초 throttle window를 두고, 83상태 desktop/mobile capture는 상태 간 요청 간격과 20상태 단위 61초 냉각 구간을 manifest에 기록한다. DTO validation을 통과하지 못한 fixture와 검증기 자체의 429는 제품 기능 실패와 분리하되 browser/strict gate는 그대로 실패 처리한다.

실제 production 런칭은 이 45/45와 별개로 `OPS-01~17`, `EXT-01~02`, DMS same-release FINAL GO, CRM S15 production browser/artifact gate까지 통과해야 한다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-25 | fresh v5 capture가 UX-12의 `seeded-years`, `empty-years`, `create-validation`까지 통과한 뒤 공용 알림 background 요청 누적으로 전역 분당 600회 제한의 429를 검출해 fail-closed 됐다. 제품 throttle과 browser 429 차단은 유지하고, 상태 간 1초와 20상태마다 61초 냉각을 기본값으로 적용하며 실제 pacing 값을 target manifest에 남기도록 했다. |
| 2026-08-25 | fresh v4 core 선행 실행에서 opportunity 전체 흐름을 통과한 뒤 계약 fixture의 외부원가 합계 불일치를 검출했다. 제품 validation의 400이 정상이므로 line 합계 1억원과 월별 청구계획 5천만원×2를 일치시켰고, 재실행에서 core 10개 기능 check와 cleanup·identity check까지 11/11 PASS했다. |
| 2026-08-25 | fresh v3는 runtime manifest 4 PID, UI/UX 17/17·83/83, DDL·권한·견적·readiness·secret·route·recovery gate를 통과했지만 core verifier가 실제 lowercase 생성 ID를 uppercase로 가정해 29/45에서 fail-closed 됐다. API의 `crm-opp-*`, `crm-ct-*` 생성 계약에 맞춰 fixture를 수정하고 core 선행 완주 후 최종 capture하는 순서로 강화했다. |
| 2026-08-24 | fresh v2에서 17화면·83상태 capture 자체는 통과했으나, 병렬 process manifest 갱신 경쟁으로 DMS PID만 남았고 독립 runtime 검증의 login 요청이 분당 5회 제한을 소진해 strict gate가 fail-closed 됐다. manifest 잠금·원자 갱신, 유효한 invalid-password fixture, throttle window 보존 재실행 계약을 추가했다. |
| 2026-08-24 | fresh v1 browser 재실행에서 Admin client bundle이 build-time 기본값 `localhost:4000`을 사용해 UX-12가 실패하는 반증을 확인했다. `build:crm-ralph-runtime`의 compiled public URL 검증, Next static/server 전체 fingerprint, strict gate 종료 후 재검증, pre-runtime local report 소비 계약으로 같은 유형의 false PASS를 차단했다. |
| 2026-08-24 | `verify:crm-core-runtime`, `verify:crm-current-demo`와 음성 self-test, runtime manifest schema 2의 live PID/current build fingerprint를 구현했다. 기본 migration completion도 strict gate에 위임했으며 fresh current 실행 전 점수는 계속 미확정이다. |
| 2026-08-24 | 기존 45/45 산정의 직접 검증 범위와 freshness 공백을 감사하고 폐쇄 원장 점수와 현재 revision 증명을 분리했다. 파일내용 worktree identity, schema 2 local/UI evidence, executable SRC/runtime report를 새 완료 계약으로 고정했다. |
