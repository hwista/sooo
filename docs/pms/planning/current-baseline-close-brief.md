# PMS Current Baseline-Close Brief

> 최종 업데이트: 2026-07-13
> 범위: PMS 전용 baseline close 준비
> 공통 제약: `apps/server/src/modules/common/**`, `packages/types/src/common/**`, `packages/web-auth/**`, `packages/web-shell/**`, `docs/common/**`, root instructions / root changelog / 공통 verification scripts 는 직접 수정하지 않음

---

## 1. 현재 PMS baseline 요약

현재 PMS는 단순 PRD 비교 단계보다 많이 진행되어 있습니다.

이미 foundation 수준으로 반영된 축:
- project object access snapshot + feature gating
- canonical lifecycle overlay (`statusCode/stageCode/doneResultCode` 위 bridge)
- project organization / relation compatibility surface
- objective / WBS planning foundation
- canonical control domain
  - `ProjectIssue`
  - `ProjectRequirement`
  - `ProjectRisk`
  - `ProjectChangeRequest`
  - `ProjectEvent`
- deliverable / close-condition -> event rollup linkage
- handoff / contract / contract payment backend foundation

대표 근거 경로:
- `docs/pms/planning/spec-reconciliation-plan.md`
- `apps/server/src/modules/pms/project/*`
- `apps/server/src/modules/pms/control/*`
- `apps/web/pms/src/components/pages/project/*`
- `packages/types/src/pms/*`
- `packages/database/prisma/schema.prisma`

---

## 2. 현재 끊긴 지점

PMS의 핵심 끊김은 구현 부족보다는 baseline close 부족입니다.

- reconciliation wave 중 런칭 API가 직접 의존하는 PMS core project/member/org/relation/handoff/planning/control/report 테이블과 history 테이블은 formal migration / protected db-init 적용 단위로 1차 고정됨
- PMS 실행 자산 기준정보와 공유 반입 프로필 schema 변화도 formal migration / protected db-init 적용 단위로 고정됨. 다만 기존 202602 초기 스키마 전체를 재작성하는 통합 cleanup 과 CRM/Admin/공용 Organization cutover 는 별도 잔여
- backlog / roadmap / execution 기준선이 최신 구현 상태를 완전히 반영하지 않음
- 런칭 전 PMS 단독 실행 제품으로 닫기 위한 PM 지휘판/상세 closeout surface 와 인증 후 런타임 smoke 는 1차 보강됨
- `/settings` 직접 진입은 공용 PMS 셸로 수렴해 설정 MDI 탭을 열며, 설정 화면 ContentArea 매핑과 헤더 브레드크럼은 `verify:pms-launch` 소스 검증에 포함됨
- 코드 관리, 메뉴 관리, 기준정보, 템플릿 관리 화면의 destructive action 과 오류/검증 피드백은 브라우저 기본 `alert`/`confirm` 이 아니라 PMS 전역 확인 다이얼로그와 토스트로 수렴했고, 관리자 화면의 기본 브라우저 대화상자 회귀는 `verify:pms-launch` 소스 검증에 포함됨
- 인수인계 탭의 CRM 인계 상태와 셸 fallback 은 `미구현`, `페이지 준비 중` 같은 미완성형 문구를 사용자 표면에 노출하지 않고, `인계 미구성` 또는 등록되지 않은 화면 경로 같은 운영 가능한 상태 표현을 사용하도록 `verify:pms-launch` 소스 검증에 포함됨
- PMS AI/RAG project/task/member/status projection 의 검색 본문은 고객·플랜트·시스템·담당자·조직 내부 ID 라벨을 노출하지 않고, 가능한 사용자/조직 라벨만 본문에 포함한다. 구조 식별자는 권한 ACL/metadata 에 유지하며, 본문 회귀는 `verify:pms-launch` 소스 검증과 adapter 단위 테스트에 포함됨
- Docker 재빌드와 런타임 smoke 는 기능 구현 상태와 별개로 host 디스크와 Docker/WSL 상태에 의존하므로, `verify:pms-launch-host` 로 Windows host/Docker host 여유 공간과 Docker CLI/Compose 응답을 먼저 확인한다. 이 사전 점검은 재빌드 가능성 판별이며, PMS 런타임 통과나 provider-ready 증빙을 대체하지 않음
- handoff / contract / payment 는 프로젝트 상세 인수인계 탭에서 1차 노출됐고, 계약/대금은 CRM 정본 읽기용 스냅샷으로 제한됨. `verify:pms-launch` 는 PMS 웹의 CRM 후보/preview 접근이 읽기 전용인지, 준비 완료 CRM preview 만 PMS 계약/대금/accepted handoff 스냅샷으로 반영되는지 Docker 런타임에서 확인함
- planning / task execution surface 는 목표/WBS/작업/마일스톤을 데스크톱 표와 모바일 카드 목록으로 확인·상태 변경할 수 있게 보강됐고, 작업별 예상/실제 공수 입력, 일일 공수 기록, 작업 실제 공수 자동 합산을 제공하며, 등록 다이얼로그는 작은 화면에서 스크롤 가능하게 제한됨
- output / closeout / control / reporting / review 는 프로젝트 상세 closeout 패널, 산출물·종료조건 처리 큐, 통제/리뷰/피드백 탭 바로가기, 프로젝트 통제 요약 패널을 제공한다. 작업 탭은 작업별 예상/실제 공수 입력, 일일 공수 기록, 작업 실제 공수 자동 합산과 합계·소진율·차이·미기입 요약을 제공한다. 산출물/종료조건 템플릿, 승인선, 통제 객체, 기존 `Issue` cleanup 인박스, 리뷰/피드백 등록·해결, PMR/PRR 준비도·초안·발행 원장·반복 예약·rollover·승인자/알림 정책도 1차 제공한다. 전사 결재 엔진과 DMS 파일 검토 연동, 전사 타임시트·노무비/회계 연동, 기존 PMS 전체 PMO/경영 대시보드는 후속 범위로 남김
- 프로젝트 멤버 역할 선택은 `PROJECT_MEMBER_ROLE` 코드 그룹 기반으로 전환됐고, 화면의 정적 역할 fallback 은 제거됨. 멤버 추가 대상자는 숫자 사용자 ID 입력이 아니라 활성 공용 사용자 lookup 결과에서 선택하며, 요청/제안/전환 상세 담당자는 현재 프로젝트 멤버 중에서 선택함. 인수인계 배정 역할도 텍스트 코드 입력이 아니라 활성 프로젝트 멤버 역할 코드에서 선택함. PMS는 사용자 원장을 생성/수정하지 않음
- PMS 런칭 화면의 날짜/일시/숫자/금액/건수 표시는 PMS 전용 공통 포맷 유틸로 정리됐고, 전환 목록 운영 담당자는 숫자 사용자 ID 대신 지정 여부로 표시함. `verify:pms-launch` 는 주요 런칭 화면의 직접 브라우저 로케일 포맷 호출 회귀와 전환 목록 담당자 숫자 ID 재노출을 차단함
- `Plant/Site`, `System Catalog`, `System Instance`, `Integration` 은 PMS 실행 자산 기준정보로 1차 스키마/API/시드/관리 조회 화면, 관리자 생성·수정·비활성화 표면, JSON 기반 dry-run/apply 반입·기존 코드 갱신 1차, CSV/TSV 업로드·컬럼 매핑·코드 우선 템플릿 다운로드·브라우저 로컬 매핑 재사용 1차, 숫자 ID 컬럼의 기존 파일 호환 매핑, 서버 공유 매핑 프로필 CRUD/재사용·기본 지정 UI·이력 조회/복구 1차, 프로젝트 생성·수정 선택 검증 1차까지 구현됨. PMS 고객사 원장 쓰기 표면은 제거되어 읽기 조회만 남았고, 공용 조직 앵커 메타데이터 응답/검색/선택지 표기 1차와 요청 등록·프로젝트 기본정보·기준정보 관리 고객사 선택지의 조직명/코드 우선 표시 통일, 상태별 목록 고객 필터의 읽기용 고객 조회 선택 1차, 프로젝트 조직 supplier/partner 연결의 공용 조직 lookup 선택 1차, 프로젝트 간 직접 관계 추가와 실행 상세 후속 프로젝트의 프로젝트 검색 선택 1차, 고객/조직/실행 자산/프로젝트 관계/담당자 fallback 의 내부 ID 비노출 1차는 구현됨. 고객사 원장 편집과 CRM/공용 Organization full cutover 는 아직 미구현

