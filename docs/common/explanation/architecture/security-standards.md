# 웹 시스템 보안 표준 가이드

> 최종 업데이트: 2026-07-20
> 범위: SSOO 모노레포의 클로즈 베타/MVP/데모 공개 전 코드 및 런타임 보안 기준

이 문서는 기능 구현률과 별개로 공개 가능한 코드 기준을 고정합니다. 코드에 구현된 통제와 실제 배포 환경에서 증명해야 하는 통제를 구분하며, 증거가 없는 항목은 완료로 간주하지 않습니다.

## 상태 범례

| 표시 | 의미 |
|------|------|
| ✅ | 코드와 회귀 검증이 존재함 |
| ⚠️ | 부분 구현 또는 추가 운영 증거가 필요함 |
| 🔲 | 미구현 또는 미결정 |
| ❓ | 현재 환경에서 검증 증거를 확보하지 못함 |

## 1. MVP 보안 기준선

| 통제 영역 | 현재 구현 | 상태 | 공개 전 남은 증거 |
|-----------|-----------|------|-------------------|
| 인증 세션 | memory-only Access Token, HttpOnly refresh/session cookie, DB session hash, rotation/revoke | ✅ | 실제 배포 cookie/domain/TLS 설정 확인 |
| 서버 인증 | 전역 `JwtAuthGuard`, 명시적 `@Public()` allowlist, access token type/session 상태 검증 | ✅ | 최신 이미지에서 auth lifecycle smoke |
| 인가 | 공용 permission foundation + domain feature/object guard | ✅ | Admin/CRM/PMS/DMS/SNS persona별 runtime smoke |
| 브라우저 CSRF | same-origin auth proxy의 `X-SSOO-CSRF`, Origin/Referer/Fetch Metadata 검사, 서버 Origin 검사 | ✅ | 실제 배포 origin 목록 확인 |
| XSS | React 기본 escaping, DMS Markdown DOMPurify, URL protocol allowlist, Mermaid strict mode | ✅ | 브라우저 smoke와 CSP report 확인 |
| 파일 처리 | DMS 크기/확장자/MIME/이미지 signature 검사, active content 강제 다운로드, root containment | ✅ | 대표 업로드/다운로드 runtime smoke |
| 경로 보안 | lexical traversal과 기존 symlink ancestor의 root 이탈을 모두 차단 | ✅ | 최신 서버 이미지에서 DMS file smoke |
| WebSocket | access token type/활성 session/현재 사용자/조직/DMS read permission 재검증 후 연결 | ✅ | logout/reconnect 및 권한 없는 persona smoke |
| SQL injection | Prisma ORM 또는 `$1...$n` 값 바인딩 사용; 동적 SQL 조각은 코드 상수/내부 숫자 offset으로 제한 | ⚠️ | raw SQL 변경 시 전용 정적 회귀 필요 |
| 공급망 | pnpm 11 lockfile 검증, 24시간 release-age strict gate, versioned install-script allowlist, PR production audit | ✅ | 의존성 변경 및 공개 직전 `pnpm security:audit` 재실행 |
| 전송/인프라 | 앱 보안 헤더와 서버 Helmet baseline | ⚠️ | TLS/HSTS, WAF/방화벽, secret manager, 이미지 스캔 증거 |
| 배포 구성 | 로컬/프로덕션 Compose 분리, production env fail-closed 검증, DB 비공개·앱 loopback bind, 절대 DMS runtime path | ⚠️ | 실제 `.env.production`, reverse proxy/TLS, 백업·복구와 secret manager 증거 |
| 빌드 공급망 TLS | 7개 Docker build가 선택적 승인 CA를 BuildKit secret으로 소비하고 server/db-init만 runtime secret을 사용하며, 전체 workspace manifest 기반 filtered install과 lockfile-keyed 잠금형 cache로 pnpm pre-run 상태/TLS/최초 공급망 검증을 유지 | ✅ | 배포 host의 CA 승인·갱신 기록과 실제 최신 이미지 build 증거 |

