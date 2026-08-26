import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: { message?: string };
  message?: string;
}

export async function proxyIngestRequest(
  request: Request,
  pathname: string,
  init?: RequestInit,
  fallbackMessage = '수집 작업 처리 중 오류가 발생했습니다.',
) {
  const response = await fetch(
    createServerApiUrl(pathname),
    createServerApiProxyInit(request, init),
  );
  const body = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !body || body.success !== true) {
    const message = body && body.success !== true
      ? body.error?.message || body.message || fallbackMessage
      : fallbackMessage;
    return Response.json({ error: message }, { status: response.status || 500 });
  }
  return Response.json(body.data);
}
