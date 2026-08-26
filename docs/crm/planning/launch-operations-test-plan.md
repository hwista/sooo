# CRM 원천 패리티·동시 런칭 Ralph 테스트 명세

> 기준일: 2026-08-14  
> 상태: Phase 2 실행 명세. 각 slice의 fresh 증거를 해당 BT 아래와 실행 원장에 누적한다.  
> 원칙: DOM 존재나 200 한 번으로 완료하지 않고 실제 DB 저장·재조회·상태·권한·실패·복구·정리를 함께 증명한다.

## 1. 실행 환경과 격리

| 항목 | 계약 |
|---|---|
| runtime | production build로 CRM `3001`, Admin `3000`, DMS `3003`, API `4000`의 표준 origin을 사용한다. mapped test port를 쓸 경우 CORS/public API/WS URL을 같은 origin matrix로 명시한다. |
| DB | production 데이터가 아닌 isolated DB 또는 transaction-safe disposable dataset. 원천 seed는 read-only baseline으로 취급한다. |
| DMS | isolated volume/repository namespace와 disposable template/artifact prefix를 사용한다. |
| test prefix | `RALPH_CRM_<run-id>`를 사용자·조직·코드·계획·계약·artifact·attempt에 공통 사용한다. |
| 역할 | 최소 viewer, user, manager, admin 4개 실제 계정. 역할별 독립 browser context와 session을 사용한다. |
| viewport | desktop 1440×1000, mobile 390×844. 표/MDI는 필요하면 내부 scroll을 허용하되 document-level overflow는 0이어야 한다. |
| 증거 | 각 TC에 screenshot, trace 또는 video, network HAR/요약, console/pageerror, API response, DB before/after, cleanup query를 run manifest에 연결한다. |

원천 기준선:

- 영업기회 6 group / 7 version row / 53 line.
- 계약 5 / contract line 44 / billing plan 35 / billing actual 5.
- 원천 계정은 6개지만 중앙 Admin 계정 수와 동일하게 만들지 않는다. 원천 표본 identity mapping을 별도 manifest로 증명한다.

## 2. 모든 browser TC에 적용되는 실패 게이트

아래 `E0`는 표의 모든 BT 항목에 각각 적용한다.

| 코드 | 수집 방법 | 성공 조건 |
|---|---|---|
| E0-C | browser console 수집 | 관련 console error 0. known warning도 allowlist와 원인을 명시하지 않으면 실패 |
| E0-R | Playwright `pageerror`, unhandled rejection, hydration/runtime overlay | 0 |
| E0-A | 해당 flow의 API 및 Next proxy response | 예상된 deny 401/403/validation 4xx만 명세대로 허용. 그 외 4xx/5xx 0 |
| E0-P | `requestfailed`, `ERR_CONNECTION_REFUSED`, local proxy diagnostic | 0 |
| E0-U | route/content marker | URL, breadcrumb, selected tab, page title가 같은 상태를 가리킴 |
| E0-M | mobile layout | document horizontal overflow 0, 핵심 action keyboard/touch 접근 가능 |

실패 주입 TC는 의도한 한 request의 실패만 허용하며, UI가 그 실패를 정확히 표시하고 복구 후 E0가 다시 0이 되어야 PASS다.

## 3. 원천 패리티 browser test spec

