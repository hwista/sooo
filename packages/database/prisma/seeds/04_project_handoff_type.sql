-- =========================================================
-- Seed: 04_project_handoff_type.sql
-- ?„ë¡œ?íŠ¸ ?¸ë“œ?¤í”„ ?€???¨ê³„ ì½”ë“œ
-- =========================================================

begin;

-- PROJECT_HANDOFF_TYPE
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_HANDOFF_TYPE','PRE_TO_PM','ê¸°íšŒ?’PM ?¸ê³„','Pre?’PM','ê¸°íšŒ ?¨ê³„?ì„œ PM?ê²Œ ?¤í–‰ ?¸ìˆ˜ ëª©ì  ?¸ê³„.',10),
('PROJECT_HANDOFF_TYPE','PRE_TO_CONTRACT_OWNER','ê¸°íšŒ?’ê³„?½ë‹´???¸ê³„','Pre?’Contract Owner','ê¸°íšŒ ?¨ê³„?ì„œ AM/ê³„ì•½?´ë‹¹?ê²Œ ê³„ì•½ ì§„í–‰ ëª©ì  ?¸ê³„.',20),
('PROJECT_HANDOFF_TYPE','EXEC_TO_CONTRACT_OWNER','?¤í–‰?’ê³„?½ì´???¸ê³„','Exec?’Contract Owner','?¤í–‰ ì¤?ì¤‘ë„ê¸??•ì‚° ??ê³„ì•½ ?´í–‰ ëª©ì  ?¸ê³„.',30),
('PROJECT_HANDOFF_TYPE','EXEC_TO_SM','?¤í–‰?’ìš´???¸ê³„','Exec?’SM','ì¢…ë£Œ ???´ì˜ ?„í™˜ ëª©ì  ?¸ê³„(SM).',40)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

-- PROJECT_HANDOFF_STAGE
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_HANDOFF_STAGE','waiting','?€ê¸?,'Waiting','?¸ê³„ ?ì„±(?˜ì‹ ??ë¯¸ì°©??.',10),
('PROJECT_HANDOFF_STAGE','in_progress','ì§„í–‰','In Progress','?˜ì‹ ???¸ìˆ˜/ì§„í–‰ ì¤?',20),
('PROJECT_HANDOFF_STAGE','done','?„ë£Œ','Done','?¸ê³„ ?„ë£Œ.',30)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
