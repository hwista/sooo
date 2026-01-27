# 문서 관리 전략 (Documentation Management)

> 최종 업데이트: 2026-01-25

---

## 1. 개요

SSOO 프로젝트는 **자동 생성 문서**와 **수동 관리 문서**를 병행하는 **하이브리드 문서화 전략**을 채택합니다.

### 1.1 원칙

1. **Single Source of Truth (SSOT)**: 코드에서 추출 가능한 정보는 자동 생성
2. **중복 금지**: 자동 문서가 커버하는 영역은 수동으로 작성하지 않음
3. **역할 분리**: 자동 = "무엇(What)", 수동 = "왜(Why)/어떻게(How)"

---

## 2. 자동 생성 문서

### 2.1 도구 및 산출물

| 도구 | 산출물 위치 | 대상 | 역할 |
|------|------------|------|------|
| **TypeDoc** | `reference/typedoc/` | TSDoc 주석 | 코드 API 레퍼런스 |
| **OpenAPI/Redoc** | `reference/api/` | Swagger 데코레이터 | REST API 명세 |
| **Prisma DBML** | `reference/db/` | schema.prisma | ERD, 테이블 구조 |
| **Storybook** | `reference/storybook/` | *.stories.tsx | UI 컴포넌트 카탈로그 |
| **conventional-changelog** | `/docs/CHANGELOG.md` | Git 커밋 | 릴리스 노트 |

### 2.2 생성 명령어

```bash
# 전체 문서 생성 + 검증
pnpm docs:all

# 개별 생성
pnpm docs:typedoc    # TypeDoc
pnpm docs:openapi    # OpenAPI + Redoc HTML
pnpm docs:db         # DBML + ERD SVG
pnpm docs:storybook  # Storybook

# Changelog
pnpm changelog       # 증분 업데이트
pnpm changelog:init  # 전체 재생성

# 검증
pnpm docs:verify     # 산출물 존재 확인
```

### 2.3 자동 문서가 커버하는 영역 (수동 작성 금지)

| 영역 | 자동 도구 | ❌ 수동 작성 금지 항목 |
|------|----------|----------------------|
| **API 명세** | OpenAPI/Redoc | 개별 엔드포인트 상세 (요청/응답 예시 등) |
| **테이블 구조** | Prisma DBML/ERD | 개별 테이블 스펙 문서 |
| **코드 API** | TypeDoc | 함수/클래스 시그니처 문서 |
| **UI 컴포넌트** | Storybook | 컴포넌트 Props, 사용 예시 |
| **릴리스 노트** | conventional-changelog | 커밋 기반 변경 이력 |

---

## 3. 수동 관리 문서

### 3.1 수동 문서 영역

자동 도구가 커버할 수 없는 **의사결정, 개념, 가이드** 영역입니다.

