export const dynamic = 'force-dynamic';

import { proxySessionBackedBinaryResponse } from '@/app/api/_shared/serverApiProxy';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const { id, kind } = await params;
  return proxySessionBackedBinaryResponse(
    req,
    `/crm/contracts/${encodeURIComponent(id)}/dms-document-artifacts/${encodeURIComponent(kind)}`,
  );
}
