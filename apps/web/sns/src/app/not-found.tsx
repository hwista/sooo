'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_HOME_PATH } from '@/lib/constants/routes';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace(APP_HOME_PATH);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ssoo-background">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-ssoo-primary border-t-transparent" />
        <p className="text-body-sm text-muted-foreground">
          페이지를 찾을 수 없습니다. 기본 화면으로 이동 중...
        </p>
      </div>
    </div>
  );
}
