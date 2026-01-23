-- =========================================================
-- Seed: 00_user_code.sql
-- ?¬ìš©??ê´€??ê³µí†µ ì½”ë“œ (USER_TYPE, USER_STATUS, USER_ROLE, etc.)
-- =========================================================

begin;

-- =========================================================
-- USER_TYPE: ?¬ìš©??? í˜•
-- =========================================================
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('USER_TYPE','internal','?´ë?','Internal','?´ë? ì§ì› (?°ë¦¬ ?Œì‚¬).',10),
('USER_TYPE','external','?¸ë?','External','?¸ë? ?´í•´ê´€ê³„ì (ê³ ê°???´ë‹¹?? ?‘ë ¥????.',20)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_STATUS: ?¬ìš©???íƒœ
-- =========================================================
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('USER_STATUS','registered','?±ë¡??,'Registered','?„ë¡œ?íŠ¸ ë¦¬ì†Œ?¤ë¡œë§??±ë¡??(?œìŠ¤??ë¯¸ì‚¬??.',10),
('USER_STATUS','invited','ì´ˆë???,'Invited','?œìŠ¤???¬ìš© ì´ˆë???(?„ì§ ê°€??ë¯¸ì™„ë£?.',20),
('USER_STATUS','active','?œì„±','Active','?•ìƒ ?¬ìš© ì¤?',30),
('USER_STATUS','inactive','ë¹„í™œ??,'Inactive','?¼ì‹œ ë¹„í™œ??(?´ì§ ??.',40),
('USER_STATUS','suspended','?•ì?','Suspended','?•ì???(ë³´ì•ˆ ?´ìŠˆ ??.',50)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_ROLE: ?¬ìš©????• 
-- =========================================================
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('USER_ROLE','admin','ê´€ë¦¬ì','Admin','?œìŠ¤???„ì²´ ê´€ë¦?ê¶Œí•œ.',10),
('USER_ROLE','manager','ë§¤ë‹ˆ?€','Manager','?€/ë¶€??ê´€ë¦?ê¶Œí•œ. ?¬ìš©??ì´ˆë? ê°€??',20),
('USER_ROLE','user','?¬ìš©??,'User','?¼ë°˜ ?¬ìš©?? ? ë‹¹???„ë¡œ?íŠ¸/?…ë¬´ ?˜í–‰.',30),
('USER_ROLE','viewer','ì¡°íšŒ??,'Viewer','ì¡°íšŒ ?„ìš© ê¶Œí•œ.',40)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_DEPARTMENT: ë¶€??(?ˆì‹œ - ?¤ì œ ì¡°ì§??ë§ê²Œ ?˜ì • ?„ìš”)
-- =========================================================
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('USER_DEPARTMENT','SALES','?ì—…ë¶€','Sales','?ì—…/?œì•ˆ ?´ë‹¹.',10),
('USER_DEPARTMENT','AM','AM?€','Account Management','ê³ ê°ê´€ë¦?ê³„ì•½ê´€ë¦??´ë‹¹.',20),
('USER_DEPARTMENT','PM','PM?€','Project Management','?„ë¡œ?íŠ¸ ?˜í–‰ ?´ë‹¹.',30),
('USER_DEPARTMENT','SM','SM?€','Service Management','?´ì˜/? ì?ë³´ìˆ˜ ?´ë‹¹.',40),
('USER_DEPARTMENT','DEV','ê°œë°œ?€','Development','ê°œë°œ ?´ë‹¹.',50),
('USER_DEPARTMENT','ADMIN','ê²½ì˜ì§€??,'Administration','ê²½ì˜ì§€??ê´€ë¦?',60)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- =========================================================
-- USER_POSITION: ì§ê¸‰/ì§ì±… (?ˆì‹œ - ?¤ì œ ì¡°ì§??ë§ê²Œ ?˜ì • ?„ìš”)
-- =========================================================
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('USER_POSITION','EXECUTIVE','?„ì›','Executive','?„ì›.',10),
('USER_POSITION','DIRECTOR','?€??,'Director','?€???ŒíŠ¸??',20),
('USER_POSITION','SENIOR','? ì„','Senior','? ì„/ì±…ì„.',30),
('USER_POSITION','STAFF','?¬ì›','Staff','?¬ì›/ì£¼ì„.',40)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
