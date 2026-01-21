'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * 사이드바 섹션 래퍼 컴포넌트
 * - 접기/펼치기 토글
 * - 아이콘 + 제목
 */
export function SidebarSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
}: SidebarSectionProps) {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-ssoo-sitemap-bg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-ssoo-primary" />
          <span className="text-sm font-medium text-ssoo-primary">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-ssoo-primary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ssoo-primary" />
        )}
      </button>
      {isExpanded && <div className="pb-2">{children}</div>}
    </div>
  );
}
