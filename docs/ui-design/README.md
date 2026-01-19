# UI Design Documentation

> SSOO 프로젝트의 UI/UX 설계 문서 모음

## 📁 문서 구조

### 1. 페이지 레이아웃
- [page-layouts.md](./page-layouts.md) - 표준 페이지 레이아웃 설계
  - 목록 페이지 (ListPageTemplate)
  - 등록/수정 페이지 (FormPageTemplate)
  - 상세 페이지 (DetailPageTemplate)

### 2. 보안 및 라우팅
- [page-security-routing.md](./page-security-routing.md) - 페이지 보안 및 라우팅 전략
  - Next.js 라우팅 노출 방지
  - 미들웨어 기반 접근 차단
  - 404 자동 리다이렉트
  - 동적 컴포넌트 로딩

### 3. 디자인 시스템
- [design-system.md](./design-system.md) - 디자인 시스템 가이드
  - 색상 체계 (Primary, Secondary, Destructive)
  - 타이포그래피 (H1, H2, H3, Body)
  - 아이콘 크기 표준
  - 버튼 스타일 및 크기
  - 사용 예시

### 4. 컴포넌트 아키텍처
- [component-hierarchy.md](./component-hierarchy.md) - 컴포넌트 계층 구조
  - Level 0: shadcn/ui 원자 컴포넌트
  - Level 1: UI 기본 컴포넌트
  - Level 2: 공통 복합 컴포넌트 (common/)
  - Level 3: 페이지 템플릿 (templates/)
  - Level 4: 도메인 페이지 (pages/)

### 4. 디자인 시스템
- 색상 팔레트
- 타이포그래피
- 간격 시스템
- 애니메이션

---

## 🎨 UI 라이브러리 스택

| 라이브러리 | 용도 |
|-----------|------|
| shadcn/ui | 기본 UI 컴포넌트 (Radix UI + Tailwind) |
| TanStack Table | 데이터 테이블 |
| TanStack Virtual | 가상 스크롤 |
| Recharts | 차트 |
| xlsx | 엑셀 Export |
| Lucide React | 아이콘 |

---

## 📐 설계 원칙

1. **템플릿 기반 표준화**: 모든 페이지는 3가지 템플릿 중 하나를 따름
2. **재사용성 우선**: 비즈니스 로직과 UI 분리
3. **일관된 UX**: 모든 페이지에서 동일한 패턴 사용
4. **접근성**: ARIA 레이블, 키보드 네비게이션 지원
5. **반응형**: 데스크톱 우선, 모바일은 별도 UI 제공
6. **보안 우선**: 라우팅 구조 숨김, 권한 기반 접근 제어
7. **디자인 일관성**: 타이포그래피, 색상, 버튼 스타일 통일

---

## 🔗 참고 문서

- [../BACKLOG.md](../BACKLOG.md) - 전체 개발 백로그
- [../database/README.md](../database/README.md) - 데이터베이스 설계
- [../service/README.md](../service/README.md) - 서비스 로직
