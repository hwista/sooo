````mdc
# DMS 통합 리팩터링 계획서

> 📅 기준일: 2026-01-27  
> 📌 목적: PMS 기준 DMS 프로젝트 구조 정렬 및 패키지 통합  
> 📂 이전 문서: `docs/pms/architecture/package-comparison.md` (병합됨)

---

## 🔴 핵심 원칙

> **DMS는 모노레포를 몰라야 한다**

| 원칙 | 설명 |
|------|------|
| **독립 실행** | DMS는 GitLab에서 단독으로 clone하여 실행 가능해야 함 |
| **모노레포 패키지 금지** | `@ssoo/types`, `@ssoo/database` 등 workspace 패키지 사용 금지 |
| **자체 완결** | 타입, API, 유틸리티 모두 DMS 내부에서 정의 |
| **외부 통신** | 필요시 HTTP API로만 통신 (현재 해당 없음) |

**현재 DMS 아키텍처:**
```
DMS (Self-contained)
├── Frontend: Next.js
├── Backend: Next.js API Routes (app/api/)
├── Storage: 로컬 파일 시스템 (docs/wiki/)
└── 외부 연동: ❌ 없음 (백엔드/DB 미연동)
```

---

## 1. 통합 현황 요약

| 구분 | 상태 | 비고 |
|------|------|------|
| **프로젝트 구조** | 🔴 정렬 필요 | PMS 기준 `src/` 구조로 통일 |
| **코어 프레임워크** | ✅ 완료 | Next.js 15.x, React 19.x |
| **CSS 유틸리티** | ✅ 완료 | Tailwind, tailwind-merge 2.x |
| **상태 관리** | ⬜ 미적용 | zustand, react-hook-form |
| **UI 라이브러리** | 🔴 정리 필요 | MUI/Fluent UI 혼용 |
| **DMS 도메인** | ✅ 유지 | Tiptap, 마크다운, AI |
| **모노레포 연동** | 🚫 해당없음 | DMS는 독립 프로젝트로 유지 |

### 1.1 UI 스택 비교

**PMS (목표)**
```
Tailwind CSS
    └── shadcn/ui
         └── Radix UI Primitives
```

**DMS (현재 - 정리 필요)**
```
Tailwind CSS + Emotion
    ├── MUI (Material UI v7)  ← 트리뷰만 유지?
    └── Fluent UI v8/v9       ← 제거 대상
```

### 1.2 🚨 UI 라이브러리 충돌 이슈

| 이슈 | 설명 | 심각도 |
|------|------|--------|
| **스타일 충돌** | MUI + Fluent UI + Tailwind 3중 혼용 | 🔴 높음 |
| **번들 크기** | 3개 라이브러리로 인한 비대화 | 🟡 중간 |
| **학습 비용** | 개발자가 3개 API 모두 숙지 필요 | 🟡 중간 |
| **CSS-in-JS 충돌** | Emotion(MUI) vs Griffel(Fluent) | 🔴 높음 |

### 1.3 프로젝트 구조 비교

| 측면 | PMS (목표) | DMS (현재) | 변경 필요 |
|------|------------|------------|----------|
| **소스 디렉토리** | `src/` 래퍼 | 루트 레벨 | 🔴 이동 필요 |
| **라우팅** | `(auth)/`, `(main)/` | `wiki/`, `api/` | 🟡 Route Group |
| **컴포넌트** | `common/layout/pages/templates/ui/` | `editor/ui/wiki/` | 🔴 재분류 |
| **상태관리** | `stores/` (zustand) | `contexts/` (Context API) | 🔴 패턴 변경 |
| **API 레이어** | `lib/api/` | `services/` | 🟡 구조 통일 |
| **유틸리티** | `lib/utils/` | `utils/` + `lib/` (분산) | 🟡 통합 |
| **훅** | `hooks/queries/` | `hooks/services/` | 🟡 명명 통일 |
| **타입** | `types/` | `types/` | ✅ 유사 |

> ⚠️ **참고**: DMS는 모노레포 패키지(`@ssoo/types`, `@ssoo/database`)를 사용하지 않음

### 1.4 소스 구조 도식화

