# 프로젝트 API (Project)

프로젝트 관리 관련 API 명세입니다.

## 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/projects` | 프로젝트 목록 조회 | ✅ |
| GET | `/projects/:id` | 프로젝트 상세 조회 | ✅ |
| POST | `/projects` | 프로젝트 생성 | ✅ |
| PUT | `/projects/:id` | 프로젝트 수정 | ✅ |
| DELETE | `/projects/:id` | 프로젝트 삭제 | ✅ |

---

## GET /projects

프로젝트 목록 조회 (페이지네이션 지원)

### Request Header

```
Authorization: Bearer <access_token>
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `page` | number | ❌ | 1 | 페이지 번호 |
| `limit` | number | ❌ | 10 | 페이지당 항목 수 |

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "projectCode": "PRJ-2026-001",
      "projectName": "신규 시스템 구축",
      "statusCode": "IN_PROGRESS",
      "startDate": "2026-01-01",
      "endDate": "2026-12-31",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

### 응답 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 프로젝트 ID |
| `projectCode` | string | 프로젝트 코드 |
| `projectName` | string | 프로젝트명 |
| `statusCode` | string | 상태 코드 |
| `startDate` | string | 시작일 (YYYY-MM-DD) |
| `endDate` | string | 종료일 (YYYY-MM-DD) |
| `createdAt` | string | 생성일시 (ISO 8601) |

---

## GET /projects/:id

프로젝트 상세 정보 조회

### Request Header

```
Authorization: Bearer <access_token>
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | 프로젝트 ID |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "1",
    "projectCode": "PRJ-2026-001",
    "projectName": "신규 시스템 구축",
    "description": "프로젝트 설명...",
    "statusCode": "IN_PROGRESS",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "budget": 100000000,
    "managerId": "10",
    "departmentCode": "DEPT_DEV",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 404 | `NOT_FOUND` | 프로젝트를 찾을 수 없음 |

---

## POST /projects

새 프로젝트 생성

### Request Header

```
Authorization: Bearer <access_token>
```

### Request Body

```json
{
  "projectCode": "PRJ-2026-002",
  "projectName": "모바일 앱 개발",
  "description": "프로젝트 설명...",
  "statusCode": "PLANNING",
  "startDate": "2026-02-01",
  "endDate": "2026-08-31",
  "budget": 50000000,
  "managerId": "10",
  "departmentCode": "DEPT_DEV"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `projectCode` | string | ✅ | 프로젝트 코드 (고유) |
| `projectName` | string | ✅ | 프로젝트명 |
| `description` | string | ❌ | 프로젝트 설명 |
| `statusCode` | string | ❌ | 상태 코드 (기본: PLANNING) |
| `startDate` | string | ❌ | 시작일 (YYYY-MM-DD) |
| `endDate` | string | ❌ | 종료일 (YYYY-MM-DD) |
| `budget` | number | ❌ | 예산 |
| `managerId` | string | ❌ | 담당자 ID |
| `departmentCode` | string | ❌ | 부서 코드 |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "2",
    "projectCode": "PRJ-2026-002",
    "projectName": "모바일 앱 개발",
    "...": "..."
  }
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 |
| 409 | `DUPLICATE_CODE` | 중복된 프로젝트 코드 |

---

## PUT /projects/:id

프로젝트 정보 수정

### Request Header

```
Authorization: Bearer <access_token>
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | 프로젝트 ID |

### Request Body

```json
{
  "projectName": "수정된 프로젝트명",
  "statusCode": "IN_PROGRESS",
  "endDate": "2026-12-31"
}
```

모든 필드는 선택적입니다. 전달된 필드만 업데이트됩니다.

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "1",
    "projectName": "수정된 프로젝트명",
    "...": "..."
  }
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 404 | `NOT_FOUND` | 프로젝트를 찾을 수 없음 |
| 400 | `VALIDATION_ERROR` | 유효하지 않은 데이터 |

---

## DELETE /projects/:id

프로젝트 삭제

### Request Header

```
Authorization: Bearer <access_token>
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string | 프로젝트 ID |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 404 | `NOT_FOUND` | 프로젝트를 찾을 수 없음 |

---

## 프로젝트 상태 코드

| 코드 | 설명 |
|------|------|
| `PLANNING` | 기획 중 |
| `IN_PROGRESS` | 진행 중 |
| `ON_HOLD` | 보류 |
| `COMPLETED` | 완료 |
| `CANCELLED` | 취소 |

---

## 관련 테이블

### pr_project (프로젝트)

```sql
-- 주요 컬럼
id               BIGINT PRIMARY KEY
project_code     VARCHAR(50)   -- 프로젝트 코드
project_name     VARCHAR(200)  -- 프로젝트명
description      TEXT          -- 설명
status_code      VARCHAR(20)   -- 상태 코드
start_date       DATE          -- 시작일
end_date         DATE          -- 종료일
budget           DECIMAL       -- 예산
manager_id       BIGINT        -- 담당자 ID
department_code  VARCHAR(20)   -- 부서 코드
is_active        BOOLEAN       -- 활성화 여부
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

---

## 구현 파일

- Controller: `apps/server/src/project/project.controller.ts`
- Service: `apps/server/src/project/project.service.ts`
- DTO: `packages/types/src/project.ts`

## 관련 문서

- [API 명세서 개요](./README.md)
- [프로젝트 테이블 명세](../database/tables/pr_project.md)
