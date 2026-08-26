---
applyTo: "**/*.{test,spec}.*"
---

# Codex Testing Instructions

> 최종 업데이트: 2026-02-27
> 정본: `.github/instructions/testing.instructions.md`

## 테스트 철학

1. **코드 작성 후 테스트 필수** - 기능 구현 후 반드시 테스트 작성
2. **Jest 미도입이라도 테스트 코드 작성** - 추후 도입 대비
3. **수동 테스트 시나리오 문서화** - 자동화 전까지 수동 검증 가이드

## 테스트 우선순위

| 등급 | 설명 | 자동화 |
|------|------|--------|
| P0 | 핵심 기능 (로그인, 권한) | 필수 |
| P1 | 주요 기능 (CRUD) | 권장 |
| P2 | 보조 기능 | 선택 |
| P3 | 엣지 케이스 | 여유 시 |

## 테스트 파일 구조

```
tests/
├── unit/                  # 단위 테스트
│   ├── services/
│   ├── utils/
│   └── hooks/
├── integration/           # 통합 테스트
│   └── api/
└── e2e/                   # E2E 테스트 (Playwright)
    └── flows/
```

## 테스트 케이스 형식

```typescript
// AAA 패턴: Arrange → Act → Assert
describe('UserService', () => {
  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      // Arrange
      const input = { loginId: 'admin', password: 'admin123!' };
      // Act
      const result = await userService.login(input);
      // Assert
      expect(result.accessToken).toBeDefined();
    });
  });
});
```

## 백엔드 테스트 패턴

- NestJS `Test.createTestingModule` 사용
- `PrismaService` mock 주입
- API 테스트: Supertest 사용

## 프론트엔드 테스트 패턴

- 컴포넌트: React Testing Library (`render`, `screen`, `fireEvent`)
- 훅: `renderHook` + `act`
- E2E: Playwright

## 런칭 브라우저 증거 계약

- DMS/Admin 런칭 spec은 첫 navigation 전에 공용 failure monitor를 연결해 console warning/error, pageerror, 관련 `requestfailed`, HTTP 5xx와 예상하지 않은 401/403을 수집합니다.
- refresh-cookie replay 방어를 완화하지 않습니다. 직렬 browser context는 session 복원으로 회전된 HttpOnly cookie가 반영된 storage state를 다음 context에 전달합니다.
- mutation spec은 원본 snapshot을 먼저 확보하고 LIFO cleanup을 실행한 뒤 post-state 동등성을 검증합니다. 본문 실패와 cleanup 실패는 함께 보고하며 cleanup 실패를 무시하지 않습니다.
- 런칭 proof는 desktop 1440×1000과 핵심 Admin/DMS navigation·settings의 mobile 390×844를 포함하고, API/proxy/console/runtime 오류가 있으면 화면이 보여도 실패입니다.
- Playwright artifact와 JSON report는 release SHA/run ID별 경로에 보존하며, 고정 `test-results`의 과거 결과를 현재 증거로 재사용하지 않습니다.

## 입력 의도 브라우저 증거 계약

- 검색·필터·lookup 공용 계약 변경은 `pnpm run test:e2e:input-intent`로 실행 중인 로컬 Docker 5앱을 모두 검증한다.
- Admin/CRM/PMS/DMS/SNS는 선택 불가능한 고정 검증 집합이다. Chromium CDP native `:autofill` pseudo-state를 header/sidebar에 강제하고, 계정명·사번형·점 포함 ID·이메일형 등 서로 다른 credential 후보가 필드별 거부 이벤트 1회와 원래 값 복구를 만드는지 증명한다.
- 키보드·paste·composition·URL 소유 초기 query는 보존하고, CRM GET submit/reload 및 console/page/request/HTTP failure 0을 동시에 확인한다.
- 실제 사용자 저장-profile 검증은 결정론적 CDP gate를 대체하지 않는 최종 인수 확인으로 별도 수행한다.

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 테스트 파일 | `*.spec.ts` (백엔드), `*.test.tsx` (프론트) | `user.service.spec.ts` |
| 테스트 케이스 ID | `TC-{도메인}-{번호}` | `TC-AUTH-01` |
| describe | 테스트 대상 클래스/함수명 | `describe('UserService')` |
| it | should + 예상 행동 | `it('should return tokens')` |

## 테스트 작성 체크리스트

- [ ] 단위 테스트 작성 (서비스, 유틸리티)
- [ ] P0 케이스 모두 커버
- [ ] 에러 케이스 테스트
- [ ] 경계값 테스트
- [ ] 수동 테스트 시나리오 문서화

## 검증

- 실행: `pnpm test` 또는 각 앱/패키지 테스트 명령

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-20 | 5앱 검색 입력의 Chromium native autofill 실패주입, 의도적 입력·URL query 보존, browser failure 0 증거 계약 추가 |
| 2026-08-18 | DMS/Admin 런칭 browser failure monitor, refresh-cookie 회전, 검증형 cleanup, desktop/mobile, run-scoped evidence 계약 추가 |
| 2026-02-27 | 테스트철학/우선순위/구조/패턴/네이밍/체크리스트 추가 |
| 2026-02-22 | Codex Testing 정본 신설 |
