# SSOO 변경 이력 (Changelog)

> 버그 수정, 주요 변경 사항을 기록합니다.

---

## 2026-01-20

### 🔧 버그 수정: 인증 토큰 만료 시 메뉴 로드 실패

**증상:**
- 서버 재시작 후에도 이미 로그인된 화면으로 표시
- localStorage에 만료된 토큰이 남아있어 `isAuthenticated`가 true
- 메뉴 API 호출 시 401 에러 발생하나 처리되지 않아 빈 메뉴 트리

**원인:**
1. `checkAuth()`에서 `isAuthenticated`가 true일 때 서버 검증 없이 진행
2. 메뉴 API 401 응답 시 인증 초기화 로직 부재
3. 토큰 갱신 실패 시 조용히 실패 (에러 로그 없음)

**수정:**
- `stores/auth.store.ts`: checkAuth에서 항상 서버에서 토큰 유효성 검증
- `stores/menu.store.ts`: 401 응답 시 clearAuth + clearMenu 호출
- `app/(main)/layout.tsx`: 로그인 성공 시 메뉴도 함께 로드

**관련 문서:**
- [architecture/auth-system.md](architecture/auth-system.md)

---

## 2026-01-19

### ✨ 기능 추가: 메뉴/레이아웃 시스템 구현 완료

- Prisma db push - 6개 테이블 생성
- 히스토리 트리거 14개 설치
- 메뉴 Seed 데이터 17건 입력
- 역할별 권한 데이터 66건 입력 (6개 역할)
- 프론트엔드 레이아웃 컴포넌트 구현 완료
- Next.js App Router Route Groups 적용

### ✨ 기능 추가: 페이지 보안 및 라우팅 강화

- 미들웨어 직접 접근 차단
- 404 자동 리다이렉트
- ContentArea 동적 로딩

### ✨ 기능 추가: 디자인 시스템 표준화

- 그룹웨어 색상 체계 적용
- 컨트롤 높이 표준화 (36px)
- 디자인 토큰 정의

---

## 2026-01-17

### 📝 문서: 백로그 문서 생성

- 테스트 자동화 항목 추가
- 메뉴/레이아웃 시스템 설계 시작
