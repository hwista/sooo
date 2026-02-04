# SSOO 모노레포 에이전트 가이드 (AGENTS)

> 최종 업데이트: 2026-02-04  
> 범위: SSOO 모노레포 전체 (`sooo/`)

---

## 이 문서의 목적

새로운 에이전트(AI 또는 개발자)가 SSOO 모노레포 작업을 시작할 때 **반드시 먼저 읽어야 하는 가이드**입니다.

**이 문서의 역할**:
- 📋 **온보딩 가이드** - 프로젝트 구조와 작업 프로세스 이해
- 🔄 **작업 프로세스** - 변경/삭제 시 따라야 할 절차
- ✅ **체크리스트** - 작업 전/후 확인 사항

**규칙/패턴 참조**:
> 📌 코드 작성 시 적용되는 **상세 규칙**은 GitHub Copilot이 자동 참조합니다.
> - 전역 규칙: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
> - 경로별 규칙: [.github/instructions/](../../.github/instructions/)

---

## ⚠️ AI 에이전트 작업 원칙

### 역할 분담

| 단계 | AI | 사람 |
|------|-----|------|
| **점검/분석** | ✅ 수행 | 결과 확인 |
| **브리핑/제안** | ✅ 수행 | 검토 |
| **삭제/변경 결정** | ✅ 판단 제시 | 🔒 **최종 승인** |
| **실행** | ⏸️ 승인 대기 | 🔒 **컨펌 후 지시** |

### 점검 기준 (러프하게 넘어가지 말 것)

1. **"수정 필요없음"으로 넘어가지 말 것** - 변경 소지가 있으면 반드시 명시
2. **모든 발견 사항에 증거 포함** - 파일 경로, 라인 번호, grep 결과
3. **영향 범위 명시** - 수정 시 영향받는 다른 파일/패키지 목록
4. **바이브 코딩 산물 의심** - 통제 없이 생성된 코드일 가능성 항상 고려

---

## 🏗️ 모노레포 구조

### 앱/패키지 구성

