---
title: UI Primitive Inventory
owner: platform-team
status: active
lastReviewed: 2026-07-08
---

# UI Primitive Inventory

SSOO 원자 UI 컴포넌트는 `@ssoo/web-ui`를 플랫폼 pool로 삼는다. 특정 앱이 지금 쓰지 않는 원자라도 플랫폼 구현으로 등록하며, inventory에 오른 원자는 앱 로컬 구현을 둘 수 없다.

## 정본 파일

- machine-readable inventory: `packages/web-ui/primitive-inventory.json`
- platform implementation: `packages/web-ui/src/*.tsx`
- gate script: `.github/scripts/verify-ui-primitives.js`
- consumption gate script: `.github/scripts/verify-ui-consumption.js`
- style boundary gate script: `.github/scripts/verify-ui-style-boundary.js`

## 상태 모델

원자 UI inventory는 단일 상태만 허용한다.

| 상태 | 의미 | 앱 로컬 구현 |
|------|------|--------------|
| `platform` | `@ssoo/web-ui`가 recipe와 구현을 소유 | `components/ui/*` thin re-export만 허용 |

중간 상태, 로컬 전용 상태, 앱 전용 상태는 허용하지 않는다. 앱에서 먼저 구현하고 나중에 승격하는 흐름도 금지한다.

## 현재 platform 원자