### BT-01 로그인·세션

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/login` |
| 역할/seed | 유효 user, 잘못된 password, 30분 경계 session |
| 조작 | password 표시/숨김, 아이디 저장 선택 후 reload, 잘못된 로그인, 정상 로그인, 활동 후 session 연장, 31분 idle snapshot으로 API 호출 |
| 기대 화면 | source-compatible controls가 보이고 저장 ID만 복원. invalid credential 명시. 정상 후 `/`, idle 후 `/login?returnTo=...` |
| API/proxy | `/api/auth/login`, session/me proxy. 정상 2xx, invalid/idle은 명세된 401. secret/credential response·log 노출 없음 |
| 범위 | desktop/mobile + E0 |

S7 실행 증거(2026-08-19): CRM opt-in password 표시/숨김과 ID 저장을 actual browser에서 확인했다. 실패 login은 ID를 저장하지 않았고 정상 login 뒤 reload는 ID만 복원했다. 격리 DB에서 2분 session은 200과 `lastSeenAt` 연장, 31분 session은 명세된 401과 `/login?returnTo=...` 이동을 보였다. password/token은 저장·출력하지 않았고 명시적 auth audit activity가 공통 column fallback에 덮이지 않도록 회귀 계약을 추가했다. desktop/mobile production build와 390×844 overflow 0, mobile password action 44px를 확인했다. 비인증 bootstrap의 명세된 session 401 외 예상 밖 proxy/runtime 오류는 없었다.

### BT-02 개인 프로필

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM 공용 `/settings`의 개인 설정 |
| 역할/seed | user, 원래 profile snapshot |
| 조작 | name/dept/position/tel/email 저장·reload, 현재 password 오류, 새 password mismatch, 정상 변경, 새 session 로그인, 원복 |
| 기대 화면/route | `/settings`와 개인 설정 content 일치. 성공/검증 오류가 field 단위 표시 |
| API/proxy | profile/password API 2xx, 잘못된 password는 예상 4xx, 다른 session revoke 확인 |
| 범위 | desktop/mobile + E0 |

S7 실행 증거(2026-08-19): name/dept/position/tel/email/display name을 저장·reload하고, 전화번호 빈 문자열 clear가 실제 DB 재조회에서도 유지됨을 확인했다. 새 password mismatch와 잘못된 현재 password를 명시적으로 표시했고, 정상 password 변경 후 기존 다른 session이 401/revoke되는 것을 확인한 뒤 원래 password와 profile을 복원했다. mobile 390×844에서 document overflow 0과 공용 `pageAction` 36px 리듬 보존을 확인했다.

### BT-03 Admin 사용자·코드·사업년도·회사정보 bridge

| 필드 | 명세 |
|---|---|
| 시작 URL | Admin `/users`, `/codes`, `/business-years`; CRM `/quote-settings` |
| 역할/seed | admin, viewer, disposable user/code/year, 원래 seller snapshot |
| 조작 | user CRUD/deactivate/reactivate/reset, code/year CRUD와 CRM selector 반영, seller 값/CI disposable 저장·문서 preview·원복 |
| 기대 화면/route | 각 직접 URL 유지. viewer write deny. CRM selector는 active만 반영. seller/CI는 reload 후 같음 |
| API/proxy | Admin/Auth/CRM settings API의 allow 2xx, deny 403, stale/duplicate validation 명세 일치 |
| 범위 | desktop/mobile + E0 |

S7 실행 증거(2026-08-19): Admin UI에서 disposable viewer를 생성·수정·비활성·재활성하고 reset mail을 요청했다. viewer Admin 직접 URL은 명시 fallback, direct write는 403이었으며 비활성화 시 기존 session은 401이었다. disposable payment code와 2099년을 생성·수정·활성/비활성하고 CRM selector가 active row만 소비함을 확인한 뒤 영구 삭제했다. 기존 2026년 중복은 client가 `이미 등록된 사업연도입니다.`로 차단했고 `payment_term/NET30` 중복은 server 409를 `동일한 코드 유형과 코드값이 이미 존재합니다.`로 표시했다. Admin desktop/mobile document overflow는 0이었고 `/favicon.ico` compatibility rewrite 적용 후 fresh browser에는 비인증 bootstrap의 예상 401 외 favicon/network 오류가 없었다. 검증 사용자는 최종 비활성·active session 0으로 정리했다.

### BT-04 홈 집계·상태·최근 항목

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/` |
| 역할/seed | viewer, source opportunity baseline |
| 조작 | source 확정 지표와 platform current 지표 확인, 상태별 건수, 최근 항목 클릭, refresh |
| 기대 화면/route | source-compatible 지표는 최신차수 중 확정만 계산. 기존 platform metric/queue는 보존. 클릭 route가 선택 id를 가리킴 |
| API/proxy | `/api/crm/dashboard`, `/api/crm/opportunities`; UI 값과 DB query가 정확히 일치 |
| 범위 | desktop/mobile + E0 |

S5 실행 증거(2026-08-18): source baseline 최신 group 6·확정 최신차수 3, 매출 694,650,000원·이익 198,080,000원·이익률 29%, 진행중 2·검토중 1·계약완료 2·실패 1, 최신 수정순 5건을 isolated DB query·actual API·desktop/mobile UI에서 동일하게 확인했다. 기존 SSOO metric/pipeline/queue는 별도 영역에 유지했다. target unit 2 suite·36 test와 production build, fresh authenticated browser E0를 통과했다. BT-04의 기능 분모는 S5에서 닫았지만 UX-01의 overlay/state-pair 조건은 BT-27에 남는다.

