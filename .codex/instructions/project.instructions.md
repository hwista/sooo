---
applyTo: "**"
---

# SSOO Codex Project Instructions

> 최종 업데이트: 2026-07-16

## 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 프로젝트명 | SSOO (삼삼오오) |
| 목적 | SI/SM 조직의 Opportunity-Project-System 통합 업무 허브 |
| 구조 | pnpm workspace + Turborepo |
| 아키텍처 | 모듈러 모놀리스 (도메인별 모듈/앱 분리: common/pms/dms/sns/crm/admin) |

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 백엔드 | NestJS, Prisma, PostgreSQL | 11.x, 6.x, 15+ |
| Admin/CRM/PMS/SNS 프론트 | Next.js (App Router), React, shadcn/ui/Radix, Zustand, TanStack Query/Table | 15.x, 19.x, 5.x |
| DMS 프론트 | Next.js, React, Tailwind CSS, Radix UI, Zustand, CodeMirror | 15.x, 19.x, 3.x, 1.x, 5.x, 6.x |
| 공통 | TypeScript, Tailwind CSS | 5.x, 3.x |

## 패키지 경계

```
apps/server ──→ packages/database
     ↓                 ↓
apps/web/admin ─→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/crm ───→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/pms ──→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/sns ──→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
apps/web/dms ──→ packages/types, packages/web-auth, packages/web-shell, packages/web-ui
```

- `apps/` → `packages/` 방향만 허용
- 역방향 참조 절대 금지
- 웹 앱은 공유 계약을 `@ssoo/types`, 공용 인증/세션/알림센터 상태를 `@ssoo/web-auth`, 공용 shell/frame/알림센터 panel surface를 `@ssoo/web-shell`, 공용 디자인 토큰/Tailwind preset/UI primitive를 `@ssoo/web-ui`로 관리
- DMS는 pnpm workspace 앱이며 파일/Git/스토리지 런타임은 `src/app/api/* -> server/*` 경계를 유지

### 패키지 목록

| 패키지 | 역할 |
|--------|------|
| `@ssoo/database` | Prisma 스키마, 트리거, 시드 |
| `@ssoo/types` | 공유 타입 정의 |
| `@ssoo/web-auth` | 공용 로그인/세션/bootstrap/auth store adapter, 알림센터 상태/API adapter |
| `@ssoo/web-shell` | 공용 앱 shell / frame / shared layout surface / 알림센터 panel surface |
| `@ssoo/web-ui` | 공용 Tailwind preset, semantic typography/spacing/radius token, 원자 UI primitive inventory |

## UI 공용화 강제 기준