즉 PMS는 “설계 초기”가 아니라 **foundation 구현 후 baseline 미확정 상태**로 봅니다.

---

## 3. baseline-close commit grouping 제안

### A. docs(pms): baseline freeze
- `docs/pms/planning/spec-reconciliation-plan.md`
- `docs/pms/planning/README.md`
- `docs/pms/planning/backlog.md`
- `docs/pms/planning/changelog.md`
- `docs/pms/planning/roadmap.md`
- `docs/pms/explanation/architecture/*`
- `docs/pms/explanation/design/*`
- `docs/pms/explanation/domain/*`

### B. feat(server-pms-project)
- `apps/server/src/modules/pms/project/*`
- `apps/server/src/modules/pms/pms.module.ts`

### C. feat(server-pms-work-control)
- `apps/server/src/modules/pms/task/*`
- `apps/server/src/modules/pms/control/*`
- `apps/server/src/modules/pms/deliverable/*`
- `apps/server/src/modules/pms/issue/*`
- `apps/server/src/modules/pms/member/*`
- `apps/server/src/modules/pms/menu/*`

### D. feat(web-pms-shell)
- `apps/web/pms/src/app/*`
- `apps/web/pms/src/components/layout/*`
- `apps/web/pms/src/components/pages/admin/*`
- `apps/web/pms/src/hooks/queries/*`
- `apps/web/pms/src/lib/api/*`
- `apps/web/pms/src/stores/*`

### E. feat(web-pms-project)
- `apps/web/pms/src/components/pages/project/*`
- `apps/web/pms/src/components/pages/home/DashboardPage.tsx`
- remove legacy `IssuesTab.tsx`

### F. feat(types-db-pms-bridge) — owner-only / shared infra 주의
- `packages/types/src/pms/*`
- PMS 관련 `packages/database/prisma/schema.prisma` 구간
- PMS 관련 seeds / triggers

주의:
- F 그룹은 shared infra 와 인접하므로 가장 마지막에 분리 검토
- DMS/SNS/common artifact 와 한 커밋에 섞지 않음

---

## 4. migration / validation gap

현재 드러난 핵심 gap:

1. `apply_all_triggers.sql` PMS trigger coverage
- 2026-06-11 기준 `34_pr_handoff_h_trigger.sql` ~ `44_pr_event_h_trigger.sql` 및 `54_pr_project_issue_h_trigger.sql` 설치 경로를 연결함
- `verify:pms-launch` 가 해당 installer coverage 를 소스 기준으로 확인함

