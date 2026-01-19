'use client';

import { useSidebarStore } from '@/stores';
import { Search } from 'lucide-react';

/**
 * 사이드바 메뉴 검색
 * - 입력 시 실시간 필터링
 */
export function SidebarSearch() {
  const { searchQuery, setSearchQuery, clearSearch } = useSidebarStore();

  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="메뉴 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-control-h pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003876] focus:border-transparent"
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
    </div>
  );
}