#### PMS 소스 구조 (목표 - 프론트엔드 전용)

```
apps/web/pms/
├── src/                          ← 🎨 프론트엔드 (전부)
│   ├── app/                      ← Next.js App Router
│   │   ├── (auth)/              ← 인증 라우트 그룹
│   │   │   └── login/
│   │   └── (main)/              ← 메인 라우트 그룹
│   │       ├── projects/
│   │       └── settings/
│   ├── components/
│   │   ├── common/              ← 범용 컴포넌트
│   │   ├── layout/              ← 레이아웃 (Header, Sidebar)
│   │   ├── pages/               ← 페이지별 전용
│   │   ├── templates/           ← 페이지 템플릿
│   │   └── ui/                  ← 기본 UI (Button, Input)
│   ├── hooks/
│   │   └── queries/             ← React Query 훅
│   ├── lib/
│   │   ├── api/                 ← 🔗 외부 서버 API 클라이언트
│   │   │   ├── client.ts        ← axios (→ localhost:4000)
│   │   │   ├── auth.ts
│   │   │   └── endpoints/
│   │   ├── utils/
│   │   └── validations/
│   ├── stores/                  ← zustand 스토어
│   └── types/
│
├── (app/api/ 없음)              ← ❌ 내부 백엔드 없음
└── public/

👉 백엔드: apps/server (NestJS) - 별도 프로젝트
```

#### DMS 소스 구조 - 변경 전 (현재)

```
apps/web/dms/
├── app/                          ← 페이지 + API 혼재
│   ├── api/                     ← ⚙️ 내부 백엔드 (API Routes)
│   │   ├── files/
│   │   ├── file/
│   │   ├── search/
│   │   ├── gemini/
│   │   └── git/
│   └── wiki/                    ← 페이지
├── components/                   ← 분류 없이 혼재
│   ├── editor/
│   ├── ui/
│   └── wiki/
├── contexts/                     ← React Context (구식)
├── hooks/
│   └── services/
├── services/                     ← 비즈니스 로직 (백엔드)
│   └── fileSystem/
├── lib/
├── types/
├── utils/
└── docs/
```

#### DMS 소스 구조 - 변경 후 (목표, 통합 대비 "미니 모노레포")

```
apps/web/dms/
│
├── src/                          ← 🎨 프론트엔드 영역 (통합 후 유지)
│   ├── app/                      ← Next.js App Router (페이지만)
│   │   ├── (main)/              ← 메인 라우트 그룹
│   │   │   └── wiki/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── pages/
│   │   │   ├── editor/
│   │   │   └── wiki/
│   │   ├── templates/
│   │   └── ui/
│   ├── hooks/
│   │   └── queries/             ← API 호출 훅
│   ├── lib/
│   │   ├── api/                 ← 🔗 API 클라이언트 (server/ 호출)
│   │   └── utils/
│   ├── stores/                  ← zustand 스토어
│   └── types/
│
├── server/                       ← ⚙️ 백엔드 영역 (통합 시 → apps/server로 이전)
│   ├── handlers/                ← API 핸들러 로직
│   │   ├── files.handler.ts
│   │   ├── file.handler.ts
│   │   ├── search.handler.ts
│   │   └── gemini.handler.ts
│   ├── services/                ← 비즈니스 로직
│   │   └── fileSystem/
│   └── lib/                     ← 서버 유틸리티
│
├── app/                          ← Next.js 라우팅 (얇은 레이어)
│   └── api/                     ← server/handlers 호출만
│       ├── files/route.ts       → import { GET } from '@/server/handlers/files.handler'
│       ├── file/route.ts
│       └── .../route.ts
│
└── docs/
```

### 1.5 통합 시 마이그레이션 전략