2. schema 변화 대비 formal migration bundle
- 2026-07-06 기준 `Plant/Site`, `System Catalog`, `System Instance`, `Integration`, `PmsMasterImportProfile` 은 formal migration 파일과 db-init protected baseline 적용 경로가 연결됨
- 2026-07-06 기준 PMS core reconciliation foundation(`ProjectMember`, `ProjectOrg`, `ProjectRelation`, `ProjectRolePermission`, `Handoff`, `Contract`, `ContractPayment`, `Objective`, `WBS`, `Task`, `Milestone`, `Issue`, `ProjectIssue`, `Requirement`, `Risk`, `ChangeRequest`, `ProjectEvent` 및 history table)도 formal migration 파일과 db-init protected baseline 적용 경로가 연결됨
- `verify:pms-launch` 가 migration 파일 내용, CRM ledger 비소유 경계, db-init protected migration coverage 를 소스 기준으로 확인함
- PMS AI/RAG 는 project/task/member/status runtime evidence gate 로 backfill/job 큐잉·실행, 공용 AI object/chunk/ACL/index state/retrieval audit 확인 경로가 추가됐고, Docker 재현용 데모 프로젝트 상태 상세 시드 기준선, provider-unavailable JSON/Markdown evidence 산출, provider-ready report verifier/template/self-test 게이트, provider env precheck → live evidence → report verification → evidence recording 완료 runner까지 연결됨
- 단, CRM/Admin/공용 Organization cutover, AI/RAG provider-ready live report artifact, legacy Issue 물리 테이블 제거는 이 migration 완료 범위가 아니다. legacy Issue 숨김 cleanup 의 보존 아카이브 스냅샷과 이력 정책, 서버 기준 cleanup 요약 지표, 완료 행 일괄 숨김 운영 액션, 열린 행 일괄 정식 전환 액션, fresh seed 의 활성 legacy Issue 재생성 차단과 전체 프로젝트 cleanup 활성 0건 런타임 검증은 별도 protected/검증 기준으로 고정됐다

3. PMS 전용 verification script 확장
현재 고정된 검증 축:
- PM 홈 운영 포커스 surface 존재
- 프로젝트 상세 closeout surface 존재
- project access snapshot endpoint / hook / API surface 존재
- project dashboard summary endpoint / hook / 상세 패널 / CRM 계약 스냅샷 경계 문구 존재
- org / relation compatibility API / hook surface 존재
- objective / WBS, control domain, deliverable / close-condition API surface 존재
- 목표/WBS/작업/마일스톤 모바일 카드 목록과 작은 화면 등록 다이얼로그 회귀 차단
- 작업별 예상/실제 공수 입력, 일일 공수 기록, 작업 실제 공수 자동 합산, 공수 요약 카드, 작업 API 공수 필드 회귀 차단
- PMS trigger installer coverage 존재
- PMS 실행 자산 기준정보와 공유 반입 프로필 formal migration bundle 및 db-init protected baseline coverage 존재
- PMS core reconciliation foundation formal migration bundle 및 db-init protected baseline coverage 존재
- 실행 자산 CSV/TSV 반입 템플릿이 코드 우선 컬럼을 사용하고 숫자 ID 컬럼은 호환 매핑으로만 유지되는지 확인
- 요청/제안/수행/전환 목록의 고객사 필터가 읽기용 고객 조회 선택을 사용하고 고객 표시가 숫자 고객 ID fallback 에 의존하지 않는지 확인
- 요청 등록, 프로젝트 기본정보, 기준정보 관리의 고객사 선택지가 공통 표시 규칙으로 고객사 코드와 공용 조직명/코드를 노출하고, 조직 식별자만 있는 경우 숫자 ID 대신 정보 조회 필요 상태를 표시하는지 확인
- 실행 상세 후속 프로젝트가 숫자 프로젝트 ID 직접 입력/표시가 아니라 프로젝트명/번호 검색 선택을 사용하고 `nextProjectId`는 호환 저장 필드로만 유지되는지 확인
- 고객/조직/실행 자산/프로젝트 관계/담당자 fallback 이 숫자 내부 ID를 직접 표시하지 않고 이름·코드 또는 정보 조회 필요 상태로 표시되는지 확인
- 기본 Docker runtime 응답(server/PMS web)
- PMS 실행 자산 기준정보 조회와 비읽기 전용 모드의 create/update/deactivate runtime smoke
- PMS 프로젝트 생성·수정의 Plant/Site 및 System Instance anchor runtime smoke
- PMS 고객사 읽기 조회의 공용 조직 앵커 응답 runtime smoke
- PMS 프로젝트 조직 supplier/partner 연결용 공용 조직 lookup runtime smoke
- PMS 프로젝트 멤버 추가용 활성 공용 사용자 lookup runtime smoke
- 노출 PMS 메뉴 경로의 실제 화면 매핑과 상태별 legacy 목록의 가짜 삭제 alert 회귀 차단
- PMS 서버/웹 TypeDoc reference 가 제거된 고객사 쓰기 DTO, mutation hook, 고객사 관리 화면 문서를 다시 노출하지 않는지 확인
- 브라우저 QA 산출물 기준 홈/요청 등록 사이드바 흐름 확인, 고객/프로젝트/실행 자산 목록 요청의 400 응답 제거, PMS 전용 한국어 시스템 글꼴 스택 보강
- 브라우저 QA 산출물 기준 기존 Issue 신규 생성 POST 가 410으로 차단되고 cleanup 인박스가 기존 행 정리 전용으로 남는지 확인
- 브라우저 QA 산출물 기준 홈에서 프로젝트 상세로 진입한 뒤 태스크/마일스톤/컨트롤/산출물/종료조건/인수인계/리뷰 탭을 실제로 열고, desktop/mobile 화면의 page error, HTTP error, 내부 ID 노출, horizontal overflow 회귀를 함께 확인
- 브라우저 QA 산출물 기준 프로젝트 상세 closeout 패널의 처리 큐와 산출물/종료조건/리뷰·피드백 조치 바로가기가 desktop/mobile 에서 실제 관리 탭을 여는지 확인
- 브라우저 QA 산출물 기준 프로젝트 상세 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 실제 등록하고, 저장 후 피드백 큐와 보고/리뷰 이벤트 목록에 표시되는지, 피드백 해결 버튼이 상태를 바꾸는지 desktop/mobile 기준으로 확인
- 브라우저 QA 산출물 기준 PMR/PRR 발행·승인 원장의 같은 예약 행을 안정 이벤트 ID와 상태 코드로 추적하고, 이벤트 생성·상태 변경 성공 응답을 화면 이벤트 목록 캐시와 활성 PMR/PRR 행에 즉시 반영해 승인 요청·승인·발행 완료 상태 전환을 desktop/mobile 기준으로 확인
- PMS API 런칭 경로의 오류 응답이 `PMS_*` 상세 코드, 실패 경로, HTTP 상태 메타데이터를 포함하는지 확인하고 대표 식별자 오류를 런타임에서 검증
- PMS AI/RAG project/task/member/status backfill/job 을 런타임에서 큐잉·실행하고 공용 AI object/chunk/ACL/index state/retrieval audit 를 확인하며 JSON report 와 Markdown summary 를 산출. provider-ready 환경이 없는 경우 semantic/vector/RAG capability false 와 stale index state 를 기준으로 검증. provider-ready report verifier/template 은 통과 report 의 source status, backfill, job run, retrieval, database audit, embedding count 형식을 고정하고, completion runner 는 provider env precheck, live PMS evidence 생성, report verification, evidence block 기록을 한 순서로 묶으며, evidence bundle 은 env template/request packet/draft report/final bundle verifier 를 한 산출물로 제공한다. 단 live report artifact 자체는 아직 잔여
- `verify:pms-launch-host` 는 재빌드 전 host 여유 공간, Windows host/Docker host 마운트, Docker CLI/Compose 응답을 수치로 확인해 Docker 재빌드 차단 원인을 PMS 기능 미구현과 분리한다. 이 점검은 런칭 runtime smoke 통과 증빙이 아니라 runtime smoke 를 시도할 수 있는 host 조건 확인이다

