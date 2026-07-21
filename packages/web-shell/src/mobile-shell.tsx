'use client';

import {
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Button, POPUP_BACKDROP_TONE_CLASS } from '@ssoo/web-ui';
import { cn } from './cn';
import { SSOO_SHELL_METRICS } from './shell-metrics';

const MOBILE_VIEWPORT_QUERY = `(max-width: ${SSOO_SHELL_METRICS.breakpoint.mobile - 1}px)`;

function subscribeToMobileViewport(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getMobileViewportSnapshot(): boolean {
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}

function getServerMobileViewportSnapshot(): boolean {
  return false;
}

/**
 * Returns the canonical SSOO mobile breakpoint state without installing one
 * resize listener per component. The server snapshot remains desktop-shaped
 * so hydration is deterministic; the client snapshot is applied immediately.
 */
export function useSsooMobileViewport(): boolean {
  return useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerMobileViewportSnapshot
  );
}

export interface SsooMobileSidebarOverlayProps {
  id: string;
  onDismiss: () => void;
  children: ReactNode;
  label?: string;
  className?: string;
}

/** Canonical modal sidebar wrapper for mobile workbench navigation. */
export function SsooMobileSidebarOverlay({
  id,
  onDismiss,
  children,
  label = '모바일 메뉴',
  className,
}: SsooMobileSidebarOverlayProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={cn('md:hidden', className)}
    >
      <Button
        variant="plain"
        size="plain"
        type="button"
        aria-label="모바일 메뉴 닫기"
        className={cn(
          'fixed inset-0 z-30 block h-full w-full cursor-default p-0',
          POPUP_BACKDROP_TONE_CLASS
        )}
        onClick={onDismiss}
      />
      {children}
    </div>
  );
}