### BT-05 영업기회 CRUD·필드·차수·계산

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/` |
| 역할/seed | user/manager/viewer, disposable full-field opportunity |
| 조작 | 검색/status/revenue/margin 정렬, 이전차수 조회, 5개 line·client contact·owner·분류·수금·DC 저장/reload, confirm, deny edit, add version, previous read-only, reopen, latest delete |
| 기대 화면/route | 선택 query가 유지되고 모든 값/합계가 재조회 후 동일. viewer mutation disabled/403. previous version 잠금 |
| API/proxy | opportunities list/detail/upsert/confirm/reopen/versions/delete 2xx; 명세된 deny 403/guard 400 외 실패 0 |
| 범위 | desktop/mobile + E0 |

S5 실행 증거(2026-08-18, 목록 subset): 고객명 기본 정렬, 원천 4상태 filter, 매출·이익·이익률 정렬, 12개 원천 column, `2차 → 1차(이전)` inline 조회를 actual API와 1440×1000/390×844 browser에서 확인했다. filter/sort query와 선택값은 navigation 뒤에도 유지되고 mobile document overflow와 authenticated console error/warning은 0이었다. 이는 `SRC-07`과 IMP-04 목록 범위만 닫으며 BT-05의 CRUD·5 line·확정/해제/삭제 전체 fresh 회귀와 UX-02/03 BT-27은 계속 미완료다.

### BT-06 견적 preview·인쇄·artifact

| 필드 | 명세 |
|---|---|
| 시작 URL | `/?selected=<source-or-disposable-id>` |
| 역할/seed | user, seller profile/CI, DC·절사 포함 opportunity |
| 조작 | preview, print popup/PDF, DMS draft/artifact 생성, reload/download |
| 기대 화면/route | 고객/건명/담당/상품·용역/DC/합계/공급자 값 정확. popup와 원 route 유지. downloaded file 재개방 |
| API/proxy | quote-preview, DMS draft/lifecycle/artifact endpoints 2xx, variables와 DB total 일치 |
| 범위 | desktop/mobile preview, desktop print/download + E0 |

### BT-07 계약 회수·확정취소 복구

| 필드 | 명세 |
|---|---|
| 시작 URL | confirmed opportunity detail |
| 역할/seed | manager, 연결된 unconfirmed contract |
| 조작 | 회수 confirmation cancel, 다시 열어 confirm, contract soft delete/link revoke, opportunity 상태/차수/계약 재생성 가능 여부 확인 |
| 기대 화면/route | cancel 시 변화 0. confirm 시 contract 미노출, opportunity confirmed 복구, add-version/contract-create 활성. 감사 이력 표시 |
| API/proxy | 단일 transactional recovery endpoint 2xx. 중간 실패 주입 시 둘 다 rollback. repeat는 idempotent/409 |
| 범위 | desktop/mobile + E0 |

### BT-08 원천 22변수 계약서

| 필드 | 명세 |
|---|---|
| 시작 URL | confirmed opportunity detail의 계약서 생성 진입점 |
| 역할/seed | user, 22 placeholder DOCX, seller legal disposable values, owner dept/tel/email |
| 조작 | template 선택, preview variable list, 초안 저장, DOCX 생성·재다운로드, unzip/reopen해 22개 치환과 미인식 placeholder 확인 |
| 기대 화면/route | 입력 source가 confirmed opportunity임을 표시. 22개 값/날짜/한글 금액 정확. 기존 contract DMS packet flow는 그대로 존재 |
| API/proxy | DMS template/runtime/artifact API 2xx. binary hash/path/source id/history 일치 |
| 범위 | desktop/mobile preview·생성·download + E0 |

### BT-09 계약 core·line·청구계획

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/contracts` 또는 confirmed opportunity conversion |
| 역할/seed | user/manager/viewer, client contact와 owner user 포함 opportunity |
| 조작 | convert, core fields/5 line/WBS/payment 저장·reload, auto split, 합계 validation, confirm/reopen/delete |
| 기대 화면/route | client contact와 owner identity가 이름 snapshot과 함께 보존. billing 합계 정확. viewer deny |
| API/proxy | contract upsert/detail/split/confirm/reopen/delete. DB FK와 history 확인 |
| 범위 | desktop/mobile + E0 |

### BT-10 청구실적·계약대비실적

| 필드 | 명세 |
|---|---|
| 시작 URL | `/contracts?selected=...`, `/contract-performance?year=...` |
| 역할/seed | user/manager, confirmed source/disposable contract |
| 조작 | monthly actual full replace/reload, invalid year/month, reopen lock, filters/search, monthly plan/actual/diff 확인 |
| 기대 화면/route | confirmed일 때만 저장, invalid field 표시, performance 합계=DB, route filter 유지 |
| API/proxy | billing actual, monthly performance 2xx; invalid 명세 400; 그 외 E0 |
| 범위 | desktop/mobile + E0 |

### BT-11 사업계획 core·차수·paste

| 필드 | 명세 |
|---|---|
| 시작 URL | `/business-plan?year=...` |
| 역할/seed | user/manager/admin/viewer, disposable draft |
| 조작 | row CRUD, 12개월+2연도 저장/reload, TSV paste/invalid, confirm/reopen, next version, carryover, previous read, confirmed WBS edit, admin delete |
| 기대 화면/route | 차수/잠금/예외 규칙과 합계가 source code와 일치. viewer deny |
| API/proxy | business-plan plans/versions/lines/confirm/reopen/carryover 2xx; role deny 403 |
| 범위 | desktop/mobile + E0 |

### BT-12 사업계획대비실적 semantic

| 필드 | 명세 |
|---|---|
| 시작 URL | `/business-plan-performance?year=...` |
| 역할/seed | viewer, confirmed plan, billing plan과 billing actual이 의도적으로 다른 contract |
| 조작 | source-compatible mode 선택, filter, WBS monthly row 확인; 기존 actual/manual view도 확인 |
| 기대 화면/route | source mode “실적”=billing plan. 기존 billing actual/manual surface는 label을 유지하며 삭제되지 않음 |
| API/proxy | source comparison response와 DB billing plan exact match; current extended response도 2xx |
| 범위 | desktop/mobile + E0 |

S6 실행 증거: 격리 DB에서 2026년 확정 계약 청구계획 18행의 매출/외부원가 합계는 913,500,000원/535,700,000원, 청구실적 1행 합계는 150,000,000원/111,900,000원이었다. `source-compatible` API/UI는 전자를 실적으로, `extended-actual`은 후자를 기존 확장과 함께 사용했다. 최초 종료 점검에서 나온 server component→client query helper RSC 예외는 순수 query 모듈 분리 후 새 production build에서 직접 URL과 강제 새로고침으로 재현 0을 확인했다. desktop 1440px와 mobile 390×844에서 source mode URL·선택값·직접실적 패널 부재, extended mode의 기존 직접실적 패널 보존, console error/warning 0과 overflow 0을 확인했다. BT-12 slice 증거는 PASS이며 전체 BT-24/27 fresh 회귀는 남아 있다.

### BT-13 내부원가·AMS

| 필드 | 명세 |
|---|---|
| 시작 URL | `/cost-plan?year=...` |
| 역할/seed | user/manager/viewer, disposable 5-item values, vendor+2 WBS |
| 조작 | 5개 item monthly plan/actual paste/reload, vendor CRUD, WBS replace, AMS monthly paste, confirm/reopen/delete guard |
| 기대 화면/route | plan-actual 차이 source semantics, vendor×WBS 값/합계 정확, viewer deny |
| API/proxy | internal/AMS source grid APIs, DB unique/FK/history 확인 |
| 범위 | desktop/mobile + E0 |