### 공급망 및 의존성 관리

- 루트 `packageManager`는 pnpm 11.13.1로 고정하고, pnpm 11의 `node:sqlite` store index와 일치하도록 Node.js 22.13 이상 및 Docker Node.js 22 LTS를 요구합니다.
- `pnpm-workspace.yaml`은 `minimumReleaseAge: 1440`과 strict mode를 명시해 24시간 미만 신규 버전만으로 해석되는 설치를 실패 처리합니다.
- dependency install script는 package/version matcher 단위 `allowBuilds`로만 허용합니다. Prisma, esbuild, sharp, unrs-resolver처럼 산출물 생성에 필요한 현재 버전만 실행하며, telemetry·후원 메시지·미사용 Oracle 드라이버 스크립트는 명시적으로 차단합니다.
- production audit 정식 명령은 관측형 `pnpm security:audit`입니다. registry 연결 실패나 승인 중단은 통과가 아니며, high/critical이 있으면 No-Go입니다.
- PR validation은 frozen lockfile 설치 직후 `pnpm security:audit`와 `pnpm docs:verify`를 실행합니다. 저장소 `.nvmrc`와 루트 `packageManager`가 CI Node/pnpm 버전의 정본입니다.
- 서버의 spreadsheet extraction은 npm registry의 오래된 `xlsx` 패키지 대신 SheetJS 공식 CDN의 `xlsx-0.20.3.tgz`를 직접 고정합니다. DMS/PMS 브라우저 앱에는 실제 사용하지 않는 `xlsx` 의존성을 두지 않습니다.
- 2026-07-16 현재 잠금파일은 production 910 dependencies 기준 info/low/moderate/high/critical 전 등급 0으로 재검증했습니다.

## 2. 인증

| 항목 | 구현 기준 | 상태 |
|------|-----------|------|
| 비밀번호 정책 | 8~100자, 영문/숫자/허용 특수문자 포함을 서버 DTO에서 검증 | ✅ |
| 비밀번호 저장 | bcrypt salt hash만 저장 | ✅ |
| 로그인 실패 제한 | 5회 실패 시 30분 잠금 | ✅ |
| 토큰 만료 | Access 15분, Refresh/session 7일 기본값 | ✅ |
| Refresh rotation | 갱신 시 새 refresh token hash로 session 갱신 | ✅ |
| 로그아웃/비밀번호 재설정 | session revoke 후 기존 Access Token도 DB session 검사에서 거부 | ✅ |
| Microsoft OAuth | HMAC state cookie, nonce, issuer/audience/signature/clock 검증, fetch timeout | ✅ |
| MFA | 별도 2차 인증 | 🔲 |
| 유휴 자동 로그아웃 | 클라이언트 idle policy | 🔲 |
| 비밀번호 이력/주기 | 재사용 금지 및 변경 주기 | 🔲 |

브라우저에는 refresh token을 노출하지 않습니다. `packages/web-auth`가 Access Token을 runtime memory에만 유지하고, localStorage에는 사용자 snapshot과 인증 여부만 저장합니다. 기존 persisted token 필드는 읽을 때 제거합니다.

## 3. 인가

| 항목 | 구현 기준 | 상태 |
|------|-----------|------|
| 전역 인증 | 모든 Nest route는 기본적으로 JWT 필요, 공개 route만 `@Public()` | ✅ |
| 수직 권한 상승 방지 | `@Roles('admin')`은 문자열 role claim이 아니라 DB 기반 `system.override` 판정 | ✅ |
| 도메인 기능 권한 | CRM/PMS/DMS/SNS feature guard와 permission code | ✅ |
| 객체 권한 | PMS project, CRM customer/opportunity, DMS document ACL | ✅ |
| 읽기 제한 데이터 redaction | DMS 잠긴 문서/검색 결과에서 원문과 snippet 제거 | ✅ |
| 전 도메인 IDOR runtime 증거 | 허용 객체와 타 사용자/타 프로젝트 객체 deny smoke | ⚠️ |

