# 문서 구조 정리 계획

> 작성일: 2026-01-21  
> 상태: 계획 수립  
> 목적: PMS/DMS 통합 전 문서 구조를 표준화하고 이관 기준을 확정

---

## 목표 구조

```
docs/
  common/            # 공통 규칙/프로세스/표준
  pms/               # 프로젝트 관리 시스템 문서
  dms/               # 도큐먼트 관리 시스템 문서
  api/               # 공용 API 문서
  architecture/      # 공통 아키텍처
  database/          # DB 설계/스키마
  tests/             # 테스트 시나리오
  ui-design/         # UI/UX 디자인
  _archive/          # 아카이브
```

---

## 이관 원칙

1. **공통 문서는 common**으로 이동
2. **PMS 전용 문서는 pms**로 이동
3. **DMS 문서는 dms**에 신규 작성
4. **API/DB/Architecture/Test/UI는 유지**하고 필요 시 경로만 정리
5. 이관은 **문서 단위로 체크포인트 커밋**

---

## 이관 매핑 (초안)

### 루트 문서

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/README.md` | `docs/common/README.md` | 공통 허브 |
| `docs/SETUP.md` | `docs/common/setup.md` | 공통 가이드 |
| `docs/ROADMAP.md` | `docs/common/roadmap.md` | 공통 로드맵 |
| `docs/BACKLOG.md` | `docs/common/backlog.md` | 공통 백로그 |
| `docs/CHANGELOG.md` | `docs/common/changelog.md` | 공통 변경 이력 |

### 도메인

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/domain/service-overview.md` | `docs/pms/domain/service-overview.md` | PMS |
| `docs/domain/concepts.md` | `docs/pms/domain/concepts.md` | PMS |
| `docs/domain/menu-structure.md` | `docs/pms/domain/menu-structure.md` | PMS |
| `docs/domain/actions/*` | `docs/pms/domain/actions/*` | PMS |
| `docs/domain/workflows/*` | `docs/pms/domain/workflows/*` | PMS |

### 아키텍처

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/architecture/*` | `docs/architecture/*` | 공통 유지 |

### API

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/api/*` | `docs/api/*` | 공통 유지 |

### DB

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/database/*` | `docs/database/*` | 공통 유지 |

### UI/테스트

| 현재 경로 | 대상 경로 | 구분 |
|---|---|---|
| `docs/ui-design/*` | `docs/pms/ui-design/*` | PMS |
| `docs/tests/*` | `docs/pms/tests/*` | PMS |

---

## 실행 단계

1. **이관 매핑 확정** (이 문서 기준)
2. **폴더 생성**: `docs/common`, `docs/pms`, `docs/dms`
3. **문서 이동** + 링크/인덱스 갱신
4. **CHANGELOG/README 업데이트**
5. **체크포인트 커밋**

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DOCS-01 | 문서 구조 이관 매핑 확정 | P1 | 🔲 대기 |
| DOCS-02 | common/pms/dms 폴더 생성 | P1 | 🔲 대기 |
| DOCS-03 | 문서 이동 및 링크 정리 | P1 | 🔲 대기 |
| DOCS-04 | 문서 인덱스/CHANGELOG 갱신 | P1 | 🔲 대기 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 문서 구조 정리 계획 초안 작성 |
