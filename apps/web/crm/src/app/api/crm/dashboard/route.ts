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
  const response = await fetch(
    createServerApiUrl('/crm/dashboard'),
    createServerApiProxyInit(req, { method: 'GET' }),
  );

  return forwardResponse(response);
}
