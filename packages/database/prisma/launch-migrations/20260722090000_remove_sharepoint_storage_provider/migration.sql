-- SharePoint storage support was retired before launch.
-- Keep local as the durable default and leave NAS opt-in until its mount is configured.
UPDATE "dms"."dm_config_m"
SET
  "config_data" = jsonb_set(
    "config_data" #- '{m365,sharepoint}',
    '{storage}',
    (
      (COALESCE("config_data" -> 'storage', '{}'::jsonb) - 'sharepoint')
      || jsonb_build_object('defaultProvider', 'local')
      || jsonb_build_object(
        'local',
        '{"enabled":true,"basePath":"../../../.runtime/document-storage/local"}'::jsonb
          || COALESCE("config_data" #> '{storage,local}', '{}'::jsonb)
          || '{"enabled":true}'::jsonb
      )
      || jsonb_build_object(
        'nas',
        '{"enabled":false,"basePath":"/mnt/nas/documents","webBaseUrl":"file:///mnt/nas/documents"}'::jsonb
          || COALESCE("config_data" #> '{storage,nas}', '{}'::jsonb)
          || '{"enabled":false}'::jsonb
      )
    ),
    true
  ),
  "updated_at" = NOW()
WHERE "scope_code" = 'system'
  AND "owner_ref" = '_system_';

-- Normalize any legacy personal selection even though no launch-candidate rows
-- currently reference SharePoint.
UPDATE "dms"."dm_config_m"
SET
  "config_data" = jsonb_set(
    "config_data",
    '{workspace,preferredStorageProvider}',
    '"system-default"'::jsonb,
    false
  ),
  "updated_at" = NOW()
WHERE "scope_code" = 'personal'
  AND "config_data" #>> '{workspace,preferredStorageProvider}' = 'sharepoint';

UPDATE "dms"."dm_config_m"
SET
  "config_data" = jsonb_set(
    "config_data",
    '{personal,workspace,preferredStorageProvider}',
    '"system-default"'::jsonb,
    false
  ),
  "updated_at" = NOW()
WHERE "config_data" #>> '{personal,workspace,preferredStorageProvider}' = 'sharepoint';