- `@ssoo/web-ui`는 기본 UI primitive의 variant, size, typography, radius, focus ring, control height를 소유한다.
- 원자 UI inventory 정본은 `packages/web-ui/primitive-inventory.json`이다. inventory에 등록된 모든 원자는 `platform` 상태여야 하며, `@ssoo/web-ui`만 구현할 수 있다.
- 앱 `components/ui/*`는 기존 import 호환을 위한 thin re-export adapter만 허용한다.
- inventory 밖 앱 로컬 `components/ui/*` 파일 추가, 중간/local-only 상태, 앱 로컬 재정의는 `pnpm run verify:ui-primitives`에서 실패한다.
- inventory export는 `packages/web-ui/src/index.ts`의 named/type re-export와 AST로 대조한다. 문자열 포함만으로는 통과하지 않는다.
- 앱 `components/ui/*` adapter는 `@ssoo/web-ui`에서 inventory에 선언된 export만 named re-export할 수 있으며 wildcard re-export, 다른 import source, JSX markup, variant/class recipe를 둘 수 없다.
- 각 웹 앱의 `components/ui/*`는 앱별 Button/Badge/Card/Input/Table/Dialog/Select 등 primitive recipe를 새로 정의하지 않는다.
- `apps/web`, `packages/web-shell`, `packages/web-auth`의 TSX surface는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 `@ssoo/web-ui` primitive 또는 앱 thin adapter를 소비한다.
- 정적 intrinsic 태그에 `role=button/tab/checkbox/...`, `onClick+tabIndex`, `onClick+onKeyDown`을 붙여 interactive primitive처럼 쓰는 pseudo-control은 금지한다.
- `@ssoo/web-ui` 원자 컴포넌트 사용처의 `className`에는 배치/간격 같은 문맥 override만 허용한다. Button/Input/NativeSelect/SelectTrigger/Textarea/Checkbox의 색상, 높이, radius, border, typography, focus recipe를 다시 조합하면 `pnpm run verify:ui-consumption`에서 실패한다.
- `@ssoo/web-ui`의 `cn()`은 SSOO 커스텀 typography token과 color token을 동시에 보존하는 class merge 정본이다. 앱/공용 패키지 로컬 utils는 이 구현을 재사용해야 하며, 단순 `twMerge(clsx(...))`로 되돌리면 `pnpm run verify:ui-style-boundary`에서 실패한다.
- DMS 문서 페이지의 header action 리듬은 플랫폼 page action 기준선이다. 기준값은 36px control height, 12px horizontal padding, 13px medium action label이며, `SsooPageHeader`와 데이터/설정 page header action은 Button `pageAction` 같은 공용 role size를 사용하고, 사용처 className에서 height/spacing/typography recipe를 다시 조합하지 않는다.
- 이 전역 소비 기준은 `pnpm run verify:ui-consumption`에서 실패 처리되며, `build`, `codex:preflight`, `codex:push-guard`에 묶인다.
- 전역 디자인 표준은 공유 패키지의 원자 UI/페이지 템플릿/auth surface와 도메인 앱의 `components/templates`, `components/common/{page,datagrid,form}`, DMS settings surface 같은 재사용 surface뿐 아니라 `apps/web/*/src/components/pages/**` 최종 페이지 내부와 주요 App Router page/error surface까지 적용된다. 앱 `globals.css`, 앱 Tailwind theme recipe, 공용/도메인 재사용 surface와 최종 페이지 내부의 font/theme/raw Tailwind 색상(arbitrary/hex 및 `white`/`black` 포함) visual token 재정의는 `pnpm run verify:ui-style-boundary`에서 실패한다.
- `verify:ui-style-boundary`는 `build`, `codex:preflight`, `codex:push-guard`에 묶이며, 제어 가능한 third-party/editor/export renderer도 `--font-sans`/`--font-mono` 같은 플랫폼 token을 사용해야 한다.
- 내부 페이지 recipe는 `@ssoo/web-shell`의 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry`를 통해 `contentPage` 단일 route contract로 조립한다.
- 앱 TS/TSX 소스는 저수준 `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooMdiTabbedContentArea`를 직접 소비하지 않는다.
- `legacyException`, `shellPage`, app-local page recipe clone, 저수준 MDI content primitive 우회는 `pnpm run verify:ssoo-frame`에서 실패 처리되며, `codex:preflight`, `codex:push-guard`, PR validation에 묶인다.
- `codex:push-guard`는 `packages/types`, `packages/web-auth`, `packages/web-shell`, `packages/web-ui` 변경을 5개 Next 앱(Admin/CRM/PMS/DMS/SNS) 전체의 production build 영향으로 계산한다. 공용 브라우저 패키지 변경을 일부 앱 빌드만으로 통과시키지 않는다.

## 백엔드 모듈 구조

```
modules/
├── common/           # 공용 모듈 (auth, user, access, health)
├── pms/              # PMS 도메인 모듈
│   ├── project/
│   ├── menu/
│   └── pms.module.ts
├── sns/              # SNS 도메인 모듈
└── dms/              # DMS 도메인 모듈
```

## 레포 특화 네이밍 규칙

### DB 테이블 네이밍

| 스키마 | 접두사 | 예시 |
|--------|--------|------|
| common | `cm_` | `cm_user_m`, `cm_code_m` |
| pms | `pr_` | `pr_project_m`, `pr_task_m` |
| dms | `dm_` | `dm_document_m` |

### NestJS 클래스 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 서비스 | PascalCase + Service | `UserService`, `ProjectService` |
| 컨트롤러 | PascalCase + Controller | `AuthController` |
| DTO | PascalCase + Dto | `CreateUserDto`, `UpdateProjectDto` |

## 기본 명령

| 용도 | 명령어 |
|------|--------|
| lint | `pnpm lint` |
| build | `pnpm build` |
| test | `pnpm test` (현재 server Jest 포함) |
| production dependency audit | `pnpm security:audit` |
| codex preflight | `pnpm run codex:preflight` |
| codex sync verify | `pnpm run codex:verify-sync` |

## 공급망 기준

- 루트 `packageManager`의 pnpm 11.13.1과 Node.js 22.13+ 기준을 유지한다. Docker base/runner도 Node.js 22 LTS를 사용한다.
- `pnpm-workspace.yaml`은 24시간 release-age strict gate와 package/version 단위 `allowBuilds`를 사용한다. 리뷰되지 않은 dependency install script를 일괄 허용하지 않는다.
- 공개 전 `pnpm security:audit`로 production high/critical 0을 확인하며, registry 연결 실패는 통과로 간주하지 않는다.
- 서버 spreadsheet extraction은 SheetJS 공식 CDN tarball을 사용하고, 브라우저 앱에는 실제 사용하지 않는 `xlsx` 의존성을 선언하지 않는다.

## 경로 → Instruction 매핑

| 경로 | Codex Instruction | GitHub Instruction |
|------|-------------------|-------------------|
| `apps/server/**` | `server.instructions.md` | `server.instructions.md` |
| `apps/web/admin/**` | `project.instructions.md` | `pms.instructions.md` shell/API/store 패턴 준용 |
| `apps/web/crm/**` | `project.instructions.md` | `project.instructions.md` + frame system 기준 |
| `apps/web/pms/**` | `pms.instructions.md` | `pms.instructions.md` |
| `apps/web/sns/**` | `project.instructions.md` | `sns.instructions.md` |
| `apps/web/dms/**` | `dms.instructions.md` | `dms.instructions.md` |
| `packages/database/**` | `database.instructions.md` | `database.instructions.md` |
| `packages/types/**` | `types.instructions.md` | `types.instructions.md` |
| `packages/web-auth/**` | `project.instructions.md` | `project.instructions.md` |
| `packages/web-shell/**` | `project.instructions.md` | `project.instructions.md` |
| `packages/web-ui/**` | `project.instructions.md` | `project.instructions.md` |
| `**/*.test.*` | `testing.instructions.md` | `testing.instructions.md` |

## 문서 동기화

- 코드 변경 시 대응 문서의 backlog/changelog 반영 확인
- 규칙 변경 시 `.github/` (정본) → `.codex/instructions/` → `CLAUDE.md` 순서로 반영

## 레포 특화 금지 사항

1. **DMS에서 `@ssoo/database` 직접 import** - DMS는 웹 앱이며 DB 접근은 서버/플랫폼 경계를 통해 관리
2. **스키마 간 직접 참조** - common ↔ pms 간 FK 금지, 애플리케이션 레벨 조인 사용

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-07-16 | Node.js 22.13+/NestJS 11/pnpm 11.13.1 기준, release-age strict gate, install-script allowlist, production dependency audit와 SheetJS 공식 배포 경로를 공급망 표준으로 추가 |
| 2026-07-08 | SSOO 커스텀 typography token과 color token이 같이 보존되도록 `@ssoo/web-ui` class merge 정본을 고정하고, DMS 문서 page action 리듬(36px/12px/13px medium)을 공용 Button role size 기준선으로 추가 |
| 2026-07-08 | `verify:ui-style-boundary` 범위를 app globals, 모든 웹 앱 최종 페이지 내부와 주요 App Router page/error surface까지 확장하고 raw `white`/`black` visual token도 차단 |
| 2026-07-07 | 공용 원자/페이지 템플릿/auth surface와 앱 globals/Tailwind/domain reusable surface 스타일 경계를 `verify:ui-style-boundary`로 추가하고 build/preflight/push guard에 연결 |
| 2026-06-19 | 원자 UI export/adapter AST 검증, pseudo-control 금지, primitive recipe className 중복 차단 기준 추가 |
| 2026-06-18 | 원자 UI raw 태그 소비를 `apps/web`, `web-shell`, `web-auth` 전역에서 금지하는 `verify:ui-consumption` 추가 |
| 2026-06-18 | 원자 UI inventory 중간 상태를 제거하고 모든 등록 원자를 `platform` 단일 상태로 정리 |
| 2026-06-18 | 원자 UI inventory 정본과 `verify:ui-primitives` 빌드/preflight/push guard 강제 기준 추가 |
| 2026-06-22 | 내부 페이지 `contentPage` route contract와 `verify:ssoo-frame` preflight/push/PR validation 강제 기준 추가 |
| 2026-06-17 | DMS 확정 화면과 PMS DataGrid/요청 목록을 선별 UI 기준선으로 정의하고 `selected-web-ui-primitives` 검증 기준 추가 |
| 2026-06-17 | `@ssoo/web-ui`를 공용 디자인 토큰/Tailwind preset/UI primitive 경계로 추가 |
| 2026-06-17 | Admin/CRM을 현재 웹 앱 기준선에 추가하고 모든 웹 앱의 `@ssoo/web-auth`/`@ssoo/web-shell` 공유 경계를 명시 |
| 2026-02-27 | 기술 스택 테이블, 백엔드 모듈 구조, DB 테이블/NestJS 네이밍, 경로→instruction 매핑 추가 |
| 2026-02-22 | Codex 프로젝트 정본 신설 |
