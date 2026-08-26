# CRM·Admin·DMS 동시 런칭 운영 성숙도 PRD

> 기준일: 2026-08-14  
> 상태: 1단계 설계 정본. 원천 패리티 분모와 운영 성숙도 분모를 분리한다.  
> 목표: DMS 도메인 기능을 CRM에 복제하지 않고 CRM 도메인에 맞는 운영·설정·관측·복구 수준을 같은 등급으로 만든다.

## 1. 목표와 비목표

### 목표

- CRM 사용자와 운영자가 도메인 업무, 설정, readiness, 실패, 재시도, 수동 복구와 감사를 실제 DB/API/UI에서 끝까지 수행한다.
- Admin은 계정/조직/역할/공통 설정의 정본이자 CRM·DMS launch readiness bridge가 된다.
- CRM, Admin, DMS의 직접 URL·권한·상태·실패 의미가 서로 일치한다.
- production runtime에서 credential을 노출하지 않고 failure가 `ready` fallback으로 바뀌지 않는다.
- 기존 Preview/demo mode/URL/버튼/안내/오류·빈 상태/복구·권한 fallback을 보존한다.

### 비목표

- DMS Git, storage, ingest, template 관리 기능을 CRM에 복사하지 않는다.
- Admin에 CRM 도메인 설정 form을 중복 구현하지 않는다. Admin은 summary와 owner route를 연결한다.
- 원천 밖 `roleCode`, 회계 executor, customer/AI/PMS 확장을 삭제하지 않는다.
- 실제 법인값, CI binary, production credential을 추측하거나 seed하지 않는다.
- `roleCode` 노출과 원천 밖 회계 executor는 보존하되 데모 100%와 이 운영 Goal의 필수 완료 조건에서 제외한다.

## 2. 책임 경계와 SDD 검토

| 책임 | 단일 소유자 | CRM/Admin에서 허용되는 연결 | 금지 |
|---|---|---|---|
| 영업기회·계약·청구·사업계획·원가 | CRM server/DB | CRM web이 도메인 API를 사용 | Admin에 중복 업무 CRUD |
| CRM 도메인 운영 설정/history/attempt/retry | CRM operations module | CRM `/operations`, `/settings`; Admin은 summary/link | DMS settings 구조 복제 |
| 사용자·조직·역할·공통 auth policy | Admin/Auth | CRM은 access snapshot과 shared user surface 소비 | CRM 전용 계정 table/역할 form |
| template binary·DOCX/PDF·Git/storage/ingest | DMS | CRM은 변수 snapshot, 업무 source id, lifecycle 요청/결과 소비 | CRM에 Git/storage/ingest 구현 |
| 프로젝트 수행 | PMS | 명시적 contract handoff | CRM 계약 저장과 PMS mutation 결합 |
| 회계 provider | 외부 선택 연동 | 비활성은 `not-required`, 실행은 별도 evidence | 원천/launch 필수 점수에 포함 |
| 법인값·CI·credential | deployment/operator input | masked reference와 readiness만 표시 | 추측값·평문 secret 저장/표시 |

SDD 결정:

- 기존 `crm/operations`, shared auth, shared web shell, DMS settings와 Admin dashboard pattern을 확장한다.
- 새 범용 framework나 추상 provider 계층을 만들지 않는다. 필요한 endpoint/DTO/history만 기존 module에 추가한다.
- 영업기회 계약 회수처럼 여러 원장에 걸친 업무는 UI 순차 호출이 아니라 기존 CRM service transaction에 둔다.
- source-compatible 지표/사업계획 실적은 현재 사용자-visible 의미를 교체하지 않고 별도 label/mode로 추가한다.
- route state는 URL을 정본으로 삼고, MDI persistence는 URL과 충돌할 때 URL이 우선하도록 기존 shell integration 지점에서 해결한다.
- seller profile 설정은 새 role 정책을 만들지 않고 기존 `crm.opportunity.write` 계약을 유지한다.

## 3. 운영 성숙도 분모

상태 정의:

- `완료`: 현재 code/DB/API/browser evidence가 있고 Phase 2 fresh regression만 남음.
- `부분`: 기반은 있으나 route, 역할, 실패, 일관성 또는 복구 증거가 부족함.
- `누락`: 필수 운영 계약 또는 사용자 흐름이 없음.
- `외부 입력`: 구현으로 만들 수 없는 배포 값/권한.

