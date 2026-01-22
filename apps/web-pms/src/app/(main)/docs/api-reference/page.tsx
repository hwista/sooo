'use client';

import dynamic from 'next/dynamic';

const RedocStandalone = dynamic(
  () => import('redoc').then((mod) => mod.RedocStandalone),
  { ssr: false },
);

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const specUrl = `${apiBaseUrl.replace(/\/$/, '')}/openapi.json`;

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-white">
      <RedocStandalone
        specUrl={specUrl}
        options={{
          hideDownloadButton: true,
          nativeScrollbars: true,
        }}
      />
    </div>
  );
}
