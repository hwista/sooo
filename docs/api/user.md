# 사용자 API (User)

사용자 정보 관련 API 명세입니다.

## 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/users/profile` | 프로필 조회 | ✅ |

---

## GET /users/profile

현재 로그인한 사용자의 상세 프로필 정보 조회

### Request Header

```
Authorization: Bearer <access_token>
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "123",
    "loginId": "john.doe",
    "userName": "홍길동",
    "displayName": "홍길동 과장",
    "email": "john.doe@example.com",
    "phone": "010-1234-5678",
    "avatarUrl": "/uploads/avatars/123.jpg",
    "roleCode": "ROLE_USER",
    "userTypeCode": "INTERNAL",
    "departmentCode": "DEPT_DEV",
    "positionCode": "POS_MANAGER",
    "lastLoginAt": "2026-01-21T09:00:00.000Z"
  },
  "message": "프로필 조회 성공"
}
```

### 응답 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 사용자 ID (BigInt를 string으로 변환) |
| `loginId` | string | 로그인 아이디 |
| `userName` | string | 사용자 실명 |
| `displayName` | string \| null | 표시 이름 |
| `email` | string \| null | 이메일 주소 |
| `phone` | string \| null | 전화번호 |
| `avatarUrl` | string \| null | 프로필 이미지 URL |
| `roleCode` | string | 역할 코드 |
| `userTypeCode` | string | 사용자 유형 코드 |
| `departmentCode` | string \| null | 부서 코드 |
| `positionCode` | string \| null | 직급 코드 |
| `lastLoginAt` | string \| null | 마지막 로그인 일시 (ISO 8601) |

### 코드 값 참조

#### roleCode (역할 코드)

| 코드 | 설명 |
|------|------|
| `ROLE_ADMIN` | 시스템 관리자 |
| `ROLE_USER` | 일반 사용자 |
| `ROLE_VIEWER` | 조회 전용 |

#### userTypeCode (사용자 유형)

| 코드 | 설명 |
|------|------|
| `INTERNAL` | 내부 사용자 |
| `EXTERNAL` | 외부 사용자 |
| `PARTNER` | 협력사 |

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `UNAUTHORIZED` | 인증 실패 |
| 404 | `NOT_FOUND` | 사용자를 찾을 수 없음 |

---

## /auth/me vs /users/profile 차이점

| 항목 | /auth/me | /users/profile |
|------|----------|----------------|
| 용도 | 토큰 검증, 권한 확인 | 상세 프로필 조회 |
| 데이터 소스 | JWT Token Payload | Database |
| 응답 크기 | 작음 (5개 필드) | 큼 (11개 필드) |
| 성능 | 빠름 (DB 조회 없음) | 보통 (DB 조회 필요) |
| 사용 시점 | 페이지 로드, 권한 체크 | 프로필 페이지 |

---

## 관련 테이블

### cm_user_m (사용자 마스터)

```sql
-- 주요 컬럼
id               BIGINT PRIMARY KEY
login_id         VARCHAR(50)   -- 로그인 아이디
password_hash    VARCHAR(255)  -- 비밀번호 해시
user_name        VARCHAR(100)  -- 사용자 이름
display_name     VARCHAR(100)  -- 표시 이름
email            VARCHAR(200)  -- 이메일
phone            VARCHAR(20)   -- 전화번호
avatar_url       VARCHAR(500)  -- 프로필 이미지 URL
role_code        VARCHAR(20)   -- 역할 코드
user_type_code   VARCHAR(20)   -- 사용자 유형 코드
department_code  VARCHAR(20)   -- 부서 코드
position_code    VARCHAR(20)   -- 직급 코드
last_login_at    TIMESTAMP     -- 마지막 로그인 일시
is_active        BOOLEAN       -- 활성화 여부
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

---

## 구현 파일

- Controller: `apps/server/src/user/user.controller.ts`
- Service: `apps/server/src/user/user.service.ts`

## 관련 문서

- [API 명세서 개요](./README.md)
- [인증 API](./auth.md)
