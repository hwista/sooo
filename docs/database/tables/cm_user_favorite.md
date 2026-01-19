# cm_user_favorite_r (사용자 즐겨찾기 메뉴)

## 개요

| 항목 | 값 |
|------|-----|
| 테이블명 | `cm_user_favorite_r` |
| Prisma Model | `UserFavorite` |
| 설명 | 사용자별 즐겨찾기 메뉴 저장 |
| 히스토리 | 미적용 (단순 즐겨찾기 ON/OFF) |

---

## 테이블 구조

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `user_favorite_id` | `BIGSERIAL` | NOT NULL | auto | PK |
| `user_id` | `BIGINT` | NOT NULL | - | 사용자 ID (FK) |
| `menu_id` | `BIGINT` | NOT NULL | - | 메뉴 ID (FK) |
| `sort_order` | `INT` | NOT NULL | 0 | 즐겨찾기 내 정렬 순서 |
| `is_active` | `BOOLEAN` | NOT NULL | TRUE | 활성화 여부 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | NOW() | 등록일시 |

---

## 인덱스 및 제약조건

```sql
-- PK
CONSTRAINT pk_cm_user_favorite_r PRIMARY KEY (user_favorite_id)

-- Unique (사용자당 메뉴 중복 방지)
CONSTRAINT ux_cm_user_favorite_r_user_menu UNIQUE (user_id, menu_id)

-- FK
CONSTRAINT fk_cm_user_favorite_r_user FOREIGN KEY (user_id) 
    REFERENCES cm_user_m(user_id) ON DELETE CASCADE
CONSTRAINT fk_cm_user_favorite_r_menu FOREIGN KEY (menu_id) 
    REFERENCES cm_menu_m(menu_id) ON DELETE CASCADE

-- Index
CREATE INDEX ix_cm_user_favorite_r_user ON cm_user_favorite_r(user_id);
```

---

## 사용 시나리오

### 1. 즐겨찾기 추가
```sql
INSERT INTO cm_user_favorite_r (user_id, menu_id, sort_order)
VALUES (1, 36, 0);  -- user_id=1이 dashboard(menu_id=36)를 즐겨찾기
```

### 2. 즐겨찾기 목록 조회 (사이드바용)
```sql
SELECT f.*, m.menu_code, m.menu_name, m.icon, m.menu_path
FROM cm_user_favorite_r f
JOIN cm_menu_m m ON f.menu_id = m.menu_id
WHERE f.user_id = :userId AND f.is_active = true
ORDER BY f.sort_order;
```

### 3. 즐겨찾기 삭제
```sql
DELETE FROM cm_user_favorite_r 
WHERE user_id = :userId AND menu_id = :menuId;
```

### 4. 즐겨찾기 순서 변경
```sql
UPDATE cm_user_favorite_r 
SET sort_order = :newOrder
WHERE user_id = :userId AND menu_id = :menuId;
```

---

## 관련 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/api/menu/favorites` | 내 즐겨찾기 목록 |
| `POST` | `/api/menu/favorites` | 즐겨찾기 추가 |
| `DELETE` | `/api/menu/favorites/:menuId` | 즐겨찾기 삭제 |
| `PATCH` | `/api/menu/favorites/reorder` | 순서 변경 |

---

## 비고

- 히스토리 트리거 미적용: 단순 ON/OFF 성격, 감사 로그 불필요
- 정렬 순서: 드래그앤드롭으로 순서 변경 가능
- 권한 체크: 즐겨찾기 조회 시 해당 메뉴 권한도 함께 검증