| ID | 운영 분모 | 완료 조건 | 현재 증거 | 판정 | 구현/검증 매핑 |
|---|---|---|---|---|---|
| OPS-01 | 운영·설정 진입점 | CRM owner URL과 Admin bridge가 desktop/mobile 직접 URL·메뉴에서 같은 content를 연다 | S11에서 CRM `/operations/settings`·`/settings`의 deterministic tab/content, menu·tab URL sync와 DMS `/settings/operations/git`·root 복귀를 desktop/mobile direct/reload/back/forward로 확인했다. | 완료 | IMP-11, IMP-15, BT-17 |
| OPS-02 | 책임 경계 | CRM/DMS/Admin/PMS/회계 owner와 `required/not-required`가 명시되고 중복 form이 없다 | boundary notice와 현재 modules 존재 | 완료 | BT-18 |
| OPS-03 | 권한 | 메뉴, direct URL, API, action allow/deny가 같은 snapshot을 사용 | S8에서 25개 CRM permission을 Admin `launch-active` catalog로 정합화하고 14 domain capability의 공용 resolver/guard/UI snapshot을 연결했다. 네 역할 API allow/deny와 fresh browser read-only/edit/confirm/settings 상태, seed 2회 assignment 보존을 확인했다. | 완료 | IMP-09, BT-15, BT-24 최종 fresh 회귀 |
| OPS-04 | readiness | source, 상태, blocker/warning, 마지막 확인 시각, owner route가 실제 probe/DB와 일치 | S9에서 CRM/DMS owner에 공용 snapshot ID·checkedAt·expiresAt·source·reason·count를 적용하고 5초 cache/30초 만료/명시적 invalidation을 구현했다. actual owner/Admin exact match, stale·probe failure `unknown/null`, refresh 복구를 확인했다. | 완료 | IMP-12, BT-19, BT-24 최종 fresh 회귀 |
| OPS-05 | 운영 설정 | revision, optimistic concurrency, reload, rollback, 환경소유 secret 구분 | CRM settings/history와 과거 conflict evidence 존재 | 완료 | BT-20 |
| OPS-06 | 관측 | 업무 실행/설정 변경/readiness에 timestamp, actor, source, correlation이 있다 | S10에서 attempt의 actor/time/source와 stable correlation을 API·DB·desktop/mobile UI에서 확인했고 retry chain 전체가 같은 transaction correlation을 사용한다. | 완료 | IMP-13, BT-21, BT-24 최종 fresh 회귀 |
| OPS-07 | 실패 원장 | sanitized 원인, 대상, 상태, retryability, 원본 보존 | attempt #2 failure와 #3 recovery 과거 evidence, runtime 3 rows | 완료 | BT-21 fresh run |
| OPS-08 | 안전 재시도 | idempotency, confirm, retry chain, 중복 artifact 방지 | same chain 409 과거 evidence | 완료 | BT-21 fresh run |
| OPS-09 | 수동 복구 | operator가 원인을 보고 owner surface로 이동, 수정, 재실행, 결과 확인 | S10에서 실패 이유와 DMS owner/CRM source direct link를 표시하고 실제 DMS 초안 생성으로 원인을 수정한 뒤 원본 attempt를 재시도해 복구 완료를 확인했다. | 완료 | IMP-13, BT-21, BT-24 최종 fresh 회귀 |
| OPS-10 | 오류·빈 상태·fallback | API/proxy failure가 ready/0으로 축소되지 않고 retry를 제공 | reports 400은 S1, readiness 0/0 fallback은 S9, attempt failure/recovery는 S10에서 해결했다. S11에서 settings/report/source deep link와 DMS root fallback의 URL/content mismatch, 승인 origin proxy/Socket 오류를 폐쇄했다. | 완료 | IMP-11, IMP-15, BT-17, BT-23 |
| OPS-11 | 설정 이력·감사 | before/after, actor, revision, masked secret, rollback 결과 조회 | CRM setting revision history 존재 | 완료 | BT-20 |
| OPS-12 | secret masking | response/log/UI/OpenAPI에 password/token/connection string/raw credential 없음 | S10에서 공용 recursive redactor를 HTTP error, CRM attempt/evidence, DMS config/logger에 적용했다. admin 8개 surface, viewer 제한, query/immutable-setting/Authorization 오류, OpenAPI와 desktop/mobile UI의 합성 marker 노출 0을 확인했다. | 완료 | IMP-14, BT-22, BT-24 최종 fresh 회귀 |
| OPS-13 | Admin bridge | CRM/DMS blocker/warning/ready 수와 owner link가 owner app과 같은 snapshot | S9에서 Admin이 CRM/DMS owner snapshot만 소비하고 fresh 값은 exact pass-through하도록 고정했다. stale·malformed·upstream 단절은 `unknown/null`이며 owner link를 유지한다. API와 desktop/mobile에서 actual snapshot 일치·만료·단절·복구를 확인했다. | 완료 | IMP-12, BT-19, BT-24 최종 fresh 회귀 |
| OPS-14 | launch runtime contract | 표준 origin/CORS/proxy/API URL/WebSocket/deep link가 production config와 일치 | S11에서 production env verifier와 전용 runtime gate를 추가했다. standard `localhost:3003→4000`, approved mapped CRM `3105→4105`·DMS `3113→4105`, Admin `3100`에서 login/API/deep link와 Socket.IO frame 송수신·오류 0을 확인했고 미승인 origin은 fail closed했다. | 완료 | IMP-15, BT-23 |
| OPS-15 | migration/rollback | migration, constraint/trigger, backfill, down/restore procedure가 검증됨 | S13 BT-24에서 clean/populated migration, 의도적 failed migration의 transaction rollback, 설정·populated baseline exact restore를 실행했다. launch migration 10개, trigger 82개, schema drift와 partial object/DB residue 0을 확인했다. | 완료 | IMP-07, IMP-09, IMP-13, BT-24 |
| OPS-16 | build/security/docs | OpenAPI/runtime, canonical docs/changelog, production build, high/critical 0 | S13 BT-25에서 CRM 23 suite·171 test, production runtime contract, server/CRM/Admin/DMS build, docs와 5개 OpenAPI 문서 458 operation, Codex sync/preflight/DMS guard를 통과했다. production audit의 high/critical은 0이다. | 완료 | IMP-16, BT-25 |
| OPS-17 | test isolation/residue | disposable prefix/DB/volume, 설정 원복, 업무/binary/history residue 정책이 명시되고 audit 0 | S13 BT-26에서 파기 전 inventory/hash를 기록한 뒤 격리 DB와 정확한 runtime root, 임시 process를 제거했다. 파기 후 DB row/runtime file/open temporary port는 모두 0이다. | 완료 | IMP-16, BT-26 |
| OPS-18 | 외부 배포 입력 | 법인값/CI/credential가 owner·형식·적용·검증 절차와 함께 제공 | S15 승인 packet·input/live API verifier·Playwright CLI desktop/mobile 및 artifact 최종 evidence gate·가이드는 완료. 실제 seller legal profile/CI와 production endpoint/credential는 미확정 | 외부 입력 | EXT-01, EXT-02 |

