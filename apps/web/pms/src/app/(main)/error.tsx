'use client';

import { useEffect } from 'react';
import { Button } from '@ssoo/web-ui';

/**
 * (main) 그룹 에러 바운더리
 * 
 * 인증 후 영역에서 발생하는 에러를 포착.
 * ChunkLoadError → 자동 새로고침, 그 외 → 복구 UI 제공
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = error.name === 'ChunkLoadError'
    || error.message?.includes('Loading chunk')
    || error.message?.includes('Failed to fetch dynamically imported module');

  // ChunkLoadError 자동 새로고침 (1회)
  useEffect(() => {
    if (isChunkError && typeof window !== 'undefined') {
      const retryKey = 'main-chunk-retry';
      const lastRetry = sessionStorage.getItem(retryKey);
      const now = Date.now();

      if (!lastRetry || now - Number(lastRetry) > 10_000) {
        sessionStorage.setItem(retryKey, String(now));
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ssoo-background">
      <div className="max-w-md px-6 text-center">
        <div className="mb-4 text-5xl">⚠️</div>
        <h2 className="mb-2 text-title-card text-ssoo-primary">
          {isChunkError ? '페이지 로딩 실패' : '오류가 발생했습니다'}
        </h2>
        <p className="mb-6 text-body-sm text-ssoo-primary/65">
          {isChunkError
            ? '페이지 리소스를 불러오는 데 실패했습니다.'
            : '예기치 않은 오류가 발생했습니다. 다시 시도해주세요.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
          >
            새로고침
          </Button>
          <Button
            variant="outline"
            onClick={reset}
          >
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  );
}
