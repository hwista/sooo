export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; rowCode: string }> }) {
  const { id, rowCode } = await params;
  const response = await fetch(
    createServerApiUrl(`/crm/business-plan/plans/${encodeURIComponent(id)}/rows/${encodeURIComponent(rowCode)}/wbs`),
    createServerApiProxyInit(req, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
    }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
