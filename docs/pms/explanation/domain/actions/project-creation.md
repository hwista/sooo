# Action Spec — A01 프로젝트(요청) 등록

## 구현 상태

- 상태: ✅ 기본 구현 완료 (히스토리 미구현)
- 최종 검증일: 2026-07-06
- 현재 기준:
  - `ProjectService.create` 기준 기본 필드 생성됨
  - 고객사는 PMS 고객사 원장 입력이 아니라 읽기용 고객 조회 선택값으로 전달됨
  - Plant/Site, System Instance 선택값은 프로젝트 생성 시 정합성 검증 대상임
  - 히스토리(`pr_project_h`) 및 상태 상세(`pr_project_status_m`) 테이블 생성 로직은 미구현

---

## 1) 목적

CRM 인계 또는 내부 접수된 실행 후보를 PMS 요청 프로젝트로 등록하여 "일을 모으는" 시작점 생성

## 2) Actor

- 영업, AM

## 3) 입력(필수/선택)

### CreateProjectDto (실제 구현)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `projectName` | string | ✅ | 프로젝트명 |
| `description` | string | ❌ | 설명 (memo 컬럼에 저장) |
| `customerId` | string | ❌ | 읽기용 고객 조회에서 선택한 고객사 참조값 |
| `plantId` | string | ❌ | 선택 고객사에 연결된 Plant/Site 참조값 |
| `systemInstanceId` | string | ❌ | 선택 고객사/사이트에 연결된 System Instance 참조값 |
| `statusCode` | string | ❌ | 상태 코드 (기본: `request`) |
| `stageCode` | string | ❌ | 단계 코드 (기본: `waiting`) |

## 4) 상태 변경

- `pr_project_m`:
  - `status_code` = request (기본값)
  - `stage_code` = waiting (기본값)
  - `done_result_code` = NULL
  - `current_owner_user_id` = ownerId (선택)

## 5) DB 영향

### 현재 구현

- INSERT `pr_project_m` (1 row)

### 미구현 (향후 계획)

- INSERT `pr_project_h` (C 스냅샷 1 row)
- INSERT `pr_project_status_m`: (project_id, request) 상세 row

## 6) Validation

- `projectName` 필수 (non-empty)
- `statusCode` 기본값: `request`
- `stageCode` 기본값: `waiting`

## 7) API 엔드포인트

```
POST /api/projects
Authorization: Bearer {accessToken}
Body: {
  "projectName": "신규 프로젝트",
  "description": "프로젝트 설명",
  "customerId": "1001",
  "plantId": "2001",
  "systemInstanceId": "3001"
}
Response: {
  "success": true,
  "data": {
    "id": "1",
    "projectName": "신규 프로젝트",
    "statusCode": "request",
    "stageCode": "waiting",
    ...
  }
}
```

## 8) 관련 파일

| 파일 | 역할 |
|------|------|
| `apps/server/src/modules/pms/project/project.controller.ts` | API 엔드포인트 |
| `apps/server/src/modules/pms/project/project.service.ts` | 비즈니스 로직 |
| `packages/types/src/pms/project.ts` | DTO 타입 정의 |

## 9) 실패/에러

- 중복 등록 방지는 MVP에서는 강제하지 않음
- 추후 customer+name+기간 유사도 경고 가능

## Changelog

| Date | Change |
|------|--------|
| 2026-07-06 | 고객사 입력을 읽기용 고객 조회 선택값으로 설명하고 Plant/Site, System Instance 선택 검증 기준을 현행화했다. |
| 2026-02-09 | Add changelog section. |