```
┌─────────────────────────────────────────────────────────────────────┐
│                        현재 (독립 운영)                              │
├─────────────────────────────────────────────────────────────────────┤
│  DMS (풀스택)                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   src/      │  │   server/   │  │   app/api/  │                  │
│  │ 프론트엔드  │─▶│  백엔드로직 │◀─│  라우팅     │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
│                          │                                           │
│                          ▼                                           │
│                   파일 시스템 (fs.*)                                 │
└─────────────────────────────────────────────────────────────────────┘

                              ⬇️ 통합 시

┌─────────────────────────────────────────────────────────────────────┐
│                        통합 후 (예상)                                │
├─────────────────────────────────────────────────────────────────────┤
│  DMS (프론트엔드만)              Server (NestJS)                     │
│  ┌─────────────┐                ┌─────────────────────┐             │
│  │   src/      │    HTTP API    │ modules/dms/        │             │
│  │ 프론트엔드  │───────────────▶│ ├── handlers/       │◀── server/ │
│  │ lib/api/    │                │ ├── services/       │    이전     │
│  └─────────────┘                │ └── lib/            │             │
│                                 └─────────────────────┘             │
│  ┌─────────────┐                         │                          │
│  │  app/api/   │ ❌ 삭제                 ▼                          │
│  └─────────────┘                  파일 시스템 + DB                   │
│                                  (하이브리드 스토리지)               │
└─────────────────────────────────────────────────────────────────────┘
```

**마이그레이션 요약:**

| 현재 위치 | 통합 후 | 비고 |
|-----------|---------|------|
| `src/` | **유지** | 프론트엔드 그대로 |
| `server/` | → `apps/server/modules/dms/` | 백엔드 로직 이전 |
| `app/api/` | **삭제** | 라우팅 레이어 불필요 |
| `src/lib/api/` | 외부 호출로 변경 | `localhost:4000/api/dms/*` |

---

## 2. 이미 통일된 패키지 ✅

> 더 이상 작업 불필요

| 패키지 | PMS | DMS | 상태 |
|--------|-----|-----|------|
| `next` | ^15.1.0 | ^15.1.0 | ✅ |
| `react` | ^19.2.4 | 19.2.0 | ✅ |
| `react-dom` | ^19.2.4 | 19.2.0 | ✅ |
| `typescript` | ^5.7.0 | ^5 | ✅ |
| `tailwindcss` | ^3.4.0 | ^3.4.0 | ✅ |
| `tailwind-merge` | ^2.6.0 | ^2.6.0 | ✅ |
| `class-variance-authority` | ^0.7.1 | ^0.7.1 | ✅ |
| `clsx` | ^2.1.0 | ^2.1.1 | ✅ |
| `lucide-react` | ^0.548.0 | ^0.548.0 | ✅ |
| `autoprefixer` | ^10.4.0 | ^10.4.21 | ✅ |
| `postcss` | ^8.4.0 | ^8.5.6 | ✅ |
| `eslint` | ^9.0.0 | ^9 | ✅ |
| `eslint-config-next` | ^15.1.0 | ^15.1.0 | ✅ |

---

## 3. DMS 도입 대상 (PMS → DMS)

### 3.1 P1: 즉시 도입 (웹 개발 표준)

> 폼 처리, 상태 관리, 유효성 검사 - 모든 웹 앱 필수

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `zod` | ^3.24.0 | 스키마 유효성 검사 | ⬜ 미적용 |
| 2 | `react-hook-form` | ^7.54.0 | 폼 상태 관리 | ⬜ 미적용 |
| 3 | `@hookform/resolvers` | ^3.9.0 | RHF + Zod 연동 | ⬜ 미적용 |
| 4 | `zustand` | ^5.0.0 | 클라이언트 상태 관리 | ⬜ 미적용 |
| 5 | `sonner` | ^1.7.0 | 토스트 알림 | ⬜ 미적용 |

**설치 명령어:**
```bash
npm install zod react-hook-form @hookform/resolvers zustand sonner
```

---

### 3.2 P2: 내부 API 개선 (선택)

> 현재 DMS는 Next.js API Routes로 자체 백엔드 구현 중  
> 외부 서버 연동 없음 - 내부 fetch 호출 개선용

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `@tanstack/react-query` | ^5.62.0 | 클라이언트 캐싱/상태 | ⬜ 선택 |
| 2 | `axios` | ^1.7.0 | HTTP 클라이언트 | ⬜ 선택 |

> ❌ **제외**: `@ssoo/types` - DMS는 모노레포 패키지 사용 금지

