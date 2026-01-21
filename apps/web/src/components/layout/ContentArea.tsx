'use client';

import { ReactNode, Suspense, lazy } from 'react';
import { useTabStore } from '@/stores';

// 페이지 컴포넌트 동적 import (Next.js 라우팅에서 제외됨)
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  '/home': lazy(() => import('@/components/pages/home/HomeDashboardPage')),
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

  // Home 탭이 항상 존재하므로 빈 상태는 발생하지 않음
  // activeTab이 없거나 path가 없으면 Home으로 리다이렉트 처리
  if (!activeTab || !activeTab.path) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">탭을 선택하세요.</p>
      </div>
    );
  }

  // 등록되지 않은 페이지 컴포넌트인 경우
  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6">
        <h1 className="heading-1 text-gray-800 mb-4">
          {activeTab.title}
        </h1>
        <p className="text-gray-500">
          페이지 준비 중: {activeTab.path}
        </p>
      </div>
    </div>
  );
}
