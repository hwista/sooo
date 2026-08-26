export const dynamic = 'force-dynamic';

import type {
  LaunchReadinessSnapshot,
} from '@ssoo/types/common';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';
import { normalizeOwnerSnapshot, unavailableReadiness } from './readinessContract';

interface UpstreamEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string };
  message?: string;
}

async function readUpstream<T>(req: Request, path: string): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const proxyInit = createServerApiProxyInit(req, { method: 'GET' });
    const response = await fetch(createServerApiUrl(path), {
      ...proxyInit,
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => null) as UpstreamEnvelope<T> | null;
    if (!response.ok || payload?.success !== true || payload.data === undefined) {
      return { ok: false, message: payload?.error?.message || payload?.message || `upstream ${response.status}` };
    }
    return { ok: true, data: payload.data };
  } catch {
    return { ok: false, message: 'upstream 연결에 실패했습니다.' };
  }
}

export async function GET(req: Request) {
  const [crmResult, dmsResult] = await Promise.all([
    readUpstream<LaunchReadinessSnapshot>(req, '/crm/operations/launch-readiness'),
    readUpstream<LaunchReadinessSnapshot>(req, '/dms/settings/readiness'),
  ]);
  const now = Date.now();
  const crm = crmResult.ok
    ? normalizeOwnerSnapshot('crm', crmResult.data, now)
    : unavailableReadiness('crm', crmResult.message);
  const dms = dmsResult.ok
    ? normalizeOwnerSnapshot('dms', dmsResult.data, now)
    : unavailableReadiness('dms', dmsResult.message);

  return Response.json({
    success: true,
    data: {
      generatedAt: new Date(now).toISOString(),
      services: [
        { ...crm, label: 'CRM' },
        { ...dms, label: 'DMS' },
      ],
    },
  });
}
