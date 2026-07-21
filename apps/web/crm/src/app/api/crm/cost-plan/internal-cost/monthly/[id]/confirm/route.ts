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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(
    createServerApiUrl(`/crm/cost-plan/internal-cost/monthly/${encodeURIComponent(id)}/confirm`),
    createServerApiProxyInit(req, { method: 'POST' }),
  );

  return forwardResponse(response);
}
