'use client';

import { useEffect } from 'react';
import { useMenuStore, useTabStore } from '@/stores';

/**
 * 메인 페이지 (대시보드)
 * - 로그인 후 기본 진입 페이지
 * - 메뉴 데이터 로드
 */
export default function MainPage() {
  const { refreshMenu, isLoading } = useMenuStore();
  const { tabs } = useTabStore();

  // 메뉴 데이터 초기 로드
  useEffect(() => {
    refreshMenu();
  }, [refreshMenu]);

  // 탭이 없으면 대시보드 안내 표시
  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">메뉴를 불러오는 중...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                SSOO에 오신 것을 환영합니다
              </h2>
              <p className="text-gray-500">
                좌측 메뉴에서 원하는 항목을 선택하세요.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // 탭이 있으면 ContentArea가 처리
  return null;
}