2026-07-03 기준 추가 완료된 검증 축:
- 인증 후 runtime 데이터 기반 project detail / access snapshot / transition readiness smoke
- org / relation compatibility rows runtime smoke
- objective / WBS / task / control domain runtime smoke
- deliverable / close-condition runtime smoke
- 산출물 완료 상태 어휘(`confirmed`/`approved`/`not_required`)와 종료조건 체크 가드 runtime smoke
- 비읽기 전용 모드의 산출물·종료조건 기본 템플릿 적용과 그룹 저장·목록 조회·선택 적용 runtime smoke
- 비읽기 전용 모드의 산출물·종료조건 관리자 템플릿 그룹 저장·승인·이력 조회·복구·보관 runtime smoke
- 비읽기 전용 모드의 산출물·종료조건 승인선 저장, 지정 승인자 승인, 산출물 승인/종료조건 완료 반영 runtime smoke
- handoff / contract snapshot runtime smoke
- `PROJECT_MEMBER_ROLE` 코드 그룹 runtime smoke 및 멤버 역할 선택 화면의 하드코딩 fallback 회귀 차단

4. backend/type/schema 대비 handoff/contract/payment web surface 는 1차 화면 노출 완료. 단, 계약/청구/매출/원가 편집은 PMS 범위가 아니므로 CRM 정본 스냅샷 조회로 제한한다.

5. planning/task execution 은 프로젝트 상세 목표/WBS/작업/마일스톤에서 모바일 카드 목록, 상태 변경, 연결 선택, 진척률 변경, 작은 화면 등록 다이얼로그, 작업별 예상/실제 공수 입력, 일일 공수 기록, 작업 실제 공수 자동 합산을 제공한다.

6. output/closeout/control/reporting/review 는 프로젝트 상세 closeout 패널, 처리 큐와 조치 바로가기, 통제 요약 패널, 산출물/종료조건 템플릿·승인선, 통제 객체, 기존 `Issue` cleanup 인박스, 리뷰/피드백 등록·해결, PMR/PRR 준비도·초안·발행 원장·반복 예약·rollover·승인자/알림 정책을 1차 제공한다. 작업 탭은 작업별 예상/실제 공수 입력, 일일 공수 기록, 작업 실제 공수 자동 합산과 합계·소진율·차이·미기입 요약을 제공한다. 전사 결재 엔진과 DMS 파일 검토 연동, 전사 타임시트·노무비/회계 연동, 기존 PMS 전체 PMO/경영 대시보드는 후속 범위다.

---

## 5. baseline close 종료 조건

PMS baseline close 는 아래가 맞아야 닫습니다.

- `spec-reconciliation-plan.md` 를 PMS 공식 baseline 으로 참조 가능
- backlog / roadmap / changelog 가 현재 구현 상태를 반영
- PMS-owned file groups 가 review 가능한 묶음으로 분해됨
- trigger installer coverage, PMS 실행 자산 formal migration bundle, PMS core reconciliation foundation formal migration bundle 이 검증으로 고정됨
- 남은 CRM/Admin/공용 Organization cutover, AI/RAG provider-ready live report artifact, legacy Issue 물리 테이블 제거 조건이 명시됨. legacy Issue 보존 아카이브 정책은 숨김 cleanup 단계에서 스냅샷과 이력을 남기는 방식으로 고정됐고, fresh seed 는 활성 legacy Issue demo 행을 만들지 않는 기준으로 전환됨
- AI/RAG는 project/task/member/status evidence gate, provider-ready report verifier/template, provider-ready completion runner/evidence recorder, provider-ready evidence bundle, live provider-ready report artifact 잔여가 분리되어 명시됨
- Docker 재빌드 전 `verify:pms-launch-host` 로 host 디스크와 Docker/Compose 상태를 확인하고, 실패 시 runtime smoke 이전에 host 상태를 복구해야 함이 명시됨
- foundation build / type validation 기준이 정해짐

