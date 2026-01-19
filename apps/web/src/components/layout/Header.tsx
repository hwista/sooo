'use client';

import { useSidebarStore } from '@/stores';
import { Menu, Plus, Bell, User, ChevronDown } from 'lucide-react';

/**
 * 상단 헤더 컴포넌트
 * - 로고
 * - 햄버거 메뉴 (사이드바 토글)
 * - 빠른 생성 버튼
 * - 알림
 * - 사용자 프로필
 */
export function Header() {
  const { isCollapsed, toggleCollapse } = useSidebarStore();

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-white border-b border-gray-200">
      {/* 왼쪽: 로고 + 햄버거 */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-gray-800">SSOO</span>
        </div>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div className="flex items-center gap-2">
        {/* 빠른 생성 */}
        <button
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>새 프로젝트</span>
        </button>

        {/* 알림 */}
        <button
          className="relative p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="알림"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {/* 알림 뱃지 (임시) */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 사용자 프로필 */}
        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </header>
  );
}
