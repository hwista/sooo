# DMS 홈 워크 허브 설계 및 Ralph 실행 계획

> 작성일: 2026-08-20  
> 상태: 구현·Ralph·저장소 필수 gate 완료  
> 대상: `apps/server`, `apps/web/dms`, `packages/database`, `packages/types`, `docs/dms`

## 1. 목표

DMS 홈을 정적인 소개 화면에서 다음 다섯 질문에 실제 데이터로 답하는 개인화 작업 허브로 전환한다.

1. 지금 처리할 일은 무엇인가?
2. 어디까지 작업했는가?
3. 지난 방문 이후 무엇이 바뀌었는가?
4. 자주 쓰는 진입점은 어디인가?
5. 운영자가 알아야 할 비정상 상태가 있는가?

기존 `새 문서`, 통합 `AI 검색`, 사이드바 책갈피, 파일 트리, 알림센터, 설정/운영 복구 동선은 삭제하거나 흡수하지 않는다. 홈은 이 기능들의 요약과 진입점만 제공한다.

## 2. 현재 상태 증거

| 근거 | 확인 결과 | 설계 반영 |
|------|-----------|-----------|
| `DashboardPage.tsx` | 최근 문서가 일반 `div`이고 실제 동작·데이터가 없음 | 실제 영속 방문 데이터와 버튼 동작으로 대체 |
| 공용 `Button` | 기본 `inline-flex items-center whitespace-nowrap` | 카드형 버튼은 `flex-col items-start whitespace-normal` 배치로 텍스트 줄 결합 방지 |
| `tab.store.ts` | 열린 탭은 `sessionStorage`, 닫힌 탭은 소실 | 최근 문서의 정본으로 사용하지 않음 |
| `file.store.ts` | 책갈피는 사용자 스코프 `localStorage` | 홈 빠른 접근에서 동일 기기 책갈피로 재사용하고 범위를 명시 |
| `dm_document_m` | 경로·소유자·콘텐츠 동기화 시각·동기화 상태 존재 | `updatedAt`이 아닌 `lastSyncedAt` 기준 변경 문서와 복구 필요 문서 집계 |
| access request API | 내 승인 inbox·관리 문서 목록 존재 | 해야 할 일 집계 |
| settings readiness / collaboration / ingest | 운영 readiness·publish 실패·수집 큐 지표 존재 | 관리자 운영 예외 집계 |
| `dm_config_m` personal scope | 사용자별 JSON 설정 저장 가능 | 홈 마지막 확인 시각 저장 |
| dev DB 2026-08-20 | 활성 문서 86, 검색 기록 14, 개인 설정 2 | 빈 샘플이 아닌 실제 데이터 기준 검증 |
| Firefox 기준 화면 | 홈 렌더 성공, console warning/error 0 | 동일 환경 전후 비교 기준 |

## 3. 범위와 비범위

### 구현 범위

- 사용자별 최근 문서 방문 집계와 세션/기기 간 복원
- 홈 마지막 확인 시각과 지난 방문 이후 변경 문서
- 승인 대기·복구 필요 문서 기반 해야 할 일
- 기존 새 문서·통합 검색·책갈피 기반 빠른 접근
- 관리자 전용 readiness·publish·ingest 운영 예외
- 섹션별 `ready | empty | degraded` 상태와 부분 장애 격리
- 데스크톱/모바일 반응형, 키보드 포커스, 명시적 빈/오류 상태

### 비범위

- 헤더 알림센터 목록을 홈에 중복 표시
- 새 범용 결재/승인 워크플로우 발명
- 파일시스템 `atime`을 사용자 방문 기록으로 사용
- 로컬 책갈피의 서버 동기화 또는 새 핀 관리 UI
- 문서 편집기 커서/스크롤 위치 복원
- 홈에서 운영 설정값을 직접 변경하는 기능

## 4. 정보 구조

### 4.1 상단 브리핑

- 제목: `문서 업무 허브`
- 현재 응답 생성 시각과 `지난 방문 이후` 기준을 표시한다.
- `처리할 일`, `변경 문서`, `최근 문서`, 관리자에게만 `운영 예외` 건수를 한 줄 요약한다.
- 건수는 아래 섹션의 요약이며 별도 중복 목록을 만들지 않는다.

### 4.2 빠른 시작

- `새 문서 작성`: 기존 권한 fallback과 `/doc/new` 탭 동작 보존
- `통합 검색`: 기존 `/ssoo/search` 탭 동작 보존
- `내 책갈피`: 현재 사용자·현재 기기의 `file.store` 책갈피를 최대 4건 표시
- 권한이 없으면 기존처럼 비활성화하고 사유 문구를 표시한다.

### 4.3 이어서 작업

