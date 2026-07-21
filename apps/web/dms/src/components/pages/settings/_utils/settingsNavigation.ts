'use client';

import type { OpenTabOptions } from '@/types/tab';
import type { SettingsScope, SettingsSurfaceId } from '@/types/settings';
import {
  getSettingSection,
  SETTING_SECTIONS,
  SETTINGS_SECTION_GROUP_LABELS,
} from '../_config/settingsPageConfig';

export const SETTINGS_TAB_PATH_PREFIX = '/settings/';

export interface SettingsTabTarget {
  surface: SettingsSurfaceId;
  scope: SettingsScope;
  sectionId: string;
}

function getFallbackSurface(scope: SettingsScope): SettingsSurfaceId {
  return scope === 'personal' ? 'personal-settings' : 'system-settings';
}

export function getSettingsTabId(scope: SettingsScope, sectionId: string) {
  const section = getSettingSection(scope, sectionId);
  const surface = section?.surface ?? getFallbackSurface(scope);
  return `settings-${surface}-${sectionId}`;
}

export function getSettingsTabPath(scope: SettingsScope, sectionId: string) {
  const section = getSettingSection(scope, sectionId);
  const surface = section?.surface ?? getFallbackSurface(scope);
  return `${SETTINGS_TAB_PATH_PREFIX}${surface}/${sectionId}`;
}

export function parseSettingsTabPath(path: string): SettingsTabTarget | null {
  if (!path.startsWith(SETTINGS_TAB_PATH_PREFIX)) {
    return null;
  }

  const [, , scopeOrSurface, sectionId] = path.split('/');
  const section = SETTING_SECTIONS.find((candidate) => (
    candidate.id === sectionId
    && (candidate.surface === scopeOrSurface || candidate.scope === scopeOrSurface)
  ));

  if (section) {
    return {
      surface: section.surface,
      scope: section.scope,
      sectionId,
    };
  }

  const scope = scopeOrSurface;
  if ((scope !== 'system' && scope !== 'personal') || !sectionId) {
    return null;
  }

  return { surface: getFallbackSurface(scope), scope, sectionId };
}

export function isSettingsTabPath(path: string) {
  return path === '/settings' || parseSettingsTabPath(path) !== null;
}

export function getSettingsTabOptions(scope: SettingsScope, sectionId: string): OpenTabOptions {
  const section = getSettingSection(scope, sectionId);

  return {
    id: getSettingsTabId(scope, sectionId),
    title: section?.label ?? SETTINGS_SECTION_GROUP_LABELS[scope === 'personal' ? 'personal' : 'system'],
    path: getSettingsTabPath(scope, sectionId),
    icon: 'Settings',
    closable: true,
    activate: true,
  };
}
