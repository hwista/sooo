export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(createServerApiUrl(`/crm/cost-plan/ams/source/vendors/${encodeURIComponent(id)}/wbs`), createServerApiProxyInit(req, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  }));
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' } });
}
