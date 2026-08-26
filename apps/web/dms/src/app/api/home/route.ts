export const dynamic = 'force-dynamic';

import type { DmsHomeSummary } from '@ssoo/types/dms';
import { proxyHomeJson } from './_shared/proxy';

export async function GET(request: Request) {
  return proxyHomeJson<DmsHomeSummary>(
    request,
    '/dms/home',
    '홈 작업 요약을 불러오지 못했습니다.',
  );
}
