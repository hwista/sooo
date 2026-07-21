export type SettingsScope = 'system' | 'personal';

export type SettingsSurfaceId =
  | 'system-settings'
  | 'operations'
  | 'management'
  | 'personal-settings';

export type SettingsProfileKey = 'anonymous' | (string & {});

export type SettingsAccessMode = 'anonymous-first';
