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
      "projectName": "신규 시스템 구축",
      "statusCode": "execution",
      "stageCode": "in_progress",
      "memo": "프로젝트 설명...",
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
| `projectName` | string | 프로젝트명 |
| `statusCode` | string | 상태 코드 |
| `stageCode` | string | 단계 코드 |
| `memo` | string \| null | 설명 (메모) |
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
    "projectName": "신규 시스템 구축",
    "memo": "프로젝트 설명...",
    "statusCode": "execution",
    "stageCode": "in_progress",
    "doneResultCode": null,
    "currentOwnerUserId": "10",
    "customerId": "20",
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
  "projectName": "모바일 앱 개발",
  "description": "프로젝트 설명...",
  "statusCode": "request",
  "stageCode": "waiting",
  "customerId": "20",
  "ownerId": "10"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `projectName` | string | ✅ | 프로젝트명 |
| `description` | string | ❌ | 프로젝트 설명 (memo) |
| `statusCode` | string | ❌ | 상태 코드 (기본: request) |
| `stageCode` | string | ❌ | 단계 코드 (기본: waiting) |
| `customerId` | string | ❌ | 고객사 ID |
| `ownerId` | string | ❌ | 담당자 ID |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "2",
    "projectName": "모바일 앱 개발",
    "...": "..."
  }
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 |

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
  "statusCode": "execution",
  "stageCode": "in_progress",
  "doneResultCode": "completed"
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
| `request` | 요청 |
| `proposal` | 제안 |
| `execution` | 실행 |
| `transition` | 전환 |

## 프로젝트 단계 코드

| 코드 | 설명 |
|------|------|
| `waiting` | 대기 |
| `in_progress` | 진행 |
| `done` | 완료 |

---

## 관련 테이블

### pr_project_m (프로젝트)

```sql
-- 주요 컬럼
project_id             BIGINT PRIMARY KEY
project_name           VARCHAR(200)  -- 프로젝트명
status_code            VARCHAR(20)   -- 상태 코드
stage_code             VARCHAR(20)   -- 단계 코드
done_result_code       VARCHAR(30)   -- 종료 결과 코드
current_owner_user_id  BIGINT        -- 담당자 ID
customer_id            BIGINT        -- 고객사 ID
memo                   TEXT          -- 설명(메모)
is_active              BOOLEAN       -- 활성화 여부
created_at             TIMESTAMP
updated_at             TIMESTAMP
```

---

## 구현 파일

- Controller: `apps/server/src/modules/pms/project/project.controller.ts`
- Service: `apps/server/src/modules/pms/project/project.service.ts`
- DTO: `packages/types/src/project.ts`

## 관련 문서

- [API 명세서 개요](./README.md)
- [프로젝트 테이블 명세](../database/tables/pr_project.md)