**설치 명령어 (필요시):**
```bash
npm install @tanstack/react-query axios
npm install -D @tanstack/react-query-devtools
```

**현재 DMS API 구조:**
```
app/api/
├── files/      → 파일 목록 (fs.readdirSync)
├── file/       → 파일 CRUD (fs.read/writeFileSync)
├── search/     → 파일 내용 검색
├── upload/     → 파일 업로드
├── gemini/     → Google AI API
└── git/        → Git 명령어 실행
```

---

### 3.3 P3: 기능별 선택 도입

> 해당 기능 구현 시 도입

| # | 패키지 | 버전 | 용도 | 필요 시점 | 상태 |
|---|--------|------|------|----------|------|
| 1 | `@tanstack/react-table` | ^8.21.3 | 데이터 테이블 | 테이블 UI | ⬜ |
| 2 | `@tanstack/react-virtual` | ^3.13.18 | 가상 스크롤 | 대량 데이터 | ⬜ |
| 3 | `recharts` | ^3.6.0 | 차트 | 대시보드 | ⬜ |
| 4 | `dayjs` | ^1.11.0 | 날짜 처리 | 날짜 표시 | ⬜ |
| 5 | `numeral` | ^2.0.0 | 숫자 포맷 | 통계 표시 | ⬜ |
| 6 | `xlsx` | ^0.18.5 | 엑셀 처리 | 내보내기 | ⬜ |
| 7 | `socket.io-client` | ^4.8.0 | WebSocket | 실시간 협업 | ⬜ |

---

### 3.4 P4: UI 디자인 통일 (장기)

> PMS 디자인 시스템 적용 시 - MUI/Fluent 대체

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `@radix-ui/react-dialog` | ^1.1.15 | 다이얼로그 | ⬜ |
| 2 | `@radix-ui/react-dropdown-menu` | ^2.1.16 | 드롭다운 | ⬜ |
| 3 | `@radix-ui/react-select` | ^2.2.6 | 셀렉트 | ⬜ |
| 4 | `@radix-ui/react-checkbox` | ^1.3.3 | 체크박스 | ⬜ |
| 5 | `@radix-ui/react-label` | ^2.1.8 | 레이블 | ⬜ |
| 6 | `@radix-ui/react-separator` | ^1.1.8 | 구분선 | ⬜ |
| 7 | `@radix-ui/react-slot` | ^1.2.4 | 슬롯 | ⬜ |
| 8 | `@radix-ui/react-tooltip` | ^1.2.8 | 툴팁 | ⬜ |
| 9 | `tailwindcss-animate` | ^1.0.7 | 애니메이션 | ⬜ |

**설치 명령어 (전체):**
```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tooltip
npm install -D tailwindcss-animate
```

---

### 3.5 개발 도구 (선택)

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `storybook` + 관련 | ^8.6.15 | 컴포넌트 문서화 | ⬜ |
| 2 | `typedoc` | ^0.28.16 | API 문서 | ⬜ |
| 3 | `rimraf` | ^6.0.0 | clean 스크립트 | ⬜ |

---

## 4. DMS 전용 패키지 정리

### 4.1 🔴 제거 대상 (UI 라이브러리 정리)

> Radix UI(shadcn/ui) 기반으로 통일 시 제거

| # | 패키지 | 버전 | 이유 | 대체 | 상태 |
|---|--------|------|------|------|------|
| 1 | `@fluentui/react` | ^8.125.1 | UI 혼용 | Radix | ⬜ 제거 예정 |
| 2 | `@fluentui/react-components` | ^9.72.7 | UI 혼용 | Radix | ⬜ 제거 예정 |
| 3 | `@fluentui/react-icons` | ^2.0.317 | 아이콘 중복 | lucide-react | ⬜ 제거 예정 |

**제거 명령어:**
```bash
npm uninstall @fluentui/react @fluentui/react-components @fluentui/react-icons
```

---

### 4.2 🟡 검토 대상 (MUI)

> 트리 뷰 기능 필요성에 따라 유지/대체 결정

