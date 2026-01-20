# SSOO 프로젝트 백로그

> 장기 태스크, 기술 부채, 개선 사항을 추적합니다.

**마지막 업데이트**: 2026-01-20

---

## 📋 상태 범례

| 상태 | 설명 |
|------|------|
| 🔲 | 대기 |
| 🔄 | 진행중 |
| ✅ | 완료 |
| ⏸️ | 보류 |

---

## 🔴 P1 (High) - 핵심 기능

### 권한 가드 구현 🔲

- [ ] 프론트엔드: 메뉴 필터링 + 라우트 가드
- [ ] 백엔드: @UseGuards(JwtAuthGuard, RolesGuard) 전체 적용

### 사용자 초대 플로우 🔲

- [ ] 초대 이메일 발송
- [ ] 초대 토큰 검증
- [ ] 비밀번호 설정 페이지

### 프로젝트 관리 🔲

- [ ] 프로젝트 생성 화면
- [ ] 산출물 관리
- [ ] 프로젝트 종료 조건

---

## 🟡 P2 (Medium) - 중요

### 보안 강화 🔲

> 상세 내용: [architecture/security-standards.md](architecture/security-standards.md)

| 항목 | 설명 | 상태 |
|------|------|------|
| HTTPS 강제 | TLS 인증서 적용 | 🔲 |
| 보안 헤더 | Helmet.js | 🔲 |
| CSRF 방지 | CSRF 토큰 | 🔲 |
| Rate Limiting | @nestjs/throttler | 🔲 |
| 토큰 저장 위치 | localStorage → httpOnly Cookie | 🔲 |

### 모니터링 & 로깅 🔲

- [ ] 프로덕션 로깅 전략
- [ ] 에러 트래킹 (Sentry)
- [ ] APM 도입 검토

### 배포 환경 🔲

- [ ] Docker Compose 설정
- [ ] 환경별 설정 (.env.production)
- [ ] 배포 스크립트

---

## 🟢 P3 (Low) - 권장

### 테스트 자동화 🔲

**Server (NestJS)**
- [ ] Jest + ts-jest 설정
- [ ] Supertest 설정 (E2E)
- [ ] 테스트 DB 환경 분리

**Web (Next.js)**
- [ ] Playwright 설정
- [ ] E2E 테스트

**CI/CD**
- [ ] GitHub Actions 워크플로우
- [ ] PR마다 테스트 자동 실행

### 코드 품질 도구 🔲

- [ ] Prettier 통합 설정
- [ ] Husky + lint-staged
- [ ] Commitlint

---

## 🔵 P4 - 품질 고도화 (9.5+ 달성)

> 현재 평균 점수: 9.48/10 (Phase 3 완료)  
> 상세 분석: [refactoring/analysis/code-quality.md](refactoring/analysis/code-quality.md)  
> 최종 보고서: [refactoring/results/FINAL_REPORT.md](refactoring/results/FINAL_REPORT.md)

### 🔴 CRITICAL - 리팩토링 (즉시 수정 권장)

#### WEB-05: DataTable 컴포넌트 분리 (436줄 → 5파일) 🔲

- **위치**: `apps/web/src/components/common/DataTable.tsx`
- **문제**: 복합 컴포넌트 기준 150줄을 3배 초과, 7가지 책임 혼재
- **해결 방안**:
  ```
  DataTable/
  ├── DataTable.tsx (~100줄)
  ├── DataTableToolbar.tsx (~50줄)
  ├── DataTableBody.tsx (~80줄)
  ├── DataTableFooter.tsx (~40줄)
  └── data-table-utils.ts (~80줄)
  ```
- **예상 소요**: 2시간

#### SRV-05: jwt-auth.guard.ts any 타입 제거 🔲

- **위치**: `apps/server/src/auth/guards/jwt-auth.guard.ts`
- **문제**: `handleRequest(err: any, user: any, info: any): any`
- **해결 방안**: 제네릭 타입 및 명시적 타입 적용
- **예상 소요**: 30분

#### WEB-07: menu.store.ts 하드코딩 URL 수정 🔲

- **위치**: `apps/web/src/stores/menu.store.ts`
- **문제**: `fetch('http://localhost:4000/api/menus/my')`
- **해결 방안**: `apiClient` 또는 `menusApi` 사용
- **예상 소요**: 15분

### 🟠 HIGH - 리팩토링 (우선 수정 권장)

#### WEB-06: MainSidebar 분리 (275줄 → 4파일) 🔲

- **위치**: `apps/web/src/components/layout/MainSidebar.tsx`
- **문제**: 레이아웃 기준 200줄 초과, 4개 컴포넌트 혼재
- **예상 소요**: 1시간

#### SRV-06: response.interceptor.ts any 타입 제거 🔲

- **위치**: `apps/server/src/common/interceptors/response.interceptor.ts`
- **문제**: `Observable<any>` 반환
- **예상 소요**: 20분

#### TYPE-05: 메뉴 타입 통합 (@ssoo/types) 🔲

- **문제**: `packages/types`와 `apps/web/src/types`에 메뉴 타입 중복 정의
- **예상 소요**: 30분

#### WEB-01: 레거시 PageHeader 완전 제거 🔲

- **위치**: `apps/web/src/components/common/PageHeader.tsx`
- **현재 상태**: @deprecated 추가됨, FormPageTemplate/DetailPageTemplate에서 사용 중
- **예상 소요**: 30분

#### WEB-02: 레거시 ListPageTemplate 이름 정리 🔲

- **위치**: `apps/web/src/components/templates/ListPageTemplate.tsx`
- **현재 상태**: @deprecated 추가됨, V2로 마이그레이션 필요
- **예상 소요**: 20분

### 테스트 커버리지 확보 🔲

| 영역 | 현재 | 목표 | 상태 |
|------|:----:|:----:|:----:|
| Unit Test (Server) | 0% | 80%+ | 🔲 |
| Unit Test (Web) | 0% | 70%+ | 🔲 |
| E2E Test | 0% | 주요 플로우 | 🔲 |

- [ ] Server: Auth/User/Project 서비스 단위 테스트
- [ ] Web: 핵심 컴포넌트 단위 테스트
- [ ] E2E: 로그인 → 메인 → CRUD 플로우

### API 문서화 🔲

- [ ] Swagger/OpenAPI 설정
- [ ] 모든 엔드포인트 문서화
- [ ] Request/Response 스키마 정의
- [ ] API 버저닝 전략

### 에러 핸들링 고도화 🔲

**Server**
- [ ] 글로벌 Exception Filter 개선
- [ ] 커스텀 에러 코드 체계
- [ ] 에러 로깅 표준화

**Web**
- [ ] Error Boundary 구현
- [ ] API 에러 중앙 처리
- [ ] 사용자 친화적 에러 메시지

---

## 📝 완료 항목

> 상세 내역: [CHANGELOG.md](CHANGELOG.md)

| 날짜 | 항목 |
|------|------|
| 2026-01-20 | 인증 토큰 만료 시 메뉴 로드 실패 버그 수정 |
| 2026-01-19 | 메뉴/레이아웃 시스템 Phase 1~6 완료 |
| 2026-01-19 | 디자인 시스템 표준화 완료 |
| 2026-01-19 | 페이지 보안 및 라우팅 강화 완료 |
| 2026-01-17 | 백로그 문서 생성 |

---

## 관련 문서

- [ROADMAP.md](ROADMAP.md) - 제품 로드맵
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
- [architecture/security-standards.md](architecture/security-standards.md) - 보안 표준
