'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
} from '@ssoo/web-auth';
import {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SSOO_SHELL_METRICS,
  SsooAppFrame,
  SsooMobileSidebarOverlay,
  SsooWorkbenchShell,
  getSsooGlobalSearchQueryFromPath,
  getSsooGlobalSearchTitle,
} from '@ssoo/web-shell';
import { SETTINGS_PATH } from '@/lib/constants/routes';
import { useLayoutStore, useSidebarStore, useTabStore } from '@/stores';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

/**
 * 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: Header + TabBar + Content + overlay sidebar
 * - 탭 시스템 전용: URL 직접 접근 미지원
 */
export function AppLayout() {
  const {
    deviceType,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  } = useLayoutStore();
  const { isCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const userSurfaceRoute = parseSsooUserSurfaceRouteEntry(currentPath);
    if (userSurfaceRoute) {
      const tabId = getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId);
      openTab({
        menuCode: tabId,
        menuId: tabId,
        title: userSurfaceRoute.title,
        path: userSurfaceRoute.path,
        icon: userSurfaceRoute.kind === 'personal-settings' ? 'Settings' : 'User',
        closable: true,
        activate: true,
      });
      return;
    }

    if (!currentPath.startsWith(SSOO_GLOBAL_SEARCH_APP_PATH)) {
      if (currentPath === SETTINGS_PATH) {
        openTab({
          menuCode: 'PMS-SETTINGS',
          menuId: 'pms-settings',
          title: '설정',
          path: SETTINGS_PATH,
          icon: 'Settings',
          closable: true,
          activate: true,
        });
      }
      return;
    }

    const query = getSsooGlobalSearchQueryFromPath(currentPath);
    openTab({
      menuCode: 'PMS-GLOBAL-SEARCH',
      menuId: 'pms-global-search',
      title: getSsooGlobalSearchTitle(query),
      path: currentPath,
      icon: 'Search',
      params: query ? { q: query } : undefined,
      closable: true,
      activate: true,
    });
  }, [currentPath, openTab]);

  useEffect(() => {
    if (deviceType === 'desktop' && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, deviceType, isMobileMenuOpen]);

  if (deviceType === 'mobile') {
    const mobileSidebarWidth = `min(${SSOO_SHELL_METRICS.sidebar.expandedWidth}px, calc(100vw - 32px))`;

    return (
      <SsooAppFrame
        mode="workbench"
        sidebarMode="none"
        sidebarSlot={isMobileMenuOpen ? (
          <SsooMobileSidebarOverlay
            id="pms-mobile-sidebar"
            onDismiss={closeMobileMenu}
            label="PMS 모바일 메뉴"
          >
            <Sidebar
              expanded
              width={mobileSidebarWidth}
              onToggleCollapse={closeMobileMenu}
              toggleLabel="모바일 메뉴 닫기"
              variant="mobile"
            />
          </SsooMobileSidebarOverlay>
        ) : null}
        headerSlot={(
          <Header
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
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isCollapsed}
      sidebarSlot={<Sidebar />}
      headerSlot={<Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