| # | 패키지 | 버전 | 용도 | 판단 | 상태 |
|---|--------|------|------|------|------|
| 1 | `@mui/material` | ^7.3.4 | UI 컴포넌트 | ⚠️ 트리뷰만 유지? | ⬜ 검토 |
| 2 | `@mui/lab` | ^7.0.1-beta.18 | 실험 기능 | ❓ 사용 여부 확인 | ⬜ 검토 |
| 3 | `@mui/x-tree-view` | ^8.15.0 | 트리 뷰 | ✅ DMS 필수 | ⬜ 유지 |
| 4 | `@emotion/react` | ^11.14.0 | MUI 의존 | MUI 따라감 | ⬜ 검토 |
| 5 | `@emotion/styled` | ^11.14.1 | MUI 의존 | MUI 따라감 | ⬜ 검토 |

**결정 필요:**
- [ ] 트리 뷰를 MUI로 유지할지 Radix 기반 구현할지
- [ ] MUI 유지 시 최소 패키지만 남기기

---

### 4.3 🟡 검토 대상 (서버/파일)

> 기능 사용 여부 확인 후 결정

| # | 패키지 | 버전 | 용도 | 사용 여부 | 상태 |
|---|--------|------|------|----------|------|
| 1 | `formidable` | ^3.5.4 | 파일 업로드 | ❓ 확인 필요 | ⬜ 검토 |
| 2 | `multer` | ^2.0.2 | 파일 업로드 | ❓ 중복 가능성 | ⬜ 검토 |
| 3 | `chokidar` | ^4.0.3 | 파일 감시 | ❓ 확인 필요 | ⬜ 검토 |
| 4 | `nodemailer` | ^7.0.12 | 이메일 발송 | ❓ 확인 필요 | ⬜ 검토 |

---

### 4.4 ✅ DMS 도메인 필수 (유지)

> 문서 관리 시스템 핵심 기능 - 절대 제거 금지

#### Tiptap 리치 텍스트 에디터

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `@tiptap/react` | ^3.16.0 | React 바인딩 | ✅ 유지 |
| 2 | `@tiptap/starter-kit` | ^3.16.0 | 기본 기능 | ✅ 유지 |
| 3 | `@tiptap/pm` | ^3.16.0 | ProseMirror | ✅ 유지 |
| 4 | `@tiptap/suggestion` | ^3.16.0 | 슬래시 명령 | ✅ 유지 |
| 5 | `@tiptap/extension-code-block-lowlight` | ^3.16.0 | 코드 하이라이트 | ✅ 유지 |
| 6 | `@tiptap/extension-highlight` | ^3.16.0 | 텍스트 강조 | ✅ 유지 |
| 7 | `@tiptap/extension-image` | ^3.16.0 | 이미지 | ✅ 유지 |
| 8 | `@tiptap/extension-link` | ^3.16.0 | 링크 | ✅ 유지 |
| 9 | `@tiptap/extension-placeholder` | ^3.16.0 | 플레이스홀더 | ✅ 유지 |
| 10 | `@tiptap/extension-table` | ^3.16.0 | 테이블 | ✅ 유지 |
| 11 | `@tiptap/extension-table-cell` | ^3.16.0 | 테이블 셀 | ✅ 유지 |
| 12 | `@tiptap/extension-table-header` | ^3.16.0 | 테이블 헤더 | ✅ 유지 |
| 13 | `@tiptap/extension-table-row` | ^3.16.0 | 테이블 행 | ✅ 유지 |
| 14 | `@tiptap/extension-task-item` | ^3.16.0 | 체크리스트 항목 | ✅ 유지 |
| 15 | `@tiptap/extension-task-list` | ^3.16.0 | 체크리스트 | ✅ 유지 |
| 16 | `lowlight` | ^3.3.0 | 코드 구문 강조 | ✅ 유지 |
| 17 | `tippy.js` | ^6.3.7 | 에디터 툴팁 | ✅ 유지 |

#### 마크다운 처리

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `marked` | ^17.0.1 | MD 파서 | ✅ 유지 |
| 2 | `react-markdown` | ^10.1.0 | MD 렌더링 | ✅ 유지 |
| 3 | `remark-gfm` | ^4.0.1 | GFM 지원 | ✅ 유지 |
| 4 | `turndown` | ^7.2.2 | HTML→MD | ✅ 유지 |

