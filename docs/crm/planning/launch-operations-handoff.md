# CRM 100% 이식·동시 런칭 2단계 실행계획

> 기준일: 2026-08-14  
> Goal 상태: active. 두 단계 모두 완료하기 전 `complete` 금지.  
> 현재 단계: Phase 2 S14 완료, S15 자동화 준비 완료·외부 입력 대기. 승인 packet, live API verifier와 Playwright CLI desktop/mobile·artifact 최종 evidence gate는 준비됐고 실제 런칭은 `EXT-01` 법인값/CI와 `EXT-02` production endpoint/credential 입력을 기다린다.  
> Phase 2 자동 전환: 이 문서 8절의 갱신된 Phase 1 closure audit가 PASS면 별도 재승인 없이 S5부터 재개한다.

## 1. 구속력 있는 실행 계약

1. 원천 데모 코드와 DDL을 패리티 정본으로 사용하고 기존 완료 주장을 재검증한다.
2. 원천 패리티와 CRM/Admin/DMS 운영 성숙도를 같은 Goal에서 달성하되 분모를 섞지 않는다.
3. 1단계에서는 planning 문서 외 기능·schema·migration·API·UI 동작을 바꾸지 않는다.
4. 1단계 종료 조건이 객관적으로 닫힌 뒤 `ssoo-doc-aware-dev`와 `web-ralph`를 적용해 구현·검증한다.
5. 기존 visible URL/화면/버튼/demo mode/안내/오류·빈 상태/수동 복구/권한 fallback과 원천 밖 확장은 보존한다.
6. 실제 법인값, CI, credential은 외부 입력이며 추측하지 않는다.
7. commit/push는 사용자가 별도로 요청하지 않으면 하지 않는다.
8. SSOO 공용 shell/template/primitive 적용은 허용하지만 원천 업무 content의 정보 구조·field/column/action·interaction·visual hierarchy를 재설계하지 않는다.

## 2. 현재까지 보존한 관찰 증거

- 원천 17 page container, DDL 23 table, source sample count와 계산/상태/document rule을 재추출했다.
- 현재 code/DB/API/type/docs를 대조했고 desktop/mobile CRM/Admin/DMS runtime을 관찰했다.
- `/reports` query 400, CRM/DMS settings deep-link/MDI mismatch, DMS readiness 시간 기반 모순, roleCode verifier 충돌, standard origin/proxy mismatch를 finding으로 고정했다.
- contract customer contact/owner FK, opportunity contract recovery, 원천 22-variable document, business-plan performance semantic gap을 원천 누락으로 고정했다.
- 관찰용 browser session과 임시 표준-port proxy는 모두 종료했고 3000/3001/3003/4000 임시 listener가 없음을 확인했다.
- 이번 계약 이후 기능 코드·DB/API/UI 변경은 수행하지 않았다.

이 증거는 Phase 2의 PASS 증거가 아니라 실패 기준선과 재현 정보다.

## 3. Phase 2 시작 전 필수 skill·repo 루틴

Phase 2 첫 turn에서 다음 순서를 고정한다.

1. `.codex/skills/ssoo-doc-aware-dev/SKILL.md`와 필요한 doc map 재확인.
2. `/home/a0122024330/.codex/skills/web-ralph/SKILL.md`와 Playwright 지침 재확인.
3. `pnpm run codex:preflight`.
4. dirty worktree와 사용자 소유 변경을 다시 식별하고 slice별 겹침을 표시.
5. isolated DB/runtime/DMS volume과 `RALPH_CRM_<run-id>` manifest 생성.
6. 각 slice를 `failing evidence → smallest implementation → target test → DB/API → desktop/mobile → cleanup → docs` 순서로 실행.

## 4. 구현 작업 카탈로그

### IMP-01 CRM source-compatible 로그인 control

- 범위: CRM login에 password visibility toggle과 login ID remember를 additive option으로 제공. password/token은 저장하지 않는다.
- 보존: 공용 auth의 실제 password reset, SSO/OAuth, registration, session 정책.
- 영향: `packages/web-auth/src/ui.tsx`, `packages/web-auth/src/login-page.tsx`, CRM login page, auth unit/E2E, auth 정본 문서.
- SDD: 다른 앱 기본 동작을 바꾸지 않도록 shared component의 명시 prop 또는 public config를 사용하고 CRM만 opt-in한다.
- 검증: BT-01.

### IMP-02 공용 프로필/Admin source substitution 재폐쇄

- 범위: source user/profile 시나리오를 현재 shared user surface와 Admin에서 fresh 증명한다. 실제 결함이 재현될 때만 소유 module에서 최소 수정.
- 영향 후보: `packages/web-auth/src/user-surface.tsx`, Admin users/auth pages, server users/auth modules, common types/docs.
- 검증: BT-02, BT-03.

### IMP-03 코드·연도·seller/CI 소비 재폐쇄

- 범위: Admin code/year와 CRM seller profile/CI 저장·문서 소비. 실제 법인값은 EXT-01 대기.
- 영향 후보: CRM quote-settings module/web, Admin codes/business-years, DMS storage ref, CRM quote/contract types/docs.
- 검증: BT-03, BT-14.

### IMP-04 source-compatible 홈·목록

- 범위: 원천의 확정 최신차수 지표, 최신 상태 분포, 최근 5건과 이전차수 탐색을 additive하게 제공한다.
- 보존: 현재 pipeline 6단계, queue, contract metric, 다음 액션과 정확한 DC/절사 canonical total.
- 원천 모순 처리: raw source total이 필요한 compatibility evidence는 `source-compatible` label로 분리하고 current canonical total을 교체하지 않는다.
- 영향: dashboard/opportunity services, `packages/types/src/crm/dashboard.ts`, CRM opportunity workspace, unit/browser tests, docs/OpenAPI.
- 검증: BT-04, BT-05.

