-- =========================================================
-- SSOO History Triggers - Master Installation Script
-- 
-- 이 스크립트는 모든 히스토리 트리거를 순서대로 설치합니다.
-- 실행 방법:
--   psql -h localhost -U appuser -d appdb -f apply_all_triggers.sql
-- =========================================================

\echo '=========================================='
\echo 'SSOO History Triggers Installation'
\echo '=========================================='

\echo 'Installing: cm_code_h trigger...'
\i 01_cm_code_h_trigger.sql

\echo 'Installing: cm_user_h trigger...'
\i 02_cm_user_h_trigger.sql

\echo 'Installing: pr_project_h trigger...'
\i 03_pr_project_h_trigger.sql

\echo 'Installing: pr_project_status_h trigger...'
\i 04_pr_project_status_h_trigger.sql

\echo 'Installing: pr_deliverable_h trigger...'
\i 05_pr_deliverable_h_trigger.sql

\echo 'Installing: pr_deliverable_group_h trigger...'
\i 06_pr_deliverable_group_h_trigger.sql

\echo 'Installing: pr_deliverable_group_item_r_h trigger...'
\i 07_pr_deliverable_group_item_r_h_trigger.sql

\echo 'Installing: pr_close_condition_group_h trigger...'
\i 08_pr_close_condition_group_h_trigger.sql

\echo 'Installing: pr_close_condition_group_item_r_h trigger...'
\i 09_pr_close_condition_group_item_r_h_trigger.sql

\echo 'Installing: pr_project_deliverable_r_h trigger...'
\i 10_pr_project_deliverable_r_h_trigger.sql

\echo 'Installing: pr_project_close_condition_r_h trigger...'
\i 11_pr_project_close_condition_r_h_trigger.sql

\echo '=========================================='
\echo 'All triggers installed successfully!'
\echo '=========================================='

-- 설치된 트리거 확인
SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    CASE tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE tgname LIKE 'trg_%_h'
ORDER BY relname;
