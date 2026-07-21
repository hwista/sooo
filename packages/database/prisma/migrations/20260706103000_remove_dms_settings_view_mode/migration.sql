-- DMS settings are edited through structured forms. Remove legacy UI mode
-- preference keys that previously selected structured/json/diff views.
UPDATE "dms"."dm_config_m"
SET "config_data" = "config_data" #- '{workspace,defaultSettingsView}' #- '{workspace,showDiffByDefault}'
WHERE "scope_code" = 'personal'
  AND "config_data" ? 'workspace';

UPDATE "dms"."dm_config_m"
SET "config_data" = jsonb_set(
  "config_data",
  '{personal,workspace}',
  (COALESCE("config_data" #> '{personal,workspace}', '{}'::jsonb) - 'defaultSettingsView' - 'showDiffByDefault'),
  true
)
WHERE "config_data" #> '{personal,workspace}' IS NOT NULL;