UI에서 버튼을 숨기는 것은 보안 통제가 아닙니다. 쓰기/관리 route는 반드시 서버 guard 또는 service ownership 검사로 거부되어야 합니다.

## 4. 입력, XSS, CSRF, 파일

| 항목 | 구현 기준 | 상태 |
|------|-----------|------|
| 서버 입력 검증 | 전역 `ValidationPipe`의 whitelist/forbid/transform + DTO/manual boundary validation | ⚠️ |
| 요청 크기 | Nest 기본 JSON limit과 DMS Multer file size limit | ✅ |
| Markdown HTML | DOMPurify 후에만 audited HTML sink로 전달 | ✅ |
| Markdown URL | http/https/mailto 또는 안전한 상대 경로만 허용 | ✅ |
| Mermaid | `securityLevel: 'strict'` | ✅ |
| CSRF | auth/password reset proxy custom header + Origin/Referer/Fetch Metadata, cookie `SameSite` | ✅ |
| 이미지 업로드 | 허용 MIME, 확장자 일치, magic signature, 크기 제한 | ✅ |
| 일반 첨부 | allowlist 확장자와 크기 제한, HTML/SVG는 inline raw preview 금지 | ✅ |
| 경로 traversal | root 상대 경로 정규화 + symlink-aware containment | ✅ |

`dangerouslySetInnerHTML`, `innerHTML`, `document.write`는 새로 추가하지 않습니다. 예외가 필요하면 sanitizer/escaping 근거와 회귀 검증을 같은 변경에 포함합니다.

## 5. API와 외부 연동

| 항목 | 구현 기준 | 상태 |
|------|-----------|------|
| Rate limiting | 전역 throttler + 로그인/세션/OAuth/password reset 강화 limit | ✅ |
| CORS | 명시 origin 목록과 credentials 조합 | ✅ |
| 보안 헤더 | Nest Helmet + 5개 Next 앱 공용 header factory | ✅ |
| 에러 응답 | 5xx 내부 예외/stack 비노출, 공용 envelope | ✅ |
| 외부 fetch timeout | Microsoft OAuth와 CRM 회계 지급 연동 AbortController | ✅ |
| 외부 endpoint trust | Azure/Microsoft 고정 endpoint 또는 운영 env endpoint | ⚠️ |
| OpenAPI 노출 정책 | `/api/openapi.json`의 production 공개/인증/비활성 정책 | 🔲 |

운영 env로 주입되는 CRM 회계 지급 endpoint는 사용자 입력 SSRF 표면은 아니지만, 공개 배포 전 HTTPS/host allowlist 정책을 확정해야 합니다.

## 6. 세션 관리

| 항목 | 현재 기준 | 상태 |
|------|-----------|------|
| Access Token 저장 | runtime memory only | ✅ |
| Refresh/session 저장 | HttpOnly cookie + DB bcrypt hash | ✅ |
| Cookie 속성 | HttpOnly, SameSite, production Secure gate | ✅ |
| Session rotation | refresh마다 동일 sessionId의 hash 교체 | ✅ |
| Session revoke | logout/password reset에서 revoke timestamp 기록 | ✅ |
| HTTP revoke 반영 | 모든 Access Token 요청에서 backing session 확인 | ✅ |
| WebSocket 연결 검증 | backing session과 DMS read permission 확인 | ✅ |
| 관리자 강제 로그아웃 UI/API | 사용자 session revoke 운영 surface | 🔲 |

## 7. 로깅과 감사

| 항목 | 현재 기준 | 상태 |
|------|-----------|------|
| 민감정보 로그 금지 | password/token/client secret/body 전체를 로그하지 않음 | ✅ |
| 변경 이력 | DB master/history와 transaction/source/activity metadata | ✅ |
| 인증 이벤트 전용 감사 로그 | 성공/실패/logout 보존 및 조회 | ⚠️ |
| API access log | 개인정보를 제외한 구조화 요청 로그 | 🔲 |
| 에러 관측 | 공용 오류 envelope는 있으나 운영 sink/alert 증거 필요 | ⚠️ |
| 이상 탐지 | 반복 실패/권한 거부/비정상 트래픽 알림 | 🔲 |

