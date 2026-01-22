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
        "menuId": "1",
        "menuCode": "MENU_PROJECT",
        "menuName": "프로젝트",
        "menuPath": "/project",
        "icon": "folder",
        "sortOrder": 1,
        "menuLevel": 1,
        "parentMenuId": null,
        "children": [
          {
            "menuId": "2",
            "menuCode": "MENU_PROJECT_LIST",
            "menuName": "프로젝트 목록",
            "menuPath": "/project/list",
            "icon": "list",
            "sortOrder": 1,
            "menuLevel": 2,
            "parentMenuId": "1",
            "children": []
          }
        ]
      }
    ],
    "adminMenus": [
      {
        "menuId": "100",
        "menuCode": "MENU_ADMIN_USER",
        "menuName": "사용자 관리",
        "menuPath": "/admin/user",
        "icon": "users",
        "sortOrder": 1,
        "menuLevel": 1,
        "parentMenuId": null,
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
        "icon": "list"
      }
    ]
  }
}
```

### 응답 필드 설명

#### generalMenus / adminMenus (트리 구조)

| 필드 | 타입 | 설명 |
|------|------|------|
| `menuId` | string | 메뉴 ID |
| `menuCode` | string | 메뉴 코드 |
| `menuName` | string | 메뉴명 |
| `menuPath` | string \| null | 메뉴 경로 (URL) |
| `icon` | string \| null | 아이콘 코드 |
| `sortOrder` | number | 정렬 순서 |
| `menuLevel` | number | 메뉴 깊이 (1부터 시작) |
| `parentMenuId` | string \| null | 부모 메뉴 ID |
| `children` | array | 하위 메뉴 배열 |

#### favorites

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 즐겨찾기 ID |
| `menuId` | string | 메뉴 ID |
| `menuCode` | string | 메뉴 코드 |
| `menuName` | string | 메뉴명 |
| `menuPath` | string | 메뉴 경로 |
| `icon` | string \| null | 아이콘 코드 |

### 메뉴 분류 기준

- **generalMenus**: `is_admin_menu = false` 인 메뉴
- **adminMenus**: `is_admin_menu = true` 인 메뉴 (관리자에게만 표시)

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
menu_id        BIGINT PRIMARY KEY
menu_code      VARCHAR(50)   -- 메뉴 코드
menu_name      VARCHAR(100)  -- 메뉴명
menu_path      VARCHAR(200)  -- URL 경로
icon           VARCHAR(50)   -- 아이콘 코드
menu_type      VARCHAR(20)   -- group | menu | action
parent_menu_id BIGINT        -- 부모 메뉴 ID
sort_order     INT           -- 정렬 순서
menu_level     INT           -- 메뉴 깊이
is_admin_menu  BOOLEAN       -- 관리자 전용 여부
```

### cm_user_favorite_r (즐겨찾기)

사용자별 즐겨찾기 정보를 저장하는 테이블

```sql
-- 주요 컬럼
user_favorite_id BIGINT PRIMARY KEY
user_id          BIGINT    -- 사용자 ID
menu_id          BIGINT    -- 메뉴 ID
sort_order       INT       -- 정렬 순서
is_active        BOOLEAN   -- 활성화 여부 (soft delete)
created_at       TIMESTAMP
```

---

## 구현 파일

- Controller: `apps/server/src/menu/menu.controller.ts`
- Service: `apps/server/src/menu/menu.service.ts`
- DatabaseService: `apps/server/src/database/database.service.ts`

## 관련 문서

- [API 명세서 개요](./README.md)
- [메뉴 구조](../domain/menu-structure.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| MNU-01 | 즐겨찾기 순서 변경 API | P3 | 🔲 대기 |
| MNU-02 | 메뉴 검색 API | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 메뉴 응답/테이블 필드 정합화 (menuId, menuLevel, icon 등) |
| 2026-01-21 | 즐겨찾기 API 버그 수정 (Prisma 모델명/필드명 수정) |
| 2026-01-21 | Backlog/Changelog 섹션 추가 |
