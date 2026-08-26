# DMS·Admin 운영 완결성 Launch Ralph 계획 및 테스트 명세

> 기준일: 2026-08-14 KST
> 상태: 로컬 launch acceptance 완료 / 실제 프로덕션 GO 입력 대기
> 선행 계획: [2026-08-13 프로덕션 Go-live Ralph 계획](./2026-08-13-production-go-live-ralph-plan.md)
> 범위: DMS 기능, DMS 설정·운영, Admin 공통 운영, 인증 전달, 프로덕션 환경·복구·릴리즈, 실제 브라우저 증거

## 1. 정정된 goal

DMS의 문서 기능이 단순히 구현돼 있다는 판단에서 멈추지 않고, 운영자가 Admin과 DMS의 실제 진입점에서 런칭에 필요한 운영·관리·설정·제어·진단·복구를 수행할 수 있어야 합니다. 내부에서 해결 가능한 알려진 공백은 0이어야 하며, 외부 비밀값·승인·공개 endpoint가 필요한 항목은 입력 즉시 같은 release SHA로 최종 `GO`를 판정할 수 있는 fail-closed 계약과 검증 도구를 갖춰야 합니다.

2026-08-13 계획의 인프라·복구·Git·공개 브라우저 네 트랙은 유지합니다. 이 문서는 당시 최종 브라우저 명세에서 누락된 Admin/DMS 운영 기능 전체를 다섯 번째 blocking 트랙으로 추가합니다.

### 1.1 2026-08-18 로컬 closeout 증거

- `stage2-isolated-final`: production build를 사용하는 격리 PostgreSQL/Git/runtime에서 Admin 운영, DMS launch smoke, DMS system/personal 설정 mutation·검증형 원복, 390×844 DMS/Admin, WS-015/WS-019를 한 런으로 실행해 `17 passed`를 기록했습니다.
- Playwright CLI 새 세션에서 DMS 1440×1000, DMS/Admin 390×844 화면과 모바일 메뉴 열기·닫기, Admin 사용자 관리 진입을 재확인했습니다. 로그인 전 예상된 session 401 외에 인증 후 DMS 관련 요청은 성공했고 Admin 콘솔 warning/error는 0건입니다.
- 런별 PostgreSQL/runtime 소유권, 60회 session restore와 5회 login rate-limit 회복, hard reload 뒤 refresh-cookie 회전 전달, 실패 mutation cleanup 검증을 브라우저 fixture에 고정했습니다.
- 이 결과는 내부 No-Go를 닫는 로컬 acceptance입니다. clean release SHA·양 원격 정합성·승인 secret/SMTP·공개 HTTPS endpoint·동일 SHA 배포·운영 backup→restore·공개 browser evidence와 사용자 수동 테스트가 끝나기 전에는 실제 프로덕션 `GO`로 표시하지 않습니다.

## 2. 100% 판정 정의

`100%`는 아래 여섯 증거가 명시된 런칭 수용 범위에서 모두 충족된 상태입니다.

1. **진입 가능성**: navigation과 직접 URL 모두에서 소유 앱의 화면에 도달한다.
2. **실제 동작**: UI action이 실제 API·DB·파일·Git·queue runtime을 변경하거나 조회한다.
3. **권한 경계**: 허용 역할은 수행하고 비허용 역할은 UI와 API 모두에서 거부된다.
4. **실패·복구**: 실패 이유가 사용자와 운영자에게 보이고 retry/cancel/rollback 또는 명시적 운영 절차가 있다.
5. **영속·감사·관측**: 새로고침/재로그인 뒤 상태가 보존되고 중요한 운영 변경은 감사 또는 상태 증거로 추적된다.
6. **브라우저 증거**: production-like 환경에서 console warning/error, page error, 관련 HTTP 5xx 없이 수용 시나리오가 통과한다.

내부 구현 공백, 문서와 코드의 모순, 작동하지 않는 설정, 증거가 없는 완료 표시는 `No-Go`입니다. 외부 입력이 없는 항목은 구현 누락으로 숨기지 않고 `external-input-required`로 표시하며, 비활성 상태와 준비 요건을 화면·검증 report에서 확인해야 합니다.

## 3. 런칭 수용 범위

### 3.1 Admin 공통 운영

