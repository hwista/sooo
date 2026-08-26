export const dynamic = 'force-dynamic';

import { proxyIngestRequest } from '@/app/api/ingest/_shared/proxy';

export async function POST(request: Request) {
  const body = await request.json();
  return proxyIngestRequest(request, '/dms/ingest/jobs/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, '수집 큐 이력 정리에 실패했습니다.');
}