#### AI / 벡터 검색

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `@google/generative-ai` | ^0.24.1 | Gemini API | ✅ 유지 |
| 2 | `@lancedb/lancedb` | ^0.23.0 | 벡터 DB | ✅ 유지 |

#### DMS 유틸리티

| # | 패키지 | 버전 | 용도 | 상태 |
|---|--------|------|------|------|
| 1 | `tailwind-variants` | ^3.1.1 | 변형 관리 | ✅ 유지 (CVA 보완) |
| 2 | `@tailwindcss/typography` | ^0.5.19 | prose 스타일 | ✅ 유지 (MD 렌더링 필수) |

---

## 5. 통합 리팩터링 실행 계획

> 프로젝트 구조 정렬과 패키지 통합을 **동시 진행**하여 효율성 극대화  
> **통합 대비 "미니 모노레포" 구조**로 프론트/백엔드 분리

### Phase 0: 기반 구조 정렬 (1~2일) ⭐ 최우선

> 모든 작업의 전제조건 - 통합 대비 프론트/백엔드 분리 구조

**진행 상태:** ✅ 완료 (2026-01-27)

**Step 0: 준비 작업** ✅ 완료
- [x] 불필요한 페이지 삭제 (`goals-md/`, `goals.md/`, `wiki-test/`)
- [x] 문서 업데이트

**Step 1: 프론트엔드 영역 (`src/`) 구성** ✅ 완료
- [x] `src/` 디렉토리 생성
- [x] 프론트엔드 폴더 이동:
  - [x] `components/` → `src/components/`
  - [x] `hooks/` → `src/hooks/`
  - [x] `lib/` → `src/lib/`
  - [x] `types/` → `src/types/`
  - [x] `utils/` → `src/lib/utils/` (통합)
  - [x] `contexts/` → `src/contexts/` (Phase 1에서 stores로 변환)
- [x] `tsconfig.json` paths 업데이트 (`@/*` → `./src/*`)
- [x] import 경로 수정 (`@/utils/` → `@/lib/utils/`)
- [x] 빌드 테스트 통과

**Step 2: 백엔드 영역 (`server/`) 분리** ✅ 완료
- [x] `server/` 디렉토리 생성
- [x] 백엔드 로직 이동:
  - [x] `services/` → `server/services/`
  - [x] API 핸들러 추출: `src/app/api/*/route.ts` 로직 → `server/handlers/*.handler.ts`
    - [x] files.handler.ts (파일 트리)
    - [x] file.handler.ts (단일 파일 CRUD)
    - [x] git.handler.ts (Git 작업)
    - [x] search.handler.ts (벡터 검색)
    - [x] index.handler.ts (벡터 인덱싱)
    - [x] upload.handler.ts (파일 업로드)
    - [x] watch.handler.ts (파일 감시 SSE)
    - [x] gemini.handler.ts (Gemini AI 질문)
    - [x] text-search.handler.ts (텍스트 검색)
    - [x] ask.handler.ts (RAG AI 질문)
    - [x] 나머지 9개 (collaborate, comments, notifications, permissions, plugins, tags, templates, users, versions)
- [x] `src/app/api/` 얇은 레이어로 변경 완료 (19개 핸들러 전체 추출됨)

**Step 3: 페이지 라우팅 (`src/app/`) 구성** ✅ 완료
- [x] `app/` 전체를 `src/app/`으로 이동 (api 포함)
- [x] `(main)/` route group 생성 (wiki)
- [x] 루트 `app/` 디렉토리 제거

**Step 4: 설정 업데이트** ✅ 완료
- [x] `tsconfig.json` paths 업데이트:
  ```json
  {
    "paths": {
      "@/*": ["./src/*"],
      "@/server/*": ["./server/*"]
    }
  }
  ```
- [x] 모든 import 경로 수정
- [x] 빌드 테스트 (`npm run build`)