- 서버에 저장된 사용자별 최근 문서 최대 6건
- 제목, 경로, 마지막 열람 시각, 열람 횟수, 문서 갱신 여부 표시
- 클릭 시 기존 `useOpenDocumentTab`을 사용한다.
- 현재 읽기 권한을 잃었거나 파일이 사라진 문서는 응답에서 제외한다.

### 4.4 해야 할 일

- 내가 처리 가능한 pending 문서 접근 요청
- 내가 소유하고 `repair_needed`인 문서
- 각 항목은 실제 설정/문서 탭으로 연결한다.
- 헤더 알림센터와 중복되는 일반 알림은 포함하지 않는다.

### 4.5 지난 방문 이후 변경

- `home.lastSeenAt` 이후 콘텐츠/메타데이터가 동기화된 읽기 가능 문서 최대 6건
- 최초 방문이면 최근 변경 문서를 보여주고 `최근 변경`으로 표기한다.
- 제목, 소유자, 변경 시각, 동기화 상태를 표시한다.
- 홈 응답의 `generatedAt`을 렌더한 뒤 별도 확인 API로 기록한다.

### 4.6 운영 예외

- `canManageSettings=true`인 관리자에게만 표시한다.
- DMS readiness의 blocked/degraded check
- publish failure / sync-blocked
- ingest failed와 장기 pending 지표
- 정상일 때는 축약된 `운영 상태 정상`을 표시하고, 이상일 때만 원인과 설정 진입점을 표시한다.

## 5. 데이터 및 API 계약

### 5.1 사용자 문서 활동 모델

`dms.dm_user_document_activity_m`

| 필드 | 의미 |
|------|------|
| `user_document_activity_id` | BigInt PK |
| `user_id`, `document_id` | 사용자·문서 식별자, unique pair |
| `first_opened_at`, `last_opened_at` | 최초·최근 열람 시각 |
| `open_count` | 성공한 열람 횟수 |
| 공통 감사 필드 | 활성·생성·수정·source/activity/transaction |

- 문서 또는 사용자가 삭제되면 activity도 cascade한다.
- `user_id + last_opened_at` 인덱스로 최근 문서를 조회한다.
- DB 규칙에 따라 `_h` 히스토리 모델과 trigger를 함께 둔다.
- 방문 기록은 문서 읽기 권한 확인 뒤에만 upsert한다.

### 5.2 개인 설정

기존 `dm_config_m(scope_code='personal')` JSON에 아래만 추가한다.

```json
{
  "home": {
    "lastSeenAt": "2026-08-20T00:00:00.000Z"
  }
}
```

- 값이 없거나 잘못된 날짜면 최초 방문으로 처리한다.
- 다른 개인 설정 키를 보존하는 deep merge를 사용한다.

### 5.3 서버 API

#### `GET /api/dms/home`

- 인증 및 `canReadDocuments` 필수
- response section은 공통 envelope를 사용한다.

```ts
interface DmsHomeSection<T> {
  status: 'ready' | 'empty' | 'degraded';
  items: T[];
  reason?: string;
}
```

- 반환: `generatedAt`, `lastSeenAt`, `hasPreviousVisit`, `features`, `metrics`, `sections.{continueWorking,changes,actions,operations}`
- 선택 섹션 로더는 `Promise.allSettled` 또는 동등한 격리로 실행한다.
- 하나의 선택 섹션 실패는 해당 section만 `degraded`로 만들고 전체 응답은 `200`을 유지한다.
- 인증/권한/핵심 요청 형식 오류는 정상적으로 `4xx`로 실패한다.

#### `POST /api/dms/home/visits`

- body: `{ "path": "relative/document.md" }`
- 파일 존재·containment·읽기 권한·control-plane document를 확인한 뒤 activity upsert
- 잠긴 미리보기와 실패한 문서 로드는 기록하지 않는다.

#### `POST /api/dms/home/seen`

- body: `{ "seenAt": "GET 응답의 generatedAt" }`
- 미래 시각·잘못된 ISO 값 거부
- 기존 개인 설정을 보존하며 `home.lastSeenAt`만 갱신

### 5.4 same-origin 경계

브라우저는 `/api/home`, `/api/home/visits`, `/api/home/seen`만 호출하고, Next Route Handler가 기존 `serverApiProxy`로 Nest `/dms/home*`에 인증 cookie/header를 전달한다.

## 6. 장애·권한·개인정보 불변식

