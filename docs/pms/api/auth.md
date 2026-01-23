# 인증 API (Auth)

사용자 인증 관련 API 명세입니다.

## 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| POST | `/auth/login` | 로그인 | ❌ |
| POST | `/auth/refresh` | 토큰 갱신 | ❌ |
| POST | `/auth/logout` | 로그아웃 | ✅ |
| POST | `/auth/me` | 현재 사용자 정보 | ✅ |

---

## POST /auth/login

사용자 로그인 및 JWT 토큰 발급

### Request

```json
{
  "loginId": "string",
  "password": "string"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `loginId` | string | ✅ | 사용자 아이디 (최대 50자) |
| `password` | string | ✅ | 비밀번호 (4~100자) |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "로그인 성공"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `accessToken` | string | 접근 토큰 (15분 만료) |
| `refreshToken` | string | 갱신 토큰 (7일 만료) |

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `INVALID_CREDENTIALS` | 아이디 또는 비밀번호 불일치 |
| 400 | `VALIDATION_ERROR` | 필수 필드 누락 또는 형식 오류 |

---

## POST /auth/refresh

Access Token 갱신

### Request

```json
{
  "refreshToken": "string"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `refreshToken` | string | ✅ | 유효한 Refresh Token |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "토큰 갱신 성공"
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `INVALID_TOKEN` | 유효하지 않은 Refresh Token |
| 401 | `TOKEN_EXPIRED` | 만료된 Refresh Token |

---

## POST /auth/logout

사용자 로그아웃 (Refresh Token 무효화)

### Request Header

```
Authorization: Bearer <access_token>
```

### Request Body

없음

### Response (200 OK)

```json
{
  "success": true,
  "data": null,
  "message": "로그아웃 성공"
}
```

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `UNAUTHORIZED` | 유효하지 않은 Access Token |

---

## POST /auth/me

현재 로그인한 사용자의 기본 정보 조회

### Request Header

```
Authorization: Bearer <access_token>
```

### Request Body

없음

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "userId": "123",
    "loginId": "john.doe",
    "roleCode": "user",
    "userTypeCode": "internal",
    "isAdmin": false
  },
  "message": "사용자 정보 조회 성공"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | string | 사용자 ID (BigInt를 string으로 변환) |
| `loginId` | string | 로그인 아이디 |
| `roleCode` | string | 역할 코드 |
| `userTypeCode` | string | 사용자 유형 코드 |
| `isAdmin` | boolean | 관리자 여부 |

### 에러 응답

| HTTP Status | 에러 코드 | 상황 |
|-------------|----------|------|
| 401 | `UNAUTHORIZED` | 유효하지 않은 Access Token |

---

## JWT Token 구조

### Token Payload

```typescript
interface TokenPayload {
  userId: string;      // 사용자 ID
  loginId: string;     // 로그인 아이디
  roleCode: string;    // 역할 코드
  userTypeCode: string; // 사용자 유형 코드
  isAdmin: boolean;    // 관리자 여부
  type?: 'access' | 'refresh';
  iat: number;         // 발급 시간
  exp: number;         // 만료 시간
}
```

### 토큰 만료 시간

| 토큰 유형 | 만료 시간 |
|----------|----------|
| Access Token | 15분 |
| Refresh Token | 7일 |

---

## 구현 파일

- Controller: `apps/server/src/modules/common/auth/auth.controller.ts`
- Service: `apps/server/src/modules/common/auth/auth.service.ts`
- DTO: `apps/server/src/modules/common/auth/dto/login.dto.ts`
- Guard: `apps/server/src/modules/common/auth/guards/jwt-auth.guard.ts`

## 관련 문서

- [API 명세서 개요](./README.md)
- [인증 시스템 아키텍처](../architecture/auth-system.md)
