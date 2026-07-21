'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import { useAccessStore, useAuthStore } from '@/stores';
import { LOGIN_PATH } from '@/lib/constants/routes';

const AppLayout = dynamic(
  () =>
    import('@/components/layout/AppLayout').then((mod) => ({
      default: mod.AppLayout,
    })),
  {
    loading: () => <AuthLoadingScreen />,
  }
);

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const accessHasLoaded = useAccessStore((state) => state.hasLoaded);
  const accessIsLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);
  const resetAccess = useAccessStore((state) => state.reset);
  const router = useRouter();
  const redirectToLogin = useCallback((currentPath: string) => {
    const returnTo = currentPath && currentPath !== LOGIN_PATH
      ? `?returnTo=${encodeURIComponent(currentPath)}`
      : '';
    router.replace(`${LOGIN_PATH}${returnTo}`);
  }, [router]);

  const { showLoading, shouldRender } = useProtectedAppBootstrap({
    hasHydrated,
    isAuthenticated,
    authIsLoading,
    accessHasLoaded,
    accessIsLoading,
    checkAuth,
    hydrateAccess,
    resetAccess,
    onUnauthenticated: redirectToLogin,
  });

  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  if (!shouldRender) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