### IMP-05 영업기회 계약 회수 transaction

- 범위: source direct recovery flow를 단일 transactional service/API/action으로 추가한다. 연결 계약의 확정 여부와 무관하게 confirmation 후 soft-delete하고, 단순 회수는 opportunity를 confirmed/unlinked로 유지하며 확정 해제는 unconfirmed/`proposal`로 복구한다.
- 방어: opportunity-contract ID/code 관계 검증, repeat idempotency, affected-row guard, audit activity, mid-transaction rollback.
- 영향: opportunity/contract service/controller/DTO, CRM proxy route/UI, CRM types, OpenAPI/history.
- 검증: BT-07.

### IMP-06 확정 영업기회 기반 22-variable 계약서

- 범위: confirmed opportunity를 source로 하는 DMS document preview/draft/lifecycle/download를 추가하고 22개 한글 변수의 exact mapping을 제공한다.
- 보존: 기존 contract-based DMS packet과 quote artifact workflow.
- 소유: CRM은 업무 변수 snapshot/source id, DMS는 template binary/render/artifact/storage.
- 영향: opportunity document APIs/service, contract/quote types 또는 새 좁은 type, DMS template compatibility, CRM opportunity UI, OpenAPI/docs.
- 검증: BT-06, BT-08.

### IMP-07 계약 customer contact·owner identity migration

- schema: contract master에 nullable `client_contact`와 nullable `owner_user_id` FK를 추가하고 `owner_name` snapshot을 계속 보존한다.
- backfill: source opportunity link가 있고 값/FK가 단일하게 확인될 때만 복사. 모호하거나 누락된 값은 null로 두고 추측하지 않는다.
- API/UI: DTO/type/OpenAPI/upsert/detail/convert/form/document variables에 필드를 end-to-end 연결.
- migration 영향: `packages/database/prisma/schema.prisma`, 새 CRM migration, DB contract/baseline, server contract module, types/web/docs.
- rollback: app을 nullable 새 필드를 읽지 않는 이전 version으로 되돌려도 동작하도록 additive migration으로 유지한다. 긴급 rollback에서 column/drop은 하지 않고 DB restore rehearsal로만 검증한다. 추후 제거는 별도 승인 migration.
- 검증: BT-09, BT-24.

### IMP-08 source business-plan performance mode

- 범위: 확정 사업계획 대 확정 계약 **billing plan** 월별 comparison을 source-compatible mode/endpoint로 제공.
- 보존: 현재 billing actual/direct actual/confirmed cost 확장과 label.
- 영향: business-plan service/controller/DTO, contract monthly-plan query 재사용, types, performance web, OpenAPI/docs.
- 검증: billing plan과 actual이 다른 fixture로 BT-12.

### IMP-09 permission catalog·allow/deny 정합

- 범위: live CRM permission이 Admin catalog에서 `planned`로 보이는 상태를 정합화하고 필요한 도메인 action의 permission ownership을 기존 access service에 통합한다.
- roleCode: visible field는 보존하되 authorization source로 새로 사용하지 않는다.
- 영향 후보: access seed/types/service, Admin roles page, CRM access snapshot, docs/verifiers.
- migration/seed rollback: permission seed는 idempotent upsert. 기존 assignment 삭제 금지. rollback은 새 permission을 inactive/deprecated 처리하고 assignment snapshot 복원.
- 검증: BT-15, BT-24.

### IMP-10 source identity/sample·AMS runtime manifest

- 범위: source 6 account identity를 중앙 사용자 8개와 억지로 동일화하지 않고 mapping manifest와 seed verifier를 제공한다. source 업무 표본 count/value/idempotency를 clean/reseed DB에서 검증하고, AMS 업체 CRUD·복수 WBS·월별 paste/정산을 disposable row로 실행한다. 재현된 결함만 기존 cost-plan owner module에서 최소 수정한다.
- 영향: database seed/verifier/test, cost-plan owner module 후보, planning/reference docs. production account 생성은 하지 않는다.
- 검증: BT-13, BT-16.

### IMP-11 reports DTO와 route/content 결정성

- reports: `CrmReportsPreviewQueryDto`에 current DTO pattern과 같은 optional/type/range/enum validation/transform을 추가하고 controller E2E로 OpenAPI/runtime를 일치시킨다.
- routing: CRM `/operations/settings`, `/settings`, DMS `/settings/operations/git`의 direct load/reload/back/forward가 URL-first로 정확한 tab/content를 연다.
- 보존: MDI, existing menu, existing default route와 fallback.
- 영향: reports DTO/tests, CRM/DMS route/layout/settings integration, CRM reports UI, OpenAPI/docs.
- 검증: BT-17, BT-23.

### IMP-12 readiness snapshot 일관성

- 완료: CRM/DMS owner와 Admin bridge가 공용 `LaunchReadinessSnapshot`의 snapshot ID, checkedAt/expiresAt, source, reason, nullable count, owner route를 공유한다.
- cache: owner별 5초 refresh coalescing, 30초 expiry, 10초 probe timeout을 적용했다. CRM 설정/재시도와 DMS system 설정 변경은 cache를 무효화한다.
- failure: stale/probe failure/malformed/upstream 단절은 `unknown`과 `null` count이며 0/0 또는 `ready` fallback을 금지한다.
- 검증: owner API·web proxy·Admin exact compare, stale/malformed verifier, 실제 server 단절·복구, desktop/mobile expiry·refresh, cache/invalidation unit test와 BT-19를 통과했다. DMS guard는 S9 마감 gate에 포함한다.

### IMP-13 correlation·manual recovery 보강

