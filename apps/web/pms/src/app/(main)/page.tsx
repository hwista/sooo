'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then((mod) => ({ default: mod.AppLayout })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-ssoo-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-ssoo-primary border-t-transparent" />
          <p className="text-ssoo-primary/70">로딩 중...</p>
        </div>
      </div>
    ),
  },
);

/**
 * 메인 셸 페이지 (/)
 *
 * - shell-app blueprint 기준으로 실제 루트 셸 엔트리를 담당한다.
 * - 실제 콘텐츠 렌더링은 AppLayout > ContentArea가 담당한다.
 */
export default function MainPage() {
  return <AppLayout />;
}
