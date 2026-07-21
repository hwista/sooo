-- =========================================================
-- CRM Seed Data: Quote Seller Profile
-- Schema: crm
-- =========================================================

begin;

insert into crm.crm_quote_seller_profile_m (
  profile_code,
  company_name,
  ci_status_code,
  is_active,
  memo,
  created_at,
  updated_at,
  last_source,
  last_activity
)
values (
  'default',
  'SSOO 영업팀',
  'dms-planned',
  true,
  '견적서 공급자 표시 정보입니다. 실제 법인/CI 정보로 교체해 사용합니다.',
  now(),
  now(),
  'SEED',
  'crm.quote-seller-profile.seed'
)
on conflict (profile_code) do nothing;

commit;