| 카테고리 | 역할 | 예시 |
|----------|------|------|
| **architecture/** | 아키텍처 결정, 개발 표준 | 기술 스택, 모듈 구조, 보안 정책 |
| **domain/** | 비즈니스 개념, 워크플로우 | 서비스 개요, 업무 흐름, 액션 정의 |
| **design/** | UI/UX 설계 원칙 | 디자인 시스템, 레이아웃 규격 |
| **guides/** | 사용 가이드라인 | API 사용법 개요, DB 연결 가이드 |
| **planning/** | 프로젝트 관리 | 백로그, 로드맵, 도메인별 changelog |

### 3.2 수동 문서 작성 규칙

1. **자동 문서 링크 필수**: 관련 자동 문서가 있으면 반드시 링크
2. **Why/How 중심**: "무엇"보다 "왜 이렇게 결정했는지" 기록
3. **Changelog 섹션**: 각 문서 하단에 변경 이력 섹션 유지

---

## 4. 하이브리드 문서 (자동 + 수동 연계)

일부 문서는 **자동 문서로 링크하면서 추가 컨텍스트를 제공**합니다.

### 4.1 하이브리드 문서 목록

| 문서 | 수동 작성 내용 | 자동 문서 링크 |
|------|---------------|---------------|
| `guides/api-guide.md` | 응답 형식, 에러 코드, 인증 방식 | → `reference/api/` |
| `guides/database-guide.md` | 스키마 구조 개요, 연결 정보, 마이그레이션 | → `reference/db/` |
| `design/component-hierarchy.md` | 컴포넌트 설계 원칙, 계층 구조 | → `reference/storybook/` |
| `planning/changelog.md` | 도메인별 상세 변경, 인덱스 | → `/docs/CHANGELOG.md` |

### 4.2 링크 형식

```markdown
## API 레퍼런스

자세한 API 명세는 자동 생성된 문서를 참조하세요:
- **[OpenAPI Spec (JSON)](../reference/api/openapi.json)** (공용 API)
- **[API 문서 (Redoc)](../reference/api/index.html)** (공용 API)
```

### 4.3 Storybook 활용

UI 컴포넌트의 **시각적 스펙**은 Storybook에서 확인하고, 수동 문서는 **설계 원칙/의사결정**만 기록합니다.

| 수동 문서 (design/) | 역할 | Storybook 링크 |
|-------------------|------|---------------|
| `component-hierarchy.md` | 컴포넌트 계층/책임 구조 | → `reference/storybook/` |
| `design-system.md` | 색상/타이포/간격 규칙 (Why) | → Storybook Design Tokens |
| `page-layouts.md` | 레이아웃 다이어그램 | → Template 스토리 |

**Storybook이 커버하는 영역:**
- 컴포넌트 Props 및 API
- Variants/States 시각화
- 사용 예시 코드 (autodocs)
- 인터랙티브 Controls

**수동 문서가 커버하는 영역:**
- "왜 이 계층 구조인가" (아키텍처 결정)
- "왜 이 색상을 선택했는가" (브랜드 가이드)
- 권한별 컴포넌트 노출 규칙 (보안 정책)

---

## 5. 폴더 구조

```
docs/
├── CHANGELOG.md                    # 자동 (conventional-changelog)
├── README.md                       # 전체 문서 인덱스
│
├── common/                         # 공통 도메인
│   └── reference/                  # 자동 생성 전용
│       ├── api/
│       ├── db/
│       └── typedoc/
│
├── pms/                            # PMS 도메인
│   ├── README.md                   # PMS 문서 인덱스
│   │
│   ├── architecture/               # 아키텍처/표준 (수동)
│   ├── domain/                     # 비즈니스 개념 (수동)
│   ├── design/                     # UI/UX 설계 (수동)
│   ├── guides/                     # 가이드라인 (하이브리드)
│   ├── planning/                   # 프로젝트 관리 (수동)
│   ├── tests/                      # 테스트 시나리오 (수동)
│   │
│   └── reference/                  # 자동 생성 전용
│       ├── api/
│       ├── db/
│       ├── typedoc/
│       └── storybook/
│
└── dms/                            # DMS 도메인 (미래)
    └── reference/
```

---

## 6. DMS 연동 방식

DMS(문서 허브)에서 자동 생성 문서를 렌더링하는 방식입니다.

### 6.1 산출물 유형별 렌더링

| 산출물 | 유형 | DMS 렌더링 방식 |
|--------|------|----------------|
| **Markdown** | 정적 텍스트 | Next.js MDX/Markdown 렌더링 |
| **ERD (SVG)** | 이미지 | `<img>` 태그 직접 임베드 |
| **Redoc HTML** | SPA | `<iframe>` 임베드 |
| **Storybook** | SPA | `<iframe>` 임베드 |
| **TypeDoc HTML** | 정적 HTML | `<iframe>` 임베드 |

### 6.2 iframe 임베드 예시

```tsx
// DMS 컴포넌트 예시
export function StorybookViewer() {
  return (
    <iframe
      src="/reference/storybook/index.html"
      className="w-full h-[80vh] border-0 rounded-lg"
      title="Storybook - UI 컴포넌트 카탈로그"
    />
  );
}
```

### 6.3 URL 구조 (계획)

```
DMS (apps/web/dms)
├── /docs/architecture/*     → Markdown 렌더링
├── /docs/domain/*           → Markdown 렌더링
├── /docs/design/*           → Markdown 렌더링
├── /docs/api                → Redoc HTML (iframe)
├── /docs/db                 → ERD SVG (img) + DBML viewer
├── /docs/storybook          → Storybook SPA (iframe)
├── /docs/typedoc            → TypeDoc HTML (iframe)
└── /docs/changelog          → Markdown 렌더링
```

---

## 7. 중복 방지 체크리스트

새 문서 작성 전 확인:

- [ ] 이 내용이 코드에서 추출 가능한가? → **자동 문서 사용**
- [ ] 기존 자동 문서와 중복되는 내용인가? → **링크로 대체**
- [ ] API 엔드포인트 상세를 작성하려는가? → **❌ OpenAPI/Redoc 사용**
- [ ] 테이블 스펙을 작성하려는가? → **❌ Prisma schema + ERD 사용**
- [ ] 컴포넌트 사용법을 작성하려는가? → **❌ Storybook 사용**

---

## 8. 마이그레이션 (2026-01-25 적용)

### 7.1 삭제된 문서 (자동 문서로 대체)

| 삭제 대상 | 대체 자동 문서 |
|----------|---------------|
| `pms/api/auth.md` | `pms/reference/api/` |
| `pms/api/health.md` | `pms/reference/api/` |
| `pms/api/menu.md` | `pms/reference/api/` |
| `pms/api/project.md` | `pms/reference/api/` |
| `pms/api/user.md` | `pms/reference/api/` |
| `pms/database/tables/*.md` (16개) | `pms/reference/db/erd.svg` + schema.prisma |

### 7.2 이동/통합된 문서

| 이전 위치 | 새 위치 | 사유 |
|----------|--------|------|
| `pms/api/README.md` | `pms/guides/api-guide.md` | 가이드 역할 명확화 |
| `pms/database/README.md` | `pms/guides/database-guide.md` | 가이드 역할 명확화 |
| `pms/ui-design/` | `pms/design/` | 폴더명 간소화 |
| `pms/common/setup.md` | `pms/getting-started.md` | 접근성 향상 |
| `pms/common/backlog.md` | `pms/planning/backlog.md` | 카테고리 정리 |
| `pms/common/roadmap.md` | `pms/planning/roadmap.md` | 카테고리 정리 |
| `pms/common/changelog.md` | `pms/planning/changelog.md` | 카테고리 정리 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-25 | 최초 작성 - 문서 자동화 도입에 따른 관리 전략 수립 |
| 2026-01-25 | Storybook 활용 가이드 추가, DMS 연동 방식 섹션 추가 |
