import { AppLayout } from '@/components/layout';

/**
 * DMS settings deep-link entry.
 *
 * The client-side AppLayout validates the requested surface/section against
 * the canonical settings registry and applies the existing system/personal
 * authorization contract. This route adds reload/bookmark support without
 * duplicating a settings implementation or weakening API authorization.
 */
export default function SettingsEntryPage() {
  return <AppLayout />;
}