- 범위: 현재 operation attempt에 ownerHref/correlation/retryability/recovery summary가 빠진 경우만 추가하고 UI에서 failure→owner fix→retry chain을 닫는다.
- 보존: 원본 실패와 기존 manual flow/evidence.
- migration: nullable/additive column이 필요하면 IMP-07과 별도 migration. backfill은 기존 id/target 기반 deterministic 값만.
- rollback: 구 version이 새 metadata를 무시하도록 nullable 유지.
- 검증: BT-21, BT-24.
- S10 완료 증거: `ssoo_crm_ralph_20260819_s8`에서 초안 없는 견적 lifecycle 실패를 만들고 attempt `#6`의 sanitized 원인·actor/time·owner/source link를 확인했다. 실제 초안을 생성한 뒤 retry `#7`이 같은 correlation로 성공했고 원본 실패는 보존됐다. repeat retry는 `409`, duplicate attempt 0, DOCX/PDF hash 불변이다.

### IMP-14 secret masking audit

- 범위: settings/readiness/attempt/error/OpenAPI/log response를 synthetic marker로 검사하고 실제 leak만 owner serializer/logger에서 수정.
- 보존: provider 존재/상태/reason과 operator에 필요한 masked hint.
- 검증: BT-22.
- S10 완료 증거: 공용 redactor를 HTTP exception, CRM attempt/evidence, DMS config/logger에 적용했다. 합성 marker를 관리자 CRM/DMS/Admin surface, viewer 제한, 잘못된 query, immutable DMS Git setting, invalid Authorization, OpenAPI와 browser UI에서 조회해 노출 0을 확인했다.

### IMP-15 production origin·proxy·WebSocket contract

- 범위: CRM/Admin/DMS public API URL, server CORS origin, WebSocket URL, proxy runtime env의 standard/mapped matrix를 production config와 문서에서 일치시킨다.
- 금지: production URL을 source code에 hard-code하거나 임시 proxy를 launch 해결책으로 문서화.
- 영향 후보: docker compose/env examples, web server-api helpers, DMS WS config, production verification scripts/docs.
- 검증: BT-23, 관련 production build.

### IMP-16 canonical docs/OpenAPI/verifier/gates

- 범위: 각 slice의 code/type/DB/API와 `docs/`, OpenAPI/Redoc, changelog, Codex/GitHubDocs 영향 문서를 동시에 갱신.
- roleCode finding: visible behavior를 제거하지 않고 intentional out-of-source extension으로 auth/profile 정본과 상충하는 verifier를 하나의 계약으로 맞춘다.
- reports DTO, readiness snapshot, new CRM endpoint가 runtime OpenAPI와 exact match해야 한다.
- 검증: BT-25, BT-26.

### IMP-17 source UI/UX fidelity

- 범위: `source-uiux-parity-spec.md`의 `UX-01~17`에 대해 원천 reference와 target을 동일 state로 capture하고 업무 content의 구조·상호작용·시각 hierarchy 차이를 폐쇄한다.
- 허용: 공용 auth/shell/template/primitive, 접근성, responsive-only adaptation.
- 금지: field/column/action/section 삭제·통합·재명명, 원천 화면을 platform dashboard로 대체, desktop 정보 밀도 축소.
- 입력: `REF-01` 원천 prototype/PPTX/DDL과 capture manifest. 기억이나 현재 target을 source reference로 역생성하지 않는다.
- 영향 후보: CRM/Admin owner surface, 공용 component opt-in, UIUX evidence manifest와 docs. 실제 차이가 재현된 파일만 수정한다.
- 검증: BT-27과 관련 BT-01~23.
- S12 완료: 기존 goal-contract가 target pair를 직접 강제하지 않던 gap을 `verify:crm-uiux-parity-evidence.mjs`와 `CRM_TARGET_UIUX_MANIFEST`로 폐쇄했다. REF-01의 17개 화면·필수 source 상태를 견적 preview·print까지 포함한 83개 독립 capture로 고정했고, `s12-iteration-22-full-83`에서 각 상태의 고유 desktop/mobile target capture, 구조·interaction·visual diff, 허용 차이 분류와 E0를 검증했다. `verify:crm-uiux-parity:all` PASS로 UX 17/17을 완료했다.

## 5. 의존 순서와 slice gate

| 순서 | slice | 선행 | 구현 후 즉시 gate | 실패 시 |
|---:|---|---|---|---|
| S0 | isolated runtime/manifest와 failing tests 고정 | Phase 1 PASS | preflight, clean DB/runtime health, BT baseline | 환경/권한 근거 제시 후 필요한 경우만 중단 |
| S1 | IMP-11 reports DTO | S0 | unit/controller E2E, `/reports` desktop/mobile | 수정 반복 |
| S2 | IMP-07 contract schema/type/API/UI | S1 | clean+populated migration, contract target, BT-09 | forward rollback/app rollback, 수정 반복 |
| S3 | IMP-05 contract recovery | S2 | transaction/failure/idempotency, BT-07 | 수정 반복 |
| S4 | IMP-06 22-variable document | S2 | exact variable/artifact binary, BT-06/08 | 수정 반복 |
| S5 | IMP-04 dashboard/list compatibility | S0 | source sample DB query, BT-04/05 | 수정 반복 |
| S6 | IMP-08 plan performance compatibility | S2 | semantic fixture, BT-12 | 수정 반복 |
| S7 | IMP-01/02/03 shared substitution | S0 | auth/Admin/seller target, BT-01/02/03/14 | shared regression 포함 수정 반복 |
| S8 | IMP-09/10 permissions·seed | S2/S7 | role matrix, idempotent seed, BT-15/16 | assignment 보존 후 수정 반복 |
| S9 | IMP-12 readiness consistency | S1 | owner/Admin cross-surface BT-19 | DMS/CRM owner별 수정 반복 |
| S10 | IMP-13/14 failure/recovery/masking | S4/S9 | BT-21/22 | 수정 반복 |
| S11 | IMP-15 runtime contract | S1/S9 | standard/mapped origin, WS, BT-23 | 완료 |
| S12 | IMP-17 source UI/UX fidelity | S5~S11, REF-01 | UX-01~17, BT-27, 관련 source browser flow | 미분류/defect 0까지 수정 반복 |
| S13 | IMP-16 full synchronization | 전 slice | BT-24/25/26, all source+UX+ops browser | 실패 slice로 되돌아감 |
| S14 | architect review·deslop·post-deslop regression | S13 | fresh browser all critical flows와 BT-27 | P0/P1/UX defect 0까지 반복 |
| S15 | external deployment input | S14 | real seller/CI/credential 적용 후 readiness 0 blocker | EXT-01/02가 없으면 Goal active로 대기 |

