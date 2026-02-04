# 보안 검토 체크리스트

코드 보안 검토 요청 시 이 체크리스트를 따르세요.

---

## 인증/인가

- [ ] 모든 API 엔드포인트에 `JwtAuthGuard` 적용됨
- [ ] 역할 기반 접근 제어 (RBAC) 적용 (`@Roles()` 데코레이터)
- [ ] 민감한 작업에 권한 검증 로직 있음
- [ ] 토큰 만료 시간 적절함 (Access: 15분, Refresh: 7일)

---

## XSS (Cross-Site Scripting) 방지

- [ ] 사용자 입력 데이터 HTML 이스케이프 처리
- [ ] React의 자동 이스케이프 신뢰 (dangerouslySetInnerHTML 미사용)
- [ ] Content-Security-Policy 헤더 설정됨

```typescript
// ✅ Helmet으로 CSP 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
}));
```

---

## CSRF (Cross-Site Request Forgery) 방지

- [ ] SameSite 쿠키 속성 설정 (`strict` 또는 `lax`)
- [ ] CORS 화이트리스트 설정됨
- [ ] 상태 변경 API는 POST/PUT/DELETE 사용 (GET으로 변경 금지)

```typescript
// ✅ CORS 설정
app.enableCors({
  origin: ['https://your-domain.com'],
  credentials: true,
});
```

---

## 보안 헤더 (Helmet)

필수 헤더 확인:

| 헤더 | 목적 |
|------|------|
| `X-Content-Type-Options: nosniff` | MIME 스니핑 방지 |
| `X-Frame-Options: DENY` | 클릭재킹 방지 |
| `X-XSS-Protection: 1; mode=block` | XSS 필터 활성화 |
| `Strict-Transport-Security` | HTTPS 강제 |

---

## 입력 검증

- [ ] DTO에 `class-validator` 데코레이터 적용
- [ ] Zod 스키마로 프론트엔드 입력 검증
- [ ] 파일 업로드 시 타입/크기 제한
- [ ] SQL Injection 방지 (Prisma ORM 사용)

```typescript
// ✅ class-validator 사용
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  userName: string;

  @IsEmail()
  email: string;
}
```

---

## 비밀번호 정책

- [ ] bcrypt로 해싱 (평문 저장 금지)
- [ ] 최소 8자 이상
- [ ] 대소문자 + 숫자 + 특수문자 조합 필수
- [ ] 비밀번호 변경 시 이전 비밀번호 확인

---

## 민감 데이터 처리

- [ ] 응답에서 비밀번호 제외 (`@Exclude()`)
- [ ] 로그에 민감정보 미포함 (토큰, 비밀번호)
- [ ] 환경 변수로 시크릿 관리 (하드코딩 금지)
- [ ] 토큰은 HttpOnly 쿠키 또는 메모리 저장

```typescript
// ✅ 민감정보 제외
@Exclude()
password: string;

// ❌ 금지 - 로그에 민감정보
logger.log(`Token: ${token}`);
```

---

## Rate Limiting

- [ ] `@nestjs/throttler` 적용
- [ ] 로그인 API에 더 엄격한 제한

```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,  // 1분
  limit: 100,  // 100회
}])
```

---

## 최종 체크

보안 검토 완료 기준:
- [ ] 위 모든 항목 확인됨
- [ ] 보안 취약점 발견 시 수정 완료
- [ ] 보안 이벤트 로깅 구현됨