### BT-14 seller 외부 입력 dry run

| 필드 | 명세 |
|---|---|
| 시작 URL | `/quote-settings`, `/operations` |
| 역할/seed | admin/user, 별도 disposable seller snapshot. 실제 법인값은 사용자가 제공한 경우에만 사용 |
| 조작 | 필수값/CI 없을 때 blocker, disposable 유효값에서 ready, quote/contract document 소비, 원복 |
| 기대 화면/route | placeholder를 실제값으로 과장하지 않음. 원복 후 원 상태와 revision 일치 |
| API/proxy | seller/CI storage ref/readiness API. binary raw/secret 노출 없음 |
| 범위 | desktop/mobile + E0 |

S7 실행 증거(2026-08-19): 원래 seller snapshot을 먼저 고정하고 disposable 법인 필드 전체와 PNG CI를 업로드해 `configured`로 저장·reload했다. 견적 preview는 같은 seller/profile status를 소비했고 원천 계약 22변수의 공급자 5개 값이 `seller-profile` source로 일치했다. 확정 계약 DMS preview는 CI storage adapter를 `verified`, seller CI attachment와 전체 문서 readiness를 `ready`로 판정했다. 이후 회사명 `SSOO 영업팀`, optional field 공란, `dms-planned`, 빈 CI ref와 원래 memo로 복원했다. 실제 운영 법인값과 CI는 EXT-01로 계속 분리한다.

### BT-15 역할 matrix

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM 17개 치환 surface, Admin users/codes/years/roles, DMS settings |
| 역할/seed | viewer/user/manager/admin 독립 context |
| 조작 | menu, direct URL, deep link, button, API 직접 요청의 read/write/confirm/retry/settings 조합 |
| 기대 화면/route | UI disable/hide와 API allow/deny 동일. 권한 부족은 명시 fallback, 데이터 leakage 없음 |
| API/proxy | allow 2xx, deny 403. roleCode 값은 보존되지만 permission 판정의 직접 source가 아님 |
| 범위 | desktop/mobile + E0 |

### BT-16 원천 seed·idempotency

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/`, `/contracts`; Admin identity mapping report |
| 역할/seed | clean isolated DB에 source seed 1회/2회 |
| 조작 | migration+seed, counts/value hash, second seed, browser sample inspection |
| 기대 화면/route | 6/7/53, 5/44/35/5 유지. duplicate 0. 중앙 사용자와 source identity mapping이 명시됨 |
| API/proxy | list/detail API와 DB counts/value snapshot exact match |
| 범위 | desktop/mobile + E0 |

S8 실행 증거(2026-08-19): `ssoo_crm_ralph_20260819_s8` clean runtime에서 CRM permission 25개, active 역할 할당 admin 25/manager 21/user 14/viewer 8, 전체 역할 할당 120건을 확인하고 access seed를 두 번 적용한 뒤에도 건수가 동일했다. Admin catalog의 25개 CRM permission은 모두 `launch-active`였다. 실제 API는 viewer read 200/write 403, user write 2xx/confirm 403, manager confirm·reopen 2xx, admin 14/14 capability를 반환했다. AMS disposable 흐름은 source 업체 생성·확정 AMS WBS 2개·계획/실적 각 24셀·저장/reload/cascade delete와 extended monthly 저장·확정·확정 중 수정 400·해제·재저장을 통과했고 residue는 0이었다. user desktop browser에서 업체 생성, WBS 2개 선택, 실제 paste event 각 24셀, 저장·reload exact 값, 연관 원가 삭제 경고와 삭제를 확인했다. viewer read-only, manager confirm 가능/공급자 설정 read-only, admin 공급자 설정 edit 가능을 fresh context로 확인했고 390×844 overflow와 네 역할 page console error는 0이었다. source sample gate는 opportunity 6/7/53, contract 5/44/35/5의 고정 hash와 combined hash, 두 번 reseed 동일성, source 6 account→central 8 account functional alias를 통과했다. BT-13/15/16 slice 증거는 PASS이며 BT-24/27 최종 fresh 전체 회귀는 계속 남는다.

## 4. 운영·실패·복구 browser test spec

### BT-17 route·오류·빈 상태

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/operations/settings`, `/settings`, `/reports`; DMS `/settings/operations/git` |
| 역할/seed | admin/viewer, empty dataset, error dataset |
| 조작 | fresh context direct load, internal menu load, back/forward/reload, reports query/filter, empty state |
| 기대 화면/route | URL/breadcrumb/tab/content 일치. `/reports` 2xx와 실제 totals. empty가 오류/ready로 변환되지 않음 |
| API/proxy | settings/reports/DMS runtime API. 예상 밖 4xx/5xx 0 |
| 범위 | desktop/mobile + E0 |