병렬 구현은 하지 않는다. shared dirty worktree에서 slice 간 원인과 residue를 명확히 유지하기 위해 위 dependency order를 따른다.

### 5.1 Phase 2 실행 원장

| slice | 상태 | 코드/API/build 증거 | 브라우저·residue 증거 | 잔여 |
|---|---|---|---|---|
| S1 reports DTO | 완료 | DTO unit 3 + reports service 5 PASS, server TypeScript/build PASS, CRM production build PASS, actual preview API 200 | `/reports?year=2026` desktop/mobile 실데이터 렌더, mobile 390px overflow 0, page console error/warning 0. 임시 browser/3001·4000 proxy 종료 | IMP-11 route/content 결정성은 BT-17/23에서 계속 수행 |
| S2 contract party identity | 완료 | nullable master/history columns+FK/index migration, type/DTO/service/UI/PMS·DMS 소비. target 3 suite·50 test, DB contract 9/9, types/database/server/CRM production build PASS. clean DB 8 migrations·37 seeds·81 triggers/runtime contract와 populated backfill/history/FK/app rollback compatibility PASS | 격리 API admin save/reload 200, invalid owner 400, viewer mutation 403. `/contracts` desktop/mobile fresh browser 저장·재조회와 DMS preview 반영, 관련 API 200, console/runtime error 0, mobile overflow 0. 임시 DB/process/browser/marker row 제거 | IMP-06 원천 22변수와 최종 BT-09/24 fresh 전체 회귀는 계속 수행 |
| S3 contract recovery | 완료 | contract/opportunity 단일 transaction, relationship/row-count guard, `revoke-contract` API/proxy/UI와 linked-contract-aware reopen. target 2 suite·52 test, DB contract 9/9, server/CRM production build PASS. actual API admin allow/viewer deny, 확정 계약 회수, 확정 유지/해제, repeat idempotency, 차수 추가 복원, wrong-link 400+mutation 0, history PASS | desktop 1440×1000과 mobile 390×844에서 회수·회수+확정 해제 201, 상태/버튼 복원, 예상 밖 4xx/5xx·console/runtime error 0, overflow 0. 모바일 52px row hit-target 결함은 기존 surface를 보존한 responsive grid 수정 후 실제 click target으로 재검증 | 최종 BT-24 fresh 회귀와 IMP-15 production proxy 계약은 계속 수행 |
| S4 22-variable document | 완료 | confirmed/latest opportunity 원천 22개 변수의 exact ordered snapshot, CRM handoff master, additive main/launch migration, 5개 opportunity API, DMS 용도별 active DOCX binary·버전·검토·render·storage와 operation attempt를 구현했다. target 2 suite·35 test, types/server/CRM production build, clean DB 9 migrations·37 seeds·81 triggers·drift 0와 runtime contract PASS. actual API admin allow/viewer deny, draft 저장·reload, lifecycle/artifact download, 동일 idempotency key 409/DB 불변을 확인했다. | desktop 1440×1000 초안·실행 201과 mobile 390×844 실제 재실행·download 201, 원천 22값 치환·미해결 placeholder 0, lifecycle 세 단계 완료, console error/warning 0, related request failure 0, mobile overflow 0, action hit target 40px. 초기 목록·deep-link 중복 fetch race는 목록 hydrate 뒤 목록 밖 detail만 조회하도록 최소 수정 후 fresh browser에서 폐쇄 | 실제 seller 법인값·CI는 EXT-01 외부 배포 입력이며 원천 기능 구현 점수와 분리. 최종 BT-24 fresh 전체 회귀는 계속 수행 |
| S5 dashboard/list compatibility | 완료 | 확정 최신차수 3건 기준 source-compatible dashboard, 원천 4상태·최근 5건, 고객명 기본 정렬·원천 상태 filter·매출/이익/이익률 정렬·12 column·inline 이전차수를 additive하게 구현했다. types build, dashboard/opportunity 2 suite·36 test, server/CRM production build PASS. isolated DB 9 migrations·81 triggers·drift 0, actual dashboard/list API 200과 source 수치 exact match를 확인했다. | desktop 1440×1000과 fresh-auth mobile 390×844에서 dashboard drilldown, filter/sort URL·선택값·2건 결과 유지, `2차 → 1차(이전)` 탐색을 확인했다. fresh authenticated contexts console error/warning 0, mobile document overflow 0. 임시 auth state/browser session은 제거했다. | `SRC-05~07` 폐쇄. content overlay/perceptual diff·전체 state pair·MDI 차이 분류가 없어 `UX-01~02`는 부분 유지하며 S12/BT-27에서 닫는다. 최종 BT-24 fresh 전체 회귀는 계속 수행 |
| S6 plan performance compatibility | 완료 | `source-compatible`은 확정 사업계획 대 확정 계약 billing plan, 기본 `extended-actual`은 기존 billing actual/manual actual/확정원가를 사용하도록 additive 분리했다. business-plan unit 16건, types/server/CRM production build PASS. 격리 DB의 2026 billing plan 18행 913,500,000원/535,700,000원과 billing actual 1행 150,000,000원/111,900,000원을 두 API 모드가 정확히 분리했다. | 최초 종료 점검의 server→client query helper RSC 예외를 순수 query 모듈 분리로 수정했다. 새 production build의 desktop 1440px와 fresh-auth mobile 390×844에서 직접 URL·강제 새로고침, source mode URL·선택값·직접실적 패널 부재, extended mode 직접실적 패널 보존, console error/warning 0, overflow 0을 확인했다. | `SRC-22` 폐쇄. source/target overlay·전체 state pair·시각 차이 분류가 없어 `UX-10`은 부분 유지하며 S12/BT-27에서 닫는다. 최종 BT-24 fresh 전체 회귀는 계속 수행 |
| S7 shared substitution | 완료 | CRM opt-in ID 저장/password visibility, 명시적 audit 보존, profile optional clear, 공용 auth `authIcon` 44px recipe, favicon compatibility를 최소 수정했다. auth/web-ui/web-shell/Admin/CRM production build와 auth hardening verifier를 통과했다. actual auth에서 invalid/normal/30분 연장/31분 idle, password 변경과 타 session revoke를 확인했고 Admin user/code/year CRUD·allow/deny·중복, seller/CI 저장과 견적·계약 문서 소비를 검증했다. | desktop/mobile에서 profile·Admin users·seller settings를 확인했고 390×844 document overflow 0, CRM profile은 공용 `pageAction` 36px 리듬을 유지했다. 임시 code/year는 0건, seller/CI는 원래 snapshot으로 복원, disposable user는 비활성·active session 0으로 정리했다. `/favicon.ico`는 200 SVG이며 fresh browser에는 비인증 bootstrap 예상 401 외 favicon/network/runtime 오류가 없었다. | `SRC-01~04` 폐쇄. 실제 운영 seller/CI는 EXT-01, 전체 role matrix는 S8, source/target overlay·전체 state pair가 남은 `UX-12/15/16/17`은 S12/BT-27에서 닫는다. 최종 BT-24 fresh 전체 회귀는 계속 수행 |
| S8 permissions·seed·AMS | 완료 | 계약·사업계획·원가/AMS·보고·공급자 설정 14 capability를 공용 permission resolver/guard와 CRM UI snapshot에 연결하고 25개 CRM permission을 Admin `launch-active` catalog로 정합화했다. types/server/CRM production build와 access service 16 test를 통과했다. 격리 DB에서 role assignment admin 25/manager 21/user 14/viewer 8, 전체 120건의 seed 2회 불변을 확인했다. source fixed hash gate는 6/7/53과 5/44/35/5 전체 값, 2회 reseed와 source 6→central 8 functional alias를 통과했다. | 실제 API에서 viewer read/write 200/403, user write/confirm 2xx/403, manager confirm/reopen 2xx, admin 14/14를 확인했다. user desktop에서 AMS 업체 생성·2 WBS·계획/실적 각 24셀 paste·저장/reload/cascade 삭제, viewer read-only, manager confirm 가능/settings read-only, admin settings edit 가능을 fresh context로 확인했다. mobile 390×844 overflow 0, 네 역할 console error 0, residue 0이다. | `SRC-24~27`, `OPS-03` 폐쇄. `UX-13~14` 시각 overlay와 BT-24/27 최종 fresh 전체 회귀는 유지. 다음은 S9 IMP-12 readiness consistency |
| S9 readiness consistency | 완료 | 공용 snapshot type, CRM aggregate owner endpoint, DMS runtime cache/meta, Admin exact pass-through/stale normalizer, owner UI expiry와 runtime verifier를 구현했다. refresh 5초·max age 30초, CRM/DMS cache·invalidation·probe failure unit 4 test, types/server/Admin/CRM/DMS production build를 통과했다. | 같은 5초 window에서 CRM/DMS owner와 Admin의 ID/time/source/reason/count exact match를 확인했다. 30초 후 세 UI가 `확인 불가`와 `—`로 전환했고 refresh로 새 ID가 복구됐다. 실제 server 단절에서 Admin 두 card가 `unknown/null`, 재기동 후 live snapshot으로 복구됐다. desktop/mobile overflow 0, 세 앱 console error/warning 0이다. | `OPS-04`, `OPS-13`, `BT-19` 폐쇄. settings route와 전체 failure/manual recovery·masking은 S10~S11에 유지 |
| S10 failure/recovery/masking | 완료 | stable correlation, owner/source link, server retryability/recovery summary, sanitized exception/evidence, 공용 URL/token/secret redactor, DMS structured log masking, BT-21/22 runtime verifier와 exact cleanup을 구현했다. 공용 transaction 기본값이 업무 correlation을 덮던 결함은 explicit correlation 우선과 operation-boundary context로 수정했다. | actual failure `#6`→owner cause fix→retry `#7`, 원본 실패 보존, same correlation, repeat `409`, artifact hash 불변, duplicate 0을 통과했다. admin 8 surface와 viewer/error/Authorization/OpenAPI marker leak 0, desktop 1280/mobile 390 overflow·console error 0, DB/file residue 0이다. | `OPS-06`, `OPS-09`, `OPS-12`, `BT-21`, `BT-22` 폐쇄. `/operations/settings`와 production origin/deep-link는 S11에 유지 |
| S11 production runtime contract | 완료 | CRM URL-first route/tab helper, sidebar·MDI URL sync, stale persisted tab normalization, supported `/?selected=...` recovery link, DMS settings→root home restoration과 production runtime verifier를 구현했다. 종료 로그에서 발견한 reports server→client query helper RSC 오류도 순수 query 모듈 분리로 수정했다. CRM/DMS lint와 production build, launch/runtime/env static gate를 통과했다. | CRM mapped `3105→4105` desktop/mobile에서 settings 두 URL·reports·source link direct/reload/menu/back/forward가 일치했다. reports는 새 build에서 direct HTTP 200과 authenticated reload 200, server/console 오류 0이다. DMS standard `3003→4000`과 approved mapped `3113→4105`에서 deep link/root와 Socket.IO frame 송수신을 확인했고, Admin `3100` login/root도 통과했다. 예상 밖 4xx/5xx·console error/warning·WS error·390px overflow 0, 미승인 origin은 fail closed, 기존 DMS container 원복 완료다. | `SRC-28`, `OPS-01`, `OPS-10`, `OPS-14`, `BT-17`, `BT-23` 폐쇄. 다음은 S12 `UX-01~17` source overlay |
| S12 source UI/UX·quote final | 완료 | REF-01을 견적 preview·print를 포함한 17개 화면·83개 독립 상태로 정정하고, target source/desktop/mobile pair를 강제하는 UI/UX evidence gate를 goal-contract에 연결했다. 견적 원천 산식·CI·담당자·인쇄/PDF와 DMS DOCX/PDF lifecycle verifier도 추가했다. | `s12-iteration-22-full-83`에서 83/83 source/desktop/mobile capture, 구조·interaction·content visual diff, 허용 차이 분류와 browser E0를 통과했다. BT-06은 원천 raw 162,000,000원·특별할인 5,000,000원·최종 157,000,000원과 browser/print PDF/DMS DOCX/PDF, residue 0을 확인했다. | `SRC-10`, `SRC-13`, `UX-01~17`, `BT-06`, `BT-27` 폐쇄. 엄격 데모 이식 45/45 |
| S13 migration·repo·residue | 완료 | BT-24 DB verifier를 clean/populated/failed migration rollback·exact restore까지 확장하고, BT-25의 11개 repo release check와 BT-26 격리환경 파기·residue verifier를 최종 gate로 연결했다. | launch migration 10개·trigger 82개·drift/partial object/residue 0, CRM 23 suite·171 test, server/CRM/Admin/DMS build, 5 OpenAPI/458 operation, security high/critical 0을 확인했다. 격리 DB/runtime/process 파기 후 DB row/file/temporary port는 0이다. | `OPS-15~17`, `BT-24~26` 폐쇄. 운영 성숙도 17/17 |
| S14 architect·deslop·최종 회귀 | 완료 | 원천 디자인을 보존해야 하는 견적 surface에 metadata가 필수인 좁은 source-fidelity style-boundary 예외를 추가하고 규칙 정본을 동기화했다. 기존 UI/UX나 동작은 변경하지 않았다. | UI style boundary, Codex sync, DMS guard, docs/OpenAPI, CRM local, production builds/runtime/security/preflight와 원천 UI/UX·견적·운영 evidence gate를 재실행해 PASS했다. | 저장소 범위 P0/P1 결함 0. S15는 EXT-01/02 적용 뒤 실제 deployment readiness 판정 |
| S15 external deployment input | 외부 입력 대기 | 승인 seller/CI packet, production env+packet gate, live API/CI hash·release identity·CRM/DMS/Admin readiness verifier에 이어 Playwright CLI browser manifest와 최종 evidence verifier를 구현했다. API 단계는 `PASS_LIVE_API_READY`로 제한되고 같은 release의 DMS 5-track FINAL GO까지 결합한 최종 gate만 `finalGoLive: true`를 낸다. schema 3은 수동 surface assertion을 금지하고 API readiness identity·seller CI 요청을 실제 접근성 snapshot과 결합한다. | API positive 11 check와 4 negative fixture, browser evidence의 서로 다른 fresh desktop/mobile 12 surface·3 binary positive 및 synthetic/mobile 누락/console error/CI hash/path·symlink·viewport·origin·CI 요청/image·snapshot identity·readiness card·artifact content/DMS NO_GO negative fixture가 PASS했다. 실제 production endpoint를 호출하거나 운영 데이터를 변경하지 않았다. | EXT-01/02 실제 값 적용, API/DMS FINAL GO evidence, 24시간 이내 Playwright CLI desktop/mobile, 실제 견적 PDF·DMS DOCX/PDF로 `verify:crm-go-live:final` PASS 필요 |

