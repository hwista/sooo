# CRM·DMS production runtime contract

> 기준일: 2026-08-20  
> 적용 범위: CRM/Admin/DMS public origin, server API/CORS, Next server proxy, DMS Socket.IO, 공개 deep link

## 1. 판정 원칙

- 앱의 public URL, browser-facing API URL, server `CORS_ORIGIN`, DMS WebSocket URL은 하나의 배포 matrix로 승인한다.
- mapped port는 포트가 열렸다는 이유만으로 승인하지 않는다. 해당 origin이 build-time public URL과 server CORS에 함께 반영돼야 한다.
- CRM/DMS Next route handler는 browser public API URL보다 내부 `*_SERVER_API_URL`을 우선한다.
- DMS WebSocket은 `NEXT_PUBLIC_WS_URL`을 우선하고, 없으면 절대형 `NEXT_PUBLIC_API_URL`의 origin을 사용한다. `:4000` 조립은 public API URL도 없는 local-development fallback에만 허용한다.
- 승인되지 않은 origin은 로그인/변경 요청에서 fail closed해야 하며 임시 proxy를 런칭 해결책으로 사용하지 않는다.

## 2. URL-first route 계약

| 앱 | 공개 URL | 기대 content |
|---|---|---|
| CRM | `/operations/settings` | CRM 시스템 설정 |
| CRM | `/settings` | 기존 CRM 시스템 설정 alias. 공용 계정 설정 `/__user/settings`와 구분 |
| CRM | `/reports?year=...` | 보고 Preview와 query state |
| CRM | `/?selected=...` | 영업기회 workspace와 선택 대상 |
| DMS | `/settings/operations/git` | Git/runtime path 운영 설정 |
| DMS | `/` | DMS home. settings history에서 back 시 home content 복원 |

CRM direct route는 deterministic tab id/title/path를 열고, sidebar·MDI tab·back/forward가 browser URL을 함께 갱신한다. 영업기회 operation attempt의 source link는 존재하지 않는 `/opportunities`가 아니라 `/?selected=...`를 사용한다.

## 3. 배포 변수 matrix

| 역할 | 변수 |
|---|---|
| server 허용 origin | `CORS_ORIGIN` |
| Admin browser API | `ADMIN_NEXT_PUBLIC_API_URL` |
| CRM browser API | `CRM_NEXT_PUBLIC_API_URL` |
| DMS browser API | `DMS_NEXT_PUBLIC_API_URL` |
| DMS browser Socket.IO | `DMS_NEXT_PUBLIC_WS_URL` 또는 DMS public API origin |
| CRM Next→server | `CRM_SERVER_API_URL` |
| DMS Next→server | `DMS_SERVER_API_URL` |
| 앱 public origin | `NEXT_PUBLIC_ADMIN_APP_URL`, `NEXT_PUBLIC_CRM_APP_URL`, `NEXT_PUBLIC_DMS_APP_URL` 등 |

실제 production 값은 `.env.production` 소유이며 문서나 DB에 credential을 기록하지 않는다. `scripts/verify-production-compose-env.mjs`는 HTTPS public URL, app origin별 CORS 포함, 안전한 WebSocket scheme을 검증한다.

## 4. 검증

정적·build gate:

```bash
pnpm run verify:crm-production-runtime-contract
pnpm run docker:production:verify-env:self-test
pnpm --filter web-crm build
pnpm --filter web-dms build
```

S11 browser 증거는 다음을 통과했다.

- CRM mapped `127.0.0.1:3105` + API `127.0.0.1:4105`: settings 두 URL, reports, 영업기회 source link의 direct/reload/menu/back/forward 일치.
- DMS standard `localhost:3003` + API/Socket `localhost:4000`: Socket.IO frame 송수신, deep link와 root 복귀 일치.
- DMS approved mapped `127.0.0.1:3113` + API/Socket `127.0.0.1:4105`: 로그인, Socket.IO frame 송수신, deep link/root 일치.
- 승인되지 않은 `127.0.0.1:3003` origin은 `허용되지 않은 요청 출처입니다.`로 fail closed.
- Admin mapped `127.0.0.1:3100`: 로그인과 root API 오류 0.
- desktop/mobile console error/warning과 예상 밖 4xx/5xx 0, 390px document overflow 0.

로컬 run manifest: `output/playwright/crm-ralph/20260820-s11-runtime-contract.json`.
