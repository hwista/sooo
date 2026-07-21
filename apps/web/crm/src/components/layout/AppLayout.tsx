'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
} from '@ssoo/web-auth';
import {
  getSsooAppIdentity,
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarSurface,
  SsooSidebarTreeStatusBadge,
  SsooAppFrame,
  SsooMobileSidebarOverlay,
  SsooWorkbenchShell,
  useSsooMobileViewport,
} from '@ssoo/web-shell';
import {
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderTree,
  Handshake,
  Layers,
  LineChart,
  Menu,
  PieChart,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  Star,
  UsersRound,
  X,
} from 'lucide-react';
import { CRM_HOME_TAB, useTabStore } from '@/stores/tab.store';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { Header } from './Header';

const CRM_APP_IDENTITY = getSsooAppIdentity('crm');

const menuItems = [
  { label: '영업기회', path: '/', icon: BarChart3, hasChildren: false, disabled: false },
  { label: '고객/활동', path: '/customers', icon: UsersRound, hasChildren: false, disabled: false },
  { label: '견적 설정', path: '/quote-settings', icon: FileText, hasChildren: false, disabled: false },
  { label: '계약 원장', path: '/contracts', icon: CircleDollarSign, hasChildren: false, disabled: false },
  { label: '계약대비실적', path: '/contract-performance', icon: BarChart3, hasChildren: false, disabled: false },
  { label: '보고 Preview', path: '/reports', icon: PieChart, hasChildren: false, disabled: false },
  { label: '사업계획 Preview', path: '/business-plan', icon: ClipboardList, hasChildren: false, disabled: false },
  { label: '사업계획대비실적 Preview', path: '/business-plan-performance', icon: LineChart, hasChildren: false, disabled: false },
  { label: '원가/AMS Preview', path: '/cost-plan', icon: Calculator, hasChildren: false, disabled: false },
  { label: '운영 기준 Preview', path: '/operations', icon: SlidersHorizontal, hasChildren: false, disabled: false },
  { label: 'PMS 인계', icon: Handshake, active: false, hasChildren: true, disabled: true },
  { label: '공용 Admin', icon: ShieldCheck, active: false, hasChildren: false, disabled: true },
  { label: '설정', icon: Settings, active: false, hasChildren: false, disabled: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
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
    const userSurfaceRoute = parseSsooUserSurfaceRouteEntry(currentPath);
    if (userSurfaceRoute) {
      openTab({
        id: getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId),
        title: userSurfaceRoute.title,
        path: userSurfaceRoute.path,
        closable: true,
      });
      return;
    }

    openTab({
      id: CRM_HOME_TAB.id,
      title: CRM_HOME_TAB.title,
      path: currentPath || CRM_HOME_TAB.path,
      closable: false,
    });
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
        mode="workbench"
        sidebarMode="none"
        sidebarSlot={isMobileMenuOpen ? (
          <SsooMobileSidebarOverlay
            id="crm-mobile-sidebar"
            label="CRM 모바일 메뉴"
            onDismiss={closeMobileMenu}
          >
            <CrmSidebar
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
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      sidebarSlot={
        <CrmSidebar
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

function CrmSidebar({
  isCollapsed,
  onToggleCollapse,
  toggleLabel,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  toggleLabel?: string;
}) {
  const router = useRouter();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const activateTab = useTabStore((state) => state.activateTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    openTabs: false,
    menuTree: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      toggleLabel={toggleLabel}
      brandTitle={CRM_APP_IDENTITY.brandTitle}
      search={{
        value: searchQuery,
        onChange: setSearchQuery,
        railIcon: Search,
        onRailSelect: () => {
          if (isCollapsed) {
            onToggleCollapse();
          }
        },
        clearLabel: '검색어 지우기',
        clearIcon: X,
      }}
      refreshAction={{
        label: '새로고침',
        icon: RefreshCw,
        onClick: () => router.refresh(),
      }}
      expandedIcon={ChevronDown}
      collapsedIcon={ChevronRight}
      sections={[
        {
          id: 'favorites',
          title: '즐겨찾기',
          icon: Star,
          expanded: expandedSections.favorites,
          onToggle: () => toggleSection('favorites'),
          children: <SsooSidebarEmptyState>즐겨찾기한 메뉴가 없습니다.</SsooSidebarEmptyState>,
        },
        {
          id: 'openTabs',
          title: '현재 열린 페이지',
          icon: Layers,
          expanded: expandedSections.openTabs,
          onToggle: () => toggleSection('openTabs'),
          children: tabs.filter((tab) => tab.id !== CRM_HOME_TAB.id).length > 0 ? (
            <SsooSidebarSearchableTree<(typeof tabs)[number]>
              nodes={tabs.filter((tab) => tab.id !== CRM_HOME_TAB.id)}
              getNodeId={(tab) => tab.id}
              getNodeLabel={(tab) => tab.title}
              getNodeTitle={(tab) => tab.title}
              getNodeSearchText={(tab) => [tab.title, tab.path]}
              getNodeIcon={() => BarChart3}
              isNodeActive={(tab) => tab.id === activeTabId}
              onNodeSelect={(tab) => activateTab(tab.id)}
              disclosureIcon={ChevronRight}
              emptyState={<SsooSidebarEmptyState>열린 페이지가 없습니다.</SsooSidebarEmptyState>}
            />
          ) : (
            <SsooSidebarEmptyState>열린 페이지가 없습니다.</SsooSidebarEmptyState>
          ),
        },
        {
          id: 'menuTree',
          title: '전체 메뉴',
          icon: FolderTree,
          expanded: expandedSections.menuTree,
          onToggle: () => toggleSection('menuTree'),
          children: (
            <SsooSidebarSearchableTree<(typeof menuItems)[number]>
              nodes={menuItems}
              getNodeId={(item) => item.label}
              getNodeLabel={(item) => item.label}
              getNodeTitle={(item) => item.label}
              getNodeSearchText={(item) => item.label}
              isNodeFolder={(item) => item.hasChildren}
              isNodeActive={(item) => Boolean('path' in item && activeTab?.path.split('?')[0] === item.path)}
              isNodeDisabled={(item) => item.disabled}
              getNodeIcon={(item) => item.icon}
              renderNodeTrailingAction={(item) => (
                item.disabled ? <SsooSidebarTreeStatusBadge>준비 중</SsooSidebarTreeStatusBadge> : null
              )}
              onNodeSelect={(item) => {
                if ('path' in item && item.path) {
                  openTab({
                    id: item.path === CRM_HOME_TAB.path ? CRM_HOME_TAB.id : item.path,
                    title: item.path === CRM_HOME_TAB.path ? CRM_HOME_TAB.title : item.label,
                    path: item.path,
                    closable: item.path !== CRM_HOME_TAB.path,
                  });
                }
              }}
              disclosureIcon={ChevronRight}
              emptyState={<SsooSidebarEmptyState>메뉴가 없습니다.</SsooSidebarEmptyState>}
            />
          ),
        },
      ]}
    />
  );
}
