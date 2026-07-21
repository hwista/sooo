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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(
    createServerApiUrl(`/crm/customers/${encodeURIComponent(id)}`),
    createServerApiProxyInit(_req, { method: 'GET' }),
  );

  return forwardResponse(response);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  const response = await fetch(
    createServerApiUrl(`/crm/customers/${encodeURIComponent(id)}`),
    createServerApiProxyInit(req, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body || undefined,
    }),
  );

  return forwardResponse(response);
}
