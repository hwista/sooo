'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import { SIDEBAR_SECTION_LABELS } from '@/types';
import {
  SidebarSearch,
  SidebarFavorites,
  SidebarOpenTabs,
  SidebarMenuTree,
} from '../sidebar';
import { SECTION_ICONS } from './sidebar-constants';

interface FloatingPanelProps {
  activeSection: SidebarSectionType;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * 플로팅 패널 컴포넌트
 * - 접힌 사이드바에서 hover 시 표시
 */
export function FloatingPanel({
  activeSection,
  onMouseEnter,
  onMouseLeave,
}: FloatingPanelProps) {
  const Icon = SECTION_ICONS[activeSection];

  return (
    <div
      className="fixed left-14 top-[60px] w-72 max-h-[calc(100vh-80px)] bg-white border border-[#9FC1E7] rounded-lg shadow-lg overflow-hidden z-50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 h-control-h border-b border-[#9FC1E7] bg-[#DEE7F1]">
        <Icon className="w-4 h-4 text-[#003876]" />
        <span className="text-sm font-medium text-[#003876]">
          {SIDEBAR_SECTION_LABELS[activeSection]}
        </span>
      </div>

      {/* 내용 */}
      <div className="overflow-y-auto max-h-[calc(100vh-140px)] p-2">
        {activeSection === 'search' && <SidebarSearch />}
        {activeSection === 'favorites' && <SidebarFavorites />}
        {activeSection === 'openTabs' && <SidebarOpenTabs />}
        {activeSection === 'menuTree' && <SidebarMenuTree />}
      </div>
    </div>
  );
}
