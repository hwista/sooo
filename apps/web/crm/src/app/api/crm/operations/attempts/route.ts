export const dynamic = 'force-dynamic';

import { forwardCrmJson } from '@/app/api/crm/_shared/forwardCrmJson';

export async function GET(req: Request) {
  const { search } = new URL(req.url);
  return forwardCrmJson(req, `/crm/operations/attempts${search}`, 'GET');
}
