import type { DeepPartialClient, DmsSettingsConfigClient } from '@/lib/api/endpoints/settings';
import { getNestedValue, setNestedValue } from '@/lib/utils/objectPath';
import type { SettingItem, SettingSection } from '../_config/settingsPageConfig';

export { getNestedValue, setNestedValue };

export function isRelativePath(pathText: string): boolean {
  if (!pathText.trim()) return false;
  if (pathText.startsWith('/') || pathText.startsWith('~')) return false;
  if (/^[A-Za-z]:[\\/]/.test(pathText)) return false;
  return true;
}

function buildSettingItemMap(sections: SettingSection[]) {
  const map = new Map<string, SettingItem>();
  sections.forEach((section) => {
    section.items.forEach((item) => {
      map.set(item.key, item);
    });
  });
  return map;
}

export function buildKeyToLabelMap(sections: SettingSection[]) {
  const map = new Map<string, string>();
  sections.forEach((section) => {
    section.items.forEach((item) => {
      map.set(item.key, item.label);
    });
  });
  return map;
}

export function getModifiedKeys(
  sections: SettingSection[],
  localConfig: Record<string, unknown>,
  originalConfig: Record<string, unknown>
) {
  const keys: string[] = [];
  sections.forEach((section) => {
    section.items.forEach((item) => {
      const localValue = getNestedValue(localConfig, item.key);
      const originalValue = getNestedValue(originalConfig, item.key);
      if (localValue !== originalValue) {
        keys.push(item.key);
      }
    });
  });
  return keys;
}

export function getValidationErrors(
  sections: SettingSection[],
  localConfig: Record<string, unknown>
) {
  const errors: Record<string, string> = {};
  sections.forEach((section) => {
    section.items.forEach((item) => {
      if (!item.validate) return;
      const value = getNestedValue(localConfig, item.key);
      const message = item.validate(value);
      if (message) {
        errors[item.key] = message;
      }
    });
  });
  return errors;
}

export function buildSettingsUpdatePayload(
  modifiedKeys: string[],
  localConfig: Record<string, unknown>,
  sections: SettingSection[]
): DeepPartialClient<DmsSettingsConfigClient> {
  const itemMap = buildSettingItemMap(sections);
  let partial: Record<string, unknown> = {};

  modifiedKeys.forEach((key) => {
    const item = itemMap.get(key);
    const rawValue = getNestedValue(localConfig, key);
    const value = item?.coerce ? item.coerce(rawValue) : rawValue;
    partial = setNestedValue(partial, key, value);
  });

  return partial as DeepPartialClient<DmsSettingsConfigClient>;
}
