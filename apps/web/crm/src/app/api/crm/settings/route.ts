export const dynamic = 'force-dynamic';

import { forwardCrmJson } from '@/app/api/crm/_shared/forwardCrmJson';

export async function GET(req: Request) {
  return forwardCrmJson(req, '/crm/settings', 'GET');
}

export async function PUT(req: Request) {
  return forwardCrmJson(req, '/crm/settings', 'PUT');
}
