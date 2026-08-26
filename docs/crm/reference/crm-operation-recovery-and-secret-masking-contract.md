# CRM 운영 실패 복구·비밀정보 마스킹 계약

> 최종 업데이트: 2026-08-19  
> 적용 범위: CRM 외부 경계 attempt, DMS 실행·설정, Admin readiness bridge, 공용 HTTP 오류와 구조화 로그

## 목적

외부 경계 실행 실패를 성공처럼 축소하지 않고 원본 실패와 복구 chain을 감사 가능한 형태로 보존한다. 운영자가 CRM에서 원인을 확인하고 실제 소유 앱으로 이동해 원인을 수정한 뒤 안전하게 재시도할 수 있어야 한다. 응답, 오류, UI, 로그와 OpenAPI에는 credential 원문을 남기지 않는다.

## attempt·recovery 정본

- 최초 실행과 모든 재시도는 하나의 `correlationId`를 공유한다. 공용 DB 확장의 요청별 transaction 기본값보다 업무가 명시한 correlation을 우선한다.
- 원본 실패 row는 `failed` 상태와 sanitized `errorMessage`, `requestedBy`, `startedAt`, `finishedAt`을 유지한다. 복구 성공으로 원본을 `succeeded`로 덮어쓰지 않는다.
- 재시도 row는 `rootAttemptId`, `retryOfAttemptId`, `attemptNumber`로 원본과 연결한다.
- 응답은 `ownerHref`, `sourceHref`, `retryable`, `recoveryStatus`, `recoverySummary`를 제공한다. `retryable` 판정은 UI가 추측하지 않고 서버 정본을 따른다.
- 같은 chain에 `running` 또는 `succeeded` attempt가 있으면 반복 재시도를 `409`로 차단한다. 차단된 요청은 새 attempt나 DMS 산출물을 만들지 않는다.
- CRM `/operations`는 원본 실패 이유, correlation, 소유 화면, CRM 대상, 복구 상태를 desktop/mobile에서 표시한다.

## 비밀정보 경계

- 공용 redactor는 URL userinfo, Bearer/Basic 토큰, password/token/secret/api-key 계열 assignment와 query 값을 마스킹한다.
- HTTP exception filter는 message와 요청 URL을 redaction 후 반환·기록한다.
- CRM attempt는 error와 evidence를 저장하기 전에 redaction하고, 원래 예외 객체 대신 sanitized `HttpException`만 외부로 던진다.
- DMS logger는 message, error, 중첩 metadata 전체에 같은 redactor를 적용한다.
- 관리자 설정/readiness/attempt/history는 secret 원문을 반환하지 않는다. viewer는 DMS system config와 readiness 상세를 보지 못한다.
- OpenAPI는 synthetic credential marker나 런타임 secret 값을 포함하지 않는다.

## 검증 계약

### BT-21

`verify:crm-operation-recovery`는 전용 `ssoo_crm_ralph_*` DB에서 초안 없는 견적 DMS lifecycle을 의도적으로 실패시킨다. 실패 원장과 owner/source link를 확인하고 실제 초안을 생성해 원인을 수정한 뒤 원본 attempt를 재시도한다. 성공 child와 동일 correlation, 원본 실패 보존, 반복 재시도 `409`, artifact hash 불변, 중복 attempt 0을 검사한다.

브라우저 증거를 남긴 뒤 `cleanup:crm-operation-recovery`는 manifest에 기록된 정확한 attempt/history/handoff/AI job과 새 파일만 제거하고 opportunity 원값을 복원한다. DB residue와 파일 residue는 모두 0이어야 한다.

### BT-22

`verify:crm-secret-masking`는 합성 marker를 DMS immutable setting 오류, 잘못된 query, invalid Authorization에 주입한다. CRM/DMS settings·readiness·attempt, Admin bridge, viewer 제한, 오류 응답과 OpenAPI를 검사해 marker 노출 0을 요구한다. 공용 redactor·HTTP filter·DMS logger unit test가 구조화 로그까지 보완한다.

## 2026-08-19 S10 증거

- 격리 DB: `ssoo_crm_ralph_20260819_s8`
- 실패 attempt `#6` → retry `#7`, 동일 correlation, 원본 실패 1건/복구 완료 1건
- 반복 재시도 `409`, duplicate attempt 0, DOCX/PDF hash 불변, 생성 파일 5개
- desktop `1280`, mobile `390` document overflow 0, 두 화면 console error 0
- 합성 secret audit: 관리자 surface 8개, error/Authorization/OpenAPI marker leak 0, viewer system config hidden/readiness `403`
- cleanup: attempt/history/handoff/AI job/file residue 0
- 로컬 증거 manifest: `output/playwright/crm-ralph/20260819_s8-s10-operation-recovery.json`