1. 다른 사용자의 방문 기록은 조회·갱신할 수 없다.
2. 현재 읽기 권한이 없는 문서는 최근/변경 목록에서 제외한다.
3. 운영 예외는 관리자에게만 반환하고 runtime path·remote credential은 홈에 노출하지 않는다.
4. activity/lastSeen 저장 실패가 문서 본문 열람을 막지 않는다.
5. 홈 선택 섹션 실패가 전체 홈 HTTP 500을 만들지 않는다.
6. 기존 파일 트리 오류·retry, 알림센터, 새 문서·검색 권한 fallback을 유지한다.
7. 항목이 0건인 것은 오류가 아니라 명시적 empty 상태다.
8. 서버 재기동·파일 목록 reconcile이 갱신하는 generic `dm_document_m.updated_at`은 최근 변경 정본으로 사용하지 않는다. 앱의 실제 콘텐츠/메타데이터 mutation만 `last_synced_at`을 전진시키며 단순 reconcile은 기존 값을 보존한다.

## 7. 구현 순서

1. 공유 타입과 Prisma activity/history 모델, launch migration, trigger 계약 추가
2. `HomeModule`의 집계·방문·seen 서비스/컨트롤러와 단위 테스트 추가
3. Ingest service export와 DMS module 연결, same-origin proxy/client/query hook 추가
4. 홈 페이지를 브리핑·빠른 시작·최근 문서·액션 큐·변경·운영 예외 컴포넌트로 분리 구현
5. 문서 성공 로드 뒤 비차단 visit 기록 연결
6. API/상태관리/컴포넌트/백로그/변경이력 문서 동기화
7. DB baseline, 타입, 서버 테스트, DMS guard, 실제 dev Docker migration/build/restart 수행
8. Ralph 데스크톱/모바일·권한·빈 상태·부분 장애·console/network 검증

## 8. 테스트 명세

### 8.1 코드·계약 검증

| ID | 검증 | 통과 기준 |
|----|------|-----------|
| TC-DMS-HOME-01 | 사용자 A/B activity 격리 | 각 사용자는 자신의 방문만 조회 |
| TC-DMS-HOME-02 | 방문 upsert | 동일 문서 재방문 시 count 증가, lastOpenedAt 갱신 |
| TC-DMS-HOME-03 | 권한 상실/파일 삭제 | 최근·변경 목록에서 제외 |
| TC-DMS-HOME-04 | lastSeen | 기존 personal JSON 보존, 미래/invalid 시각 거부 |
| TC-DMS-HOME-05 | section 장애 격리 | 한 로더 실패에도 `200`, 해당 section만 degraded |
| TC-DMS-HOME-06 | 관리자 경계 | 일반 사용자는 operationalExceptions 빈 상태, 관리자만 실제 probe |
| TC-DMS-HOME-07 | 읽기 전용 처리함 | 홈 조회가 control-plane 동기화 write를 호출하지 않음 |
| TC-DMS-HOME-08 | 콘텐츠 변경 시계 | 단순 reconcile은 `lastSyncedAt` 보존, 실제 metadata mutation만 전진 |
| TC-DMS-HOME-09 | DB 계약 | launch migration·activity history trigger·schema parity 통과 |
| TC-DMS-HOME-10 | 기존 기능 | 새 문서·검색 권한 fallback과 탭 경로 보존 |

### 8.2 Ralph 브라우저 검증

도구: `playwright-cli`, dev Docker `http://localhost:3003`

#### Flow A — 관리자 데스크톱 1440×1000

1. 로그인 후 홈 진입
2. 상단 브리핑, 빠른 시작, 이어서 작업, 해야 할 일, 변경, 운영 상태 확인
3. 새 문서와 통합 검색이 각각 기존 탭을 여는지 확인
4. 최근 문서를 열고 홈으로 돌아와 최근 목록·열람 시각 갱신 확인
5. 운영 예외가 readiness/publish/ingest 실제 상태와 일치하는지 확인

#### Flow B — 사용자 데스크톱

1. 일반 사용자 로그인
2. 자신의 최근·변경·액션만 보이는지 확인
3. 운영 예외 카드가 렌더되지 않는지 확인
4. 권한 없는 액션의 disabled 사유가 보이는지 확인

#### Flow C — 모바일 390×844

1. 홈 진입 후 단일 열 레이아웃 확인
2. 가로 스크롤 0, 텍스트 겹침/잘림 0
3. 빠른 시작과 문서 항목의 최소 터치 영역·키보드 focus 확인
4. 문서 열기 후 홈 복귀 동작 확인

#### Flow D — 빈 상태와 부분 장애

1. 방문 기록/변경/액션 0건 fixture에서 각 empty 문구 확인
2. 선택 집계 source 하나를 실패 주입해 전체 홈이 유지되고 해당 section만 복구 안내를 보이는지 확인
3. 실패 주입 원복 후 fresh reload에서 ready 복귀 확인

### 8.3 브라우저 차단 조건

