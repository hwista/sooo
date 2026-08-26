export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { search } = new URL(req.url);
  const response = await fetch(createServerApiUrl(`/crm/cost-plan/ams/source/vendors/${encodeURIComponent(id)}${search}`), createServerApiProxyInit(req, { method: 'DELETE' }));
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' } });
}
