'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 404 Not Found 페이지
 * - 존재하지 않는 경로 접근 시 자동으로 메인 페이지(/)로 리다이렉트
 * - 메인 페이지의 인증 가드(checkAuth)가 알아서 로그인 여부 판단
 *   - 로그인됨 → 메인 페이지 표시
 *   - 미로그인 → /auth/login으로 리다이렉트
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // 무조건 메인 페이지로 리다이렉트
    // (main)/layout.tsx의 checkAuth가 인증 상태를 판단하여 처리
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">페이지를 찾을 수 없습니다. 메인 페이지로 이동 중...</p>
      </div>
    </div>
  );
}
