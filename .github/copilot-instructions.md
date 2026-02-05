# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 이 파일은 GitHub Copilot이 코드 생성/수정 시 **항상** 참조하는 전역 규칙입니다.
> 경로별 상세 규칙은 `.github/instructions/` 폴더를 참조하세요.

---

## ⛔ 작업 완료 프로토콜 (매 작업 후 필수 실행)

> **이 섹션은 모든 작업 완료 후 반드시 실행해야 합니다.**
> **생략 시 인스트럭션 위반입니다.**

### 매 작업 완료 시 자동 실행

```
┌─────────────────────────────────────────────────────────────┐
│  1. 검증 실행                                               │
│     → node .github/scripts/sdd-verify.js --quick            │
│     → 린트/타입체크/빌드 오류 없음 확인                     │
│     → ❌ 실패 시: 문제 해결 후 다시 검증                    │
├─────────────────────────────────────────────────────────────┤
│  2. 관련 문서 전수 최신화                                   │
│     → 변경 내용에 영향받는 모든 문서 업데이트               │
│     → 구조/API/설정 변경 시: 해당 설명 문서 수정            │
│     → 가이드/예시가 변경된 경우: 해당 부분 수정             │
│     → Changelog 추가: .github/README.md 또는 docs/          │
├─────────────────────────────────────────────────────────────┤
│  3. 커밋 제안 (사용자에게 제시)                             │
│     → git add -A && git commit -m "[type]([scope]): [msg]"  │
│     → "커밋하시겠습니까?" 확인 요청                         │
└─────────────────────────────────────────────────────────────┘
```

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

Type: feat|fix|docs|style|refactor|perf|test|chore
Scope: server|web-pms|web-dms|database|types|.github|docs
```

### 작업 종료 시 필수 출력

```markdown
---
## 📋 작업 완료 체크리스트
- [x] 작업 완료
- [x] 검증 통과 (sdd-verify)
- [x] 관련 문서 전수 최신화

## 💾 커밋 제안
\`\`\`bash
git add -A && git commit -m "[type]([scope]): [description]"
\`\`\`
커밋하시겠습니까?
---
```

---

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | SSOO (삼삼오오) |
| **목적** | SI/SM 조직의 Opportunity-Project-System 통합 업무 허브 |
| **구조** | 모노레포 (pnpm workspace + Turborepo) |
| **아키텍처** | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/dms) |

---

## 🔴 핵심 원칙 (항상 준수)

### 1. 코드 클렌징 원칙

- **사용되는 코드만 유지** - 미사용 코드는 즉시 삭제
- **불필요한 추상화 제거** - 과도한 레이어, BaseService 등 금지
- **미래 기능용 선제작 금지** - 필요할 때 만들 것
- **일관된 패턴 유지** - 동일한 문제는 동일한 방식으로 해결

### 2. 문서-코드 동기화

- **코드 변경 → 문서 업데이트 → 커밋** 순서 준수
- 문서에 없으면 코드도 없어야 함
- 관련 문서의 **Changelog** 섹션에 변경 내용 추가 필수

### 3. 증거 기반 작업 (추정 금지)

- **모든 발견 사항에 증거 포함** - 파일 경로, 라인 번호, grep 결과
- **"~로 보임", "~일 것 같음" 금지** → 확인된 사실만 기술
- **확신 없으면 "확인 필요"로 표기** 후 검증 방법 제안
- **영향 범위 명시** - 수정 시 영향받는 파일/모듈 목록

### 4. 승인 프로세스

| 작업 | AI | 사용자 |
|------|-----|------|
| 점검/분석 | ✅ 수행 | 결과 확인 |
| 브리핑/제안 | ✅ 수행 | 검토 |
| **삭제/변경 결정** | 판단 제시 | 🔒 **최종 승인** |
| **실행** | ⏸️ 대기 | 🔒 **컨펌 후 지시** |

### 5. 점검 우선 원칙

어떤 작업이든 **"점검 → 분석 → 실행"** 순서:

