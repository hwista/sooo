export const dynamic = 'force-dynamic';

import { forwardCrmJson } from '@/app/api/crm/_shared/forwardCrmJson';

export async function GET(req: Request) {
  return forwardCrmJson(req, '/crm/operations/access', 'GET');
}