로그 보존 기간과 개인정보 접근 감사 범위는 법무/보안 운영 정책에서 별도로 확정합니다. 이 문서의 예시 기간을 법적 요구사항으로 간주하지 않습니다.

## 8. 보안 헤더

| 헤더/정책 | 현재 기준 | 상태 |
|-------------|-----------|------|
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `X-Frame-Options` | `DENY` | ✅ |
| CSP frame/base/object/form | enforced baseline | ✅ |
| CSP script/style/connect + Trusted Types | Next bootstrap inline script와 localhost/127.0.0.1 개발 연결을 허용하고 Trusted Types policy 이름을 제한하는 report-only 관측 baseline. Next 15 route chunk가 policy 없이 script sink를 사용하는 동안 `require-trusted-types-for 'script'`는 보류 | ⚠️ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | camera/microphone/geolocation disabled | ✅ |
| HSTS/TLS | Helmet 및 인프라 종단 설정 확인 필요 | ⚠️ |

전체 CSP를 enforce로 전환하거나 `require-trusted-types-for 'script'`를 다시 활성화할 때는 Next runtime inline script/style·route chunk, DMS blob/data image, WebSocket/SSE, Azure endpoint를 실제 브라우저에서 먼저 관측합니다. 기능 증거 없이 report-only를 enforce로 바꾸거나 Trusted Types 강제를 활성화하지 않습니다.

## 9. 공개 전 강제 게이트

### 코드 게이트

```bash
pnpm run codex:preflight
pnpm run codex:verify-sync
pnpm run lint
pnpm run test
pnpm run build
pnpm run verify:auth-commonization
pnpm run verify:access-smoke
pnpm run verify:access-admin
pnpm run verify:access-dms
pnpm run codex:dms-guard
pnpm run docker:production:verify-env
pnpm run docker:production:config
pnpm run verify:dms-backup-restore:production
pnpm run verify:dms-public-endpoints
pnpm run verify:workspace-release-state
pnpm run verify:dms-go-live
pnpm run security:audit
```

`pnpm security:audit`는 registry advisory DB 연결이 필요합니다. 네트워크 실패나 승인 중단은 통과가 아니라 미검증입니다.

### 런타임/사용자 게이트

1. 현재 source/lockfile로 새 이미지를 빌드하고 현재 migration/trigger/seed를 적용합니다.
2. Admin/CRM/PMS/DMS/SNS의 허용 persona와 deny persona를 각각 검증합니다.
3. 로그인, session restore, logout/revoke, password reset, WebSocket reconnect를 검증합니다.
4. DMS path traversal/symlink, active content 다운로드, 이미지 signature, 문서 ACL을 검증합니다.
5. 데스크톱/모바일에서 오류/빈 상태/수동 복구 동선을 포함한 브라우저 smoke를 수행합니다.
6. 공개 endpoint, CORS, cookie, CSP report, TLS/HSTS, secret 주입 상태를 배포 URL에서 확인합니다.
7. PostgreSQL과 DMS Markdown Git/ingest/storage를 함께 백업해 격리 복원하고 DB contract와 file manifest/hash를 확인합니다.
8. server/DMS/Admin runtime SHA가 clean local/GitHub/GitLab release SHA와 모두 일치하는지 확인합니다.

### No-Go 조건

- lint/build/test/필수 verifier 중 하나라도 실패
- high/critical production dependency 취약점이 미조치
- placeholder JWT/encryption secret 또는 비보안 production cookie 설정
- `compose.local.yaml`의 insecure-production bypass를 공개 배포에 사용
- dependency/Prisma engine 다운로드에서 TLS 인증서 검증 비활성화
- source보다 오래된 이미지로 runtime smoke 수행
- 권한 없는 persona가 domain/object 데이터 또는 DMS WebSocket event를 읽을 수 있음
- DMS Git/DB/runtime binding이 요구 배포 역할과 불일치
- TLS/CORS/secret manager/backup·복구 증거 없이 public internet에 노출
- local/GitHub/GitLab/runtime release SHA 중 하나라도 불일치
- browser console warning/error, page error 또는 관련 HTTP 5xx가 남은 상태에서 Go 선언
- AI/RAG 외부 provider 예외를 readiness·복구·릴리즈·브라우저 실패의 예외로 확대

