# CRM 원천 데모 직접 테스트 가이드

> 기준일: 2026-08-18  
> 범위: 기능 `SRC-01~28`, UI/UX `UX-01~17`. 보호 발표자료는 선택 보조 자료

이 문서는 원천 데모 이식 결과를 개발 환경에서 사람이 직접 재현하는 최소 절차다. 완료 판정과 항목별 증거는 [원천 기능 패리티 매트릭스](../planning/source-parity-matrix.md)를 정본으로 사용한다.

## 1. 실행

```bash
pnpm install
pnpm run db:up
pnpm run db:push
pnpm run db:seed
pnpm run dev:server
```

별도 터미널에서 다음 앱을 실행한다.

```bash
pnpm --filter web-crm dev
pnpm --filter web-admin dev
pnpm --filter web-dms dev
```

기본 주소는 CRM `http://localhost:3001`, Admin `http://localhost:3000`, DMS `http://localhost:3003`, Server API `http://localhost:4000/api`다. 개발 seed 계정은 `admin` / `admin123!`이며 운영 환경에서는 사용하지 않는다.

## 2. 원천 seed 기준값

`pnpm run db:seed`는 다음 원천 표본을 idempotent하게 적용한다.

- 영업기회: 6개 group, 7개 version row, 53개 매출·원가 line
- 대시보드 최신 차수: 6건, 매출 합계 2,156,150,000원
- 삼성전자 ERP: 확정 1차와 미확정 2차가 함께 존재
- 계약: `crm-source-ct-001~005` 5건, 44개 line, 35개 청구계획, 5개 청구실적
- 원천 계약의 계약금액과 청구합계가 다른 경우도 원천값을 보존하며 화면에서 차이를 경고

원천 seed 정본은 `packages/database/prisma/seeds/52_crm_opportunities.sql`과 `packages/database/prisma/seeds/56_crm_source_contracts.sql`이다.

## 3. 핵심 사용자 시나리오

1. CRM 홈에서 영업기회 `6건`과 매출 `2,156,150,000원`을 확인한다.
2. 삼성전자 ERP를 열어 2차가 최신 미확정이고 1차가 확정 상태인지 확인한다. 매출 상품·용역과 원가 상품·내부용역·외부용역의 분류와 계산을 확인한다.
3. 새 영업기회를 전 필드로 저장한 뒤 재조회하고, 확정 → 새 차수 → 최신 미확정 삭제 → 이전 차수 자동 선택 규칙을 확인한다.
4. 확정 영업기회를 계약으로 전환하고 WBS와 계약 line을 저장한다. 기간 자동분할 후 매출·원가 분할합계의 차이가 0인지 확인한다.
5. 계약 확정 후 월별 청구실적을 저장하고 계약대비실적에서 계획·실적·차이를 확인한다. 확정 해제 후 실적 입력과 저장이 잠기는지 확인한다.
6. 견적/계약 문서에서 DMS에 등록한 실제 DOCX template을 선택해 산출하고, 다운로드한 DOCX를 열어 한글·금액·계약 변수가 치환됐는지 확인한다.
7. 사업계획에서 3개년 값, 12개월 매출·외부원가, 행 추가·수정·삭제, TSV 붙여넣기, 차수 확정·해제·삭제를 확인한다.
8. 원가/AMS에서 내부원가 고정 5개 항목, 업체 master CRUD, 다중 WBS, 업체×WBS 12개월 계획·실적 붙여넣기와 정산 잠금을 확인한다.
9. Admin에서 코드와 사업년도를 생성·수정·비활성·삭제하고 CRM 필터에 반영되는지 확인한다. 사용자 역할별로 조회/생성/수정/확정 권한이 제한되는지 확인한다.
10. 프로필·비밀번호 변경, 30분 idle 정책, 공급자 회사정보와 CI 업로드·문서 소비를 확인한다.

검증 중 만든 영업기회, 계약, 사용자, 코드, 사업년도와 업로드 파일은 확인 후 삭제한다. 원천 seed code를 운영 데이터처럼 수정하지 않는다.

## 4. 자동 회귀 게이트

`CRM_SOURCE_PROTOTYPE_DIR`는 `index.html`, `login.js`, `supabase_client.js`가 있는 실제 앱 루트를 지정한다. 다운로드 폴더가 동일 이름의 폴더를 한 번 더 감싼 현재 제공본처럼 sibling 없는 단일 wrapper라면 상위 wrapper 경로도 허용하며 verifier가 내부 유일 앱 루트를 자동 해석한다. wrapper에 파일이나 다른 폴더가 함께 있으면 잘못된 원천 선택을 막기 위해 실패한다.

```bash
pnpm run verify:crm-launch
pnpm run verify:crm-local
pnpm run verify:crm-migration-completion
pnpm run verify:crm-goal-contract
CRM_SOURCE_UIUX_MANIFEST=<source-uiux-manifest.json> CRM_TARGET_UIUX_MANIFEST=<target-uiux-parity-manifest.json> pnpm run verify:crm-uiux-parity:all
CRM_SOURCE_SAMPLE_DATABASE_NAME=<ssoo_crm_ralph_db> pnpm run verify:crm-source-sample
CRM_SOURCE_SAMPLE_DATABASE_NAME=<ssoo_crm_ralph_db> pnpm run verify:crm-source-sample:reseed
CRM_RALPH_DATABASE_NAME=<ssoo_crm_ralph_db> pnpm run verify:crm-domain-access-runtime
pnpm run docs:verify
pnpm run codex:preflight
pnpm run codex:verify-sync
```

`verify:crm-migration-completion:with-extensions`는 외부 회계 provider, 공용 AI/RAG provider, DRM 보호자료 reflection까지 요구하는 별도 확장 감사다. 이 확장 감사는 데모 패리티 분모를 대신하지 않는다. 데모 100%는 `verify:crm-goal-contract`의 REF-01 검사와 `SRC-01~28`·`UX-01~17`의 실제 fresh 증거가 함께 닫혀야 한다.

`verify:crm-uiux-parity:all`은 각 UX의 전체 필수 state에 대해 같은 이름의 source screenshot, 고유 desktop/mobile target screenshot, 구조·interaction·content visual diff, 허용 차이 분류, browser E0를 요구한다. target 정상 화면 하나나 기능 테스트만으로는 통과하지 않는다.
