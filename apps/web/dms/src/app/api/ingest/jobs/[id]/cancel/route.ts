export const dynamic = 'force-dynamic';

import { proxyIngestRequest } from '@/app/api/ingest/_shared/proxy';

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyIngestRequest(
    request,
    `/dms/ingest/jobs/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
    '수집 작업 취소에 실패했습니다.',
  );
}
