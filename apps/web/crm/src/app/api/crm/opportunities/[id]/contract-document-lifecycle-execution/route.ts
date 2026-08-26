export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(
    createServerApiUrl(`/crm/opportunities/${encodeURIComponent(id)}/contract-document-lifecycle-execution`),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: (await req.text()) || undefined,
    }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
