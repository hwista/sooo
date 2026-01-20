'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@ssoo/types';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * 필요한 역할 (OR 조건)
   * 지정하지 않으면 인증만 확인
   */
  roles?: UserRole[];
  /**
   * 권한 없을 때 리다이렉트할 경로
   * @default '/'
   */
  fallbackPath?: string;
  /**
   * 권한 없을 때 표시할 컴포넌트
   * fallbackPath보다 우선
   */
  fallback?: ReactNode;
}

/**
 * 역할 기반 라우트 보호 컴포넌트
 *
 * @example
 * // 인증만 필요
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // admin 역할 필요
 * <ProtectedRoute roles={['admin']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // admin 또는 pm 역할 필요, 권한 없으면 커스텀 UI
 * <ProtectedRoute roles={['admin', 'pm']} fallback={<AccessDenied />}>
 *   <ProjectSettings />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  roles,
  fallbackPath = '/',
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  // 역할 검사 (roles가 없으면 항상 true)
  const hasRequiredRole = !roles || roles.length === 0 || hasRole(...roles);

  useEffect(() => {
    // 로딩 완료 후 검사
    if (isLoading) return;

    // 미인증 또는 권한 없음
    if (!isAuthenticated || !hasRequiredRole) {
      // fallback이 없으면 리다이렉트
      if (!fallback) {
        router.replace(fallbackPath);
      }
    }
  }, [isAuthenticated, isLoading, hasRequiredRole, fallback, fallbackPath, router]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 미인증
  if (!isAuthenticated) {
    return fallback ?? null;
  }

  // 권한 없음
  if (!hasRequiredRole) {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
            <p className="text-gray-500">
              이 페이지는 {roles?.join(', ')} 역할만 접근할 수 있습니다.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
