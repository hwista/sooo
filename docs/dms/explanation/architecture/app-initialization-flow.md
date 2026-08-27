# 앱 초기화 흐름 (App Initialization Flow)

> 최종 업데이트: 2026-08-27

DMS 앱의 현재 초기화 흐름을 **로그인 진입**, **protected shell bootstrap**, **파일 트리 preload** 기준으로 정리합니다.

---

## 초기화 개요

```text
브라우저 접속
    ↓
app/layout.tsx
    ↓
Providers
    ├─ QueryClient / Toaster / ConfirmDialog
    ├─ SharedAuthStateSync / user-scope query cache reset
    └─ (로그인 후 + 권한 허용 시) Assistant UI
    ↓
경로 판별
    ├─ /login
    │   ↓
    │   app/(auth)/login/page.tsx
    │   ↓
    │   SharedAuthLoginPage
    │   └─ AuthPageShell + AuthStandardLoginCard
    │
    └─ /
        ↓
        app/(main)/layout.tsx
        ↓
        useProtectedAppBootstrap(...)
        ├─ auth hydration / checkAuth
        ├─ DMS access snapshot hydrate
        └─ 미인증 시 /login 복구
        ↓
        canReadDocuments 이면 refreshFileTree({ forceSync: true })
        ↓
        app/(main)/page.tsx
        ↓
        AppLayout
        └─ workspace frame
            ├─ workspace mode → ContentArea tabs
            └─ settings mode → Sidebar/Header/TabBar/ContentArea variants
```

---

## 핵심 파일

```text
apps/web/dms/src/
├── app/
│   ├── layout.tsx                  # RootLayout + Providers
│   ├── providers.tsx               # QueryClient / SharedAuthStateSync / user-scope cache reset / assistant gating
│   ├── (auth)/
│   │   ├── layout.tsx              # fragment layout; 공용 auth shell은 SharedAuthLoginPage가 소유
│   │   └── login/page.tsx          # SharedAuthLoginPage route adapter
│   ├── (main)/
│   │   ├── layout.tsx              # protected shell gate + file tree preload
│   │   └── page.tsx                # actual root shell entry
│   └── not-found.tsx               # 마지막 루트 복구 장치
├── components/layout/AppLayout.tsx
├── lib/constants/routes.ts         # APP_HOME_PATH / LOGIN_PATH / ROOT_ENTRY_PATHS
└── stores/
    ├── auth.store.ts
    ├── access.store.ts
    ├── file.store.ts
    └── settings-page-navigation.store.ts
```

---

## bootstrap 순서

### 1. 로그인 진입

- `/login` 은 public entry 다.
- auth store hydration 이후 이미 로그인된 상태면 `/` 로 복귀한다.
- 로그인 성공 시에도 `APP_HOME_PATH ('/')` 로 이동한다.

### 2. protected shell bootstrap

`app/(main)/layout.tsx` 는 직접 `AppLayout` 을 렌더하지 않는다.
공통 `useProtectedAppBootstrap(...)` 을 사용해 다음 순서를 맞춘다.

1. auth hydration 대기
2. `checkAuth()` 실행
3. 인증 성공 후 `useAccessStore.hydrate()` 실행
4. 미인증 시 access state reset 후 `/login` 이동
5. access snapshot 준비 완료 시 `children` 렌더

### 3. 파일 트리 preload

bootstrap 이후에도 DMS는 app-specific 후속 단계가 하나 더 있다.

- `accessSnapshot.features.canReadDocuments === true` 일 때만 `refreshFileTree({ forceSync: true })` 실행
- 자동 bootstrap과 사용자의 `다시 불러오기` 클릭은 각각 `/api/files?force=1` 요청을 한 번만 보낸다.
- 현재 사용자 scope의 요청이 성공하고 store가 initialized 되면 결과가 `[]`이어도 준비 완료다. 메인 shell을 렌더하고 사이드바가 `표시할 문서가 없습니다.` empty state를 표시한다.
- 네트워크/API 오류는 기존 shell/sidebar 안에 오류와 `문서 목록 다시 불러오기` action을 표시한다. 성공한 빈 결과를 오류로 바꾸거나 숨은 자동 재시도를 수행하지 않는다.
- 사용자 scope가 바뀌면 이전 사용자의 지연된 성공/오류 응답은 현재 tree 상태를 덮어쓰지 않는다.
- 따라서 공용 bootstrap 은 auth/access 까지만 담당하고,
  DMS-specific 파일 시스템 준비는 layout 의 후속 effect 로 유지한다.