## 6. Behavior Impact Gate

현재 계획은 기존 동작을 삭제/대체하지 않는 additive 설계다. 다음 상황이 실제로 필요해지면 즉시 멈추고 사용자 확정을 받는다.

- 현재 business-plan performance의 billing actual/manual mode를 제거하거나 의미를 바꿔야 하는 경우.
- 현재 dashboard pipeline/queue/metric을 source 지표로 교체해야 하는 경우.
- `roleCode` API/UI 노출을 제거·축소해야 하는 경우.
- 기존 `/settings`, `/operations`, DMS settings URL/menu/demo mode/fallback을 폐기하거나 redirect contract를 바꿔야 하는 경우.
- 기존 오류/빈 상태/수동 복구 action을 흡수하거나 숨겨야 하는 경우.

새 source-compatible tab/metric/action을 추가하고 기존 surface를 유지하는 작업은 이 승인 범위 안이다.

## 7. migration·test data·rollback 공통 규칙

1. migration은 nullable/additive 우선, deterministic backfill만 허용한다.
2. schema 적용 전 isolated DB dump/schema+count manifest를 만든다.
3. clean DB와 populated baseline 모두 적용한다.
4. app rollback은 새 field가 없어도 아니라 **새 field를 무시해도** 동작하는 이전 build로 검증한다. production에서 즉시 column drop하지 않는다.
5. test row/binary는 `RALPH_CRM_<run-id>` prefix와 isolated storage namespace를 사용한다.
6. 매 slice 종료 시 test row/session/outbox/artifact를 정리하고 settings/seller/CI hash를 원복한다.
7. 실패 evidence를 보존해야 하면 isolated DB/manifest에만 남기고 production-like baseline count에는 포함하지 않는다.

