# 인증 시스템 (Authentication)

> 최종 업데이트: 2026-01-20

## 1. 개요

SSOO 시스템의 인증은 JWT(JSON Web Token) 기반으로 구현되어 있습니다.

### 1.1 토큰 구성

| 토큰 종류 | 만료 시간 | 용도 |
|----------|----------|------|
| Access Token | 15분 | API 요청 인증 |
| Refresh Token | 7일 | Access Token 갱신 |

### 1.2 환경 변수 (apps/server/.env)

```env
JWT_SECRET=ssoo-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=ssoo-jwt-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 2. 인증 흐름

### 2.1 로그인 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ POST /api/auth/login  │               │
     │ {loginId, password}                   │
     │──────────────────>│                   │
     │                   │ findByLoginId     │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ bcrypt.compare    │
     │                   │ (password)        │
     │                   │                   │
     │                   │ generateTokens    │
     │                   │ (access+refresh)  │
     │                   │                   │
     │                   │ saveRefreshHash   │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │ {accessToken,     │                   │
     │  refreshToken}    │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ localStorage에 저장                    │
     │ (ssoo-auth)       │                   │
     │                   │                   │
```

### 2.2 API 요청 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ GET /api/menus/my │                   │
     │ Authorization:    │                   │
     │ Bearer <token>    │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ JWT 검증          │
     │                   │ (JwtStrategy)     │
     │                   │                   │
     │                   │ ┌───────────────┐ │
     │                   │ │ 만료? → 401   │ │
     │                   │ │ 유효? → 계속  │ │
     │                   │ └───────────────┘ │
     │                   │                   │
     │                   │ 사용자 상태 확인  │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │ 응답 데이터       │                   │
     │<──────────────────│                   │
```

### 2.3 토큰 갱신 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 401 Unauthorized  │                   │
     │ (Access Token 만료)                   │
     │                   │                   │
     │ POST /api/auth/refresh│               │
     │ {refreshToken}    │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ JWT 검증          │
     │                   │ (refresh secret)  │
     │                   │                   │
     │                   │ 저장된 hash와 비교│
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ 새 토큰 생성      │
     │                   │ (access+refresh)  │
     │                   │                   │
     │ {accessToken,     │                   │
     │  refreshToken}    │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ 원래 요청 재시도  │                   │
     │──────────────────>│                   │
```

---

## 3. 클라이언트 구현

### 3.1 인증 상태 저장 (Zustand + localStorage)