| 원자 | 정본 exports |
|------|--------------|
| AlertDialog | `AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` |
| Avatar | `Avatar`, `AvatarImage`, `AvatarFallback` |
| Badge | `Badge`, `BadgeProps`, `badgeVariants` |
| Button | `Button`, `ButtonProps`, `buttonVariants` |
| Card | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent` |
| Checkbox | `Checkbox` |
| Dialog | `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogSurface`, `DialogBody` |
| Divider/Separator | `Divider`, `DividerProps`, `Separator` |
| Dropdown/DropdownMenu | `Dropdown`, `Option`, `DropdownProps`, `OptionProps`, `DropdownMenu*` |
| Input | `Input` |
| NativeSelect | `NativeSelect` |
| PopupBackdrop | `PopupBackdrop`, `PopupBackdropProps`, `POPUP_BACKDROP_TONE_CLASS`, `POPUP_BACKDROP_ANIMATION_CLASS` |
| ScrollArea | `ScrollArea`, `ScrollAreaProps` |
| SegmentedControl | `SegmentedControl`, `SegmentedControlItem`, `SegmentedControlItemProps`, `SegmentedControlProps` |
| Select | `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` |
| Skeleton | `Skeleton` |
| Table | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |
| Textarea | `Textarea` |

## 강제 기준

1. inventory의 모든 primitive는 `platform` 상태여야 한다.
2. `packages/web-ui/src`의 primitive 구현 파일은 inventory에 선언되어야 한다.
3. inventory primitive는 `packages/web-ui/src/index.ts`에서 named/type re-export되어야 하며, gate는 TypeScript AST로 export source와 export name을 대조한다.
4. 앱 `apps/web/*/src/components/ui/*` 파일은 inventory에 등록된 원자만 허용한다.
5. 앱 로컬 `components/ui/*` 파일은 `@ssoo/web-ui` thin named re-export adapter만 허용한다.
6. 앱 로컬 `components/ui/*` 파일 안에서는 `React.forwardRef`, `cva`, `cn`, Radix import, JSX markup, 자체 `className` recipe를 둘 수 없다.
7. `apps/web`, `packages/web-shell`, `packages/web-auth`의 TSX surface는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 platform primitive를 소비한다.
8. 정적 intrinsic 태그에 interactive role 또는 `onClick+tabIndex`/`onClick+onKeyDown`을 붙여 primitive처럼 쓰는 pseudo-control은 허용하지 않는다.
9. `@ssoo/web-ui` 원자 사용처의 `className`은 layout-only override만 허용한다. Button/Input/NativeSelect/SelectTrigger/Textarea/Checkbox recipe 토큰을 다시 조합하면 실패한다.
10. `@ssoo/web-ui`의 `cn()`은 SSOO 커스텀 typography token과 color token을 동시에 보존하는 class merge 정본이다. 앱/공용 패키지 local utils는 이 구현을 재사용한다.
11. DMS 문서 페이지 header action의 현재 렌더 리듬(36px control height, 12px horizontal padding, 13px medium label)은 Button `pageAction` 역할 size 기준선이다. 공용 page header/data workspace/settings header action은 이 역할 size를 소비하고 사용처에서 height/spacing/typography recipe를 재조합하지 않는다.
12. 공용 auth input의 trailing icon control은 Button `authIcon` 역할 size(44×44px)를 사용한다. auth 사용처에서 raw button이나 높이·너비 recipe를 다시 만들지 않는다.
13. story 파일은 검증 대상에서 제외한다.
14. 앱 `globals.css`의 font/theme/raw visual token 재정의, 앱 Tailwind theme recipe 재선언, 공용 원자/페이지 템플릿/auth surface, 도메인 reusable surface, 최종 페이지 내부와 주요 App Router page/error surface의 raw Tailwind 색상/arbitrary/hex visual token 재정의는 `verify:ui-style-boundary`에서 실패한다. raw `white`/`black`도 semantic token 없이 직접 쓰지 않는다.
15. 외부 원본의 exact visual/print 계약이 있는 final-page 문서 renderer는 source reference와 fresh visual test가 모두 있을 때만 `design/source-fidelity-override:start ref=<reference-id> evidence=<test-id>`/end marker 블록을 사용할 수 있다. shell·공용 primitive·일반 업무 화면에는 사용할 수 없고, marker 경로·metadata·중첩·종료 오류는 fail closed다.

## 실행 지점

- `pnpm run verify:ui-primitives`: inventory와 앱 로컬 adapter를 직접 검증한다.
- `pnpm run verify:ui-consumption`: 앱/공용 web surface의 raw 원자 태그 소비를 검증한다.
- `pnpm run verify:ui-style-boundary`: 공용 원자/페이지 템플릿/auth surface, app globals/Tailwind/domain reusable surface, 최종 페이지 내부의 style drift를 검증한다.
- `pnpm run codex:preflight`: 작업 시작/점검 루틴에서 두 gate를 실행한다.
- `pnpm run build`: `build:raw` 진입 전에 두 gate를 실행한다.
- `pnpm run codex:push-guard`: push 전 두 gate를 실행한다.

## 신규 원자 추가 절차

1. 중복 구현 필요성을 전수 확인한다.
2. 공통 recipe를 `packages/web-ui/src/{primitive}.tsx`에 만든다.
3. `packages/web-ui/src/index.ts`에서 export한다.
4. `packages/web-ui/primitive-inventory.json`에 `platform` 상태로 등록한다.
5. 필요한 앱 `components/ui/{primitive}.tsx`는 `@ssoo/web-ui` named re-export adapter로만 만든다.
6. 기존 raw JSX, pseudo-control, recipe class override 소비처를 `@ssoo/web-ui` primitive 또는 앱 thin adapter로 옮긴다.
7. `pnpm run verify:ui-primitives`, `pnpm run verify:ui-consumption`, 대상 앱 빌드를 통과시킨다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-08-21 | 외부 원본 문서의 exact visual/print renderer에 한정한 source-fidelity override marker와 fail-closed style-boundary 계약 추가 |
| 2026-08-19 | 공용 auth input trailing icon에 raw button/사용처 크기 조합 대신 Button `authIcon` 44×44px 역할 size를 추가 |
| 2026-07-08 | SSOO typography/color token을 함께 보존하는 `cn()` merge 정본과 DMS 문서 page action 기반 Button `pageAction` 역할 size 기준(36px/12px/13px medium)을 추가 |
| 2026-07-08 | `verify:ui-style-boundary`의 검사 범위를 app globals, 최종 페이지 내부와 주요 App Router page/error surface까지 확장하고 raw `white`/`black` visual token도 차단 |
| 2026-07-07 | 공용 원자/페이지 템플릿/auth surface와 앱 globals/Tailwind/domain reusable surface style drift를 차단하는 `verify:ui-style-boundary` gate 추가 |
| 2026-06-19 | `SegmentedControl` primitive 추가, export/adapter AST 검증과 pseudo-control/recipe class 중복 차단 기준 반영 |
| 2026-06-18 | 원자 UI raw 태그 소비를 앱/web-shell/web-auth 전역에서 막는 `verify:ui-consumption` 추가 |
| 2026-06-18 | 원자 UI inventory의 중간 상태를 제거하고 모든 원자를 `platform` 단일 상태로 정리 |
| 2026-06-18 | 원자 UI inventory 정본과 `verify:ui-primitives` 강제 기준 추가 |
