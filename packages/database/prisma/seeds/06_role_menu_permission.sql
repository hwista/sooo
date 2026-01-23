-- ============================================
-- Seed: 06_role_menu_permission.sql
-- Role Menu Permission (??• ë³?ë©”ë‰´ ê¶Œí•œ)
-- ë¹„ì¦ˆ?ˆìŠ¤ ?„ë¡œ?¸ìŠ¤: ?”ì²­ ???œì•ˆ ??ê³„ì•½ ???¤í–‰ ??ì¢…ë£Œ ???´ê? ???´ì˜
-- ============================================
-- access_type: full=?„ì²´, read=?½ê¸°?„ìš©, none=?‘ê·¼ë¶ˆê?(?ˆì½”???ì„± ?ˆí•¨)

-- ============================================
-- admin (?œìŠ¤??ê´€ë¦¬ì) - ëª¨ë“  ë©”ë‰´ full ?‘ê·¼
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'admin', menu_id, 'full', CURRENT_TIMESTAMP FROM cm_menu_m WHERE is_active = true
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- manager (ë§¤ë‹ˆ?€) - ê´€ë¦¬ì ë©”ë‰´ ?œì™¸ ?„ì²´ full
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'manager', menu_id, 'full', CURRENT_TIMESTAMP
FROM cm_menu_m
WHERE is_active = true AND is_admin_menu = false
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- user (?¼ë°˜ ?¬ìš©?? - ê´€ë¦¬ì ë©”ë‰´ ?œì™¸ ?„ì²´ read
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'user', menu_id, 'read', CURRENT_TIMESTAMP
FROM cm_menu_m
WHERE is_active = true AND is_admin_menu = false
ON CONFLICT (role_code, menu_id) DO NOTHING;

-- ============================================
-- viewer (ì¡°íšŒ ?„ìš©) - ?€?œë³´??read
-- ============================================
INSERT INTO pms.cm_role_menu_r (role_code, menu_id, access_type, updated_at)
SELECT 'viewer', menu_id, 'read', CURRENT_TIMESTAMP
FROM cm_menu_m
WHERE menu_code = 'dashboard'
ON CONFLICT (role_code, menu_id) DO NOTHING;
