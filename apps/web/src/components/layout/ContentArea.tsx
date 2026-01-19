'use client';

import { ReactNode, Suspense, lazy } from 'react';
import { useTabStore } from '@/stores';

// 페이지 컴포넌트 동적 import (Next.js 라우팅에서 제외됨)
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/request/customer': lazy(() => import('@/components/pages/request/customer/CustomerRequestListPage')),
  '/request/customer/create': lazy(() => import('@/components/pages/request/customer/CustomerRequestCreatePage')),
};

interface ContentAreaProps {
  children?: ReactNode;
}

/**
 * 메인 콘텐츠 영역
 * - 활성화된 탭의 컨텐츠 표시
 * - 탭이 없을 때 빈 상태 표시
 */
export function ContentArea({ children }: ContentAreaProps) {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // activeTab이 있으면 해당 페이지 컴포넌트를 렌더링
  if (activeTab && activeTab.path) {
    const PageComponent = pageComponents[activeTab.path];
    
    if (PageComponent) {
      return (
        <div className="flex-1 overflow-auto bg-white">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">페이지 로딩 중...</p>
              </div>
            </div>
          }>
            <PageComponent />
          </Suspense>
        </div>
      );
    }
  }

  // children이 있으면 렌더링 (Next.js 라우팅 지원 - 직접 URL 접근용)
  if (children) {
    return (
      <div className="flex-1 overflow-auto bg-white">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">페이지 로딩 중...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </div>
    );
  }

  // 열린 탭이 없을 때
  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-gray-500">좌측 메뉴에서 원하는 항목을 선택하세요.</p>
        </div>
      </div>
    );
  }

  // activeTab이 없으면 탭 선택 안내
  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">탭을 선택하세요.</p>
      </div>
    );
  }

  // Placeholder for tab content
  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6">
        <h1 className="heading-1 text-gray-800 mb-4">
          {activeTab.title}
        </h1>
        <p className="text-gray-500">
          경로: {activeTab.path}
        </p>
      </div>
    </div>
  );
}