S11 실행 증거(2026-08-20): CRM `/operations/settings`와 `/settings`를 fresh state에서 직접 열고 reload해 URL·`CRM 시스템 설정` tab·heading이 일치함을 확인했다. sidebar에서 `/reports`와 설정을 열면 URL이 같이 변경되고 browser back/forward가 해당 tab/content를 정확히 복원했다. 종료 로그에서 발견한 `/reports` server→client query helper RSC 오류는 순수 `reportsPreviewQuery.ts`로 분리한 새 build에서 direct HTTP 200, authenticated reload 200, server/console 오류 0으로 폐쇄했다. operation 실패 원장의 영업기회 source href는 미지원 `/opportunities`에서 실제 workspace `/?selected=...`로 수정했다. DMS `/settings/operations/git`은 direct/reload 후 설정 content를 유지하고 `/`로 back 시 `문서 관리 시스템` home content, forward 시 Git 운영 content를 복원한다. desktop 1280과 mobile 390에서 예상 밖 4xx/5xx·console error/warning 0, document overflow 0이다. BT-17은 PASS다.

### BT-18 책임 경계

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/operations`, contract/quote DMS panels, Admin launch summary, DMS settings |
| 역할/seed | admin/user, DMS/PMS/accounting enabled/disabled matrix |
| 조작 | 각 dependency owner link, not-required state, unsupported action 안내 확인 |
| 기대 화면/route | CRM에 Git/storage/ingest form 없음. Admin에 CRM 도메인 form 없음. disabled 선택 provider=`not-required` |
| API/proxy | dependency readiness source/reason/ownerHref 일치 |
| 범위 | desktop/mobile + E0 |

### BT-19 CRM/DMS/Admin readiness 일관성

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/operations`, Admin `/`, DMS settings owner page |
| 역할/seed | admin, 동일 runtime, ready/block/stale probe 3종 |
| 조작 | 같은 시간 window에 세 surface refresh, probe 상태 전환, cache expiry, recovery refresh |
| 기대 화면/route | snapshot id/checkedAt/source/state/reason이 동일. probe 실패는 unknown, 0/0 또는 ready fallback 금지 |
| API/proxy | owner readiness와 Admin aggregate response 일치. 의도한 probe failure 외 E0 |
| 범위 | desktop/mobile + E0 |

S9 실행 증거(2026-08-19): `ssoo_crm_ralph_20260819_s8` 격리 runtime에서 CRM owner `/crm/operations/launch-readiness`, DMS owner `/dms/settings/readiness`, CRM/DMS web proxy, Admin `/api/launch-readiness`를 같은 5초 window에 조회해 `snapshotId`, `checkedAt`, `expiresAt`, `source`, `status`, `reason`, blocker/degraded/total count, `ownerHref`가 exact match함을 확인했다. cache/in-flight coalescing과 settings/retry invalidation unit test, stale/malformed normalizer는 `unknown/null`을 통과했다. desktop에서 CRM과 DMS owner ID가 Admin card와 일치했고, 30초 만료 후 세 surface가 `확인 불가`와 숨김/`—` count로 바뀌며 refresh 뒤 새 snapshot으로 복구됐다. 실제 server를 중단했을 때 Admin의 CRM/DMS card 모두 `admin.bridge.unavailable`, `unknown/null`, `upstream 연결에 실패했습니다.`를 표시했고 재기동·refresh 뒤 live owner snapshot으로 복구됐다. Admin/DMS/CRM mobile 390×844 document overflow는 0, 세 surface console error/warning은 0이었다. BT-19는 PASS다.

### BT-20 설정 revision·rollback

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM settings owner page |
| 역할/seed | admin, original revision/value, two browser contexts |
| 조작 | save/reload, concurrent writer, stale save, history, rollback/원복 |
| 기대 화면/route | revision 증가, stale 409, before/after/actor, 원값 복원 |
| API/proxy | settings GET/PATCH/history 2xx, stale만 409, secret masked |
| 범위 | desktop/mobile + E0 |

### BT-21 failure ledger·retry·manual recovery

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM `/operations`와 대상 quote/contract flow |
| 역할/seed | manager/admin, disposable failure target |
| 조작 | isolated failure 주입, attempt 확인, owner link 이동, 원인 수정, confirm retry, repeat retry |
| 기대 화면/route | 원본 실패 보존, sanitized reason/actor/time/correlation, recovered chain 표시, repeat 차단, 중복 artifact 0 |
| API/proxy | attempt list/detail/retry와 target API. 의도 실패 1건, recovery 2xx, repeat 409 |
| 범위 | desktop/mobile + E0 |

S10 실행 증거(2026-08-19): `ssoo_crm_ralph_20260819_s8`에서 최신 확정 영업기회 3의 초안 없는 견적 DMS lifecycle을 의도적으로 `400` 실패시켰다. attempt `#6`은 sanitized 원인, actor `1`, timestamp, DMS owner `/settings/operations/git`, 당시 CRM source `/opportunities?selected=3`, stable correlation을 기록했다. DMS markdown 초안을 실제 생성해 원인을 수정한 뒤 retry `#7`이 같은 correlation로 성공했고, 원본 `#6`은 `failed`와 원인을 그대로 보존하면서 `recovered`로 집계됐다. 집계는 **미복구 0/복구 1**이다. repeat retry는 `409`, attempt 추가 0, DOCX/PDF hash 불변, 생성 파일은 5개였다. desktop 1280과 mobile 390에서 원본 실패·correlation·owner/source link·복구 완료를 확인했고 document overflow와 console error는 0이었다. browser 증거 후 attempt/history/handoff/AI job/file residue를 모두 0으로 정리했다. 이때 표시만 확인하고 실제 route 지원 여부를 놓친 source href는 S11에서 `/?selected=3`으로 보정하고 direct load했다. BT-21은 PASS다.