**현재 구조 (Phase 0 완료):**
```
apps/web/dms/
├── src/                    ← ✅ 프론트엔드 + 라우팅 통합
│   ├── app/               ← Next.js App Router
│   │   ├── (main)/       ← 메인 페이지들
│   │   │   └── wiki/
│   │   ├── api/          ← API Routes (19개) - 얇은 레이어
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── contexts/          ← (Phase 1에서 stores로 변환)
│   ├── hooks/
│   ├── lib/
│   │   └── utils/
│   └── types/
├── server/                 ← ✅ 백엔드
│   ├── handlers/          ← ✅ 10개 핸들러 추출 완료
│   │   ├── ask.handler.ts
│   │   ├── file.handler.ts
│   │   ├── files.handler.ts
│   │   ├── gemini.handler.ts
│   │   ├── git.handler.ts
│   │   ├── index.handler.ts
│   │   ├── search.handler.ts
│   │   ├── text-search.handler.ts
│   │   ├── upload.handler.ts
│   │   └── watch.handler.ts
│   └── services/
└── ...
```

---

### Phase 1: 상태관리 + P1 패키지 (2~3일)

> **구조 + 패키지 동시 진행** - 가장 큰 시너지

**패키지 설치:**
- [ ] `zod` 설치
- [ ] `react-hook-form` + `@hookform/resolvers` 설치
- [ ] `zustand` 설치
- [ ] `sonner` 설치

**구조 변경:**
- [ ] `src/contexts/` 분석 (어떤 Context가 있는지)
- [ ] `src/stores/` 디렉토리 생성
- [ ] Context → zustand store 변환
- [ ] Provider 패턴 제거
- [ ] 컴포넌트에서 `useContext` → zustand 훅으로 교체
- [ ] 빌드/동작 테스트

**예시 변환:**
```tsx
// Before: contexts/AuthContext.tsx
const AuthContext = createContext<AuthState | null>(null);
export const useAuth = () => useContext(AuthContext);

// After: stores/auth-store.ts
import { create } from 'zustand';
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

---

### Phase 2: UI 정리 + 컴포넌트 재구성 (3~4일)

> Fluent UI 제거와 컴포넌트 분류를 **동시에**

**Fluent UI 제거:**
- [ ] Fluent UI 사용 코드 분석
- [ ] 대체 컴포넌트 구현 (Tailwind/Radix)
- [ ] `@fluentui/react` 제거
- [ ] `@fluentui/react-components` 제거
- [ ] `@fluentui/react-icons` → `lucide-react`로 대체
- [ ] globals.css Fluent import 확인/제거

**컴포넌트 재분류 (PMS 스타일):**
- [ ] `src/components/common/` - 재사용 가능한 범용 컴포넌트
- [ ] `src/components/layout/` - Header, Sidebar, Footer 등
- [ ] `src/components/pages/` - 페이지별 전용 컴포넌트
  - [ ] `pages/editor/` - 에디터 관련 (기존 `editor/`)
  - [ ] `pages/wiki/` - 위키 관련 (기존 `wiki/`)
- [ ] `src/components/templates/` - 페이지 템플릿
- [ ] `src/components/ui/` - 기본 UI (Button, Input 등)

**MUI 최소화:**
- [ ] MUI 사용 현황 분석
- [ ] 트리 뷰 외 MUI 사용처 파악
- [ ] `@mui/x-tree-view` 유지 결정 또는 대체 검토
- [ ] 불필요 MUI 패키지 제거

---

### Phase 3: API 레이어 정리 (1~2일)

> 서비스 구조 PMS 스타일로 통일 + API 클라이언트 구성

**API 클라이언트 구성 (`src/lib/api/`):**
- [ ] `src/lib/api/client.ts` 생성 - 내부 API 호출 래퍼
- [ ] 기존 fetch 직접 호출 → `apiClient` 통해 호출
- [ ] (통합 시 이 파일만 외부 서버 URL로 변경하면 됨)

```typescript
// src/lib/api/client.ts
const API_BASE = '/api';  // 현재: 내부
// 통합 후: 'http://localhost:4000/api/dms'