## 8. Phase 1 closure audit

Phase 2로 자동 전환하기 위한 객관 조건:

| 조건 | 산출물 | 현재 판정 |
|---|---|---|
| 원천 화면/DDL/계산/상태/문서/표본 분모 고정 | `source-parity-matrix.md` 2~3절 | 충족 |
| 원천 패리티와 운영 분모 분리 | 패리티 5절, PRD 3절 | 충족 |
| current code/DB/API/type/docs/browser 독립 대조 | 패리티 4~5절 | 충족 |
| 모든 partial/missing이 구현 작업에 매핑 | `SRC-*`→`IMP-*`→`BT-*` | 충족 |
| 중요 web flow에 URL/role/seed/action/UI/API/route/desktop/mobile/error gate | test plan BT-01~23 | 충족 |
| 원천 UI/UX 디자인 무변경 분모와 source-reference 비교 gate | `source-uiux-parity-spec.md` UX-01~17, BT-27 | REF-01 17개 화면·83/83 상태 쌍 / UX 17/17 완료 |
| migration/rollback/격리/residue/repo gate | 이 문서 5·7절, BT-24~26 | 충족 |
| DMS readiness·roleCode finding 보존 | PRD F-01/F-02, IMP-12/16 | 충족 |
| 미확정 사실과 외부 입력 분리 | 패리티 7절, PRD EXT-01/02 | 충족 |
| 문서 내부 ID·링크·gate 정합 검증 | `SRC-01~28`, `UX-01~17`, `OPS-01~18`, `IMP-01~17`, `BT-01~27`, `EXT-01~02`, `S0~S15` 자동 감사 | `pnpm run verify:crm-goal-contract:structure` 통과 후 충족 |
| `codex:verify-sync`와 관련 docs validation | `pnpm run codex:verify-sync`, `pnpm run docs:verify`, `pnpm run codex:preflight` | 2026-08-18 fresh preflight PASS |
| 현재 revision freshness | schema 2 local report·target UI manifest·runtime report의 동일 파일내용 `worktreeIdentity` | 2026-08-24 감사에서 기존 증거의 결합 공백 확인, 재증명 진행 중 |

