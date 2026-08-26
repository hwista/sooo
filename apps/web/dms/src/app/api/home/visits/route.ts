export const dynamic = 'force-dynamic';

import type { DmsRecordDocumentVisitResult } from '@ssoo/types/dms';
import { proxyHomeJson } from '../_shared/proxy';

export async function POST(request: Request) {
  const body = await request.json();
  return proxyHomeJson<DmsRecordDocumentVisitResult>(
    request,
    '/dms/home/visits',
    '문서 열람 이력을 기록하지 못했습니다.',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}
