'use client';

import { useLayoutStore, useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types';
import { MainSidebar } from './MainSidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

interface AppLayoutProps {
  children?: React.ReactNode;
}

/**
 * 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 별도 UI (추후 개발)
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { deviceType } = useLayoutStore();
  const { isCollapsed } = useSidebarStore();

  // 모바일은 별도 UI (추후 개발)
  if (deviceType === 'mobile') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8">
          <h1 className="heading-1 mb-2">모바일 버전 준비 중</h1>
          <p className="text-gray-600">데스크톱에서 접속해주세요.</p>
        </div>
      </div>
    );
  }

  const sidebarWidth = isCollapsed
    ? LAYOUT_SIZES.sidebar.collapsedWidth
    : LAYOUT_SIZES.sidebar.expandedWidth;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <MainSidebar />

      {/* Main Content Area */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <Header />

        {/* TabBar */}
        <TabBar />

        {/* Content */}
        <ContentArea>{children}</ContentArea>
      </div>
    </div>
  );
}
