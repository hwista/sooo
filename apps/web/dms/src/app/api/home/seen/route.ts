export const dynamic = 'force-dynamic';

import type { DmsAcknowledgeHomeSeenResult } from '@ssoo/types/dms';
import { proxyHomeJson } from '../_shared/proxy';

export async function POST(request: Request) {
  const body = await request.json();
  return proxyHomeJson<DmsAcknowledgeHomeSeenResult>(
    request,
    '/dms/home/seen',
    '홈 확인 시각을 기록하지 못했습니다.',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}