1. **점검** - 현재 상태 파악
2. **분석** - 문제점/개선점 식별
3. **계획** - 실행 계획 수립 (사용자 승인)
4. **실행** - 승인된 계획만 실행
5. **검증** - 결과 확인

### 6. 패키지 경계 준수

```
apps/server ──→ packages/database
     ↓                 ↓
apps/web/pms ──→ packages/types

apps/web/dms (독립 - @ssoo/* 참조 금지)
```

- apps → packages 방향만 허용
- 역방향 참조 절대 금지
- DMS는 독립 프로젝트 (npm 사용, 모노레포 패키지 미참조)

### 7. 기존 코드 기반 일관성 유지

새 코드 작성 시 **반드시 기존 코드베이스를 먼저 참조**:

- **같은 도메인의 기존 파일 분석** 후 동일 패턴 적용
- **스타일, 구조, 네이밍이 기존 코드와 일치**해야 함
- 유사 기능이 이미 있다면 **복사 후 수정** 방식 권장
- **새 패턴 도입 시**: 기존 패턴 대비 장점 명시 + 사용자 승인 필요

### 8. 불확실성 명시 (추측 금지)

정보가 부족할 때 **추측하지 말고 명시적으로 표기**:

```markdown
[NEEDS CLARIFICATION: 구체적인 질문]
```

- **최대 3개**만 허용 - 나머지는 합리적 기본값 사용
- **우선순위**: scope > security > UX > technical
- 질문 시 **선택지와 각각의 영향** 함께 제시

**예시**:
```markdown
- **FR-006**: 사용자 인증 방식 [NEEDS CLARIFICATION: email/password vs SSO vs OAuth?]
- **기본값 적용**: 데이터 보존 기간 → 업계 표준 (7년)
```

### 9. 구현 전 Gate 체크 (SDD)

복잡한 기능 구현 전 **Gate 체크리스트** 확인:

#### Simplicity Gate
- [ ] 프로젝트/모듈 ≤3개 사용?
- [ ] 미래 기능 선제작 없음?
- [ ] YAGNI 원칙 준수?

#### Anti-Abstraction Gate
- [ ] 프레임워크 직접 사용 (불필요한 래퍼 없음)?
- [ ] 단일 모델 표현 (동일 엔티티 중복 정의 없음)?

#### Integration Gate
- [ ] API 계약 정의됨?
- [ ] 테스트 시나리오 식별됨?

**위반 시**: Complexity Tracking 테이블에 정당화 필수

| 위반 | 필요 이유 | 더 단순한 대안을 거부한 이유 |
|------|----------|---------------------------|
| 4번째 모듈 | [현재 필요] | [3개로 불충분한 이유] |

---

## 🛠️ 기술 스택

### 백엔드 (apps/server)
- NestJS 10.x, TypeScript 5.x, Prisma 6.x
- PostgreSQL 15+ (Multi-Schema: common, pms)
- JWT 인증, bcrypt, class-validator
- Swagger/OpenAPI (@nestjs/swagger)

### 프론트엔드 (apps/web/pms)
- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui (Radix primitives)
- Zustand 5.x (상태 관리), TanStack Query 5.x (서버 상태)
- TanStack Table 8.x (테이블), React Hook Form + Zod (폼/검증)

### DMS (apps/web/dms)
- Next.js 15.x, React 19.x (npm 독립)
- Tiptap 에디터, MUI Tree View

### 패키지
- `@ssoo/database`: Prisma 스키마, 트리거, 시드
- `@ssoo/types`: 공유 타입 정의

---

## 📏 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProjectCard.tsx` |
| 훅 | use 접두사 + camelCase | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 타입/인터페이스 | PascalCase | `User`, `ProjectDto` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| NestJS 클래스 | PascalCase + 접미사 | `UserService`, `AuthController` |
| DTO | PascalCase + Dto | `CreateUserDto` |
| DB 테이블 | snake_case + 스키마 접두사 | `cm_user_m`, `pr_project_m` |