`REF-01`, `pnpm run verify:crm-goal-contract`, preflight는 2026-08-18에 모두 PASS해 Phase 2를 재개했다. 이후 S5~S14를 별도 isolated DB/API/browser와 최종 통합 증거로 폐쇄해 2026-08-21 폐쇄 원장 기준 strict demo 45/45와 operations 17/17을 기록했다. 2026-08-24 감사에서는 기능 완료 행 집계와 기존 UI/BT evidence가 현재 작업 트리의 실제 파일내용 지문에 묶이지 않은 공백을 확인했다. [CRM 데모 100% 이식 검증 계약](./demo-100-verification-contract.md)에 따라 schema 2 fresh evidence로 현재 revision을 다시 증명하기 전에는 45/45를 현재 판정으로 사용하지 않는다. 실제 런칭은 EXT-01/02가 적용되기 전까지 active로 유지한다.

## 9. 최종 완료 판정

Goal 완료는 다음이 전부 참일 때만 가능하다.

- 원천 패리티 `SRC-*`와 UI/UX 패리티 `UX-*`의 partial/missing/substitution/reference gap 0.
- 운영 성숙도 `OPS-01~17` partial/missing 0.
- 관련 P0/P1 구현 결함 0.
- 예상 밖 4xx/5xx, API/proxy failure, console/runtime error, 권한 불일치 0.
- migration/runtime/OpenAPI/docs/security/production build 통과.
- production high/critical vulnerability 0.
- desktop/mobile fresh browser 정상·deny·실패·복구 통과.
- test residue 0, 설정/seller/CI 원복 완료.
- 실제 launch에 필요한 EXT-01/02가 적용되고 readiness blocker 0. 제공되지 않았으면 최종 보고에 외부 의존성으로 표시하고 Goal을 active로 유지한다.

최종 보고는 반드시 세 표로 분리한다.

1. 원천 패리티 `SRC-*` 결과.
2. CRM/Admin/DMS 운영 성숙도 `OPS-*` 결과.
3. 외부 배포 입력·credential·의존성 `EXT-*` 결과.

