'use client';

import type { SidebarSection } from '@/types';
import { SIDEBAR_SECTION_LABELS } from '@/types';
import { SECTION_ICONS } from './sidebar-constants';

interface CollapsedSidebarProps {
  onMouseEnter: (section: SidebarSection) => void;
  onMouseLeave: () => void;
}

/**
 * 접힌 사이드바 (아이콘만)
 */
export function CollapsedSidebar({
  onMouseEnter,
  onMouseLeave,
}: CollapsedSidebarProps) {
  const sections: SidebarSection[] = ['search', 'favorites', 'openTabs', 'menuTree'];
  // TODO: admin 권한 체크 후 'admin' 섹션 추가

  return (
    <div className="flex flex-col items-center py-2 gap-1">
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section];
        return (
          <button
            key={section}
            className="p-3 hover:bg-[#F6FBFF] rounded-lg transition-colors"
            title={SIDEBAR_SECTION_LABELS[section]}
            onMouseEnter={() => onMouseEnter(section)}
            onMouseLeave={onMouseLeave}
          >
            <Icon className="w-5 h-5 text-[#003876]" />
          </button>
        );
      })}
    </div>
  );
}
