'use client';

import { Settings } from 'lucide-react';

/**
 * 사이드바 관리자 버튼
 * - 관리자 페이지를 새 창으로 오픈
 * - 권한이 있는 사용자에게만 표시 (추후 구현)
 */
export function SidebarAdmin() {
  const handleOpenAdmin = () => {
    // 관리자 페이지를 새 창으로 오픈
    window.open('/admin', 'admin', 'width=1200,height=800');
  };

  // TODO: 관리자 권한 체크 추가
  const hasAdminAccess = true; // 임시

  if (!hasAdminAccess) return null;

  return (
    <button
      onClick={handleOpenAdmin}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
    >
      <Settings className="w-4 h-4" />
      <span>관리자</span>
    </button>
  );
}
