export const dynamic = 'force-dynamic';

import { forwardCrmJson } from '@/app/api/crm/_shared/forwardCrmJson';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardCrmJson(req, `/crm/operations/attempts/${encodeURIComponent(id)}/retry`, 'POST');
}
