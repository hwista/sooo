-- Add platform user owner mapping to CRM opportunities.
-- CRM stays in the crm schema; owner_user_id references common users by value without a cross-schema FK.

ALTER TABLE "crm"."crm_opportunity_m"
  ADD COLUMN IF NOT EXISTS "owner_user_id" BIGINT;

ALTER TABLE "crm"."crm_opportunity_h"
  ADD COLUMN IF NOT EXISTS "owner_user_id" BIGINT;

UPDATE "crm"."crm_opportunity_m" o
SET "owner_user_id" = u."user_id"
FROM "common"."cm_user_m" u
WHERE o."owner_user_id" IS NULL
  AND (
    lower(trim(u."user_name")) = lower(trim(o."owner_name"))
    OR lower(trim(coalesce(u."display_name", ''))) = lower(trim(o."owner_name"))
  );

UPDATE "crm"."crm_opportunity_h" h
SET "owner_user_id" = o."owner_user_id"
FROM "crm"."crm_opportunity_m" o
WHERE h."owner_user_id" IS NULL
  AND h."opportunity_id" = o."opportunity_id";

CREATE INDEX IF NOT EXISTS "ix_crm_opportunity_m_owner_user"
  ON "crm"."crm_opportunity_m" ("owner_user_id");

COMMENT ON COLUMN "crm"."crm_opportunity_m"."owner_user_id" IS 'Platform common.cm_user_m.user_id value for precise CRM opportunity ownership; no cross-schema FK.';
COMMENT ON COLUMN "crm"."crm_opportunity_h"."owner_user_id" IS 'Historical copy of CRM opportunity owner_user_id.';
