export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

function forwardResponse(response: Response) {
  return response.text().then((body) => new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  }));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const response = await fetch(
    createServerApiUrl(`/crm/customers${url.search}`),
    createServerApiProxyInit(req, { method: 'GET' }),
  );

  return forwardResponse(response);
}

export async function POST(req: Request) {
  const body = await req.text();
  const response = await fetch(
    createServerApiUrl('/crm/customers'),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body || undefined,
    }),
  );

  return forwardResponse(response);
}