| 영역 | 필수 동작 | 증거 |
|------|-----------|------|
| 대시보드 | 공통 운영 상태와 DMS 소유 운영 화면 링크 | 직접 URL·navigation browser |
| 사용자 | 생성/수정/비활성/재활성, 마지막 admin 보호 | API mutation + UI reload + audit |
| 계정·세션 | 상태/잠금/최근 세션 조회, 강제 로그아웃, 잠금 해제 | UI mutation + 재조회 + session invalidation |
| 비밀번호 재설정 | 정책에 따른 challenge 생성과 실제 전달 상태 | outbox delivery readiness + request evidence |
| 조직 | 계층 CRUD, cycle 차단, 활성 하위 조직/구성원 보호, 재활성 | UI mutation/restore + audit |
| 역할·권한 | catalog, role grant 변경/복원, `system.override` 보호 | UI mutation/restore + access inspect |
| 접근 진단 | user/action/object inspect, 예외 조회 | 결과 surface + API success |
| 감사 | user/auth/session/org/permission 운영 이벤트 조회 | audit feed에 검증 mutation 존재 |
| 인증 정책 | password/internal SSO/Microsoft/self-signup/email 정책 저장·재조회 | secret masking + reload persistence |
| 가입 요청 | pending 조회, 승인/반려 | mutation + 사용자/역할 결과 |
| 공통코드·사업연도 | 목록/관리 화면 직접 진입과 정상 조회 | direct route + API success |
| AI 운영 | provider readiness, source, queue, scheduler, bounded run | external provider disposition 포함 |

MFA enrollment/reset, 외부 SSO unlink, model/persona/agent/quota/eval 편집은 현재 런칭 수용 범위가 아닙니다. UI가 이를 구현된 기능처럼 표시하면 실패입니다. Microsoft 로그인은 tenant/client/redirect/암호화 secret과 allowlist가 준비된 경우에만 활성화할 수 있으며, 준비되지 않은 활성화는 fail-closed여야 합니다.

### 3.2 DMS 운영·설정·제어

| 영역 | 필수 동작 | 증거 |
|------|-----------|------|
| 문서 기본 기능 | 생성/읽기/편집/저장/검색/탭/하드 새로고침 | browser + Git/DB projection |
| 문서 ACL | locked preview, 요청/승인/거절/회수, 직접 grant, 소유권/공개 범위 | 다중 사용자 browser + API denial |
| 협업 | soft lock, takeover 승인/거절, 댓글/답글/삭제/복원, 알림 | 다중 context browser |
| 설정 영속성 | system/personal scope별 저장·재조회, non-admin system 거부 | mutation/restore + reload + 403 |
| 운영 readiness | DB/settings/Git/control-plane/5개 runtime path 9개 `Ready` | `/settings/operations/*` browser |
| Git 운영 | binding/parity/publish 상태, 실패·재시도·취소 | 실제 격리 Git remote |
| 저장소 | Local 기본, 활성화된 NAS 선택, 첨부별 override, upload/open/download/resync | 파일·DB projection + browser |
| ingest | submit, confirm, auto/manual publish, failure/retry/cancel/cleanup, metrics | queue file + Git parity + browser |
| 템플릿 | personal/global CRUD, review confirmation, DOCX template upload | mutation/restore + reload |
| 검색·AI fallback | keyword/search policy와 provider-unavailable 상태가 정직하게 동작 | 결과/빈 상태 + disposition |
| CRM 연결 정책 | 결재선·계약 산출 정책 저장과 runtime 소비 | persistence + policy evidence |
| 사용자 환경 | 작성자 fallback, viewer zoom, sidebar, 저장소 선호 | reload + 실제 소비 경로 |

Teams/네트워크 드라이브 입력 adapter와 provider-backed AI/RAG는 외부 integration/provider가 승인되지 않은 현재 `external-input-required`입니다. 해당 채널을 지원한다고 표시하지 않으며, DMS 직접 제출/ingest API와 keyword fallback은 계속 blocking 범위입니다.

## 4. 발견 공백과 처리 결정