```typescript
// stores/auth.store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      // ...
    }),
    {
      name: 'ssoo-auth',  // localStorage 키
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

### 3.2 앱 시작 시 인증 체크

앱이 시작되면 항상 서버에서 토큰 유효성을 검증합니다:

```typescript
// app/(main)/layout.tsx
useEffect(() => {
  const check = async () => {
    await checkAuth();  // 서버에서 토큰 검증
    setIsChecking(false);
  };
  check();
}, [checkAuth]);
```

### 3.3 checkAuth 로직

```typescript
checkAuth: async () => {
  // 1. 토큰이 없으면 미인증
  if (!accessToken && !refreshToken) {
    set({ isAuthenticated: false });
    return;
  }

  // 2. Access Token으로 /auth/me 호출
  try {
    const meResponse = await authApi.me(accessToken);
    if (meResponse.success) {
      set({ user: meResponse.data, isAuthenticated: true });
      return;
    }
  } catch {
    // Access Token 만료 → Refresh 시도
  }

  // 3. Refresh Token으로 재인증
  try {
    const success = await refreshTokens();
    if (success) {
      // 새 Access Token으로 다시 /auth/me 호출
      // ...
    }
  } catch {
    // 모든 시도 실패
  }

  // 4. 모두 실패 → 인증 초기화
  clearAuth();
}
```

---

## 4. 보안 고려사항

### 4.1 토큰 저장 위치

| 저장 위치 | 장점 | 단점 | 현재 사용 |
|----------|------|------|----------|
| localStorage | 구현 간단, 탭 간 공유 | XSS 취약 | ✅ |
| httpOnly Cookie | XSS 안전 | CSRF 취약, 구현 복잡 | ❌ |
| Memory | 가장 안전 | 새로고침 시 손실 | ❌ |

> ⚠️ 운영 환경에서는 httpOnly Cookie 사용을 권장합니다.

### 4.2 토큰 만료 처리

1. **Access Token 만료 (15분)**
   - 401 응답 시 자동으로 Refresh Token으로 갱신
   - 갱신 성공 시 원래 요청 자동 재시도

2. **Refresh Token 만료 (7일)**
   - 갱신 실패 시 로그인 페이지로 이동
   - localStorage 인증 정보 삭제

### 4.3 서버 재시작 시 처리

- JWT Secret이 동일하면 이전 토큰도 유효
- Refresh Token은 DB에 해시로 저장되어 있어 검증 가능
- 클라이언트는 앱 시작 시 항상 `checkAuth()`로 서버 검증

---

## 5. 트러블슈팅

### 5.1 로그인은 됐는데 메뉴가 안 보이는 경우

**원인**: localStorage에 만료된 토큰이 남아있어 `isAuthenticated`가 true이지만, 실제 토큰이 유효하지 않음

**해결**:
1. 브라우저 DevTools → Application → Local Storage → `ssoo-auth` 삭제
2. 새로고침 후 다시 로그인

**코드 수정 (2026-01-20)**:
- `checkAuth()`에서 항상 서버 검증 수행
- 메뉴 API 401 응답 시 인증 초기화
- 콘솔 로그 추가로 디버깅 용이

### 5.2 콘솔 로그 확인

```
[MainLayout] Starting auth check...
[AuthStore] Access token expired, trying refresh...
[AuthStore] Refresh token failed: 유효하지 않은 토큰입니다.
[AuthStore] All auth attempts failed, clearing auth
```

### 5.3 개발 중 토큰 문제

개발 중 토큰 관련 문제 발생 시:

```javascript
// 브라우저 콘솔에서 실행
localStorage.removeItem('ssoo-auth');
location.reload();
```

---

## 6. API 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| POST | `/api/auth/login` | 로그인 | ❌ |
| POST | `/api/auth/refresh` | 토큰 갱신 | ❌ |
| POST | `/api/auth/logout` | 로그아웃 | ✅ |
| POST | `/api/auth/me` | 현재 사용자 정보 | ✅ |

---

## 7. 관련 파일

### 서버
- `apps/server/src/modules/common/auth/auth.service.ts` - 인증 서비스
- `apps/server/src/modules/common/auth/auth.controller.ts` - 인증 컨트롤러
- `apps/server/src/modules/common/auth/strategies/jwt.strategy.ts` - JWT 검증 전략

### 클라이언트
- `apps/web/pms/src/stores/auth.store.ts` - 인증 상태 관리
- `apps/web/pms/src/lib/api/auth.ts` - 인증 API 클라이언트
- `apps/web/pms/src/lib/api/client.ts` - Axios 인터셉터 (자동 토큰 갱신)
- `apps/web/pms/src/app/(main)/layout.tsx` - 인증 체크 및 라우팅

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| AUTH-01 | Refresh Token Rotation 검토 | P3 | 🔲 대기 |
| AUTH-02 | 로그인 시도 횟수 제한 | P2 | 🔲 대기 |
| AUTH-03 | 비밀번호 정책 강화 | P2 | ✅ 완료 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-20 | 인증 시스템 문서 최초 작성 |
| 2026-01-20 | 인증 가드 any 타입 제거 (IMM-03) |
| 2026-01-23 | 로그인/Refresh 레이트 리밋 적용(5회/분, 10회/분), 비밀번호 정책 강화(8자 이상, 영문+숫자+특수문자) |
| 2026-01-20 | apiClient 자동 토큰 갱신 구현 |


## 환경 변수

- JWT_SECRET, JWT_REFRESH_SECRET 필수 (ConfigModule Joi 검증)
- JWT_ACCESS_EXPIRES_IN 기본 15m, JWT_REFRESH_EXPIRES_IN 기본 7d
- PORT 기본 4000, CORS_ORIGIN 기본 http://localhost:3000

---

## Current policies snapshot (2026-01-23)
- Token TTLs: access 15m, refresh 7d; stored refresh hash invalidated on logout.
- Throttling: login 5/min, refresh 10/min; default 100/min.
- Password & lockout: >=8 chars incl. upper/lower/number/special; 5 failed logins -> 30m lock.
- Error contract: GlobalHttpExceptionFilter + ApiError/ApiSuccess; Swagger documents 401/403/404/429/500 with examples.
- Module boundary: auth/user live in common module; no direct dependency from domain modules to each other.
- BigInt handling: IDs remain bigint in DB; API outputs stringified IDs.

## Docs maintenance
- Keep this snapshot aligned after any auth/security change.
- Update Swagger examples when error codes/messages change.
- Reflect boundary/rate policies in lint/ruleset if modified.

