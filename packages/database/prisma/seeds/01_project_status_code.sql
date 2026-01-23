-- =========================================================
-- Seed: 01_project_status_code.sql
-- ?„ë¡œ?íŠ¸ ?íƒœ/?¨ê³„/ê²°ê³¼ ì½”ë“œ
-- =========================================================

-- PROJECT_STATUS (4?¨ê³„: ?”ì²­ ???œì•ˆ ???¤í–‰ ???„í™˜)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('PROJECT_STATUS','request','?”ì²­','Request','ê³ ê° ?”ì²­ ?‘ìˆ˜ ë°?ê²€???¨ê³„.',10,now(),now()),
('PROJECT_STATUS','proposal','?œì•ˆ','Proposal','ê²¬ì /?œì•ˆ???‘ì„± ë°?ê³„ì•½ ?‘ìƒ ?¨ê³„.',20,now(),now()),
('PROJECT_STATUS','execution','?¤í–‰','Execution','ê³„ì•½ ì²´ê²° ???„ë¡œ?íŠ¸ ?˜í–‰ ?¨ê³„.',30,now(),now()),
('PROJECT_STATUS','transition','?„í™˜','Transition','?„ë¡œ?íŠ¸ ?„ë£Œ ???´ì˜/? ì?ë³´ìˆ˜ ?„í™˜ ?¨ê³„.',40,now(),now())
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_STAGE (ê°??íƒœ ??ì§„í–‰ ?¨ê³„)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
('PROJECT_STAGE','waiting','?€ê¸?,'Waiting','?„ì§ ë³¸ê²© ?‘ì—… ???€ê¸?.',10,now(),now()),
('PROJECT_STAGE','in_progress','ì§„í–‰','In Progress','?‘ì—… ì§„í–‰ ì¤?',20,now(),now()),
('PROJECT_STAGE','done','?„ë£Œ','Done','?´ë‹¹ ?íƒœ??ì¢…ë£Œ.',30,now(),now())
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_DONE_RESULT (?íƒœë³?ì¢…ë£Œ ê²°ê³¼)
-- request done: accepted(?˜ìš©), rejected(ê±°ë?), hold(ë³´ë¥˜)
-- proposal done: won(?˜ì£¼), lost(?¤ì£¼), hold(ë³´ë¥˜)
-- execution done: completed(?„ë£Œ), cancelled(ì·¨ì†Œ), hold(ë³´ë¥˜)
-- transition done: transferred(?„í™˜?„ë£Œ), cancelled(ì·¨ì†Œ)
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order, created_at, updated_at)
values
-- ?”ì²­ ?¨ê³„ ê²°ê³¼
('PROJECT_DONE_RESULT','accepted','?˜ìš©','Accepted','?”ì²­ ?˜ìš©(?œì•ˆ ?¨ê³„ ?„í™˜ ?€??.',10,now(),now()),
('PROJECT_DONE_RESULT','rejected','ê±°ë?','Rejected','?”ì²­ ê±°ë?(ì¢…ë£Œ).',15,now(),now()),
-- ?œì•ˆ ?¨ê³„ ê²°ê³¼
('PROJECT_DONE_RESULT','won','?˜ì£¼','Won','ê³„ì•½ ?±ì‚¬(?¤í–‰ ?„í™˜ ?€??.',20,now(),now()),
('PROJECT_DONE_RESULT','lost','?¤ì£¼','Lost','ë¬´ì‚°/?¨ë°°.',25,now(),now()),
-- ?¤í–‰ ?¨ê³„ ê²°ê³¼
('PROJECT_DONE_RESULT','completed','?„ë£Œ','Completed','?„ë¡œ?íŠ¸ ?•ìƒ ?„ë£Œ(?„í™˜ ?¨ê³„ ?„í™˜ ?€??.',30,now(),now()),
('PROJECT_DONE_RESULT','cancelled','ì·¨ì†Œ','Cancelled','?„ë¡œ?íŠ¸ ì·¨ì†Œ.',35,now(),now()),
-- ?„í™˜ ?¨ê³„ ê²°ê³¼
('PROJECT_DONE_RESULT','transferred','?„í™˜?„ë£Œ','Transferred','?´ì˜/? ì?ë³´ìˆ˜ ?„í™˜ ?„ë£Œ.',40,now(),now()),
-- ê³µí†µ
('PROJECT_DONE_RESULT','hold','ë³´ë¥˜','Hold','ë³´ë¥˜(ì¶”í›„ ?¬ê°œ ê°€??.',50,now(),now())
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();
