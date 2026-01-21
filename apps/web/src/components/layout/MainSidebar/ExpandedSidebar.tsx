'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import { Star, Layers, FolderTree, RefreshCw } from 'lucide-react';
import {
  SidebarSearch,
  SidebarFavorites,
  SidebarOpenTabs,
  SidebarMenuTree,
} from '../sidebar';
import { SidebarSection } from './SidebarSection';

interface ExpandedSidebarProps {
  expandedSections: SidebarSectionType[];
  onToggleSection: (section: SidebarSectionType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * 펼친 사이드바 (전체 UI)
 */
export function ExpandedSidebar({
  expandedSections,
  onToggleSection,
  onRefresh,
  isRefreshing,
}: ExpandedSidebarProps) {
  return (
    <div className="flex flex-col">
      {/* 검색 + 새로고침 */}
      <div className="p-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <SidebarSearch />
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-ssoo-sitemap-bg rounded-lg transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw
              className={`w-4 h-4 text-ssoo-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 즐겨찾기 */}
      <SidebarSection
        title="즐겨찾기"
        icon={Star}
        isExpanded={expandedSections.includes('favorites')}
        onToggle={() => onToggleSection('favorites')}
      >
        <SidebarFavorites />
      </SidebarSection>

      {/* 현재 열린 페이지 */}
      <SidebarSection
        title="현재 열린 페이지"
        icon={Layers}
        isExpanded={expandedSections.includes('openTabs')}
        onToggle={() => onToggleSection('openTabs')}
      >
        <SidebarOpenTabs />
      </SidebarSection>

      {/* 전체 메뉴 */}
      <SidebarSection
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