- `200 + []` 응답은 신규 사용자/권한 내 문서 없음으로 해석하며 오류 화면이 아니라 파일 트리 empty state 로 종료한다.
- API 또는 control-plane sync 실패는 파일 트리 error state 로 표시하되, 사이드바 상단 새로고침과 error state 내부 retry control 로 `refreshFileTree({ forceSync: true })`를 다시 실행할 수 있어야 한다.
- 정상 로그인 사용자를 문서 목록 전용 full-page blocking recovery 화면에 가두지 않는다.

### 4. 실제 shell 렌더링

`app/(main)/page.tsx` 가 루트 shell entry 다.

- `AppLayout` 은 같은 `SsooAppFrame` 위에서 workspace mode와 settings mode를 전환한다.
- workspace mode에서 `ContentArea` 는 active tab 의 internal path 를 기준으로 Home / Markdown / AI 를 렌더한다.
- settings mode에서 `AppLayout` 은 같은 `Sidebar`, `Header`, `TabBar`, `ContentArea` frame slot을 유지하고 settings variant/tab path 데이터만 주입한다.

---

## Providers 역할

| 항목 | 역할 |
|------|------|
| `QueryClientProvider` | query cache 경계 |
| `SharedAuthStateSync` | browser-facing auth state 동기화 |
| `useDmsUserScopeQueryCacheReset` | auth user-scope 전환 시 query cache 정리 |
| `ConfirmDialog` / `Toaster` | 전역 UX surface |
| `FloatingAssistant` / `AssistantSessionSync` | 로그인 후 + `canUseAssistant` 권한이 있을 때만 노출 |

즉 assistant 런타임은 앱 전체에 항상 붙는 것이 아니라,
**로그인 경로가 아니고 인증 + 권한이 확보된 경우에만 mount** 된다.

---

## PMS 대비 차이점

| 항목 | PMS | DMS |
|------|-----|-----|
| 공개 진입점 | `/`, `/login`, `/password-reset` | `/`, `/login`, `/password-reset` |
| 공통 bootstrap | auth + access snapshot | auth + access snapshot |
| 앱별 후속 bootstrap | 메뉴 snapshot apply | 파일 트리 preload |
| frame 종류 | workspace frame | workspace frame + settings mode |

---

## 관련 문서

- [page-routing.md](page-routing.md)
- [state-management.md](state-management.md)
- [layout-system.md](../design/layout-system.md)

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-08-27 | 파일 트리 오류도 정상 로그인 shell을 유지하고 sidebar의 visible error/retry로 복구하도록 Behavior Impact Gate와 현행 UI 계약을 명시 |
| 2026-07-14 | 현재 사용자 scope의 파일 트리 요청이 성공하면 빈 배열도 정상 ready 상태로 처리하고 shell/empty state를 렌더하도록 정렬; force-sync 자동 빈 결과 재시도 제거 및 요청 1회 경계 명시 |
| 2026-06-16 | DMS `(auth)/layout.tsx`가 app-specific auth shell/theme를 소유하지 않고 `SharedAuthLoginPage`가 `AuthPageShell` + login card를 직접 소유하는 현재 구현으로 정렬 |
| 2026-06-15 | settings mode가 별도 settings tabbar/content 주입이 아니라 기존 4개 frame slot 유지 + settings tab path 데이터 전환임을 명시 |
| 2026-06-12 | 설정 화면을 workspace `/settings` tab page가 아니라 공유 frame 위 settings mode로 현행화 |
| 2026-04-16 | shared protected bootstrap, `/login` public entry, file tree preload 후속 단계까지 현재 구현 기준으로 재작성 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
