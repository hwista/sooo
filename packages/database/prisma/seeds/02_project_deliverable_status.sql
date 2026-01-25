-- =========================================================
-- Seed: 02_project_deliverable_status.sql
-- ?ÑÎ°ú?ùÌä∏ ?∞Ï∂úÎ¨??úÏ∂ú ?ÅÌÉú ÏΩîÎìú
-- =========================================================

begin;

-- PROJECT_DELIVERABLE_SUBMISSION_STATUS
insert into pms.cm_code_m (code_group, code_value, display_name_ko, display_name_en, description, sort_order)
values
('PROJECT_DELIVERABLE_SUBMISSION_STATUS','before_submit','?úÏ∂ú ??,'Before Submit','?∞Ï∂úÎ¨??ëÏÑ±/Ï§ÄÎπ??®Í≥Ñ.',10),
('PROJECT_DELIVERABLE_SUBMISSION_STATUS','submitted','?úÏ∂ú','Submitted','?¥Î? ?úÏ∂ú ?êÎäî Í≥†Í∞ù ?ÑÎã¨ ?ÑÎ£å.',20),
('PROJECT_DELIVERABLE_SUBMISSION_STATUS','confirmed','?ïÏ†ï','Confirmed','Í≥†Í∞ù Í≤Ä???ïÏ†ï ?ÑÎ£å.',30)
on conflict on constraint ux_cm_code_m_group_value do update
set display_name_ko=excluded.display_name_ko,
    display_name_en=excluded.display_name_en,
    description=excluded.description,
    sort_order=excluded.sort_order,
    updated_at=now();

commit;