### PMS AI/RAG Provider-Ready Evidence Record

<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:START -->
Provider-ready evidence status: pending

- Current blocking item: no verified Azure-backed PMS provider-ready runtime report artifact has been recorded.
- Required proof: passed PMS project/task/projectMember/projectStatus provider-ready JSON report plus Markdown summary, verified before documentation is updated.
- Handoff bundle: `output/pms-ai-rag-provider-ready` contains draft report/env/request packet templates only and must not be treated as completion evidence.
- Recording path: `complete:pms-ai-rag-provider-ready` calls `record:pms-ai-rag-provider-ready-evidence` after report verification.
<!-- PMS_AI_RAG_PROVIDER_READY_EVIDENCE:END -->

---

## 6. baseline close 이후 다음 tranche

추천 다음 tranche:

### Tranche 1
- PMS 단독 실행 제품 closeout surface 강화
  - PM 홈 운영 포커스
  - 프로젝트 상세 다음 액션/막힌 조건/종료 가능 여부
  - 산출물/종료조건 readiness 가시화

### Tranche 2
- PMS verification / migration debt 해소
- trigger installer coverage 수정
- PMS verification script 를 runtime 데이터/API smoke 로 확장 완료.
- 보고/리뷰 이벤트 요약, 누적 데이터 환경의 최근 항목 렌더링, 런칭 피드백 공유용 스냅샷, 현재 PMS 실행 데이터 기준 PMR/PRR 준비도 화면, 초안 다운로드, 프로젝트 이벤트 기반 발행 원장, 주간/월간 반복 예약 생성, 만기 예약 자동 rollover, 프로젝트 멤버 승인자 지정, 결재선 정책 선택, 수신 정책 기반 PMS 공통 알림, 승인 요청·승인·반려·발행 완료 상태 전환, 승인·반려 지정 승인자 제한은 프로젝트 상세 리뷰 탭과 이벤트 API/서버 백그라운드 worker로 1차 완료. 후속은 기존 PMS 전체 PMO/경영 대시보드와 전사 타임시트·노무비/회계 연동 범위 재결정.

### Tranche 2b
- handoff / contract / contract payment web surface 노출

