-- =========================================================
-- Seed: 05_menu_data.sql
-- 초기 메뉴 ?�이??
-- ?�로?�트 ?�태 기반 메뉴: ?�청 ???�안 ???�행 ???�환
-- 관리자 메뉴??is_admin_menu = true �?분리
-- =========================================================

-- 기존 ?�이???�리 (개발 ?�경??
-- DELETE FROM cm_role_menu_r;
-- DELETE FROM cm_user_menu_r;
-- DELETE FROM cm_user_favorite_r;
-- DELETE FROM cm_menu_m;

-- ============================================
-- ?�반 ?�용??메뉴 (is_admin_menu = false)
-- 1?�벨: ?�?�보?? ?�청, ?�안, ?�행, ?�환
-- ============================================

-- 1. ?�?�보??(메인 진입??
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('dashboard', '?�?�보??, 'Dashboard', 'menu', '/dashboard', 'LayoutDashboard', 1, 1, true, false, '?�체 ?�황, KPI, ?�림', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- 2. ?�청 (고객 ?�청 ?�수 �?검??
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('request', '?�청', 'Request', 'group', '/request', 'MessageSquare', 2, 1, true, false, '고객 ?�청 ?�수 �?검??, CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- 3. ?�안 (견적/?�안???�성 �?계약 ?�상)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('proposal', '?�안', 'Proposal', 'group', '/proposal', 'Lightbulb', 3, 1, true, false, '견적/?�안???�성 �?계약 ?�상', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- 4. ?�행 (계약 체결 ???�로?�트 ?�행)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('execution', '?�행', 'Execution', 'group', '/execution', 'Rocket', 4, 1, true, false, '계약 체결 ???�로?�트 ?�행', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- 5. ?�환 (?�로?�트 ?�료 ???�영/?��?보수 ?�환)
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('transition', '?�환', 'Transition', 'group', '/transition', 'ArrowRightLeft', 5, 1, true, false, '?�로?�트 ?�료 ???�영/?��?보수 ?�환', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 관리자 메뉴 (is_admin_menu = true)
-- ?�반 메뉴?� ?�일 ?�벨 (menu_level: 1)
-- ============================================

-- 관리자 그룹
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin', '관리자', 'Admin', 'group', '/admin', 'Shield', 1, 1, true, true, '?�스??관�?메뉴', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_name_en = EXCLUDED.menu_name_en,
  menu_type = EXCLUDED.menu_type,
  menu_path = EXCLUDED.menu_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  menu_level = EXCLUDED.menu_level,
  is_visible = EXCLUDED.is_visible,
  is_admin_menu = EXCLUDED.is_admin_menu,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2?�벨 메뉴 (?�반)
-- ============================================

-- ?�청 > ?�청 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('request.list', '?�청 목록', 'Request List', 'menu', '/request', 'List', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'request'), true, false, '?�청 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'request'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- ?�안 > ?�안 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('proposal.list', '?�안 목록', 'Proposal List', 'menu', '/proposal', 'List', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'proposal'), true, false, '?�안 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'proposal'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- ?�행 > ?�로?�트 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('execution.list', '?�로?�트 목록', 'Project List', 'menu', '/execution', 'List', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'execution'), true, false, '?�행 ?�로?�트 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'execution'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- ?�환 > ?�환 목록
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('transition.list', '?�환 목록', 'Transition List', 'menu', '/transition', 'List', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'transition'), true, false, '?�환 목록 조회', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'transition'),
  is_admin_menu = false,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2?�벨 메뉴 (관리자)
-- ============================================

-- 관리자 > ?�용??관�?
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.user', '?�용??관�?, 'User Management', 'menu', '/admin/user', 'Users', 1, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, true, '?�용??계정 관�?, CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > ??�� 관�?
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.role', '??�� 관�?, 'Role Management', 'menu', '/admin/role', 'UserCog', 2, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, true, '??�� �?권한 관�?, CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 메뉴 관�?
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.menu', '메뉴 관�?, 'Menu Management', 'menu', '/admin/menu', 'Menu', 3, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, true, '메뉴 구조 관�?, CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 코드 관�?
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.code', '코드 관�?, 'Code Management', 'menu', '/admin/code', 'Code', 4, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, true, '공통 코드 관�?, CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 고객??관�?
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.customer', '고객??관�?, 'Customer Management', 'menu', '/admin/customer', 'Building2', 5, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, true, '고객???�랜???�스??기�??�보', CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- 관리자 > 부??관�?
INSERT INTO pms.cm_menu_m (menu_code, menu_name, menu_name_en, menu_type, menu_path, icon, sort_order, menu_level, parent_menu_id, is_visible, is_admin_menu, description, updated_at)
VALUES ('admin.dept', '부??관�?, 'Department Management', 'menu', '/admin/dept', 'Network', 6, 2, 
        (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'), true, true, '부??구조 관�?, CURRENT_TIMESTAMP)
ON CONFLICT ON CONSTRAINT cm_menu_m_menu_code_key DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  parent_menu_id = (SELECT menu_id FROM cm_menu_m WHERE menu_code = 'admin'),
  is_admin_menu = true,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 기존 불필??메뉴 비활?�화
-- (opportunity, contract, project, closing, handoff, operation ??
-- ============================================
UPDATE cm_menu_m SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE menu_code IN ('opportunity', 'contract', 'project', 'closing', 'handoff', 'operation', 
                    'project.list', 'request.customer', 'request.customer.list', 'request.customer.create')
  AND is_active = true;