| ID | 발견 내용 | 판정 | 완료 조건 |
|----|-----------|------|-----------|
| OPS-ROUTE-01 | Admin `/ai-operations`가 navigation에는 있으나 middleware 직접 진입 허용 목록에 없음 | ✅ 해결 | allowlist와 회귀 검증 연결 |
| OPS-EVIDENCE-01 | 공개 readiness spec이 DMS 9개 readiness와 Admin AI만 확인해 이전 운영 goal 증거를 누락 | ✅ 해결 | Admin 7개 직접 route와 DMS settings deep link spec을 공개 browser track에 연결 |
| DMS-STO-01-A | personal 저장소 선호가 저장되지만 upload runtime에서 소비되지 않음 | ✅ 해결 | 개인 설정 UI + 첨부/참조/이미지 upload routing + 단위/browser 증거 |
| DMS-STO-02-B | backlog가 resync를 작업 등록 수준으로 기록 | ✅ 해결 | 실제 DB projection 갱신 구현과 회귀 증거로 정본 상태 수정 |
| AUTH-MAIL-01 | password reset outbox producer는 있으나 repo 내 delivery worker/readiness가 없음 | ✅ 내부 해결 / 외부 SMTP 값 필요 | SMTP worker, stale claim 복구, retry/status, production env 검증, Admin readiness와 로컬 SMTP 전달 증거 |
| DOC-STATUS-01 | Microsoft auth 구현과 정본의 “미구현” 표시가 모순 | ✅ 해결 | Entra 인증 구현/외부 입력과 M365·Teams·MFA·self-signup 미지원 범위를 분리해 정본화 |
| DMS-QA-01 | 저장소·설정·운영 브라우저 시나리오가 분산되고 최종 gate에 연결되지 않음 | ✅ 해결 | 5-track launch gate가 격리 mutation spec과 공개 read-only spec을 모두 실행 |
| DMS-ROUTE-02 | settings 내부 tab path가 Git 한 곳 외에는 브라우저 reload/bookmark 진입을 지원하지 않음 | ✅ 해결 | `/settings/{surface}/{sectionId}` catch-all handoff, middleware prefix, 권한 유지, reload/browser 회귀 |
| DMS-LIFECYCLE-01 | 설정 이동/새로고침이 취소한 file-tree 요청을 console 운영 오류로 오기록 | ✅ 해결 | settings route에서는 불필요한 tree 준비를 생략하고 page lifecycle discard를 오류 상태에서 분리 |

새 공백을 발견하면 이 표에 추가하고, 내부 해결 가능 항목이 하나라도 열린 상태에서는 로컬 launch acceptance를 통과로 표시하지 않습니다.

## 5. 브라우저 Ralph 테스트 명세

### 5.1 공통 실패 수집

각 page/context는 시작 시점부터 아래를 수집합니다.

- console `warning` 또는 `error`
- uncaught `pageerror`
- 관련 API/proxy HTTP 5xx
- 예상하지 않은 401/403, route redirect, hydration/application error

mutation은 고유한 launch prefix를 사용하고 `finally`에서 원상복구합니다. 원상복구 실패도 테스트 실패입니다. destructive production data mutation은 하지 않으며, 실제 공개 endpoint에서는 전용 launch verifier tenant/data만 사용합니다.

### 5.2 Admin 시나리오

1. 로그인 후 dashboard, `/users`, `/organizations`, `/roles`, `/auth`, `/codes`, `/business-years`, `/ai-operations`를 navigation과 직접 URL로 각각 확인합니다.
2. 검증 사용자를 생성하고 account snapshot, session revoke, unlock, password-reset request, deactivate/reactivate를 실행합니다.
3. 마지막 활성 admin 비활성화를 시도해 거부 메시지를 확인합니다.
4. 부모/자식 조직을 만들고 cycle·active child guard를 확인한 뒤 역순 정리합니다.
5. 검증 role의 permission grant를 변경하고 access inspect·audit 결과를 확인한 뒤 원래 grant로 복원합니다.
6. 인증 정책의 안전한 비밀값 비노출 필드를 변경·저장·reload·복원합니다. 외부 provider를 준비 없이 활성화하는 요청은 거부되어야 합니다.
7. password reset delivery readiness가 `ready`이거나 명시적으로 `disabled`여야 합니다. `outbox`인데 worker/SMTP가 준비되지 않은 상태는 `blocked`입니다.
8. AI provider 예외 모드에서는 provider가 blocked인 이유와 secret-free 경계를 확인하고, ready 모드에서는 3개 provider가 ready인지 확인합니다.

### 5.3 DMS 시나리오

