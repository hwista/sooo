'use client';

import { useSidebarStore, useMenuStore, useTabStore } from '@/stores';
import { LAYOUT_SIZES, SIDEBAR_SECTION_ICONS, SIDEBAR_SECTION_LABELS, FLOAT_PANEL_CONFIG } from '@/types';
import type { SidebarSection } from '@/types';
import { useState, useRef, useCallback } from 'react';
import {
  Search,
  Star,
  Layers,
  FolderTree,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Menu,
} from 'lucide-react';
import {
  SidebarSearch,
  SidebarFavorites,
  SidebarOpenTabs,
  SidebarMenuTree,
  SidebarAdmin,
} from './sidebar';

const SECTION_ICONS: Record<SidebarSection, React.ComponentType<{ className?: string }>> = {
  search: Search,
  favorites: Star,
  openTabs: Layers,
  menuTree: FolderTree,
  admin: Settings,
};

/**
 * 사이드바 컴포넌트
 * - 펼침: 검색 + 즐겨찾기 + 열린탭 + 메뉴트리 + 관리자
 * - 접힘: 아이콘만 + hover 시 플로트 패널
 */
export function MainSidebar() {
  const {
    isCollapsed,
    activeFloatSection,
    expandedSections,
    toggleCollapse,
    openFloatSection,
    closeFloatSection,
    toggleSection,
  } = useSidebarStore();

  const { isLoading: isMenuLoading, refreshMenu } = useMenuStore();
  const floatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 플로팅 패널 마우스 진입
  const handleMouseEnter = useCallback(
    (section: SidebarSection) => {
      if (floatTimeoutRef.current) {
        clearTimeout(floatTimeoutRef.current);
        floatTimeoutRef.current = null;
      }
      if (isCollapsed) {
        floatTimeoutRef.current = setTimeout(() => {
          openFloatSection(section);
        }, FLOAT_PANEL_CONFIG.openDelay);
      }
    },
    [isCollapsed, openFloatSection]
  );

  // 플로팅 패널 마우스 이탈
  const handleMouseLeave = useCallback(() => {
    if (floatTimeoutRef.current) {
      clearTimeout(floatTimeoutRef.current);
    }
    floatTimeoutRef.current = setTimeout(() => {
      closeFloatSection();
    }, FLOAT_PANEL_CONFIG.closeDelay);
  }, [closeFloatSection]);

  const sidebarWidth = isCollapsed
    ? LAYOUT_SIZES.sidebar.collapsedWidth
    : LAYOUT_SIZES.sidebar.expandedWidth;

  return (
    <>
      <aside
        className="fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-40"
        style={{ width: sidebarWidth }}
      >
        {/* 사이드바 접기/펼치기 버튼 */}
        <div className="flex items-center justify-between h-12 px-2 border-b border-gray-100">
          {!isCollapsed && (
            <span className="font-bold text-lg text-gray-800 pl-2">SSOO</span>
          )}
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? '펼치기' : '접기'}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 사이드바 콘텐츠 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isCollapsed ? (
            // 접힌 상태: 아이콘만
            <CollapsedSidebar
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          ) : (
            // 펼친 상태: 전체 UI
            <ExpandedSidebar
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              onRefresh={refreshMenu}
              isRefreshing={isMenuLoading}
            />
          )}
        </div>
      </aside>

      {/* 플로팅 패널 */}
      {isCollapsed && activeFloatSection && (
        <div
          className="fixed left-14 top-12 w-64 max-h-[calc(100vh-96px)] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
          onMouseEnter={() => {
            if (floatTimeoutRef.current) {
              clearTimeout(floatTimeoutRef.current);
              floatTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            {(() => {
              const Icon = SECTION_ICONS[activeFloatSection];
              return <Icon className="w-4 h-4 text-gray-600" />;
            })()}
            <span className="text-sm font-medium text-gray-700">
              {SIDEBAR_SECTION_LABELS[activeFloatSection]}
            </span>
          </div>

          {/* 내용 */}
          <div className="overflow-y-auto max-h-[calc(100vh-144px)] p-2">
            {activeFloatSection === 'search' && <SidebarSearch />}
            {activeFloatSection === 'favorites' && <SidebarFavorites />}
            {activeFloatSection === 'openTabs' && <SidebarOpenTabs />}
            {activeFloatSection === 'menuTree' && <SidebarMenuTree />}
          </div>
        </div>
      )}
    </>
  );
}

// 접힌 사이드바 (아이콘만)
function CollapsedSidebar({
  onMouseEnter,
  onMouseLeave,
}: {
  onMouseEnter: (section: SidebarSection) => void;
  onMouseLeave: () => void;
}) {
  const sections: SidebarSection[] = ['search', 'favorites', 'openTabs', 'menuTree'];
  // TODO: admin 권한 체크 후 'admin' 섹션 추가

  return (
    <div className="flex flex-col items-center py-2 gap-1">
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section];
        return (
          <button
            key={section}
            className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
            title={SIDEBAR_SECTION_LABELS[section]}
            onMouseEnter={() => onMouseEnter(section)}
            onMouseLeave={onMouseLeave}
          >
            <Icon className="w-5 h-5 text-gray-600" />
          </button>
        );
      })}
    </div>
  );
}

// 펼친 사이드바 (전체 UI)
function ExpandedSidebar({
  expandedSections,
  onToggleSection,
  onRefresh,
  isRefreshing,
}: {
  expandedSections: SidebarSection[];
  onToggleSection: (section: SidebarSection) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="flex flex-col">
      {/* 검색 + 새로고침 */}
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <SidebarSearch />
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="메뉴 새로고침"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 즐겨찾기 */}
      <SidebarSection
        section="favorites"
        title="즐겨찾기"
        icon={Star}
        isExpanded={expandedSections.includes('favorites')}
        onToggle={() => onToggleSection('favorites')}
      >
        <SidebarFavorites />
      </SidebarSection>

      {/* 현재 열린 페이지 */}
      <SidebarSection
        section="openTabs"
        title="현재 열린 페이지"
        icon={Layers}
        isExpanded={expandedSections.includes('openTabs')}
        onToggle={() => onToggleSection('openTabs')}
      >
        <SidebarOpenTabs />
      </SidebarSection>

      {/* 전체 메뉴 */}
      <SidebarSection
        section="menuTree"
        title="전체 메뉴"
        icon={FolderTree}
        isExpanded={expandedSections.includes('menuTree')}
        onToggle={() => onToggleSection('menuTree')}
      >
        <SidebarMenuTree />
      </SidebarSection>

      {/* 관리자 페이지 (추후 개발) */}
      {/* <SidebarAdmin /> */}
    </div>
  );
}

// 섹션 래퍼 컴포넌트
function SidebarSection({
  section,
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
}: {
  section: SidebarSection;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && <div className="pb-2">{children}</div>}
    </div>
  );
}