---

## 📁 레이어 아키텍처

### 프론트엔드 의존성 방향

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조 가능
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

### 백엔드 모듈 구조

```
modules/
├── common/           # 공용 모듈 (auth, user, health)
├── pms/              # PMS 도메인 모듈
│   ├── project/
│   ├── menu/
│   └── pms.module.ts
└── (dms/)            # 미래 확장
```

---

## ✅ Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
export { Input } from './Input';
export type { ButtonProps } from './Button';

// ❌ 와일드카드 export 금지
export * from './components';
```

---

## 🚫 금지 사항

1. **와일드카드 export** (`export * from`)
2. **any 타입 사용** - unknown 또는 구체적 타입 사용
3. **역방향 의존성** - ui가 pages 참조, packages가 apps 참조
4. **DMS에서 @ssoo/* 패키지 import**
5. **미사용 코드 커밋** - Dead Code는 삭제
6. **BaseService 등 불필요한 추상화**
7. **문서 업데이트 없이 코드만 커밋**
8. **추정/추측으로 판단** - 증거 없이 "~일 것 같음" 금지

---

## ✅ 작업 완료 조건

작업 완료 전 반드시 확인:

- [ ] 코드 변경 완료
- [ ] 관련 문서 Changelog 업데이트
- [ ] 영향 범위 파악 및 테스트
- [ ] Dead Code 없음 확인
- [ ] any 타입 없음 확인
- [ ] 린트/빌드 오류 없음

---

## 📊 백로그 우선순위

| 우선순위 | 설명 | 처리 시점 |
|----------|------|----------|
| **IMM** | 배포/보안 차단 | 즉시 |
| **P1** | 핵심 기능 | 다음 스프린트 |
| **P2** | 품질 개선 | 2주 내 |
| **P3** | 추후 개선 | 여유 시 |
| **P4** | 선택적 | 미정 |

---

## 📝 커밋 메시지 규칙

```
<type>(<scope>): <subject>

