# 프로젝트 패키지 비교 분석

> 📅 기준일: 2026-01-27  
> 📌 목적: PMS ↔ DMS 환경 통일을 위한 현황 비교

---

## 1. 코어 프레임워크 비교

| 패키지 | PMS | DMS | 차이 | 통일 방향 |
|--------|-----|-----|------|----------|
| `next` | ^15.1.0 | 16.0.0 | ⚠️ 메이저 차이 | DMS 다운그레이드 예정 |
| `react` | ^19.2.0 | 19.2.0 | ✅ 통일 완료 | 19.2.0 |
| `react-dom` | ^19.2.0 | 19.2.0 | ✅ 통일 완료 | 19.2.0 |
| `typescript` | ^5.7.0 | ^5 | ✅ 호환 | 5.7.0으로 통일 |

### 1.1 Next.js 버전 이슈

| 항목 | PMS (15.x) | DMS (16.x) |
|------|------------|------------|
| 기본 번들러 | Webpack | Turbopack |
| 실행 플래그 | 없음 | `--webpack` 필요 |
| 안정성 | Stable | Latest |

**권장:** PMS 기준 (15.x)으로 통일 또는 DMS를 15.x로 다운그레이드

---

## 2. UI 라이브러리 비교

| 카테고리 | PMS | DMS |
|----------|-----|-----|
| **디자인 시스템** | shadcn/ui (Radix) | MUI + Fluent UI |
| **스타일링** | Tailwind CSS | Tailwind CSS |
| **아이콘** | lucide-react | lucide-react |

### 2.1 PMS UI 스택

```
Tailwind CSS
    └── shadcn/ui
         └── Radix UI Primitives
              ├── @radix-ui/react-dialog
              ├── @radix-ui/react-dropdown-menu
              ├── @radix-ui/react-select
              └── ...
```

### 2.2 DMS UI 스택

```
Tailwind CSS + Emotion
    ├── MUI (Material UI v7)
    │    ├── @mui/material
    │    ├── @mui/lab
    │    └── @mui/x-tree-view
    │
    └── Fluent UI
         ├── @fluentui/react (v8)
         └── @fluentui/react-components (v9)
```

### 2.3 🚨 UI 라이브러리 충돌 분석

| 이슈 | 설명 | 심각도 |
|------|------|--------|
| **스타일 충돌** | MUI + Fluent UI + Tailwind 3중 혼용 | 🔴 높음 |
| **번들 크기** | 3개 라이브러리로 인한 비대화 | 🟡 중간 |
| **학습 비용** | 개발자가 3개 API 모두 숙지 필요 | 🟡 중간 |
| **CSS-in-JS 충돌** | Emotion(MUI) vs Griffel(Fluent) | 🔴 높음 |

---

## 3. 상태 관리 비교

| 기능 | PMS | DMS | 통일 방향 |
|------|-----|-----|----------|
| **클라이언트 상태** | Zustand | ❌ 없음 | Zustand |
| **서버 상태** | TanStack Query | ❌ 없음 | TanStack Query |
| **폼 상태** | React Hook Form | ❌ 없음 | React Hook Form |
| **유효성 검사** | Zod | ❌ 없음 | Zod |

---

## 4. 데이터 테이블 비교

| 기능 | PMS | DMS |
|------|-----|-----|
| **테이블 라이브러리** | TanStack Table | MUI X Tree View |
| **가상 스크롤** | TanStack Virtual | ❌ 없음 |

---

## 5. 공통 유틸리티 비교

| 패키지 | PMS | DMS | 용도 |
|--------|-----|-----|------|
| `class-variance-authority` | ^0.7.1 | ^0.7.1 | ✅ 동일 |
| `clsx` | ^2.1.0 | ^2.1.1 | ✅ 호환 |
| `tailwind-merge` | ^2.6.0 | ^3.3.1 | ⚠️ 메이저 차이 - DMS 다운그레이드 예정 |
| `lucide-react` | ^0.548.0 | ^0.548.0 | ✅ 통일 완료 |
| `dayjs` | ^1.11.0 | ❌ 없음 | PMS만 |
| `axios` | ^1.7.0 | ❌ 없음 | PMS만 |

---

## 6. DMS 전용 패키지

### 6.1 리치 텍스트 에디터 (유지)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@tiptap/*` | ^3.16.0 | 블록 에디터 (14개 패키지) |
| `lowlight` | ^3.3.0 | 코드 구문 강조 |
| `tippy.js` | ^6.3.7 | 에디터 툴팁 |

### 6.2 마크다운 처리 (유지)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `marked` | ^17.0.1 | 마크다운 파서 |
| `react-markdown` | ^10.1.0 | 마크다운 렌더링 |
| `remark-gfm` | ^4.0.1 | GFM 지원 |
| `turndown` | ^7.2.2 | HTML → MD 변환 |

### 6.3 AI/Vector 검색 (유지)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `@google/generative-ai` | ^0.24.1 | Gemini API |
| `@lancedb/lancedb` | ^0.23.0 | 벡터 DB |

---

## 7. 모노레포 통합 상태

| 프로젝트 | `@ssoo/types` | `@ssoo/database` |
|----------|---------------|------------------|
| **server** | ✅ workspace:* | ✅ workspace:* |
| **web-pms** | ✅ workspace:* | ❌ 미사용 |
| **web-dms** | ❌ 미연동 | ❌ 미연동 |

---

## 8. 통일 우선순위 제안

### Phase 1: 긴급 (UI 작동)

| 작업 | 설명 |
|------|------|
| ✅ globals.css 수정 | 잘못된 Fluent UI CSS import 제거 |
| ✅ react/react-dom 통일 | PMS 19.0.0 → 19.2.0 업그레이드 |
| ✅ lucide-react 통일 | PMS 0.468.0 → 0.548.0 업그레이드 |
| ❌ UI 라이브러리 정리 | Fluent UI 제거 또는 MUI 제거 |

### Phase 2: 인프라 통일

| 작업 | 설명 |
|------|------|
| ❌ Next.js 버전 통일 | DMS 16.x → 15.x 다운그레이드 예정 |
| ❌ tailwind-merge 통일 | DMS 3.x → 2.x 다운그레이드 예정 |
| ❌ `@ssoo/types` 연동 | DMS에서 공유 타입 사용 |
| ❌ 상태 관리 추가 | Zustand, TanStack Query |

### Phase 3: UI 스택 통일

| 작업 | 설명 |
|------|------|
| ❌ shadcn/ui 도입 | DMS에 Radix 기반 컴포넌트 |
| ❌ MUI 제거 또는 유지 결정 | 트리 뷰 등 특수 컴포넌트만 유지? |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - 현황 비교 분석 |
| 2026-01-27 | PMS 업그레이드: react 19.2.0, react-dom 19.2.0, lucide-react 0.548.0 |
