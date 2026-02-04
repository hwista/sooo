# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 이 파일은 GitHub Copilot이 코드 생성/수정 시 **항상** 참조하는 전역 규칙입니다.
> 경로별 상세 규칙은 `.github/instructions/` 폴더를 참조하세요.

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

### 3. 패키지 경계 준수

```
apps/server ──→ packages/database
     ↓                 ↓
apps/web/pms ──→ packages/types

apps/web/dms (독립 - @ssoo/* 참조 금지)
```

- apps → packages 방향만 허용
- 역방향 참조 절대 금지
- DMS는 독립 프로젝트 (npm 사용, 모노레포 패키지 미참조)

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

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-04 | 초기 생성 (기존 AGENTS.md 기반) |