- 관련 API 또는 local proxy 실패
- HTTP 5xx 또는 예상하지 않은 401/403
- console warning/error 또는 page runtime error
- 모바일 가로 스크롤·겹침·잘림
- 기존 새 문서/통합 검색/파일 트리/알림센터 동선 회귀
- 서버 집계와 화면 건수 불일치

## 9. 설계 게이트 감사

| 기준 | 결과 | 근거 |
|------|------|------|
| 실제 데이터로 구현 가능한가 | PASS | document/access/settings/collaboration/ingest와 dev DB 실데이터 확인 |
| 기존 기능을 보존하는가 | PASS | 기존 탭 hook·권한 store·책갈피 store를 그대로 재사용 |
| 중복 정보가 없는가 | PASS | 일반 알림은 헤더에 유지하고 홈 action queue에서 제외 |
| 사용자·권한 경계가 닫혀 있는가 | PASS | user/document pair와 응답 직전 ACL 재검증 |
| HTTP 500 재발 면역성이 있는가 | PASS | section envelope와 선택 로더 장애 격리 계약 |
| 운영/일반 사용자 역할이 분리되는가 | PASS | `canManageSettings` 기준 운영 예외 비노출 |
| 반응형·접근성 검증이 구체적인가 | PASS | 1440×1000, 390×844, focus/overflow/heading 명시 |
| 정본·마이그레이션·회귀 검증이 포함되는가 | PASS | 코드·DB·문서·Ralph 검증 순서와 차단 조건 명시 |

설계 게이트는 전 항목 PASS다. 구현 완료 판정은 위 테스트와 실제 브라우저 증거가 모두 통과한 뒤에만 가능하다.

## 10. Ralph 실행 결과

### 10.1 Docker·DB·API

- dev Compose의 `server`, `dms`, `postgres`가 모두 healthy이고 `/api/health/readiness`는 DB·DMS `ready`를 반환했다.
- `dm_user_document_activity_m/_h`와 `trg_dm_user_document_activity_h`가 실제 dev DB에 적용됐다.
- 같은 문서를 실제 브라우저에서 두 번 연 결과 activity `open_count=2`, history 2건으로 증가했고 문서 `last_synced_at=2026-08-19T08:04:10.346Z`는 변하지 않았다.
- 홈/파일 목록 재조회가 generic `updated_at`을 갱신하는 기존 reconcile 특성을 확인했으나, 홈 변경 집계는 해당 컬럼을 사용하지 않아 관리자 재진입 결과가 `방문 후 변경 0건`으로 유지됐다.

### 10.2 브라우저

| 흐름 | 결과 | 증거 |
|------|------|------|
| 관리자 1440×1000 | PASS | 영속 최근 문서 1건, 실제 API/화면 건수 일치, 새 문서·AI 검색 진입, 운영 readiness 상태 반영 |
| 일반 사용자 | PASS | `canManageSettings=false`, API `operations=empty`, 운영 요약/카드 미렌더 |
| 모바일 390×844 | PASS | `clientWidth=390`, `scrollWidth=390`, 가로 overflow 없음, 상·하단 카드 단일 열 배치 |
| 부분 장애/복구 | PASS | 한 section만 `degraded`와 `다시 시도` 표시, route 원복 후 실제 API로 즉시 복구 |
| 접근성/런타임 | PASS | Tab focus `outline 2px`, 관리자·일반 사용자 console error/warning 0 |

시각 증거는 `output/playwright/dms-home-hub-ralph/`의 `final-desktop-1440x1000.png`, `final-mobile-390x844.png`, `final-mobile-390x844-lower.png`, `final-user-1440x1000.png`, `final-degraded-section.png`에 보관했다. Linux headless Firefox의 CJK 폰트 부재는 캡처 glyph에만 영향을 주며 DOM 접근성 snapshot의 한글 문자열, 레이아웃 치수, Windows 사용자 화면 렌더와 분리해 판정했다.

### 10.3 최종 gate

- `pnpm run codex:preflight`: PASS
- `pnpm run codex:verify-sync`: PASS
- `pnpm run codex:dms-guard`: PASS (DMS production build 포함)
- `pnpm run docs:verify`: PASS
- DB launch contract: 9/9 PASS
- 홈·콘텐츠 변경 시계·개인 설정 server spec: 12/12 PASS
- dev Docker server/DMS production image build 및 healthy 재기동: PASS

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-20 | 실제 데이터/API/DB 경계를 확정하고 홈 워크 허브 구현, dev Docker 관리자·일반 사용자·모바일·부분 장애 Ralph 결과를 기록 |
| 2026-08-20 | generic `updatedAt` 재조정 부작용을 발견해 변경 정본을 `lastSyncedAt`으로 교체하고 홈 처리함을 read-only snapshot 조회로 분리 |
