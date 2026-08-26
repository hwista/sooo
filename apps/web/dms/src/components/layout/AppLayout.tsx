'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
} from '@ssoo/web-auth';
import {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooAppFrame,
  SsooMobileSidebarOverlay,
  getSsooGlobalSearchQueryFromPath,
  getSsooGlobalSearchTitle,
} from '@ssoo/web-shell';
import { HOME_TAB, useAuthStore, useLayoutStore, useSettingsPageNavigationStore, useSettingsStore, useSidebarStore, useTabStore } from '@/stores';
import {
  getSettingsTabOptions,
  parseSettingsTabPath,
} from '@/components/pages/settings/_utils/settingsNavigation';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

/**
 * DMS 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 공용 overlay sidebar + Header + TabBar + Content
 * - Sidebar: 공통 toggle + collapsed hover expand
 *
 * Note: 일반 브라우저 진입점은 `/`를 사용하고,
 * Admin launch-readiness의 공식 운영 설정 deep link만 해당 설정 탭으로 handoff한다.
 * 내부 탭 기반 화면 전환은 ContentArea가 담당한다.
 */
export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const closeMobileMenu = React.useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = React.useCallback(() => setIsMobileMenuOpen((current) => !current), []);
  const sidebarAutoExpandSections = React.useMemo(() => ['bookmarks', 'openTabs', 'changes'] as const, []);
  const { deviceType } = useLayoutStore();
  const { sidebarOpen, toggleSidebar, setExpandedSections } = useSidebarStore();
  const fileTreeResetEpoch = useSidebarStore((state) => state.fileTreeResetEpoch);
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const applyWorkspacePreferences = useSettingsPageNavigationStore((state) => state.applyWorkspacePreferences);
  const isSettingsModeActive = useSettingsPageNavigationStore((state) => state.isActive);
  const openSettingsSection = useSettingsPageNavigationStore((state) => state.openSection);
  const exitSettings = useSettingsPageNavigationStore((state) => state.exitSettings);
  const activeTabPath = useTabStore((state) => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
    return activeTab?.path ?? null;
  });
  const openTab = useTabStore((state) => state.openTab);
  const activateTab = useTabStore((state) => state.activateTab);
  const updateTab = useTabStore((state) => state.updateTab);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRoutePath = React.useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);
  const settingsConfig = useSettingsStore((state) => state.config);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  React.useEffect(() => {
    if (!currentUserId || isSettingsLoaded) return;
    void loadSettings();
  }, [currentUserId, isSettingsLoaded, loadSettings]);

  React.useEffect(() => {
    if (pathname === '/') {
      exitSettings();
      activateTab(HOME_TAB.id);
      return;
    }

    const settingsRoute = parseSettingsTabPath(pathname);
    if (settingsRoute) {
      openSettingsSection(settingsRoute.scope, settingsRoute.sectionId);
      openTab(getSettingsTabOptions(settingsRoute.scope, settingsRoute.sectionId));
      return;
    }

    const userSurfaceRoute = parseSsooUserSurfaceRouteEntry(currentRoutePath);
    if (userSurfaceRoute) {
      openTab({
        id: getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId),
        title: userSurfaceRoute.title,
        path: userSurfaceRoute.path,
        icon: userSurfaceRoute.kind === 'personal-settings' ? 'Settings' : 'User',
        closable: true,
        activate: true,
      });
      return;
    }

    if (!currentRoutePath.startsWith(SSOO_GLOBAL_SEARCH_APP_PATH)) {
      return;
    }

    const query = getSsooGlobalSearchQueryFromPath(currentRoutePath);
    const tabId = openTab({
      id: 'global-search',
      title: getSsooGlobalSearchTitle(query),
      path: currentRoutePath,
      icon: 'Search',
      closable: true,
      activate: true,
    });
    if (tabId) {
      updateTab(tabId, {
        title: getSsooGlobalSearchTitle(query),
        path: currentRoutePath,
        icon: 'Search',
      });
    }
  }, [activateTab, currentRoutePath, exitSettings, openSettingsSection, openTab, pathname, updateTab]);

  React.useEffect(() => {
    const workspace = settingsConfig?.personal.workspace;
    if (!workspace) return;
    applyWorkspacePreferences(workspace);
  }, [applyWorkspacePreferences, settingsConfig]);

  React.useLayoutEffect(() => {
    if (isSettingsModeActive || !activeTabPath) return;
    const settingsTabTarget = parseSettingsTabPath(activeTabPath);
    if (!settingsTabTarget) return;
    openSettingsSection(settingsTabTarget.scope, settingsTabTarget.sectionId);
  }, [activeTabPath, isSettingsModeActive, openSettingsSection]);

  React.useLayoutEffect(() => {
    if (!isSettingsModeActive) return;
    if (activeTabPath && parseSettingsTabPath(activeTabPath)) return;
    exitSettings();
  }, [activeTabPath, exitSettings, isSettingsModeActive]);

  React.useEffect(() => {
    const sections = settingsConfig?.personal.sidebar?.sections;
    if (!sections) return;

    const nextExpandedSections = sidebarAutoExpandSections.filter((section) => sections[section]);

    setExpandedSections([...nextExpandedSections]);
  }, [setExpandedSections, settingsConfig, sidebarAutoExpandSections]);

  React.useEffect(() => {
    if (deviceType !== 'mobile' && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, deviceType, isMobileMenuOpen]);

  // 사용자 변경 시 client-side state 일괄 cleanup 은 `lib/user-scope` 의 registry 가 처리.
  // 각 store 가 자체 등록 → useAuthStore 변경을 zustand subscribe 가 감지 → 모든 listener emit.
  // AppLayout 이 직접 selector/effect 를 보유하지 않음 — 새 store 추가 시 그 store 파일 안에서
  // registerUserScopedReset 한 번 호출로 자동 합류.

  if (deviceType === 'mobile') {
    return (
      <SsooAppFrame
        mode="document"
        sidebarMode="none"
        sidebarSlot={isMobileMenuOpen ? (
          <SsooMobileSidebarOverlay
            id="dms-mobile-sidebar"
            label="DMS 모바일 메뉴"
            onDismiss={closeMobileMenu}
          >
            <Sidebar
              key={`dms-mobile-sidebar-${isSettingsModeActive ? 'settings' : 'workspace'}-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
              variant={isSettingsModeActive ? 'settings' : 'workspace'}
              isCollapsed={false}
              onToggleCollapse={closeMobileMenu}
              toggleLabel="모바일 메뉴 닫기"
            />
          </SsooMobileSidebarOverlay>
        ) : null}
        headerSlot={(
          <Header
            variant={isSettingsModeActive ? 'settings' : 'workspace'}
            mobile
            mobileMenuOpen={isMobileMenuOpen}
            onMobileMenuClick={toggleMobileMenu}
          />
        )}
        tabBarSlot={<TabBar />}
        contentSlot={<ContentArea />}
      />
    );
  }

  return (
    <SsooAppFrame
      mode="document"
      sidebarMode="collapsible"
      sidebarExpanded={sidebarOpen}
      sidebarSlot={
        <Sidebar
          key={`dms-sidebar-${isSettingsModeActive ? 'settings' : 'workspace'}-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
          variant={isSettingsModeActive ? 'settings' : 'workspace'}
          isCollapsed={!sidebarOpen}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<Header variant={isSettingsModeActive ? 'settings' : 'workspace'} />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
