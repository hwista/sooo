export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function GET(request: Request) {
  const response = await fetch(
    createServerApiUrl('/crm/quote-seller-profile/ci'),
    createServerApiProxyInit(request, { method: 'GET' }),
  );
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': response.headers.get('cache-control') || 'private, no-store',
      ...(response.headers.get('content-disposition')
        ? { 'Content-Disposition': response.headers.get('content-disposition') as string }
        : {}),
    },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type');
  const response = await fetch(
    createServerApiUrl('/crm/quote-seller-profile/ci'),
    createServerApiProxyInit(request, {
      method: 'POST',
      headers: contentType ? { 'Content-Type': contentType } : undefined,
      body: await request.arrayBuffer(),
    }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
