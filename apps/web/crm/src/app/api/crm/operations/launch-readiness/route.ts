import { forwardCrmJson } from '@/app/api/crm/_shared/forwardCrmJson';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return forwardCrmJson(req, '/crm/operations/launch-readiness', 'GET');
}
