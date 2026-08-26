export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

async function forwardResponse(response: Response) {
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}

function targetPath(id: string, rowCode: string) {
  return `/crm/business-plan/plans/${encodeURIComponent(id)}/rows/${encodeURIComponent(rowCode)}`;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; rowCode: string }> }) {
  const { id, rowCode } = await params;
  const response = await fetch(
    createServerApiUrl(targetPath(id, rowCode)),
    createServerApiProxyInit(req, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
    }),
  );
  return forwardResponse(response);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; rowCode: string }> }) {
  const { id, rowCode } = await params;
  const response = await fetch(
    createServerApiUrl(targetPath(id, rowCode)),
    createServerApiProxyInit(req, { method: 'DELETE' }),
  );
  return forwardResponse(response);
}