진척 백분율은 가중 추정치가 아니라 완료 row 수로만 표시한다. 데모 이식 진척은 `(완료 SRC + 완료 UX) / 45`, 운영 성숙도는 `완료 OPS-01~17 / 17`로 별도 계산하며 둘을 합산하지 않는다. `완료/원천 모순`은 additive compatibility와 해당 BT가 닫힌 경우만 완료로 센다. 어느 하나라도 미완료이면 100%가 아니며, 백분율은 acceptance gate를 대신하지 않는다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-24 | S15 browser evidence schema 3에서 제출자 작성 surface assertion을 금지하고 API CRM/DMS snapshot identity·ready/0 blocker/degraded, seller CI 요청과 CRM/Admin/DMS/preview/print 접근성 snapshot을 자동 대조하도록 강화. 실제 EXT-01/02 전이므로 Goal active 유지 |
| 2026-08-24 | S15 browser evidence schema 2에서 real-root path/symlink containment, PNG viewport exact, CRM/Admin/DMS origin 관측, quote 금액 산식과 snapshot/artifact text 일치, PDF/DOCX 실제 재열기·placeholder 0을 verifier-derived 결과로 강화. 실제 EXT-01/02 전이므로 Goal active 유지 |
| 2026-08-24 | S15 API PASS를 최종 완료와 분리하고 Playwright CLI desktop/mobile 12 surface, 고유 snapshot/PNG, 실패·overflow 0, 견적 PDF·DMS DOCX/PDF binary/hash를 API evidence와 결합하는 최종 verifier/self-test를 추가. 실제 EXT-01/02 전이므로 Goal active 유지 |
| 2026-08-24 | S15 외부 입력 인수 packet과 fail-closed go-live verifier를 준비. 법인/CI exact input, production env, release SHA, live seller API/CI, CRM/DMS owner와 Admin bridge readiness를 credential-free evidence로 묶었지만 실제 EXT-01/02 입력 전이므로 Goal active 유지 |
| 2026-08-21 | Phase 2 S12에서 17개 화면·83/83 source/desktop/mobile 상태와 BT-06 견적 browser/print/DMS artifact를 폐쇄해 SRC 28/28, UX 17/17, strict demo 45/45를 달성 |
| 2026-08-21 | Phase 2 S13~S14에서 BT-24 migration/rollback, BT-25 repo/build/docs/OpenAPI/security, BT-26 isolation/residue와 최종 deslop/preflight를 통과해 OPS 17/17을 달성. S15 실제 런칭은 EXT-01/02 외부 입력 대기 |
| 2026-08-19 | Phase 2 S9에서 CRM/DMS/Admin readiness를 공용 snapshot ID와 5초 refresh/30초 expiry로 정합화하고 stale·probe failure·upstream 단절을 `unknown/null`로 고정했다. exact API/browser, cache invalidation, expiry/refresh/recovery, desktop/mobile E0로 OPS-04/13과 BT-19를 폐쇄하고 현재 단계를 S10 준비로 전환 |
| 2026-08-19 | Phase 2 S10에서 actual failure→owner cause fix→retry와 stable correlation, 원본 실패 보존, repeat 409·artifact 불변·residue 0을 통과했다. response/error/log/viewer/OpenAPI/UI secret marker leak 0과 desktop/mobile E0로 OPS-06/09/12와 BT-21/22를 폐쇄하고 현재 단계를 S11 준비로 전환 |
| 2026-08-20 | Phase 2 S11에서 CRM/DMS URL-first route, operation source deep link와 DMS root 복귀를 수정했다. standard/approved mapped origin에서 login/API/Socket.IO/deep-link, 미승인 origin fail-closed와 desktop/mobile E0를 통과해 SRC-28, OPS-01/10/14, BT-17/23을 폐쇄하고 현재 단계를 S12 준비로 전환 |
| 2026-08-19 | Phase 2 S8에서 CRM domain permission/catalog/guard, 네 역할 allow·deny, seed 2회 assignment 보존, source fixed hash/functional alias, AMS 업체·2 WBS·48셀 paste·확정 잠금·해제·cascade 삭제를 actual DB/API/desktop/mobile로 닫아 SRC-24~27과 OPS-03을 폐쇄. UX-13~14를 부분 유지하고 현재 단계를 S9 준비로 전환 |
| 2026-08-19 | Phase 2 S7에서 CRM login control, 공용 profile/password, Admin user/code/year, seller/CI 문서 소비와 원복을 actual allow/deny/failure/desktop/mobile로 닫아 SRC-01~04를 폐쇄. UX-12/15/16/17과 EXT-01을 분리 유지하고 현재 단계를 S8 준비로 전환 |
| 2026-08-18 | Phase 2 S6에서 source-compatible 사업계획대비실적 산식을 확정 계약 청구계획으로 고정하고 기존 확장 모드를 보존했다. 실제 DB/API/desktop/mobile로 SRC-22를 폐쇄하고 UX-10은 부분 유지, 현재 단계를 S7 준비로 전환 |
| 2026-08-18 | Phase 2 S5에서 source-compatible dashboard/list를 구현하고 source exact DB/API와 production desktop/mobile browser로 SRC-05~07을 폐쇄. source/target 시각 diff 미완료인 UX-01~02는 부분으로 유지하고 현재 단계를 S6 준비로 전환 |
| 2026-08-18 | 과거 Phase 1을 재개방하고 원천 UI/UX 무변경 `UX-01~17`, `REF-01`, IMP-17, BT-27, S12를 추가. source reference와 자동 계약/preflight가 PASS하기 전 S5 이후 재개 금지 |
| 2026-08-14 | Phase 2 S3에서 source-compatible 계약 회수와 연결 계약 회수+영업기회 확정 해제를 transaction/API/UI로 완성. actual allow/deny/failure/idempotency/history, desktop/mobile action과 responsive hit target, build를 통과해 SRC-12를 폐쇄 |
| 2026-08-14 | Phase 2 S2 계약 party identity를 master/history/type/API/UI와 PMS/DMS 소비까지 additive하게 구현. clean+populated migration, rollback compatibility, actual allow/deny/invalid FK, desktop/mobile 저장·재조회, console/runtime error 0과 residue 0으로 SRC-15를 폐쇄 |
| 2026-08-14 | Phase 2 S1 reports DTO를 runtime whitelist와 일치시키고 API 200·desktop/mobile·console 0까지 검증. route/content와 production proxy는 미완료로 분리 유지 |
| 2026-08-14 | Phase 1 ID/mapping 수동 감사와 codex sync/docs/preflight를 모두 통과해 Phase 2 자동 전환 조건을 닫음 |
| 2026-08-14 | 단일 Goal의 2단계 실행 계약으로 재작성. 16개 implementation mapping, dependency slice, additive Behavior Impact 설계, migration/rollback/isolation/residue, Phase 1 closure audit와 최종 3표 보고 기준을 고정 |