<body>
```

### Type
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 포맷팅
- `refactor`: 리팩토링
- `perf`: 성능 개선
- `test`: 테스트
- `chore`: 기타 변경

### Scope
- `server`, `web-pms`, `web-dms`, `database`, `types`, `docs`

---

## 📚 상세 규칙 참조

경로별 상세 규칙은 다음 파일들을 참조:

- `server.instructions.md` - NestJS 백엔드 규칙
- `pms.instructions.md` - PMS 프론트엔드 규칙
- `dms.instructions.md` - DMS 프론트엔드 규칙
- `database.instructions.md` - 데이터베이스/Prisma 규칙
- `types.instructions.md` - 타입 패키지 규칙
- `testing.instructions.md` - 테스트 작성 규칙

---

## 📖 문서 관리 규칙

### 🔴 문서 역할 구분 (정본 원칙)

| 명칭 | 경로 | 역할 | 정본 | 이식성 |
|------|------|------|------|--------|
| **깃헙독스** (GitHub Docs) | `.github/` | 개발 **프로세스** 표준 | ✅ 정본 | 100% 이식 |
| **레포독스** (Repo Docs) | `docs/` | 개발 **결과물** 문서 | 보완 | 레포 특화 |

**핵심 원리**:
- **깃헙독스**만으로 **어떤 프로젝트든** 고품질 개발 가능
- **레포독스**는 **이 프로젝트의 산출물** 설명
- 중복 방지: 프로세스 규칙은 깃헙독스에만, 결과물 설명은 레포독스에만

### 📚 Diátaxis 문서 구조 (필수)

> **Diátaxis Framework**: 문서를 4가지 유형으로 분류하는 표준 체계
> **하이브리드 구조**: Diátaxis 4분류 + explanation 하위 세분화

| 분류 | 목적 | 독자 상태 | docs/ 폴더 매핑 |
|------|------|----------|-----------------|
| **Tutorials** | 학습 (step-by-step) | 배우는 중 | `tutorials/`, `getting-started.md` |
| **How-to Guides** | 문제 해결 | 작업 수행 중 | `guides/` |
| **Reference** | 기술 명세 | 정보 탐색 중 | `reference/` (자동 생성) |
| **Explanation** | 개념 이해 | 이해하려는 중 | `explanation/` (하위 세분화) |

**Explanation 하위 세분화:**
- `explanation/architecture/` - 아키텍처 결정, 기술 표준
- `explanation/domain/` - 비즈니스 개념, 워크플로우
- `explanation/design/` - UI/UX 설계 원칙

**문서 작성 시 반드시 분류 결정:**
1. 새 문서 생성 전 → "이 문서는 4가지 중 어디에 해당하는가?"
2. Explanation인 경우 → "architecture/domain/design 중 어디인가?"
3. 분류 불명확 → `[NEEDS CLARIFICATION: 문서 분류]`

**폴더 구조 표준:**
```
docs/
├── README.md              # 문서 허브
├── CHANGELOG.md           # 변경 이력
├── getting-started.md     # Tutorial: 빠른 시작
│
├── common/                # 공통 문서
│   ├── tutorials/         # Tutorial: 학습 자료
│   ├── guides/            # How-to: 개발 가이드
│   ├── reference/         # Reference: 자동 생성 (API, DB)
│   └── explanation/       # Explanation: 개념 이해
│       └── architecture/  # 아키텍처 결정
│
└── [domain]/              # 도메인별 문서 (pms, dms)
    ├── tutorials/         # Tutorial: 학습 자료
    ├── guides/            # How-to: 사용 가이드
    ├── reference/         # Reference: 자동 생성
    ├── explanation/       # Explanation: 개념 이해
    │   ├── architecture/  # 기술 결정
    │   ├── domain/        # 비즈니스 개념
    │   │   ├── concepts.md
    │   │   ├── workflows/
    │   │   └── actions/
    │   └── design/        # UI/UX 설계
    ├── planning/          # (관리 문서: 백로그, 로드맵)
    └── tests/             # (테스트 시나리오)
```

### 자동 vs 수동 문서

| 영역 | 자동 도구 | ❌ 수동 작성 금지 |
|------|----------|-----------------|
| API 명세 | OpenAPI/Redoc | 엔드포인트 상세 |
| 테이블 구조 | Prisma DBML/ERD | 테이블 스펙 문서 |
| 코드 API | TypeDoc | 함수/클래스 시그니처 |
| UI 컴포넌트 | Storybook | Props, 사용 예시 |

### 수동 문서 영역 (작성 가능)

- `explanation/architecture/` - 아키텍처 결정, 개발 표준
- `explanation/domain/` - 비즈니스 개념, 워크플로우
- `explanation/design/` - UI/UX 설계 원칙
- `guides/` - 사용 가이드라인 (How-to)
- `tutorials/` - 학습 자료 (Tutorial)
- `planning/` - 프로젝트 관리 (관리 문서)

### reference/ 폴더 규칙

`docs/**/reference/` 폴더는 **자동 생성 전용**:
- 직접 수정 금지
- 코드 변경 → 생성 명령어로 재생성
- `pnpm docs:all` 또는 개별 명령어 사용

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | Diátaxis 하이브리드 구조 적용 (explanation/ 하위에 architecture/domain/design/) |
| 2026-02-05 | 점검 우선 원칙 추가 (원칙 5), 원칙 번호 재정렬 (1-9) |
| 2026-02-05 | Diátaxis Framework 문서 구조 표준 추가 (4분류 + 폴더 매핑) |
| 2026-02-05 | 문서 역할 구분 명확화 (.github = 프로세스 정본, docs = 결과물 정본) |
| 2026-02-04 | SDD 핵심 개념 추가 (원칙 7, 8: NEEDS CLARIFICATION, Gate 시스템) |
| 2026-02-04 | 테스트 규칙, 문서 관리 규칙 추가 |