1. admin은 system setting을 변경·저장·reload·복원하고, 일반 사용자는 system setting 변경 API에서 403을 받되 personal setting은 저장·재조회합니다.
2. readiness 9개와 Git/path 상세를 확인합니다.
3. Local과 활성 NAS에 대해 기본/개인/첨부 override upload를 실행하고 provider, storage URI, 파일 존재, open/download, resync DB projection을 확인합니다.
4. ingest 정상 confirm publish와 의도된 Git failure 후 retry, cancel, retention cleanup, metrics를 확인합니다.
5. template CRUD/review/DOCX, CRM 결재선/산출 정책을 변경·재조회·복원합니다.
6. 다중 사용자로 locked search, access request/approve/reject/revoke, hard refresh, comment, notification, soft lock/takeover를 확인합니다.
7. provider-unavailable AI 상태에서는 keyword/search와 명시적 unavailable/fallback UI가 동작해야 합니다.

### 5.4 viewport와 증거

- 데스크톱: Admin 1440×1000, DMS 1440×1000
- 모바일: DMS/Admin navigation·설정 진입 390×844
- 자동 spec 후 Playwright CLI 새 세션으로 핵심 화면을 다시 확인합니다.
- snapshot, screenshot, console, network 증거는 `output/playwright/dms-operational-launch-<release-sha>/`에 보존합니다.

### 5.5 중단·재진입·증거 무결성

- 최종 gate는 release SHA/run ID별 `output/dms-go-live/<release-sha>/<run-id>/` bundle을 새로 만들며 고정 경로의 이전 결과를 덮어쓰지 않습니다.
- 모든 step은 실행 직전과 성공·실패 직후 `checkpoint.json`을 atomic checkpoint로 갱신합니다. 로그, Playwright JSON/trace/screenshot/video, endpoint·release·restore report와 최종 report는 같은 bundle에 모읍니다.
- `--resume`은 명시한 run ID의 release SHA, HEAD, worktree fingerprint, gate plan hash가 모두 현재 실행과 같을 때만 이미 통과한 step을 건너뜁니다. 실행 중이던 step은 다시 수행하고 불일치·손상 checkpoint는 No-Go입니다.
- 최종 `manifest.json`은 bundle 파일의 크기와 SHA-256을 기록하며 password/token/secret 원문이 evidence에 있으면 GO를 거부합니다.
- Playwright 격리 runtime은 run ID 소유 manifest를 사용합니다. 소유권이 확인되지 않은 PID·data dir·프로세스는 자동 정리하지 않습니다.

## 6. 실행 단계와 종료 조건

1. manifest/lockfile 취약점과 PDF runtime 회귀를 해소합니다.
2. 발견된 내부 No-Go를 모두 구현하고 단위·통합 테스트를 추가합니다.
3. Admin/DMS 운영 matrix 자동 spec을 최종 go-live gate에 연결합니다.
4. `codex:verify-sync`, `docs:verify`, `lint`, `test:server`, `security:audit`, DB/OpenAPI/build/DMS/push guard를 모두 실행합니다.
5. production-like 격리 PostgreSQL/Git/runtime stack에서 전체 Playwright spec과 CLI 증거를 통과시킵니다.
6. 코드·문서·backlog의 상태를 실제 증거와 동기화합니다.

로컬 종료 조건은 내부 No-Go 0, 전체 정적 gate green, production-like browser matrix green입니다. 실제 프로덕션 `GO`는 여기에 clean release SHA, 양 원격 정합성, 승인된 운영 secret/SMTP/공개 HTTPS endpoint, 동일 SHA 배포, 운영 backup→restore와 공개 browser evidence가 추가로 모두 필요합니다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-18 | `stage2-isolated-final` 17/17과 별도 Playwright CLI desktop/mobile 증거로 로컬 launch acceptance를 완료하고 실제 프로덕션 GO 입력·사용자 테스트를 잔여 조건으로 고정 |
| 2026-08-18 | release SHA/run ID evidence bundle, atomic checkpoint/resume identity, shared browser failure/auth fixture, 검증형 mutation cleanup, 390×844 DMS/Admin 수용 계약을 추가 |
| 2026-08-14 | 발견 공백 9건의 처리 상태, settings 전체 deep link, SMTP 실제 전달, 저장소 선호 runtime 소비, 5-track gate와 lifecycle 회귀를 현행화 |
| 2026-08-14 | 이전 goal에서 누락된 Admin/DMS 운영 완결성을 다섯 번째 blocking 트랙으로 추가하고 100% 정의, 기능 matrix, 발견 공백, browser Ralph 명세를 고정 |
