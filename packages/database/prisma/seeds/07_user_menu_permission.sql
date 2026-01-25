-- ============================================
-- Seed: 07_user_menu_permission.sql
-- User Menu Permission (?¬ìš©?ë³„ ë©”ë‰´ ê¶Œí•œ)
-- ============================================
-- Role ?Œì´ë¸”ì´ ?•ì˜?˜ê¸° ?„ê¹Œì§€ ?¬ìš©?ë³„ ì§ì ‘ ê¶Œí•œ ë¶€??
-- 
-- access_type: full=?„ì²´, read=?½ê¸°?„ìš©
-- override_type: grant=ê¶Œí•œë¶€?? revoke=ê¶Œí•œë°•íƒˆ (??•  ê¶Œí•œ ?¤ë²„?¼ì´?œìš©)
-- 
-- ?„ì¬: Role ë¯¸ì •???íƒœ?´ë?ë¡??¬ìš©?ì—ê²?ì§ì ‘ ê¶Œí•œ ë¶€??
-- ì¶”í›„: Role ?•ì˜ ??cm_role_menu_r ?œìš©, cm_user_menu_r???ˆì™¸ ì²˜ë¦¬?©ìœ¼ë¡??„í™˜

-- ============================================
-- admin ?¬ìš©??(user_id=1) - ëª¨ë“  ë©”ë‰´ full ?‘ê·¼
-- ============================================
INSERT INTO pms.cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
SELECT 1, menu_id, 'full', 'grant', CURRENT_TIMESTAMP 
FROM cm_menu_m WHERE is_active = true
ON CONFLICT (user_id, menu_id) DO NOTHING;

-- ============================================
-- ì¶”ê? ?¬ìš©??ê¶Œí•œ?€ ?¬ê¸°??ì¶”ê?
-- ============================================
-- ?ˆì‹œ: PM ?¬ìš©??(user_id=2)ê°€ ?ì„±?˜ë©´
-- INSERT INTO pms.cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
-- SELECT 2, menu_id, 'full', 'grant', CURRENT_TIMESTAMP 
-- FROM cm_menu_m WHERE menu_code IN ('dashboard', 'execution', 'execution.list', 'transition')
-- ON CONFLICT (user_id, menu_id) DO NOTHING;
--
-- INSERT INTO pms.cm_user_menu_r (user_id, menu_id, access_type, override_type, updated_at)
-- SELECT 2, menu_id, 'read', 'grant', CURRENT_TIMESTAMP 
-- FROM cm_menu_m WHERE menu_code IN ('request', 'proposal', 'execution', 'transition')
-- ON CONFLICT (user_id, menu_id) DO NOTHING;
