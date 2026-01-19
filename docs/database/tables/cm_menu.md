# 테이블 정의서: cm_menu (메뉴)

## 1. 개요

| 항목 | 값 |
|------|-----|
| 테이블명 | `cm_menu_m` (마스터), `cm_menu_h` (히스토리) |
| 설명 | 시스템 메뉴 정의. 트리 구조로 부모-자식 관계 표현 |
| PK | `menu_id` (BIGSERIAL) |
| 주요 UK | `menu_code` |

---

## 2. 컬럼 정의

| # | 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|---|--------|------|------|--------|------|
| 1 | `menu_id` | BIGSERIAL | NO | auto | PK |
| 2 | `menu_code` | VARCHAR(50) | NO | - | 메뉴 고유 코드 (UK). 예: `dashboard`, `project.list` |
| 3 | `menu_name` | VARCHAR(100) | NO | - | 메뉴 표시명 (한글) |
| 4 | `menu_name_en` | VARCHAR(100) | YES | - | 메뉴 표시명 (영문) |
| 5 | `menu_type` | VARCHAR(20) | NO | `menu` | 메뉴 유형: `group`, `menu`, `action` |
| 6 | `parent_menu_id` | BIGINT | YES | - | 부모 메뉴 ID (self-relation) |
| 7 | `menu_path` | VARCHAR(200) | YES | - | 라우트 경로. 예: `/project`, `/project/[id]` |
| 8 | `icon` | VARCHAR(50) | YES | - | 아이콘 이름 (lucide-react) |
| 9 | `sort_order` | INT | NO | 0 | 동일 레벨 내 정렬 순서 |
| 10 | `menu_level` | INT | NO | 1 | 메뉴 깊이 (1=최상위) |
| 11 | `is_visible` | BOOLEAN | NO | true | 사이드바에 표시 여부 |
| 12 | `is_enabled` | BOOLEAN | NO | true | 메뉴 활성화 여부 |
| 13 | `open_type` | VARCHAR(20) | NO | `tab` | 열기 방식: `tab`, `modal`, `external` |
| 14 | `description` | TEXT | YES | - | 메뉴 설명 |
| - | *공통 컬럼* | - | - | - | is_active, memo, created_by, created_at, ... |

---

## 3. 메뉴 타입 (menu_type)

| 코드 | 설명 | 예시 |
|------|------|------|
| `group` | 그룹 (클릭 불가, 하위 메뉴 포함) | "프로젝트", "관리자" |
| `menu` | 메뉴 (클릭 시 탭으로 열림) | "프로젝트 목록", "대시보드" |
| `action` | 액션 (권한 체크용, UI 비표시) | "프로젝트 생성", "사용자 삭제" |

---

## 4. 열기 방식 (open_type)

| 코드 | 설명 |
|------|------|
| `tab` | MDI 탭으로 열기 (기본) |
| `modal` | 모달 다이얼로그로 열기 |
| `external` | 새 창/탭으로 열기 |

---

## 5. 초기 메뉴 구조

```
dashboard (대시보드)
├── menu_level: 1, sort_order: 1

project (프로젝트)
├── menu_level: 1, sort_order: 2, menu_type: group
├── project.list (프로젝트 목록)
│   └── menu_level: 2, sort_order: 1
├── project.create (프로젝트 생성) - action
│   └── menu_level: 2, menu_type: action

customer (고객사)
├── menu_level: 1, sort_order: 3, menu_type: group
├── customer.list (고객사 목록)
├── customer.plant (플랜트 관리)

system (시스템)
├── menu_level: 1, sort_order: 4, menu_type: group
├── system.list (시스템 목록)
├── system.instance (인스턴스 관리)

report (리포트)
├── menu_level: 1, sort_order: 5, menu_type: group

admin (관리자)
├── menu_level: 1, sort_order: 99, menu_type: group
├── admin.user (사용자 관리)
├── admin.role (역할 관리)
├── admin.menu (메뉴 관리)
├── admin.code (코드 관리)
```

---

## 6. 인덱스

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `ux_cm_menu_m_code` | `menu_code` | UK: 메뉴 코드 유일성 |
| `ix_cm_menu_m_parent` | `parent_menu_id` | 부모 메뉴 조회 |
| `ix_cm_menu_m_level_order` | `menu_level`, `sort_order` | 메뉴 트리 정렬 |
| `ix_cm_menu_m_active` | `is_active` | 활성 메뉴 필터 |

---

## 7. 관련 테이블

- `cm_role_menu_r`: 역할별 메뉴 권한
- `cm_user_menu_r`: 사용자별 메뉴 권한 (예외)
- `cm_dept_menu_r`: 부서별 메뉴 권한 (확장용)

---

## 8. API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/auth/my-menus` | 로그인 사용자의 메뉴 트리 조회 |
| GET | `/api/admin/menus` | 전체 메뉴 목록 (관리자) |
| POST | `/api/admin/menus` | 메뉴 생성 |
| PUT | `/api/admin/menus/:id` | 메뉴 수정 |
| DELETE | `/api/admin/menus/:id` | 메뉴 삭제 |
