'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import {
  AuthUserMenu,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  useSharedLogout,
  type SsooUserSurfaceTabKind,
} from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore, useSettingsPageNavigationStore, useSettingsStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { getSettingsTabOptions } from '@/components/pages/settings/_utils/settingsNavigation';

interface UserMenuProps {
  /** 드롭다운 너비 (부모 액션 영역 기준) */
  dropdownWidth?: number;
}

export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessFeatures = useAccessStore((state) => state.snapshot?.features);
  const canManageSettings = accessFeatures?.canManageSettings ?? false;
  const canUseAccessCenter = Boolean(accessFeatures?.canReadDocuments || accessFeatures?.canUseSearch);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const applyWorkspacePreferences = useSettingsPageNavigationStore((state) => state.applyWorkspacePreferences);
  const enterSettings = useSettingsPageNavigationStore((state) => state.enterSettings);
  const openSection = useSettingsPageNavigationStore((state) => state.openSection);
  const openSettingsTab = useOpenTabWithConfirm();

  const openUserSurfaceTab = async (kind: SsooUserSurfaceTabKind) => {
    await openSettingsTab({
      id: getSsooUserSurfaceTabId(kind),
      title: getSsooUserSurfaceTabTitle(kind),
      icon: kind === 'personal-settings' ? 'Settings' : 'User',
      path: getSsooUserSurfaceTabPath(kind),
      closable: true,
      activate: true,
    });
  };

  const openSettingsSection = async (scope: 'system' | 'personal', sectionId: string) => {
    await loadSettings();
    const settingsState = useSettingsStore.getState();
    if (settingsState.config?.personal.workspace) {
      applyWorkspacePreferences(settingsState.config.personal.workspace);
    }
    enterSettings(scope);
    openSection(scope, sectionId);
    await openSettingsTab(getSettingsTabOptions(scope, sectionId));
  };

  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
      userSurfaces={{
        myProfile: { onSelect: () => openUserSurfaceTab('my-profile') },
        personalSettings: { onSelect: () => openUserSurfaceTab('personal-settings') },
      }}
      actions={[
        ...(canManageSettings
          ? [
              {
                key: 'dms-system-settings',
                label: '문서 시스템 설정',
                icon: Settings,
                onSelect: () => openSettingsSection('system', 'storage'),
              },
              {
                key: 'dms-operations',
                label: '문서 운영·진단',
                icon: Settings,
                onSelect: () => openSettingsSection('system', 'git'),
              },
              {
                key: 'dms-management',
                label: '문서 관리',
                icon: Settings,
                onSelect: () => openSettingsSection('system', 'documentAccess'),
              },
            ]
          : []),
        {
          key: 'dms-personal-settings',
          label: '내 문서 환경 설정',
          icon: Settings,
          disabled: !(canManageSettings || canUseAccessCenter),
          onSelect: () => openSettingsSection('personal', 'identity'),
        },
      ]}
    />
  );
}