## 10. 남은 보안 백로그

| 우선순위 | 항목 | 종료 증거 |
|----------|------|-----------|
| P0 | 최신 이미지 기반 auth/access/domain smoke | 모든 allow/deny 시나리오 통과 |
| P0 | 배포 TLS/cookie/CORS/secret 검증 | 배포 URL header와 secret 주입 증거 |
| P0 | production Compose와 durable path 검증 | `docker:production:verify-env/config` 통과, DB/DMS backup·restore evidence |
| P0 | 동일 release SHA와 공개 Ralph 증거 | local/GitHub/GitLab/server/DMS/Admin SHA 일치, `verify:dms-go-live` GO report |
| P1 | OpenAPI production 노출 정책 | authenticated/disabled/public 중 명시 결정과 회귀 |
| P1 | CRM 외부 endpoint HTTPS/host 정책 | production config validation과 테스트 |
| P1 | 구조화 보안/인증 감사 로그 | 민감정보 redaction 포함 운영 sink 증거 |
| P1 | CSP report 수집 후 enforce 확대 | 브라우저 회귀와 violation 0 근거 |
| P2 | MFA, idle timeout, password history | 제품 정책 결정과 구현 |
| P2 | 개인정보 lifecycle | 동의/열람/삭제/보유 기한 정책과 기능 |

## 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [인증 시스템](./auth-system.md)
- [개발 표준](./development-standards.md)

## Changelog

| Date | Change |
|------|--------|
| 2026-08-13 | DMS 최종 공개 gate에 동일 release SHA, 공개 endpoint TLS/HSTS/cookie/readiness, PostgreSQL+runtime root 격리 복원, console/network fail-closed Ralph를 추가하고 AI/RAG 외부 provider 예외가 다른 보안 실패를 면제하지 않도록 고정 |
| 2026-07-20 | `adm-zip` 0.6.0으로 production audit high 취약점을 제거하고 PR validation에 production audit·문서 검증을 blocking gate로 연결. CI의 Node/pnpm 버전은 `.nvmrc`와 루트 `packageManager` 정본을 사용 |
| 2026-07-16 | Node.js 22.13+/Docker Node.js 22 LTS와 pnpm 11.13.1, 24시간 release-age strict gate, versioned install-script allowlist, 관측형 `security:audit`를 공급망 기준으로 추가. NestJS/Next/Axios/DMS sanitizer·diagram/Git 및 transitive advisory를 패치하고 SheetJS 공식 0.20.3 tarball로 전환해 production audit 전 등급 0을 확인 |
| 2026-07-16 | 로컬/프로덕션 Compose를 분리하고 프로덕션 env의 비밀값, HTTPS origin, secure cookie, 내부 DB URL, 절대 DMS path, secure Git remote를 fail-closed로 검증하는 gate를 추가. 7개 Docker build의 TLS 검증을 유지한 채 승인 PEM CA를 BuildKit secret으로 전달하고 server/db-init만 runtime secret을 소비하며, 잠금형 pnpm store cache로 중복 registry 요청을 줄이는 선택 경로를 추가. 실제 TLS/secret manager/backup 증거는 계속 공개 전 미완료로 유지 |
| 2026-07-15 | 현재 코드 기준으로 인증/인가/CSRF/XSS/업로드/헤더 상태를 재평가하고 MVP 공개 강제 게이트와 No-Go 조건을 추가. DMS symlink-aware path containment와 WebSocket active-session/read-permission 검증을 기준선에 반영 |
| 2026-02-09 | Add changelog section. |
