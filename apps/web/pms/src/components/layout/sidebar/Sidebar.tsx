'use client';

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layers,
  Menu,
  RefreshCw,
  Search as SearchIcon,
  Shield,
  Star,
  X,
} from 'lucide-react';
import {
  getSsooAppIdentity,
  SsooSidebarSurface,
  type SsooSidebarIcon,
} from '@ssoo/web-shell';
import { useAccessStore, useMenuStore, useSidebarStore } from '@/stores';
import { Favorites } from './Favorites';
import { OpenTabs } from './OpenTabs';
import { MenuTree } from './MenuTree';
import { AdminMenu } from './AdminMenu';

const PMS_APP_IDENTITY = getSsooAppIdentity('pms');

interface SidebarProps {
  expanded?: boolean;
  width?: number | string;
  collapsedWidth?: number | string;
  toggleIcon?: SsooSidebarIcon;
  toggleLabel?: string;
  onToggleCollapse?: () => void;
  variant?: 'desktop' | 'mobile';
}

/**
 * 사이드바 컴포넌트
 * - 펼침: 검색 + 즐겨찾기 + 열린탭 + 메뉴트리 + 관리자
 * - 접힘: 아이콘만 + hover 시 플로트 패널
 */
export function Sidebar({
  expanded,
  width,
  collapsedWidth,
  toggleIcon,
  toggleLabel,
  onToggleCollapse,
  variant = 'desktop',
}: SidebarProps) {
  const {
    isCollapsed,
    expandedSections,
    searchQuery,
    toggleCollapse,
    toggleSection,
    setSearchQuery,
    clearSearch,
  } = useSidebarStore();

  const isAccessLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);
  const { adminMenus } = useMenuStore();

  const showAdminSection = adminMenus.length > 0;
  const resolvedExpanded = expanded ?? !isCollapsed;
  const resolvedToggleCollapse = onToggleCollapse ?? toggleCollapse;
  const ToggleIcon = toggleIcon ?? (variant === 'mobile' ? X : Menu);

  return (
    <SsooSidebarSurface
      expanded={resolvedExpanded}
      onToggleCollapse={resolvedToggleCollapse}
      toggleIcon={ToggleIcon}
      toggleLabel={toggleLabel}
      width={width}
      collapsedWidth={collapsedWidth}
      brandTitle={PMS_APP_IDENTITY.brandTitle}
      search={{
        inputId: `ssoo-pms-${variant}-navigation-search-input`,
        inputName: `ssoo-pms-${variant}-navigation-search-query`,
        ariaLabel: 'PMS 메뉴 검색',
        value: searchQuery,
        onChange: setSearchQuery,
        onClear: clearSearch,
        railIcon: SearchIcon,
        onRailSelect: () => {
          if (isCollapsed) {
            toggleCollapse();
          }
        },
        clearLabel: '검색어 지우기',
        clearIcon: X,
      }}
      refreshAction={{
        label: '새로고침',
        icon: RefreshCw,
        onClick: hydrateAccess,
        disabled: isAccessLoading,
        loading: isAccessLoading,
      }}
      expandedIcon={ChevronDown}
      collapsedIcon={ChevronRight}
      sections={[
        {
          id: 'favorites',
          title: '즐겨찾기',
          icon: Star,
          expanded: expandedSections.includes('favorites'),
          onToggle: () => toggleSection('favorites'),
          children: <Favorites />,
        },
        {
          id: 'openTabs',
          title: '현재 열린 페이지',
          icon: Layers,
          expanded: expandedSections.includes('openTabs'),
          onToggle: () => toggleSection('openTabs'),
          children: <OpenTabs />,
        },
        {
          id: 'menuTree',
          title: '전체 메뉴',
          icon: FolderTree,
          expanded: expandedSections.includes('menuTree'),
          onToggle: () => toggleSection('menuTree'),
          children: <MenuTree />,
        },
        {
          id: 'admin',
          title: '관리자',
          icon: Shield,
          hidden: !showAdminSection,
          expanded: expandedSections.includes('admin'),
          onToggle: () => toggleSection('admin'),
          children: <AdminMenu />,
        },
      ]}
    />
  );
}
