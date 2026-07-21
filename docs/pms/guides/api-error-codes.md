# PMS API 오류 코드 가이드

> 최종 업데이트: 2026-07-08
> 범위: PMS 런칭 API 오류 응답 1차 계약

---

## 목적

PMS 런칭 화면과 검증 도구가 서버 오류를 화면/로그에서 같은 방식으로 해석할 수 있도록 PMS API 경로의 오류 응답 코드를 `PMS_*` 형식으로 고정한다.

이 문서는 PMS 실행 프로젝트, 읽기용 고객 조회, 코드/메뉴/역할, 실행 자산 기준정보, 홈 요약 API의 오류 계약만 다룬다. CRM 계약/청구/매출/고객 원장 쓰기 오류는 PMS가 소유한다고 주장하지 않는다.

---

## 응답 형식

PMS API 오류 응답은 다음 필드를 포함한다.

```json
{
  "success": false,
  "error": {
    "code": "PMS_INVALID_IDENTIFIER",
    "message": "유효한 프로젝트 식별자가 아닙니다.",
    "path": "/api/projects/not-a-number/access",
    "statusCode": 400
  },
  "timestamp": "2026-07-08T00:00:00.000Z"
}
```

| 필드 | 의미 |
|------|------|
| `success` | 실패 응답은 항상 `false` |
| `error.code` | 화면과 검증에서 사용할 안정적인 PMS 오류 코드 |
| `error.message` | 사용자 또는 운영자가 읽을 수 있는 원문 메시지 |
| `error.path` | 실패한 요청 경로 |
| `error.statusCode` | HTTP 상태 코드 메타데이터 |
| `timestamp` | 서버 응답 시각 |

---

## 런칭 기준 코드

| 코드 | HTTP 상태 | 의미 |
|------|-----------|------|
| `PMS_AUTHENTICATION_REQUIRED` | 401 | 인증 정보가 없거나 유효하지 않음 |
| `PMS_PROJECT_PERMISSION_DENIED` | 403 | 해당 프로젝트에 필요한 PMS 권한이 없음 |
| `PMS_PERMISSION_DENIED` | 403 | PMS API 접근 권한이 없음 |
| `PMS_INVALID_IDENTIFIER` | 400 | 프로젝트, 고객, 조직, 멤버, 기준정보 등의 식별자 형식이 올바르지 않음 |
| `PMS_INVALID_RELATION` | 400 | 자기 자신 참조, 다른 고객/사이트/목표 트리 참조 등 관계가 올바르지 않음 |
| `PMS_STAGE_TRANSITION_BLOCKED` | 400 | 단계 전이, 산출물, 종료조건 규칙 때문에 요청을 처리할 수 없음 |
| `PMS_MASTER_IMPORT_INVALID` | 400 | 실행 자산 기준정보 반입 파일, 컬럼 매핑, 행 데이터가 올바르지 않음 |
| `PMS_REFERENCE_INACTIVE` | 400 | 비활성 참조 데이터를 사용하려고 함 |
| `PMS_REFERENCE_NOT_FOUND` | 400 | 요청에 포함된 참조 데이터를 찾지 못함 |
| `PMS_REQUIRED_FIELD_MISSING` | 400 | 필수 입력값이 누락됨 |
| `PMS_BAD_REQUEST` | 400 | 위 세부 코드로 분류되지 않는 PMS 잘못된 요청 |
| `PMS_PROJECT_NOT_FOUND` | 404 | 프로젝트를 찾지 못함 |
| `PMS_CUSTOMER_NOT_FOUND` | 404 | 읽기용 고객 조회 대상을 찾지 못함 |
| `PMS_PROJECT_MEMBER_NOT_FOUND` | 404 | 프로젝트 멤버를 찾지 못함 |
| `PMS_PROJECT_ORGANIZATION_NOT_FOUND` | 404 | 프로젝트 연결 조직을 찾지 못함 |
| `PMS_PROJECT_RELATION_NOT_FOUND` | 404 | 프로젝트 관계를 찾지 못함 |
| `PMS_DELIVERABLE_NOT_FOUND` | 404 | 산출물을 찾지 못함 |
| `PMS_CLOSE_CONDITION_NOT_FOUND` | 404 | 종료조건을 찾지 못함 |
| `PMS_CONTROL_OBJECT_NOT_FOUND` | 404 | PMS 통제 객체를 찾지 못함 |
| `PMS_TASK_NOT_FOUND` | 404 | 작업을 찾지 못함 |
| `PMS_MILESTONE_NOT_FOUND` | 404 | 마일스톤을 찾지 못함 |
| `PMS_OBJECTIVE_NOT_FOUND` | 404 | 목표를 찾지 못함 |
| `PMS_WBS_NOT_FOUND` | 404 | WBS를 찾지 못함 |
| `PMS_MASTER_REFERENCE_NOT_FOUND` | 404 | 실행 자산 기준정보를 찾지 못함 |
| `PMS_RESOURCE_NOT_FOUND` | 404 | 위 세부 코드로 분류되지 않는 PMS 리소스 없음 |
| `PMS_PROJECT_MEMBER_CONFLICT` | 409 | 이미 존재하는 프로젝트 멤버 관계 |
| `PMS_PROJECT_RELATION_CONFLICT` | 409 | 이미 존재하거나 충돌하는 프로젝트 관계 |
| `PMS_MASTER_IMPORT_PROFILE_CONFLICT` | 409 | 실행 자산 반입 프로필 충돌 |
| `PMS_DUPLICATE_RESOURCE` | 409 | 중복 리소스 |
| `PMS_CONFLICT` | 409 | 위 세부 코드로 분류되지 않는 PMS 충돌 |
| `PMS_RATE_LIMITED` | 429 | 요청 제한 초과 |
| `PMS_INTERNAL_ERROR` | 500 이상 | PMS API 처리 중 서버 내부 오류 |
| `PMS_HTTP_{status}` | 기타 | 아직 세부 분류가 없는 PMS HTTP 오류 |

---

## 운영 기준

- 화면은 `error.code`를 기준으로 사용자 메시지, 재시도 여부, 권한 안내를 분기한다.
- 런칭 검증은 대표 식별자 오류가 `PMS_INVALID_IDENTIFIER`와 HTTP 상태 메타데이터를 반환하는지 확인한다.
- 새 PMS API가 세부 오류를 직접 던질 때는 `PMS_*` 코드를 유지한다.
- 공용/CRM/Admin이 소유하는 원장 오류를 PMS 완료 범위로 흡수하지 않는다.

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | PMS API 오류 응답의 `PMS_*` 상세 코드와 HTTP 상태 메타데이터 기준을 문서화 |
