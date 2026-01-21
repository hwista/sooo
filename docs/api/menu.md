# 메뉴 API (Menu)

사용자 메뉴 및 즐겨찾기 관련 API 명세입니다.

## 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/menus/my` | 사용자 메뉴 트리 조회 | ✅ |
| POST | `/menus/favorites` | 즐겨찾기 추가 | ✅ |
| DELETE | `/menus/favorites/:menuId` | 즐겨찾기 삭제 | ✅ |

---

## GET /menus/my

현재 사용자의 메뉴 트리와 즐겨찾기 목록 조회

### Request Header

```
Authorization: Bearer <access_token>
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "generalMenus": [
      {
        "id": "1",
        "menuCode": "MENU_PROJECT",
        "menuName": "프로젝트",
        "menuPath": "/project",
        "iconCode": "folder",
        "sortOrder": 1,
        "depth": 1,
        "parentId": null,
        "children": [
          {
            "id": "2",
            "menuCode": "MENU_PROJECT_LIST",
            "menuName": "프로젝트 목록",
            "menuPath": "/project/list",
            "iconCode": "list",
            "sortOrder": 1,
            "depth": 2,
            "parentId": "1",
            "children": []
          }
        ]
      }
    ],
    "adminMenus": [
      {
        "id": "100",
        "menuCode": "MENU_ADMIN_USER",
        "menuName": "사용자 관리",
        "menuPath": "/admin/user",
        "iconCode": "users",
        "sortOrder": 1,
        "depth": 1,
        "parentId": null,
        "children": []
      }
    ],
    "favorites": [
      {
        "id": "1",
        "menuId": "2",
        "menuCode": "MENU_PROJECT_LIST",
        "menuName": "프로젝트 목록",
        "menuPath": "/project/list",
        "iconCode": "list"
      }
    ]
  }
}
```

### 응답 필드 설명

#### generalMenus / adminMenus (트리 구조)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 메뉴 ID |
| `menuCode` | string | 메뉴 코드 |
| `menuName` | string | 메뉴명 |
| `menuPath` | string \| null | 메뉴 경로 (URL) |
| `iconCode` | string \| null | 아이콘 코드 |
| `sortOrder` | number | 정렬 순서 |
| `depth` | number | 메뉴 깊이 (1부터 시작) |
| `parentId` | string \| null | 부모 메뉴 ID |
| `children` | array | 하위 메뉴 배열 |

#### favorites

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 즐겨찾기 ID |
| `menuId` | string | 메뉴 ID |
| `menuCode` | string | 메뉴 코드 |
| `menuName` | string | 메뉴명 |
| `menuPath` | string | 메뉴 경로 |
| `iconCode` | string \| null | 아이콘 코드 |

### 메뉴 분류 기준

- **generalMenus**: `menu_type = 'GENERAL'` 인 메뉴
- **adminMenus**: `menu_type = 'ADMIN'` 인 메뉴 (관리자에게만 표시)

---

## POST /menus/favorites

메뉴를 즐겨찾기에 추가

### Request Header

```
Authorization: Bearer <access_token>
```

### Request Body

```json
{
  "menuId": "2"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `menuId` | string | ✅ | 즐겨찾기에 추가할 메뉴 ID |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "1",
    "userId": "123",
    "menuId": "2",
    "createdAt": "2026-01-21T10:30:00.000Z"
  }
}
```

### 동작 방식

1. 이미 즐겨찾기에 있는 경우 (`is_active = false`):
   - `is_active = true`로 업데이트 (재활성화)
2. 즐겨찾기에 없는 경우:
   - 새 레코드 생성

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `UNAUTHORIZED` | 인증 실패 |
| 404 | `NOT_FOUND` | 존재하지 않는 메뉴 ID |

---

## DELETE /menus/favorites/:menuId

메뉴를 즐겨찾기에서 삭제

### Request Header

```
Authorization: Bearer <access_token>
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `menuId` | string | 삭제할 메뉴 ID |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "removed": true
  }
}
```

### 동작 방식

- **Soft Delete**: `is_active = false`로 업데이트
- 실제 레코드는 삭제되지 않음

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `UNAUTHORIZED` | 인증 실패 |

---

## 관련 테이블

### cm_menu_m (메뉴 마스터)

메뉴 정보를 저장하는 테이블

```sql
-- 주요 컬럼
id            BIGINT PRIMARY KEY
menu_code     VARCHAR(50)   -- 메뉴 코드
menu_name     VARCHAR(100)  -- 메뉴명
menu_path     VARCHAR(200)  -- URL 경로
icon_code     VARCHAR(50)   -- 아이콘 코드
menu_type     VARCHAR(20)   -- GENERAL | ADMIN
parent_id     BIGINT        -- 부모 메뉴 ID
sort_order    INT           -- 정렬 순서
depth         INT           -- 메뉴 깊이
```

### cm_user_favorite_r (즐겨찾기)

사용자별 즐겨찾기 정보를 저장하는 테이블

```sql
-- 주요 컬럼
id         BIGINT PRIMARY KEY
user_id    BIGINT    -- 사용자 ID
menu_id    BIGINT    -- 메뉴 ID
is_active  BOOLEAN   -- 활성화 여부 (soft delete)
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## 구현 파일

- Controller: `apps/server/src/menu/menu.controller.ts`
- Service: `apps/server/src/menu/menu.service.ts`

## 관련 문서

- [API 명세서 개요](./README.md)
- [메뉴 구조](../domain/menu-structure.md)
