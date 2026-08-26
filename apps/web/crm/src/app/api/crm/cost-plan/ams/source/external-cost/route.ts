export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function POST(req: Request) {
  const response = await fetch(createServerApiUrl('/crm/cost-plan/ams/source/external-cost'), createServerApiProxyInit(req, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  }));
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' } });
}
