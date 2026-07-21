export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

async function forwardResponse(response: Response) {
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const response = await fetch(
    createServerApiUrl(`/crm/opportunities/owners/lookup${url.search}`),
    createServerApiProxyInit(req, { method: 'GET' }),
  );

  return forwardResponse(response);
}
