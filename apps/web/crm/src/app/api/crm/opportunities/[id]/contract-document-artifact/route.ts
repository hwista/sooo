export const dynamic = 'force-dynamic';

import { proxySessionBackedBinaryResponse } from '@/app/api/_shared/serverApiProxy';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxySessionBackedBinaryResponse(
    req,
    `/crm/opportunities/${encodeURIComponent(id)}/contract-document-artifact`,
  );
}