### BT-22 secret masking·감사

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM/DMS settings, Admin auth policy/readiness |
| 역할/seed | admin/viewer, synthetic credential marker in env-owned test config |
| 조작 | GET/history/error/log/download/OpenAPI 확인, viewer direct API |
| 기대 화면/route | marker/raw connection string/token/password 0건. viewer는 secret 존재 여부도 정책 이상 노출하지 않음 |
| API/proxy | response body/header/log grep 및 OpenAPI schema audit |
| 범위 | desktop/mobile + E0 |

S10 실행 증거(2026-08-19): 공용 recursive redactor를 HTTP exception message/request URL, CRM attempt error/evidence, DMS config error/logger metadata에 적용했다. `crm-s10-secret-marker`를 query, DMS immutable Git remote userinfo, invalid Bearer token에 넣고 CRM/DMS settings·history·readiness·attempt, Admin readiness bridge와 OpenAPI를 검사했다. 관리자 surface 8개, error/Authorization/OpenAPI marker leak은 모두 0이었고 viewer DMS system config는 숨김, readiness는 `403`이었다. desktop/mobile UI marker leak과 console error도 0이며 redactor/filter/logger unit test를 통과했다. BT-22는 PASS다.

### BT-23 production origin·proxy·WebSocket

| 필드 | 명세 |
|---|---|
| 시작 URL | CRM/Admin/DMS standard production origin과 승인된 mapped origin |
| 역할/seed | admin/user |
| 조작 | login/session/API, deep links, DMS WebSocket 연결, reload/back/forward |
| 기대 화면/route | CORS/origin 허용 matrix와 일치, `localhost:4000` hard-code warning 없음, direct URL 유지 |
| API/proxy | requestfailed/refused/CORS/WS error 0 |
| 범위 | desktop/mobile + E0 |

S11 실행 증거(2026-08-20): `verify:crm-production-runtime-contract`와 production env verifier self-test를 통과했다. CRM approved mapped `127.0.0.1:3105→4105`, DMS standard `localhost:3003→4000`, DMS approved mapped `127.0.0.1:3113→4105`, Admin mapped `127.0.0.1:3100`에서 login/session/API/deep link를 실행했다. DMS Socket.IO는 standard `ws://localhost:4000`과 mapped `ws://127.0.0.1:4105`에서 각각 frames in 3/out 2, socket error 0이었다. public URL/CORS matrix에 없는 `127.0.0.1:3003` 로그인은 `허용되지 않은 요청 출처입니다.`로 fail closed했다. 승인 matrix의 예상 밖 4xx/5xx, console error/warning, CORS/refused/WS error는 0이다. BT-23은 PASS다.

## 5. 비브라우저 gate

### BT-24 DB migration/runtime

- clean DB migrate, populated baseline migrate, rollback/restore rehearsal.
- FK/unique/check/trigger/history/backfill contract.
- `pnpm run db:baseline:verify`, `pnpm run db:runtime:verify`, database contract test.
- failed migration 후 partial object/residue 0.

S13 완료(2026-08-21): BT-24 전용 격리 DB에서 clean deploy와 populated baseline backfill, 의도적으로 실패하는 migration의 transaction rollback, 설정 snapshot과 populated baseline의 exact restore를 실행했다. launch migration 10개, trigger 82개, schema drift 0, failed migration partial object 0, 종료 DB residue 0으로 `bt-24-database.json`은 `PASS_CLEANED`다.

### BT-25 repo/docs/build/security

- `pnpm run codex:preflight`
- `pnpm run codex:verify-sync`
- DMS 변경 시 `pnpm run codex:dms-guard`
- CRM target/unit/integration/verifier와 `pnpm run verify:crm-local`, `pnpm run verify:crm-launch`
- docs/OpenAPI regenerate 및 runtime operation/DTO validation 일치
- server, CRM, Admin, DMS 관련 production build
- `pnpm run security:audit`; production high/critical 0
- push 요청이 있을 때만 `pnpm run codex:push-guard`

S13 완료(2026-08-21): `record:crm-launch-repo-evidence`로 CRM local 23 suite·171 test, production runtime contract, server/CRM/Admin/DMS production build, docs와 common/CRM/DMS/PMS/SNS OpenAPI 5개 문서·458 operation, Codex sync/preflight, DMS guard, production audit를 한 실행 원장에 기록했다. 11개 check가 모두 PASS이고 high/critical vulnerability는 0이어서 `bt-25-repo-release.json`은 `PASS`다.

### BT-26 residue·환경 원복

검증 종료 후 다음 count가 0이어야 한다.

- `RALPH_CRM_<run-id>` 사용자/조직/role assignment/code/year/customer/activity/opportunity/contract/plan/cost/vendor.
- attempt/retry/history 중 정책상 보존하기로 한 evidence를 제외한 disposable row. 보존 evidence는 isolated DB 밖으로 이동하지 않는다.
- DMS template/document/artifact/file/storage ref와 isolated volume binary.
- password reset outbox/session/token.
- 임시 proxy/process/browser session/trace가 아닌 runtime process.
- 설정은 시작 revision의 값과 동등하고 seller profile/CI hash가 원복됨.

원천 seed count/value hash와 기존 사용자-visible 설정은 시작 전후가 같아야 한다.

S13 완료(2026-08-21): `verify:crm-test-isolation`이 파기 전 격리 DB·runtime root·임시 listener inventory와 hash를 기록했고, 정확한 대상만 파기한 뒤 `verify:crm-test-residue`가 DB 존재 false, DB row 0, runtime file 0, temporary port 0을 확인했다. `bt-26-residue.json`은 `PASS_CLEANED`이며 파기 전 감사 기록은 `bt-26-pre-destroy.json`에 남겼다.