### Tranche 3
- 완료 상태 legacy Issue cleanup 행 일괄 숨김 후 열린 cleanup 행의 프로젝트 단위 정식 통제 항목 전환
- legacy Issue cleanup 요약 기준 활성 cleanup 대상 0건 확인
- fresh seed 가 활성 legacy Issue 행을 다시 만들지 않고 정식 통제 객체와 보존 아카이브만 만드는지 확인
- 원본 legacy Issue 물리 테이블 제거 여부와 별도 migration 결정

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-13 | PMS 홈 요약에 접힌 대표 신호와 별도의 launch feedback 신호 목록을 추가하고, 홈 화면에 런칭 피드백 큐 패널을 노출해 여러 프로젝트의 피드백을 바로 리뷰 탭에서 처리할 수 있도록 보강 |
| 2026-07-13 | PMS Docker 재빌드 전 host 디스크 여유 공간과 Docker CLI/Compose 응답을 확인하는 `verify:pms-launch-host` 를 추가하고 baseline close 검증 축에 반영. 이 점검은 현재 Docker/WSL host 차단 원인 분리용이며 PMS runtime smoke 또는 provider-ready 증빙을 대체하지 않음 |
| 2026-07-13 | PMS AI/RAG provider-ready evidence bundle 생성/검증 경로를 추가해 Azure-backed report 생성에 필요한 env template, required-input request packet, draft report template, completion runner 명령을 한 산출물로 묶음. draft 산출물은 최종 검증에서 실패하며 실제 provider-ready 통과 report artifact 는 계속 잔여 |
| 2026-07-13 | PMS `/settings` 직접 진입을 공용 셸 AppLayout으로 수렴시키고, 설정 화면 MDI 매핑과 헤더 브레드크럼을 런칭 검증에 포함 |
| 2026-07-13 | PMS AI/RAG provider-ready evidence recorder를 추가해 provider-ready report verification 이후 digest-bound evidence block artifact 와 PMS planning 문서 기록 dry-run/record 경로를 실행하도록 완료 runner에 연결. 실제 provider-ready 통과 report artifact 는 계속 잔여로 유지 |
| 2026-07-10 | PMS AI/RAG provider-ready 완료 runner를 추가해 provider env precheck, live PMS evidence 생성, provider-ready report verification 을 표준 순서로 묶고 env-file/Docker runtime/기존 artifact 재검증/self-test 를 제공. 실제 provider-ready 통과 report artifact 는 계속 잔여로 유지 |
| 2026-07-10 | PMS demo issue seed 가 활성 `pr_issue_m` 행을 재생성하지 않고 열린 seed 업무를 정식 이슈·리스크·변경요청으로 만들며 원본 스냅샷은 legacy archive 로만 보존하도록 전환. `verify:pms-launch` 는 전체 프로젝트 cleanup 활성 0건을 런타임에서 확인 |
| 2026-07-10 | PMS 기존 `Issue` cleanup 인박스에 열린 행 일괄 정식 전환 API/화면 액션을 추가하고, 정식 이슈·리스크·변경요청 생성 후 원본을 `canonicalized_cleanup` 보존 아카이브로 비활성화하도록 런칭 검증에 포함 |
| 2026-07-10 | PMS 기존 `Issue` cleanup 인박스에 완료 행 일괄 숨김 API/화면 액션을 추가하고, `resolved`/`closed` 행만 보존 아카이브 후 비활성화하도록 런칭 검증에 포함. 열린 cleanup 행은 정식 통제 항목 전환 대상으로 유지 |
| 2026-07-10 | PMS 기존 `Issue` cleanup 요약 API와 화면 지표를 추가해 활성 cleanup, 열린 대상, 완료 상태, 숨김 보존 건수와 물리 제거 가능 여부를 서버 기준으로 표시하고 `verify:pms-launch` 런타임에서 확인. 물리 제거는 활성 cleanup 0건 확인 이후 별도 migration 으로 유지 |
| 2026-07-10 | PMS 기존 `Issue` 숨김 cleanup 시 원본 행 비활성화 전에 보존 아카이브 스냅샷과 이력 레코드를 남기는 정책을 DB/API/런칭 검증에 고정. 원본 테이블의 물리 제거는 활성 cleanup 대상 0건 확인 이후 별도 migration 으로 유지 |
| 2026-07-10 | PMS 기존 `Issue` 신규 생성 POST 를 410 `PMS_LEGACY_ISSUE_WRITE_DISABLED`로 차단하고 웹 create API/mutation hook/create request TypeDoc 표면을 제거. 기존 행은 cleanup 인박스의 조회·상태 변경·숨김·정식 전환 전용으로 보존 |
| 2026-07-10 | PMS 산출물·종료조건별 1~5단계 승인선을 프로젝트 멤버 기반으로 저장하고, 지정 승인자 승인/반려와 최종 상태 반영을 DB/API/화면/런칭 검증에 포함. 전사 결재 엔진과 DMS 파일 검토 연동은 후속으로 유지 |
| 2026-07-10 | PMS 산출물·종료조건 템플릿 선택 적용에 append/replace 정책을 추가하고, replace 적용 시 템플릿 밖 활성 항목을 소프트 비활성화하는 런칭 검증을 포함 |
| 2026-07-10 | PMS AI/RAG provider-ready runtime report verifier/template/self-test 를 추가하고 런칭 게이트가 이를 소스 검증하도록 연결. 실제 provider-ready 통과 report artifact 는 계속 잔여로 유지 |
| 2026-07-09 | PMS 산출물 완료 상태 어휘를 `confirmed`/`approved`/`not_required`로 통합하고, 종료조건 체크 가드와 전환 준비도 완료 집계를 런칭 검증에 포함 |
| 2026-07-09 | PMS 관리자 템플릿 관리 화면과 전용 API를 추가해 산출물·종료조건 그룹의 초안·승인·보관, 버전 증가, 이력 조회·복구, 보관 그룹 조회를 제공하고 런칭 검증에 포함 |
| 2026-07-09 | PMS 산출물·종료조건 탭에 저장된 템플릿 그룹 선택 적용과 현재 목록 기반 템플릿 저장 1차를 추가하고, 종료조건 그룹 항목의 산출물 필요 여부 보존과 런타임 그룹 저장/조회/적용 검증을 포함 |
| 2026-07-09 | PMS 이벤트 생성·상태 변경 성공 응답을 활성 이벤트 목록 캐시와 PMR/PRR 활성 행 상태에 즉시 반영하도록 보강해, 누적 데이터 Docker 환경에서도 승인 요청·승인·발행 완료 상태 전환이 같은 화면 행에 바로 표시되도록 조정 |
| 2026-07-09 | PMS 런칭 검증에 CRM 계약 후보·PMS 인계 preview 읽기 전용 경계와 준비 완료 preview 의 PMS 계약/대금/accepted handoff 스냅샷 반영 런타임 smoke 를 추가. CRM 계약/청구 원장 쓰기와 PMS 신규 프로젝트 자동 생성은 계속 제외 |
| 2026-07-09 | PMS PMR/PRR 발행·승인 원장 행에 안정 이벤트 ID와 상태 코드 식별자를 추가하고, 브라우저 QA가 누적 원장 환경에서도 같은 예약 행의 승인 요청·승인·발행 완료 전환을 확인하도록 보강 |
| 2026-07-09 | PMS AI/RAG 런타임 evidence verifier가 provider-unavailable Docker 증빙을 JSON report 와 Markdown summary 로 함께 남기도록 보강. provider-ready vector/RAG 실증 artifact 는 계속 잔여로 유지 |
| 2026-07-09 | PMS 리뷰/피드백 탭의 PMR/PRR 원장, 런칭 피드백, 보고/리뷰 이벤트 표시를 최근 항목 중심으로 제한하고 전체 건수는 유지하도록 보강 |
| 2026-07-09 | PMS 산출물·종료조건 탭에 현재 단계 기본 템플릿 적용 API/화면 버튼을 추가하고, 그룹 마스터 우선·상태별 기본 세트 fallback·append 방식 적용을 런칭 검증에 포함 |
| 2026-07-09 | 기존 Issue 호환성 인박스를 열린 cleanup 대상 기본 보기로 축소하고, 완료/전환 행은 선택 이력으로 접으며, 삭제 동작은 물리 삭제 대신 비활성화/숨김 처리로 전환 |
| 2026-07-09 | PMR/PRR 예약 시간이 지난 발행 예정 이벤트를 서버 백그라운드 worker가 승인 요청 상태로 자동 전환하고 승인자 알림을 발송하도록 추가 |
| 2026-07-09 | PMR/PRR 승인 요청 이후 승인·반려를 지정 승인자만 처리하도록 리뷰/피드백 화면과 이벤트 API 상태 전환을 제한하고 런칭 검증과 브라우저 QA에 반영 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 PMR/PRR 결재선 정책 선택, 알림 수신 정책 미리보기, 프로젝트 이벤트 정책 증적, 정책 기반 다중 수신 PMS 공통 알림을 추가 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 PMR/PRR 주간/월간 반복 예약 차수 생성, 프로젝트 멤버 승인자 지정, PMS 공통 알림을 추가 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 PMR/PRR 주간/월간 발행 건 예약과 승인 요청·승인·반려·발행 완료 상태 전환을 프로젝트 이벤트 기반 워크플로우로 추가 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 현재 PMR/PRR 준비도 판정을 프로젝트 이벤트 기반 발행 원장으로 기록하고 이력을 확인하도록 추가 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 산출물·종료조건·일반 통제 이슈·리스크·변경·인수인계·launch feedback 상태를 화면에서 바로 판정하는 PMR/PRR 준비도 패널을 추가 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 산출물·종료조건·통제 이슈·리스크·변경·인수인계·launch feedback 상태를 묶은 PMR/PRR Markdown 초안을 다운로드하도록 추가 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 현재 보고/리뷰 이벤트, 수집된 launch feedback, 확인 필요 신호를 PMR/PRR 자동 보고서가 아닌 런칭 피드백 공유용 스냅샷으로 다운로드하도록 추가 |
| 2026-07-08 | PMS 요청 등록, 프로젝트 기본정보, 기준정보 관리 고객사 선택지를 공통 표시 규칙으로 통일해 고객사 코드와 공용 조직명/코드를 우선 표시하고, 숫자 조직 ID 노출 회귀를 런칭 검증으로 차단 |
| 2026-07-08 | PMS 런칭 화면 날짜/일시/숫자/금액/건수 표시를 공통 포맷 유틸로 정리하고, 전환 목록 운영 담당자 숫자 ID 노출을 지정 여부 표시와 런칭 검증으로 차단 |
| 2026-07-08 | PMS 리뷰/피드백 탭에서 수집된 launch feedback 이슈 목록, 상태 변경, 해결 처리 액션을 제공하고 홈 피드백 요약 갱신 및 브라우저 QA 해결 클릭 검증에 포함 |
| 2026-07-08 | PMS AI/RAG projectStatus 런타임 evidence 가 새 Docker 환경에서도 검증 대상을 확보하도록 데모 프로젝트 상태 상세 시드를 추가하고 seed installer / db-seed / 런칭 게이트에 연결 |
| 2026-07-08 | PMS AI/RAG member/status projection 을 독립 AI index entity 로 추가하고 runtime evidence gate 를 project/task/member/status object/chunk/ACL/index state/retrieval audit 검증으로 확장. provider-ready 실증 artifact 는 잔여로 유지 |
| 2026-07-08 | PMS AI/RAG project/task evidence gate 를 추가해 runtime backfill 큐잉·실행, 공용 AI object/chunk/ACL/index state/retrieval audit 검증을 수행. 이 시점의 member/status projection 잔여는 이후 같은 날짜 member/status projection 항목에서 해소 |
| 2026-07-08 | PMS API 오류 응답을 `PMS_*` 상세 코드와 HTTP 상태 메타데이터로 정규화하고 대표 식별자 오류 응답을 런타임 검증에 포함 |
| 2026-07-07 | PMS 헤더가 활성 MDI 탭 기준의 화면 브레드크럼을 표시하도록 보강하고, 홈/프로젝트 상세/요청 등록 헤더 문맥을 런칭 브라우저 QA와 `verify:pms-launch` 검증에 포함 |
| 2026-07-07 | PMS 홈 요약에 리스크/리포트/운영 집계 위젯을 추가해 열린 리스크, 차단 이슈, 변경 요청, 보고/리뷰 이벤트 준비도, 지연 마일스톤, 산출물 대기, 종료/전환 막힘을 런칭 검증에 포함. PMR/PRR 자동 보고 완료로는 주장하지 않음 |
| 2026-07-07 | PMS 홈에서 열린 launch feedback 이슈를 별도 피드백 지표와 리뷰 탭 대상 운영 신호로 노출하도록 보강. 전체 보고/PMO 자동화는 여전히 미완성 범위로 유지 |
| 2026-07-07 | PMS 컨트롤 탭 기존 `Issue` 호환성 인박스에서 정식 이슈·리스크·변경요청으로 수동 전환하고 기존 행을 종료 처리하는 legacy cleanup 1차 동선을 추가 |
| 2026-07-07 | PMS 프로젝트 상세 closeout 패널에 현재 단계의 미해결 산출물·종료조건 처리 큐를 추가하고, 큐 항목 클릭으로 산출물/종료조건/리뷰 관리 탭을 여는 흐름을 브라우저 QA/런칭 검증에 포함 |
| 2026-07-07 | PMS 프로젝트 상세 closeout 패널에서 산출물/종료조건/리뷰·피드백 관리 탭으로 바로 전환하는 조치 바로가기를 추가하고 브라우저 QA/런칭 검증에 포함 |
| 2026-07-07 | PMS 브라우저 QA가 프로젝트 리뷰 탭에서 피드백 이슈와 리뷰 이벤트를 실제 등록하고 저장 후 목록 반영을 확인하도록 확장 |
| 2026-07-07 | PMS 브라우저 QA를 홈/요청 등록에서 홈→프로젝트 상세→주요 관리 탭 리허설까지 확장하고, 프로젝트 상세 상태/관리 탭 레일을 작은 화면에서 가로 스크롤되도록 보강 |
| 2026-07-06 | PMS 브라우저 QA에서 확인된 목록 API 400 응답을 서버 `limit` 계약으로 정리하고, PMS 전용 한국어 글꼴 스택과 홈/요청 등록 사이드바 흐름 검증 산출물을 보강 |
| 2026-07-06 | PMS 실행 상세 후속 프로젝트를 프로젝트명/번호 검색 선택으로 전환하고 `nextProjectId` 직접 입력/표시 회귀를 런칭 검증에 포함 |
| 2026-07-06 | PMS 요청/제안/수행/전환 목록 고객사 필터를 읽기용 고객 조회 선택으로 전환하고 숫자 고객 ID fallback 표시 회귀를 런칭 검증에 포함 |
| 2026-07-06 | PMS 실행 자산 기준정보 CSV/TSV 템플릿을 고객사/사이트/시스템 코드 우선으로 정리하고 숫자 ID 컬럼은 호환 매핑으로만 유지하도록 런칭 검증에 포함 |
| 2026-07-06 | PMS 목표/WBS/작업/마일스톤 모바일 카드 목록과 작은 화면 스크롤 등록 다이얼로그를 추가하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 산출물 모바일 카드 목록과 산출물/종료조건 작은 화면 스크롤 등록 다이얼로그를 추가하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 컨트롤 탭의 기존 `Issue` 호환성 인박스 모바일 카드 목록을 추가하고 새 작성은 정식 통제 패널로 유도하는 기준을 런칭 검증에 포함 |
| 2026-07-06 | PMS 통제 탭의 이슈/요구사항/리스크/변경/이벤트 모바일 카드 목록과 작은 화면 스크롤 등록 다이얼로그를 추가하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 리뷰/피드백 탭의 모바일 카드 목록과 작은 화면 스크롤 등록 다이얼로그를 추가하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 인수인계 배정 역할을 텍스트 코드 직접 입력에서 활성 프로젝트 멤버 역할 코드 선택으로 전환하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 요청/제안/전환 상세 담당자를 숫자 사용자 ID 직접 입력에서 현재 프로젝트 멤버 선택으로 전환하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 프로젝트 직접 관계 추가를 숫자 프로젝트 ID 직접 입력에서 프로젝트명/번호 검색 후 선택으로 전환하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 프로젝트 멤버 추가를 숫자 사용자 ID 직접 입력에서 프로젝트 문맥의 활성 공용 사용자 lookup 선택으로 전환하고 런칭 검증에 포함 |
| 2026-07-06 | PMS 서버/웹 TypeDoc reference 를 최신 소스로 재생성하고, 제거된 고객사 쓰기 DTO·mutation hook·관리 화면 문서가 stale reference 로 남지 않도록 런칭 검증에 포함 |
| 2026-07-06 | PMS 프로젝트 조직 supplier/partner 연결을 숫자 조직 ID 직접 입력에서 프로젝트 문맥의 읽기 전용 공용 조직 lookup 선택으로 전환하고 런칭 검증에 포함 |
| 2026-07-06 | 상태별 legacy 목록의 실제 동작 없는 삭제 alert 액션을 제거하고, 노출 PMS 메뉴가 실제 화면으로 연결되는지 런칭 검증에 포함 |
| 2026-07-06 | PMS 고객사 읽기 조회에 공용 조직 앵커 메타데이터 반환/검색/선택지 표기와 런타임 검증을 추가. 고객사 원장 편집과 공용 조직 full cutover 는 잔여로 유지 |
| 2026-07-06 | PMS core reconciliation foundation formal migration 파일을 db-init protected baseline 적용 경로에 묶고 `verify:pms-launch` 소스 검증에 포함 |
| 2026-07-06 | PMS 실행 자산 기준정보와 공유 반입 프로필 formal migration 파일을 db-init protected baseline 적용 경로에 묶고 `verify:pms-launch` 소스 검증에 포함 |
| 2026-07-06 | PMS 홈 요약에 리뷰/피드백 액션과 프로젝트 리뷰 탭 직접 진입 동선을 추가하고 런타임 smoke 검증에 포함 |
| 2026-07-06 | 프로젝트 상세 리뷰 탭에서 launch feedback 을 피드백 이슈/리뷰 이벤트로 직접 등록하는 표면과 런타임 smoke 검증을 추가 |
| 2026-07-06 | PMS 고객사 관리 CRUD 화면/API/mutation/쓰기 DTO export 를 제거하고 고객사 조회를 프로젝트 실행 선택용 읽기 표면으로 제한 |
| 2026-07-03 | 프로젝트 멤버 역할 선택을 `PROJECT_MEMBER_ROLE` 활성 코드 기반으로 고정하고, 정적 fallback 역할 목록 회귀를 `verify:pms-launch` 에서 차단 |
| 2026-07-03 | 프로젝트 상세 리뷰 탭으로 보고/리뷰 이벤트 요약과 피드백 큐를 1차 노출하되, 기존 PMS 전체 보고/PMR/PRR 자동화는 미완성 범위로 유지 |
| 2026-07-03 | `verify:pms-launch` 런타임 검증을 인증 후 프로젝트 상세/access/readiness/task/control/deliverable/close-condition/handoff/contract snapshot smoke 로 확장 |
| 2026-06-11 | PMS trigger installer coverage 연결: handoff/contract/payment/objective/WBS/project org/relation/control/event/project issue history trigger 를 `apply_all_triggers.sql` 경로에 포함하고 `verify:pms-launch` 검증 축에 추가 |
| 2026-06-08 | PMS 런칭 closeout 1차 보강: 홈 운영 포커스, 프로젝트 상세 closeout 패널, `verify:pms-launch` 전용 검증 명령 추가 |
| 2026-04-17 | PMS 병렬 세션 결과를 current baseline-close brief 로 고정하고, commit grouping / migration gap / 다음 tranche 를 정리 |
