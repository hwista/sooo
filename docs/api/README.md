# API 명세서

SSOO 백엔드 서버의 REST API 명세 문서입니다.

## 기본 정보

- **Base URL**: `/api`
- **Content-Type**: `application/json`
- **인증 방식**: JWT Bearer Token
- **OpenAPI JSON**: `/api/openapi.json`

## 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { ... },
  "message": "선택적 메시지"
}
```

### 페이지네이션 응답

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

## 공통 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | 인증되지 않은 요청 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `VALIDATION_ERROR` | 400 | 유효성 검사 실패 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

## API 목록

### 헬스체크 (Health)
| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/health` | 서버 상태 확인 | ❌ |

➡️ [헬스체크 API 상세](./health.md)

### 인증 (Auth)
| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| POST | `/auth/login` | 로그인 | ❌ |
| POST | `/auth/refresh` | 토큰 갱신 | ❌ |
| POST | `/auth/logout` | 로그아웃 | ✅ |
| POST | `/auth/me` | 현재 사용자 정보 | ✅ |

➡️ [인증 API 상세](./auth.md)

### 메뉴 (Menu)
| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/menus/my` | 사용자 메뉴 트리 조회 | ✅ |
| POST | `/menus/favorites` | 즐겨찾기 추가 | ✅ |
| DELETE | `/menus/favorites/:menuId` | 즐겨찾기 삭제 | ✅ |

➡️ [메뉴 API 상세](./menu.md)

### 사용자 (User)
| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/users/profile` | 프로필 조회 | ✅ |

➡️ [사용자 API 상세](./user.md)

### 프로젝트 (Project)
| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/projects` | 프로젝트 목록 조회 | ✅ |
| GET | `/projects/:id` | 프로젝트 상세 조회 | ✅ |
| POST | `/projects` | 프로젝트 생성 | ✅ |
| PUT | `/projects/:id` | 프로젝트 수정 | ✅ |
| DELETE | `/projects/:id` | 프로젝트 삭제 | ✅ |

➡️ [프로젝트 API 상세](./project.md)

## 인증

JWT Bearer Token을 사용합니다. 인증이 필요한 요청에는 `Authorization` 헤더를 포함해야 합니다.

```
Authorization: Bearer <access_token>
```

### 토큰 만료 시

1. `401 Unauthorized` 응답 수신
2. Refresh Token으로 `/auth/refresh` 호출
3. 새로운 Access Token으로 원래 요청 재시도

## 관련 문서

- [인증 시스템 아키텍처](../architecture/auth-system.md)
- [데이터베이스 테이블](../database/README.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| API-01 | Health Check API 문서화 | P3 | 🔲 대기 |
| API-02 | 에러 응답 상세 코드 정의 | P2 | 🔲 대기 |
| API-03 | API 버전 관리 정책 수립 | P4 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | Project/User/Menu API 명세 정합화 |
| 2026-01-21 | Health API 문서 추가 |
| 2026-01-21 | API 명세서 최초 작성 (auth, menu, user, project) |
| 2026-01-21 | 즐겨찾기 API 추가 (POST/DELETE /menus/favorites) |