export const apiClient = {
  get: (path: string) => fetch(`${API_BASE}${path}`).then(r => r.json()),
  post: (path: string, data: unknown) => fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => r.json()),
  // ...
};
```

**훅 구조 변경:**
- [ ] `src/hooks/services/` → `src/hooks/queries/` 명명 통일

**선택 (react-query 도입 시):**
- [ ] `@tanstack/react-query` 설치
- [ ] 기존 fetch 호출 → useQuery/useMutation 패턴 적용
- [ ] QueryClientProvider 설정

---

### Phase 4: 라우트 정리 (1~2일)

> Route Group 도입으로 레이아웃 분리

**구조 변경:**
- [ ] `src/app/(main)/` 그룹 생성
- [ ] `src/app/wiki/` → `src/app/(main)/wiki/`
- [ ] `src/app/goals-md/` → `src/app/(main)/goals/` (또는 제거)
- [ ] `src/app/(main)/layout.tsx` - 메인 레이아웃 (사이드바 포함)
- [ ] `src/app/(auth)/layout.tsx` - 인증 레이아웃 (미래 확장용)
- [ ] `middleware.ts` 업데이트 (경로 변경 반영)

---

### Phase 5: 디자인 통일 (장기, 점진적)

> P4 패키지 - Radix UI 기반 컴포넌트 교체

- [ ] 필요한 Radix UI 패키지만 선택 설치
- [ ] `tailwindcss-animate` 설치
- [ ] MUI 컴포넌트 → Radix/shadcn 스타일로 점진적 교체
- [ ] `components.json` (shadcn CLI 설정) 추가

---

## 6. 일정 요약

| Phase | 작업 | 예상 기간 | 의존성 | 패키지 연동 |
|-------|------|----------|--------|------------|
| **0** | 기반 구조 (프론트/백 분리) | 1~2일 | - | - |
| **1** | 상태관리 + P1 | 2~3일 | Phase 0 | zod, zustand, sonner, RHF |
| **2** | UI 정리 + 컴포넌트 | 3~4일 | Phase 0 | Fluent 제거, MUI 최소화 |
| **3** | API 레이어 정리 | 1~2일 | Phase 1 | react-query (선택) |
| **4** | 라우트 정리 | 1~2일 | Phase 2 | - |
| **5** | 디자인 통일 | 점진적 | Phase 2 | Radix UI (필요시) |

**총 예상: 약 10~14일** (Phase 5 제외)

---

## 7. 주의사항

### ❌ 하지 말아야 할 것

| 항목 | 이유 |
|------|------|
| `@ssoo/types` 연동 | DMS 모노레포 독립성 원칙 위배 |
| `@ssoo/database` 연동 | DMS 모노레포 독립성 원칙 위배 |
| `workspace:*` 의존성 | GitLab 단독 배포 불가 |
| `src/`에 백엔드 로직 포함 | 통합 시 분리 어려움 |

### ✅ 해야 할 것

| 항목 | 이유 |
|------|------|
| DMS 자체 타입 정의 | `src/types/` 에서 독립 관리 |
| npm 공개 패키지만 사용 | 어디서든 설치 가능 |
| `server/`에 백엔드 로직 분리 | 통합 시 이전 용이 |
| `app/api/`는 얇은 레이어로 유지 | handler 호출만 |
| `src/lib/api/`로 API 호출 추상화 | 통합 시 URL만 변경 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - 패키지 통합 계획서 |
| 2026-01-27 | 프로젝트 구조 정렬 계획 통합, 모노레포 독립성 원칙 반영 |
| 2026-01-27 | 통합 대비 "미니 모노레포" 구조 설계, 소스 구조 도식화 추가 |
| 2026-01-27 | **Phase 0 시작** - Step 0 완료 (불필요 페이지 삭제: goals-md, goals.md, wiki-test) |
| 2026-01-27 | **Phase 0 Step 1 완료** - src/ 프론트엔드 구조 생성, 95개 파일 이동 |
| 2026-01-27 | **Phase 0 Step 2 완료** - server/ 백엔드 구조 생성, services 이동 |
| 2026-01-27 | **Phase 0 Step 3 완료** - src/app/ 라우팅 구조 완성, (main) route group 생성 |
| 2026-01-27 | **Phase 0 완전 완료** - 나머지 9개 핸들러 추출 (총 19개), 모든 route.ts 얇은 레이어로 변환 |

````