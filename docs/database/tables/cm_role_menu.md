# 테이블 정의서: cm_role_menu (역할별 메뉴 권한)

## 1. 개요

| 항목 | 값 |
|------|-----|
| 테이블명 | `cm_role_menu_r` (관계), `cm_role_menu_h` (히스토리) |
| 설명 | 역할(role)별 메뉴 접근 권한 매핑 |
| PK | `role_menu_id` (BIGSERIAL) |
| UK | `role_code` + `menu_id` |

---

## 2. 컬럼 정의

| # | 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|---|--------|------|------|--------|------|
| 1 | `role_menu_id` | BIGSERIAL | NO | auto | PK |
| 2 | `role_code` | VARCHAR(20) | NO | - | 역할 코드 (cm_code.role 참조) |
| 3 | `menu_id` | BIGINT | NO | - | 메뉴 ID (FK → cm_menu_m) |
| 4 | `access_type` | VARCHAR(10) | NO | `full` | 접근 유형: `full`, `read`, `none` |
| - | *공통 컬럼* | - | - | - | is_active, memo, created_by, ... |

---

## 3. 접근 유형 (access_type)

| 코드 | 설명 | UI 표현 |
|------|------|---------|
| `full` | 전체 접근 (읽기/쓰기) | 메뉴 정상 표시, 모든 기능 사용 가능 |
| `read` | 읽기 전용 | 메뉴 표시 + 🔒 표시, 수정 기능 비활성화 |
| `none` | 접근 불가 | 메뉴 숨김 (기본값, 레코드 없으면 none) |

---

## 4. 역할 코드 (role_code)

| 코드 | 설명 | 주요 권한 |
|------|------|----------|
| `admin` | 시스템 관리자 | 모든 메뉴 full 접근 |
| `manager` | 매니저 | 관리자 메뉴 제외 전체 full |
| `user` | 일반 사용자 | 관리자 메뉴 제외 전체 read |
| `viewer` | 조회 전용 | 대시보드 read |

---

## 5. 초기 데이터 (권한 매트릭스)

| 메뉴 | admin | manager | user | viewer |
|------|-------|---------|------|--------|
| dashboard | full | full | read | read |
| request | full | full | read | none |
| proposal | full | full | read | none |
| execution | full | full | read | none |
| transition | full | full | read | none |
| admin | full | none | none | none |

---

## 6. 인덱스

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `ux_cm_role_menu_r_role_menu` | `role_code`, `menu_id` | UK: 역할-메뉴 조합 유일성 |
| `ix_cm_role_menu_r_menu` | `menu_id` | 메뉴별 권한 조회 |
| `ix_cm_role_menu_r_role` | `role_code` | 역할별 메뉴 목록 조회 |

---

## 7. 권한 조회 로직

```sql
-- 사용자의 메뉴 권한 조회 (역할 기반)
SELECT m.*, rm.access_type
FROM cm_menu_m m
JOIN cm_role_menu_r rm ON m.menu_id = rm.menu_id
WHERE rm.role_code = :userRoleCode
  AND rm.access_type != 'none'
  AND rm.is_active = true
  AND m.is_active = true
ORDER BY m.menu_level, m.sort_order;
```