## 4. DMS 동급성의 정확한 의미

| DMS에서 관찰되는 운영 능력 | CRM에 필요한 동급 능력 | 복제하지 않는 DMS 기능 |
|---|---|---|
| settings navigation와 direct link | `/operations`, `/settings`의 결정적 route와 owner link | DMS settings tree 자체 |
| storage/Git/ingest readiness | CRM DB, seller profile, DMS/PMS/선택 provider dependency readiness | Git/storage/ingest probe 구현 |
| ingest failure/retry/cancel | CRM quote/contract/handoff failure ledger와 safe retry/manual recovery | ingest queue |
| template/permission/output policy history | CRM settings revision/audit와 contract/quote policy reference | template CRUD 복사 |
| operator-visible errors/empty states | CRM domain-specific error, stale, permission fallback | DMS 문구/화면 복사 |
| masked configuration | CRM response/log/UI secret masking | DMS secret schema 복제 |
| Admin readiness summary | 같은 snapshot/version/checkedAt를 쓰는 CRM/DMS summary | Admin 도메인 설정 form |

동급 판정은 항목 수나 화면 모양이 아니라 정상·권한거부·실패·복구·감사·readiness 일관성이 실제로 증명되는지로 한다.

## 5. 확인된 finding

| Finding | 사실 | 잘못 해석하면 안 되는 결론 | Phase 2 처리 |
|---|---|---|---|
| F-01 DMS readiness 시간 모순 | 같은 runtime에서 fresh API 8/9 blocked, later DMS 9/9 ready, Admin 0/0 또는 later ready가 관찰됨 | “DMS가 항상 blocked” 또는 “항상 ready”로 단정 금지 | snapshot id/checkedAt/source/cache policy와 cross-surface consistency test 추가 |
| F-02 `roleCode` verifier 충돌 | OpenAPI verifier는 현재 노출을 허용하지만 access smoke는 금지 | roleCode를 원천 기능으로 계산하거나 승인 없이 제거 금지 | visible field 보존, intentional extension으로 문서·verifier만 하나의 계약으로 정합화 |
| F-03 reports runtime 400 | DTO query에 validation decorator가 없어 whitelist가 year 등 모두 거부 | 단순 browser/network 일시오류 아님 | DTO validation과 controller E2E, OpenAPI/runtime 계약 수정 |
| F-04 route/content 불일치 | CRM/DMS direct settings URL redirect, CRM `/settings`와 persisted tab content 어긋남 | “MDI이므로 정상”으로 완료 처리 금지 | URL-first route restoration, 기존 menu/tab 보존 |
| F-05 host/proxy mismatch | mapped host port origin은 server CORS/build 표준 port와 달라 403/refused | 로그인 자체 결함으로 단정 금지 | production env/config matrix와 standard-origin fresh run |
| F-06 DMS WebSocket warning | DMS가 `ws://localhost:4000`에 반복 연결 실패 | page error 0을 warning 0으로 과장 금지 | runtime public WS URL contract 점검 |

