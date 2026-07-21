'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  SsooAppFrame,
  SsooMobileSidebarOverlay,
  useSsooMobileViewport,
} from '@ssoo/web-shell';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { getSnsShellTabOptions } from './shell-navigation';
import { useTabStore } from '@/stores';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobileViewport = useSsooMobileViewport();
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((current) => !current), []);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    openTab(getSnsShellTabOptions(currentPath));
  }, [currentPath, openTab]);

  useEffect(() => {
    if (!isMobileViewport && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, isMobileMenuOpen, isMobileViewport]);

  void children;

  if (isMobileViewport) {
    return (
      <SsooAppFrame
        mode="social"
        sidebarMode="none"
        sidebarSlot={isMobileMenuOpen ? (
          <SsooMobileSidebarOverlay
            id="sns-mobile-sidebar"
            label="SNS 모바일 메뉴"
            onDismiss={closeMobileMenu}
          >
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={closeMobileMenu}
              toggleLabel="모바일 메뉴 닫기"
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
    <SsooAppFrame
      mode="social"
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      sidebarSlot={
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
