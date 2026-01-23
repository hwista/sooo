-- =========================================================
-- Seed: 99_user_initial_admin.sql
-- ?�스??초기 관리자 계정 ?�성
-- 주의: ?�행 ??password_hash�??�제 bcrypt ?�시값으�?교체 ?�요!
-- =========================================================

begin;

-- 초기 관리자 계정
-- password_hash ?�시??'admin123!' ??bcrypt ?�시 (?�제 배포 ??변�??�수)
-- ?�성 방법: node -e "console.log(require('bcrypt').hashSync('your_password', 12))"

insert into common.cm_user_m (
    -- System Access Control
    is_system_user,
    user_type_code,
    
    -- Authentication
    login_id,
    password_hash,
    
    -- Profile
    user_name,
    display_name,
    email,
    
    -- Organization
    department_code,
    position_code,
    employee_number,
    
    -- Role & Permission
    role_code,
    
    -- Status
    user_status_code,
    
    -- Common
    is_active,
    memo,
    created_by,
    last_source,
    last_activity
)
values (
    -- System Access Control
    true,                   -- is_system_user: ?�스???�용 가??
    'internal',             -- user_type_code: ?��? 직원
    
    -- Authentication
    'admin',                -- login_id
    '$2b$12$PLACEHOLDER_HASH_REPLACE_WITH_REAL_BCRYPT_HASH',  -- password_hash (반드??교체!)
    
    -- Profile
    '?�스?��?리자',          -- user_name
    'Admin',                -- display_name
    'admin@company.com',    -- email (?�제 ?�메?�로 변�?
    
    -- Organization
    'ADMIN',                -- department_code
    'DIRECTOR',             -- position_code
    'ADMIN001',             -- employee_number
    
    -- Role & Permission
    'admin',                -- role_code: 관리자
    
    -- Status
    'active',               -- user_status_code: ?�성
    
    -- Common
    true,                   -- is_active
    '?�스??초기 관리자 계정. 배포 ??비�?번호 변�??�수.',
    null,                   -- created_by: ?�스???�성
    'SEED',                 -- last_source
    'user_initial_admin.sql'
)
on conflict (email) do nothing;  -- ?��? 존재?�면 skip

commit;

-- =========================================================
-- ?�인 쿼리
-- =========================================================
-- select user_id, login_id, user_name, email, role_code, user_status_code 
-- from cm_user_m 
-- where login_id = 'admin';