### BT-27 원천 UI/UX 구조·시각 패리티

| 필드 | 명세 |
|---|---|
| 시작 URL | 원천 17개 page container와 대응 CRM/Admin/DMS owner surface |
| 역할/seed | 원천 baseline과 동일한 source/disposable state, viewer/user/manager/admin 중 화면 책임에 맞는 역할 |
| 조작 | 동일 viewport·state에서 원천/SSOO capture, section·field·column·action·label·default filter/sort/selection·dialog·잠금·empty/error 구조 diff, content-region screenshot overlay/perceptual diff |
| 기대 화면/route | 플랫폼 shell만 허용 차이로 분리. 업무 content의 누락·통합·재명명·순서·의미 변경 0. 차이는 `platform-required`, `responsive-only`, `source-bug-compatible`, `defect`로 모두 분류 |
| API/proxy | 대응 BT-01~23의 API/DB 결과와 visible 값이 동일. 원천 capture 생성 요청과 target 요청의 실패 0 |
| 범위 | 원천 desktop 1440×1000 + SSOO desktop 1440×1000/mobile 390×844 + E0. `UX-01~17` 누락·미분류·defect 0 |

상세 비교 기준과 허용/금지 변화는 [CRM 원천 UI/UX 패리티 명세](./source-uiux-parity-spec.md)를 따른다. `REF-01`이 없으면 이 TC는 `SKIP`이 아니라 `FAIL`이다.

S12 완료(2026-08-21): 기존 `verify:crm-goal-contract`는 REF-01 hash·분모·문서 상태를 검증했지만 target 상태 쌍을 강제하지 않았다. `verify:crm-uiux-parity`를 goal-contract에 연결하고 `verify:crm-uiux-parity:all`을 최종 gate로 추가했다. source 필수 상태는 누락됐던 견적 preview·print를 포함한 83개 독립 capture로 정정했다. `s12-iteration-22-full-83`에서 83/83 동일 state ID의 source, 고유 desktop/mobile target, 구조·interaction·visual diff, 허용 차이 분류와 E0를 단일 실행으로 검증했고 `verify:crm-uiux-parity:all`이 PASS했다. 따라서 BT-27과 UX 17/17은 완료다.

### S15 실제 배포 인수 판정

S15는 이미 통과한 데모 패리티 `SRC-01~28`, `UX-01~17` 및 운영 구현 `OPS-01~17`을 다시 산정하지 않는다. 아래 실제 외부 입력과 production 관측 증거를 모두 확인하는 별도 cutover gate다.

| 단계 | 필수 입력·조작 | 합격 조건 |
|---|---|---|
| 입력 packet | 승인 owner/approver, 법인명·대표자·주소·사업자등록번호·전화·이메일, CI PNG/JPEG/GIF/WEBP binary와 SHA-256 | `pnpm run verify:crm-go-live:input -- --packet=<approved.json> --env-file=<production.env>` PASS. packet 내부 credential key 0 |
| production 계약 | 실제 CRM/Admin/DMS/API HTTPS URL, 배포 release SHA, production compose env | 기존 production env verifier PASS, 네 endpoint의 release identity가 기대 SHA와 일치 |
| 인증·owner 상태 | secret manager가 검증 process에만 주입한 Admin login ID/password로 실제 로그인 | `verify:crm-go-live`가 `PASS_LIVE_API_READY`, `finalGoLive: false`, `browserRequired: true`를 기록. CRM seller profile·CI exact match, CRM/DMS owner `ready`, blocker/degraded 0, Admin bridge snapshot exact |
| 산출물 | fresh browser에서 견적 설정 확인, 견적 preview/print, CRM/Admin/DMS readiness, DMS DOCX/PDF lifecycle 실행 | schema 3 quote identity와 `subtotal - discount = total`을 고정하고, 승인 법인값·담당자·고객·영업기회·금액이 화면/인쇄 PDF/DMS DOCX/PDF에 일치. API snapshot identity·ready/0 blocker/0 degraded와 CRM/Admin/DMS 화면 문구, seller CI endpoint 요청·접근 가능한 CI image를 verifier가 직접 대조하고 수동 surface assertion은 거부. PDF parser·DOCX ZIP/XML 재열기, 미해결 placeholder 0, 예상 밖 4xx/5xx·console/runtime/API/proxy error 0 |
| 화면 회귀 | production CRM/Admin/DMS desktop 1440×1000, mobile 390×844 서로 다른 새 Playwright CLI context | viewport별 6개, 총 12개 고유 snapshot/PNG. PNG IHDR는 각 viewport exact, 세 production origin network 관측, 핵심 route·설정·readiness·견적 상태 결함 0, 24시간 이내 capture, release SHA와 API evidence hash 일치 |
| 종료 | logout, 임시 session/browser 정리, sanitized evidence 저장 | evidence에 `credentialsStored: false`; password/token/secret 값 및 법인 원문 미저장 |

