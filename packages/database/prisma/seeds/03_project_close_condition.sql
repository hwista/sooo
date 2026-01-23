-- =========================================================
-- Seed: 03_project_close_condition.sql
-- ?„ë¡œ?íŠ¸ ì¢…ë£Œ ì¡°ê±´ ??ª© ì½”ë“œ
-- =========================================================

begin;

insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_CLOSE_CONDITION_ITEM','DELIVERABLE_SUBMITTED','?°ì¶œë¬??œì¶œ','Deliverables Submitted','?„ìš” ?°ì¶œë¬??œì¶œ(?•ì • ?¬í•¨) ?¬ë?ë¥?ê·¼ê±°ë¡?ì¢…ë£Œ ì¡°ê±´ ì¶©ì¡±.',10),
('PROJECT_CLOSE_CONDITION_ITEM','CUSTOMER_ACCEPTANCE_SIGNED','ê²€?˜í™•?¸ì„œ ?¬ì¸','Acceptance Signed','ê³ ê° ê²€???¸ìˆ˜ ?•ì¸???œëª… ?„ë£Œ.',20),
('PROJECT_CLOSE_CONDITION_ITEM','FINAL_REPORT_DONE','ì¢…ë£Œ ë³´ê³  ?„ë£Œ','Final Report Done','ì¢…ë£Œ ë³´ê³ /ìµœì¢… ê²°ê³¼ ë³´ê³  ?„ë£Œ.',30),
('PROJECT_CLOSE_CONDITION_ITEM','HANDOVER_COMPLETED','?¸ìˆ˜?¸ê³„ ?„ë£Œ','Handover Completed','?´ì˜/ì°¨ê¸° ?´ë‹¹???¸ìˆ˜?¸ê³„ ?„ë£Œ.',40)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