## 6. readiness 상태 계약

| 상태 | 의미 |
|---|---|
| `ready` | 현재 required dependency와 domain invariant가 모두 통과했고 snapshot이 유효 기간 안에 있음 |
| `degraded` | 업무 계속 가능하나 operator 확인 항목 존재 |
| `blocked` | 필수 값/권한/dependency/contract가 없어 launch 또는 대상 실행 불가 |
| `not-required` | 해당 provider/연동이 현재 배포 구성에서 명시적으로 비활성 |
| `unknown` | probe 실패, stale snapshot, 권한 부족 등으로 판정 불가. 절대 `ready`로 fallback하지 않음 |

owner readiness 응답은 최소 `owner`, `snapshotId`, `checkedAt`, `expiresAt`, `refreshWindowSeconds`, `source`, `status`, `reason`, nullable count, `ownerHref`를 제공한다. 세부 check가 있는 owner는 check key/state/reason도 함께 제공한다. Admin bridge는 fresh owner app 값을 재해석하지 않고 동일 snapshot을 전달하며, probe 실패·만료·연결 불가는 `unknown`과 `null` count로 표시한다. 상세 계약은 [CRM·DMS·Admin 런칭 readiness snapshot 계약](../reference/crm-readiness-snapshot-contract.md)을 따른다.

## 7. 권한 권고안

기존 role과 visible `roleCode`는 보존한다. 권한 판정은 permission code를 정본으로 하며 role label을 직접 분기 조건으로 추가하지 않는다.

| 행위 | viewer | user | manager | admin |
|---|---:|---:|---:|---:|
| CRM 원장 조회/Preview | allow | allow | allow | allow |
| opportunity/contract/plan/cost draft mutation | deny | allow | allow | allow |
| confirm/reopen/version/retry | deny | 조건부 | allow | allow |
| CRM operations live read | safe summary만 | allow | allow | allow |
| CRM settings write/history | deny | deny | deny 또는 정책상 read | allow |
| Admin account/org/role/code/year mutation | deny | deny | deny | allow |
| DMS system readiness/settings | deny | deny 또는 personal만 | 정책상 제한 | allow |

정확한 `user` confirm 범위는 현재 seed/API 계약을 기준으로 Phase 2 시작 전 target test에서 고정하며, 브라우저와 API가 다르면 더 제한적인 쪽으로 fail closed한다.

## 8. 외부 입력 계약

### EXT-01 seller legal profile/CI

필요 입력: 확정 법인명, 대표자명, 사업자등록번호, 주소, 전화, e-mail, 현재 upload API가 실제 수용하는 5MB 이하 PNG/JPEG/GIF/WEBP CI binary. 제공 주체와 적용 환경이 확인되어야 하며 secret이 아니다. 임시값으로 readiness를 녹색으로 만들지 않는다.

실제 값과 asset이 아직 제공되지 않은 것은 구현 누락으로 채울 대상이 아니다. 이는 구현 잔여가 아니라 배포 입력 상태이며, 기능 패리티 검증에는 disposable synthetic 값만 사용하고 최종 런칭 판정에서는 `EXT-01` blocker로 별도 표시한다.

