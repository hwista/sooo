export const dynamic = 'force-dynamic';

import { proxyIngestRequest } from '@/app/api/ingest/_shared/proxy';

export function GET(request: Request) {
  return proxyIngestRequest(request, '/dms/ingest/jobs/metrics', undefined, '수집 큐 지표 조회에 실패했습니다.');
}