\`\`\`
sooo/
├── apps/
│   ├── server/              # NestJS 백엔드 API 서버
│   └── web/
│       ├── pms/             # PMS 프론트엔드 (Next.js 15)
│       └── dms/             # DMS 프론트엔드 (독립 프로젝트)
├── packages/
│   ├── database/            # Prisma ORM, DB 스키마
│   └── types/               # 공유 TypeScript 타입
├── docs/                    # 문서
└── .github/                 # Copilot 규칙
    ├── copilot-instructions.md
    └── instructions/
\`\`\`

### 패키지별 역할과 제약

| 패키지 | 역할 | 패키지 매니저 | Copilot 규칙 |
|--------|------|---------------|--------------|
| \`apps/server\` | NestJS API 서버 | pnpm | \`server.instructions.md\` |
| \`apps/web/pms\` | PMS 프론트엔드 | pnpm | \`pms.instructions.md\` |
| \`apps/web/dms\` | DMS 프론트엔드 | **npm (독립)** | \`dms.instructions.md\` |
| \`packages/database\` | Prisma 스키마, 트리거 | pnpm | \`database.instructions.md\` |
| \`packages/types\` | 공유 타입 정의 | pnpm | \`types.instructions.md\` |

> ⚠️ **DMS 독립성**: DMS는 npm을 사용하며, \`@ssoo/*\` 패키지를 참조하지 않습니다.
> DMS 작업 시에는 [apps/web/dms/docs/development/AGENTS.md](../../apps/web/dms/docs/development/AGENTS.md)를 참조하세요.

---

## 🔴 핵심 원칙 (요약)

> 📌 **상세 규칙**: [.github/copilot-instructions.md](../../.github/copilot-instructions.md) 참조

| 원칙 | 핵심 |
|------|------|
| **코드 클렌징** | 사용되는 코드만 유지, 불필요한 추상화 제거 |
| **문서-코드 동기화** | 코드 변경 → 문서 업데이트 → 커밋 |
| **패키지 경계 준수** | apps → packages 방향만, DMS는 독립 |

---

## 📜 작업 표준 프로세스 (필수 준수)

### 1. 변경 작업 흐름

\`\`\`
코드 변경 → 문서 업데이트 → 빌드 검증 → 커밋
\`\`\`

| 단계 | 내용 |
|------|------|
| **1. 코드 변경** | 패턴 표준 준수, 영향 범위 파악 |
| **2. 문서 업데이트** | 관련 문서의 Backlog/Changelog 갱신 |
| **3. 빌드 검증** | 영향받는 패키지 빌드 확인 |
| **4. 커밋** | 변경 내용과 문서를 함께 커밋 |

### 2. 삭제/수정 작업 흐름

\`\`\`
분석 → 브리핑 → 승인 대기 → 실행 → 검증 → 기록
\`\`\`

| 단계 | 내용 |
|------|------|
| **1. 분석** | grep 검색으로 사용처 확인, 영향 범위 파악 |
| **2. 브리핑** | 대상, 사유, 영향 파일/패키지 목록 보고 |
| **3. 승인 대기** | 🔒 **사용자 컨펌 필수** |
| **4. 실행** | 승인 후 변경 수행 |
| **5. 검증** | 빌드/런타임 테스트 |
| **6. 기록** | Changelog에 변경 내역 기록 |

### 3. 빌드 검증 명령어

\`\`\`bash
# 개별 패키지 빌드
cd apps/server && pnpm build
cd apps/web/pms && pnpm build
cd apps/web/dms && npm run build  # DMS는 npm

# 전체 빌드 (루트에서)
pnpm build

# 린트
pnpm lint
\`\`\`

---

## 🔍 Dead Code 삭제 기준

### 삭제 판단 기준

1. **grep 검색 결과 0건** → 어디서도 참조 안 됨
2. **import는 있으나 실제 호출 없음** → 사용 안 됨
3. **주석 처리된 코드 블록** → 필요하면 git에서 복원
4. **TODO/FIXME만 있고 구현 없는 스텁** → 미래 기능 선제작

### 삭제 전 검증

\`\`\`bash
# 1. 영향 패키지 빌드
pnpm build --filter=<package-name>

# 2. 린트
pnpm lint
\`\`\`

---

## ✅ 작업 전 체크리스트

### 필수 확인

- [ ] 이 문서(AGENTS.md)를 읽었는지 확인
- [ ] 작업 대상 패키지 파악 (PMS? Server? Database?)
- [ ] DMS 작업이면 [DMS AGENTS.md](../../apps/web/dms/docs/development/AGENTS.md) 참조
- [ ] 해당 경로의 Copilot 규칙 확인

### 코드 변경 시

- [ ] 기존 패턴과 일치하는지 확인
- [ ] 타입 정의와 구현 일치하는지 확인
- [ ] 불필요한 코드 추가하지 않았는지 확인
- [ ] 영향받는 패키지 빌드 테스트

### 문서 변경 시

- [ ] Backlog/Changelog 섹션 업데이트
- [ ] 관련 문서 링크 유효성 확인

---

## 📁 문서 구조

### Copilot 규칙 (정본)

| 파일 | 적용 대상 |
|------|----------|
| \`.github/copilot-instructions.md\` | 전역 |
| \`.github/instructions/server.instructions.md\` | \`apps/server/**\` |
| \`.github/instructions/pms.instructions.md\` | \`apps/web/pms/**\` |
| \`.github/instructions/dms.instructions.md\` | \`apps/web/dms/**\` |
| \`.github/instructions/database.instructions.md\` | \`packages/database/**\` |
| \`.github/instructions/types.instructions.md\` | \`packages/types/**\` |

### 상세 참조 문서

| 문서 | 경로 | 역할 |
|------|------|------|
| **DB 설계 규칙** | \`guides/rules.md\` | 테이블/히스토리 상세 규칙 |
| **DB 가이드** | \`guides/database-guide.md\` | DB 셋업 절차 |
| **BigInt 가이드** | \`guides/bigint-guide.md\` | BigInt 처리 상세 |
| **기술 스택** | \`architecture/tech-stack.md\` | 기술 선택 기준 |
| **모듈러 모놀리스** | \`architecture/modular-monolith.md\` | 아키텍처 원칙 |

### 도메인별 문서

| 도메인 | 위치 | 설명 |
|--------|------|------|
| **PMS** | \`docs/pms/\` | PMS 전용 문서 |
| **DMS** | \`apps/web/dms/docs/development/\` | DMS 정본 (독립) |
| **DMS 통합** | \`docs/dms/\` | 모노레포 통합 관련만 |

---

## 📊 현재 상태 (2026-02-04)

### 완료된 작업

| 작업 | 내용 |
|------|------|
| **Copilot 규칙 체계화** | 6개 instruction 파일 생성 |
| **PMS-DMS 구조 통일** | 폴더 구조, 컴포넌트 패턴 표준화 |
| **Dead Code 정리** | DMS 미사용 코드 ~2,000줄 삭제 |
| **문서 체계화** | AGENTS ↔ Copilot 역할 분리 |

### 진행 중

| 항목 | 상태 |
|------|------|
| 문서별 Backlog/Changelog 적용 | 🔄 진행중 |
| 문서-코드 일치성 검증 | 🔄 진행중 |

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| MR-01 | 전체 문서 Backlog/Changelog 섹션 적용 | P1 | 🔄 진행중 |
| MR-02 | PMS/Server/Database 코드 패턴 점검 | P1 | ⬜ 대기 |
| MR-03 | 전체 Dead Code 분석 (Server, Database) | P2 | ⬜ 대기 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-04 | **리팩토링**: Copilot 규칙과 역할 분리, 중복 제거, 온보딩/프로세스 가이드로 전환 |
| 2026-02-03 | typecheck 명령어 삭제 (스크립트 미존재), 날짜 현행화 |
| 2026-02-02 | 모노레포 AGENTS 최초 작성 |