S15는 [외부 입력 적용·실환경 런칭 검증 가이드](../guides/go-live-external-inputs.md)의 승인 packet으로 owner/approval, 법인 필수값, CI MIME/size/SHA-256을 고정한다. `verify:crm-go-live:input`이 production env와 packet을 먼저 검증하고, 적용 뒤 `verify:crm-go-live`가 live seller API/CI와 승인값을 exact 대조해 `PASS_LIVE_API_READY`까지만 기록한다. `verify:crm-go-live:final`이 같은 release의 DMS 5-track FINAL GO, 24시간 이내 Playwright CLI desktop/mobile 12 surface와 견적 PDF·DMS DOCX/PDF hash를 API evidence에 결합해야만 `finalGoLive: true`다.

### EXT-02 production endpoint/credential

필요 시 DMS storage/Git, OAuth/SSO, 선택 provider credential은 환경 소유다. 문서에는 변수명·owner·검증법만 기록하고 값은 기록하지 않는다.

검증용 관리자 credential도 packet이나 evidence에 넣지 않고 process environment로만 주입한다. live API evidence는 API/database readiness, CRM/Admin/DMS release identity, CRM·DMS owner와 Admin bridge `ready`, blocker/degraded 0을 요구하며 `credentialsStored: false`를 기록한다. 최종 browser evidence는 서로 다른 fresh context, logout/session 삭제, 고유 snapshot/screenshot, 오류·overflow 0과 실제 artifact binary를 추가로 요구한다.

## 9. 완료 기준

운영 성숙도는 다음을 모두 만족해야 닫힌다.

1. `OPS-01~17`의 `부분/누락`이 0이다.
2. `EXT-*`는 실제 값이 없으면 명시적인 외부 blocker로 남고 Goal을 complete로 바꾸지 않는다.
3. 정상/deny/실패/복구가 실제 DB/API와 desktop/mobile browser에서 같은 결과를 낸다.
4. 예상 밖 4xx/5xx, proxy/API failure, console/runtime error, 권한 불일치가 0이다.
5. migration/runtime/OpenAPI/docs/build/security/residue gate가 모두 통과한다.
6. DMS readiness와 roleCode verifier finding이 사용자-visible 동작 삭제 없이 닫힌다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-24 | S15 live API 성공을 `PASS_LIVE_API_READY`로 한정하고 Playwright CLI desktop/mobile 12 surface와 견적 PDF·DMS DOCX/PDF hash까지 검증한 경우만 `CRM-S15-FINAL-GO-LIVE` PASS를 내도록 최종 evidence gate 추가 |
| 2026-08-24 | S15 외부 입력 승인 packet과 production env/input/live verifier를 추가. 현재 CI upload 계약을 PNG/JPEG/GIF/WEBP 5MB 이하로 명확히 하고 live seller field·CI hash, release identity, CRM/DMS owner·Admin bridge ready를 credential 저장 없이 검증하도록 고정. 실제 EXT-01/02 값은 계속 외부 입력 대기 |
| 2026-08-21 | S13에서 BT-24 clean/populated/failed migration rollback·restore와 drift/residue 0, BT-25 23 suite·171 test·4개 production build·5 OpenAPI/458 operation·security high/critical 0, BT-26 격리 DB/runtime/process 파기와 residue 0을 통과해 OPS-15~17을 완료 처리. 운영 성숙도 OPS-01~17은 17/17이며 실제 런칭의 EXT-01/02는 외부 입력으로 유지 |
| 2026-08-20 | S11에서 CRM settings alias와 source link, DMS settings→root URL-first 복귀, MDI URL sync를 수정했다. standard/approved-mapped origin의 login/API/Socket.IO/deep-link와 미승인 origin fail-closed, desktop/mobile E0를 통과해 OPS-01/10/14와 BT-17/23을 완료 처리 |
| 2026-08-19 | S9에서 CRM/DMS owner readiness와 Admin bridge를 공용 snapshot identity, 5초 refresh window, 30초 expiry, `unknown/null` failure 계약으로 정합화하고 OPS-04/13을 완료 처리. OPS-10은 settings route와 전체 recovery가 남아 부분 유지 |
| 2026-08-19 | S10에서 stable correlation·owner/source recovery link·server retryability·원본 실패 보존을 적용하고 actual 실패→원인 수정→재시도→repeat 409·artifact hash 불변·cleanup residue 0을 통과했다. 합성 secret의 response/error/log/viewer/OpenAPI/UI leak 0으로 OPS-06/09/12를 완료 처리하고 OPS-10의 남은 direct-route 범위는 S11에 유지 |
| 2026-08-14 | DMS 기능 복제와 운영 동급성을 분리하고 18개 운영 분모, SDD 소유 경계, readiness 상태 계약, DMS 시간 기반 모순·roleCode verifier 충돌·reports/route/runtime finding을 재기준화 |
