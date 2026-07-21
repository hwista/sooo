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
  const response = await fetch(
    createServerApiUrl('/crm/customers/access/me'),
    createServerApiProxyInit(req, { method: 'GET' }),
  );

  return forwardResponse(response);
}
