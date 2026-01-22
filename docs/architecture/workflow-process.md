# 개발 작업 프로세스 가이드

> 최종 업데이트: 2026-01-21

SSOO 프로젝트의 표준 개발 작업 프로세스입니다.

---

## 🔄 표준 작업 프로세스

모든 개발 작업은 아래 3단계를 **반드시** 준수합니다.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. 코드    │ ──> │  2. 문서    │ ──> │  3. 커밋    │
│   개발      │     │   업데이트   │     │   (Git)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 1단계: 코드 개발

- 기능 구현 또는 버그 수정
- 테스트 확인

### 2단계: 문서 업데이트

해당 작업과 관련된 문서의 **Changelog** 섹션에 변경 내용 추가:

| 작업 유형 | 업데이트 대상 문서 |
|----------|-------------------|
| API 변경 | `docs/api/README.md` |
| 레이아웃/UI 변경 | `docs/architecture/layout-system.md` |
| Store 변경 | `docs/architecture/state-management.md` |
| 컴포넌트 변경 | `docs/architecture/ui-components.md` |
| 유틸리티 변경 | `docs/architecture/utilities.md` |
| 인증 변경 | `docs/architecture/auth-system.md` |
| DB 변경 | `docs/database/README.md` |

### 3단계: Git 커밋

커밋 메시지 컨벤션에 따라 커밋

---

## 📁 분산형 문서 관리

### 원칙

각 문서는 **현재 상태 + 이력 + 할 일**을 한 곳에서 관리합니다.

```markdown
# 문서 제목

(문서 본문)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| XXX-01 | 할 일 내용 | P2 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 변경 내용 설명 |
```

### 중앙 인덱스 역할

| 파일 | 역할 |
|------|------|
| `docs/common/changelog.md` | 최근 변경 요약 + 영역별 링크 |
| `docs/common/backlog.md` | 우선순위 높은 항목 요약 + 영역별 링크 |

### 아카이브 정책

- 30일 이상 지난 변경 이력 → `docs/_archive/`로 이동
- 완료된 백로그 중 30일 지난 항목 → 아카이브로 이동

---

## 📝 커밋 메시지 컨벤션

### 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat: 즐겨찾기 DB 연동` |
| `fix` | 버그 수정 | `fix: 로그인 토큰 갱신 오류` |
| `docs` | 문서 변경 | `docs: API 명세서 작성` |
| `style` | 코드 포맷팅 | `style: 린트 오류 수정` |
| `refactor` | 리팩터링 | `refactor: DataTable 컴포넌트 분리` |
| `test` | 테스트 | `test: 로그인 API 테스트 추가` |
| `chore` | 빌드/설정 | `chore: ESLint 설정 변경` |

### Scope (선택)

- `web-pms`: 프로젝트 관리 프론트엔드
- `server`: 백엔드
- `db`: 데이터베이스
- `docs`: 문서
- `config`: 설정

### 예시

```
feat(web-pms): 커스텀 스크롤바 디자인 시스템 추가

## CSS 유틸리티
- scrollbar-thin, scrollbar-default, scrollbar-wide
- scrollbar-primary, scrollbar-accent

## 컴포넌트
- ScrollArea 컴포넌트 추가
```

---

## 🌿 Git 브랜치 전략

### 브랜치 구조

```
main (production)
  │
  └── develop (integration)
        │
        ├── feature/xxx (기능 개발)
        ├── fix/xxx (버그 수정)
        └── refactor/xxx (리팩터링)
```

### 브랜치 네이밍

| 유형 | 패턴 | 예시 |
|------|------|------|
| 기능 | `feature/{기능명}` | `feature/project-management` |
| 버그 | `fix/{이슈번호-설명}` | `fix/123-login-error` |
| 리팩터링 | `refactor/{대상}` | `refactor/sidebar-components` |
| 문서 | `docs/{문서명}` | `docs/api-specification` |

### 병합 규칙

1. `feature/*` → `develop` (PR 필수)
2. `develop` → `main` (릴리스 시)

---

## ✅ 코드 리뷰 체크리스트

PR 생성 전 자체 점검:

```markdown
## 체크리스트

- [ ] 기능이 정상 동작하는가?
- [ ] 관련 문서가 업데이트되었는가?
- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] 불필요한 console.log가 제거되었는가?
- [ ] any 타입을 사용하지 않았는가?
- [ ] 컴포넌트 크기 기준(200줄)을 초과하지 않는가?
```

---

## 📋 백로그 우선순위

| 우선순위 | 설명 | 처리 시점 |
|----------|------|----------|
| **IMM** (Immediate) | 배포/보안 차단 | 즉시 |
| **P1** (High) | 핵심 기능 | 다음 스프린트 |
| **P2** (Medium) | 품질 개선 | 2주 내 |
| **P3** (Low) | 추후 개선 | 여유 시 |
| **P4** (Nice-to-have) | 선택적 | 미정 |

### 상태 표시

| 상태 | 설명 |
|------|------|
| 🔲 | 대기 |
| 🔄 | 진행중 |
| ✅ | 완료 |
| ⏸️ | 보류 |

---

## 🔧 자동화 도구

### Husky + lint-staged

커밋 전 자동 실행:

```bash
# .husky/pre-commit
pnpm run lint
```

> WSL에서 Windows Node를 사용하는 경우 `.husky/_/node` shim을 통해 `node`를 해석합니다.
> pnpm이 Windows 경로(`/mnt/c/*`)일 경우 Windows 경로(`C:\\nvm4w\\nodejs\\node_modules\\pnpm\\bin\\pnpm.cjs`)로 대체 실행합니다.
> commitlint는 필요 시 `wslpath -w`로 변환한 경로를 사용합니다.

```json
// lint-staged.config.js
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

### Commitlint

커밋 메시지 검증:

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

---

## 관련 문서

- [개발 표준](./development-standards.md)
- [프론트엔드 표준](./frontend-standards.md)
- [DB 규칙](../database/rules.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| WFP-01 | PR 템플릿 작성 | P3 | 🔲 대기 |
| WFP-02 | GitHub Actions CI/CD 설정 | P2 | 🔲 대기 |
| WFP-03 | pre-push hook 추가 (빌드/타입체크) | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | scope 명칭을 web-pms로 정리 |
| 2026-01-21 | 개발 표준 문서 위치를 architecture로 이동 |
| 2026-01-21 | Husky hook에서 Windows 경로 변환 처리 추가 |
| 2026-01-21 | Husky hook에서 Windows pnpm/npx 경로 우회 처리 |
| 2026-01-21 | Husky hook pnpm fallback 경로 추가 |
| 2026-01-21 | Husky hook에 WSL Node shim 경로 추가 |
| 2026-01-21 | Husky hook Node/pnpm 가드 추가 및 예시 업데이트 |
| 2026-01-21 | 작업 프로세스 가이드 최초 작성 |
| 2026-01-21 | 분산형 문서 관리 체계 도입 |
| 2026-01-20 | Husky + lint-staged + Commitlint 설정 |
