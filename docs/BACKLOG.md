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