입력·live API 검증은 `pnpm run verify:crm-go-live`가 fail-closed로 수행하지만 이것만으로 최종 PASS가 아니다. `pnpm run verify:crm-go-live:final`이 API evidence, 같은 release의 DMS 5-track `FINAL GO` evidence, Playwright CLI manifest, 12개 고유 화면 증거와 세 binary artifact를 다시 검증해 `CRM-S15-FINAL-GO-LIVE` PASS를 낸 경우만 S15를 통과한다. 실제 `EXT-01` 또는 `EXT-02`가 없거나 DMS final GO/production browser/artifact 증거가 누락되면 `SKIP`이나 부분 PASS가 아니라 **미실행/미통과**이며 Goal을 complete로 바꾸지 않는다. 실행 방법과 packet 계약은 [CRM S15 외부 입력·실환경 인수 가이드](../guides/go-live-external-inputs.md)를 따른다.

## 6. Ralph 반복과 종료 판정

각 implementation slice는 다음 순서를 지킨다.

1. 대응 `BT-*`에서 실패 증거를 고정한다.
2. 가장 작은 code/type/DB/API/UI/doc slice를 구현한다.
3. target test와 실제 DB/API allow/deny를 실행한다.
4. desktop/mobile 정상·실패·복구를 실행한다.
5. residue/설정 원복을 확인한다.
6. source/UX/operations matrix와 evidence manifest를 갱신한다.

최종에는 architect review, deslop review, deslop 후 전체 회귀, 완전히 새 browser context의 fresh run과 BT-27 source-reference 비교를 수행한다. P0/P1 결함, 예상 밖 4xx/5xx, API/proxy failure, console/runtime error, 권한 불일치, UX 미분류 차이, residue가 하나라도 있으면 Goal을 complete로 바꾸지 않는다.

S8에서 viewer/user/manager/admin의 domain permission별 새 browser context와 직접 API matrix를 닫았다. 다만 전체 17개 치환 surface의 모든 상태 조합은 S12~S13 최종 fresh 회귀에서 다시 폐쇄한다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-24 | S15 browser evidence schema 3에서 수동 surface assertion을 제거하고 API readiness snapshot identity와 CRM/Admin/DMS 접근성 snapshot, seller CI 요청·image를 직접 결합하는 음성 fixture를 추가 |
| 2026-08-24 | S15 browser evidence schema 2에 real-root path/symlink containment, PNG viewport exact, 세 production origin, quote 금액 산식·snapshot/artifact text, PDF/DOCX 재열기·placeholder 0과 음성 fixture를 추가 |
| 2026-08-24 | S15 API 검증을 `PASS_LIVE_API_READY`로 한정하고 서로 다른 Playwright CLI desktop/mobile context의 12개 고유 snapshot/PNG, 실패·overflow 0, 견적 PDF·DMS DOCX/PDF hash를 결합한 `CRM-S15-FINAL-GO-LIVE`만 최종 PASS로 인정 |
| 2026-08-24 | S15 실제 배포 인수를 데모 패리티와 분리하고 승인 법인/CI packet, production env·release identity, runtime-only 인증, CRM/DMS owner·Admin bridge, 견적 인쇄·DMS DOCX/PDF, fresh desktop/mobile, credential-free evidence를 모두 요구하는 fail-closed cutover gate로 고정 |
| 2026-08-21 | BT-24를 clean/populated/failed migration rollback·exact restore와 drift/residue 0으로, BT-25를 23 suite·171 test·4개 production build·5 OpenAPI/458 operation·security high/critical 0으로, BT-26을 격리 DB/runtime/process 파기 후 residue 0으로 통과 |
| 2026-08-21 | BT-27을 17개 화면·83개 source/desktop/mobile 상태 쌍, 구조·interaction·content visual diff, 분류·E0로 통과해 UX-01~17 완료 |
| 2026-08-19 | BT-21/22 S10을 actual failure→DMS owner cause fix→same-correlation retry, 원본 실패 보존, repeat 409·artifact hash 불변·duplicate/residue 0과 admin/viewer/error/log/OpenAPI/UI secret marker leak 0, desktop/mobile E0로 통과 |
| 2026-08-19 | BT-19 S9을 CRM/DMS owner·web proxy·Admin snapshot exact match, 5초 cache/30초 expiry, invalidation unit test, stale/malformed/probe failure `unknown/null`, 실제 server 단절·복구, desktop/mobile E0로 통과 |
| 2026-08-19 | BT-13/15/16 S8을 permission seed 2회 동일성, 네 역할 API/browser allow·deny, Admin live catalog, 원천 sample fixed hash/identity alias, AMS 업체·2 WBS·48셀 paste·확정 잠금·해제·cascade 삭제와 residue 0으로 통과. 전체 17 surface fresh 및 source UI/UX overlay는 BT-24/27에 유지 |
| 2026-08-19 | BT-01~03/14 S7을 actual auth session, profile/password revoke, Admin user/code/year allow·deny·중복, seller/CI 견적·계약 소비와 원복, desktop/mobile로 통과. 전체 role matrix와 source UI/UX overlay는 S8/S12에 유지 |
| 2026-08-18 | BT-12 S6를 실제 청구계획/청구실적 차이 DB, 두 API 모드, desktop/mobile E0로 통과. 전체 BT-24/27 fresh 회귀는 별도 유지 |
| 2026-08-18 | 원천 UI/UX 디자인 무변경을 검증하는 BT-27을 추가하고 source reference 누락을 SKIP이 아닌 FAIL로 고정 |
| 2026-08-14 | 원천 16개 핵심 flow와 운영 7개 flow를 start URL·역할/seed·조작·화면/API/route·desktop/mobile·console/runtime/API/proxy 게이트까지 재작성. DB/build/security/residue gate 분리 |
