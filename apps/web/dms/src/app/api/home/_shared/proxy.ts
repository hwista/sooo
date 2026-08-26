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

export async function proxyHomeJson<T>(
  request: Request,
  pathname: string,
  fallbackMessage: string,
  init?: RequestInit,
) {
  const response = await fetch(
    createServerApiUrl(pathname),
    createServerApiProxyInit(request, init),
  );
  const body = await response.json().catch(() => null) as
    | BackendSuccessResponse<T>
    | BackendErrorResponse
    | null;

  if (!response.ok || !body || body.success !== true) {
    const message = body && body.success !== true
      ? body.error?.message || body.message || fallbackMessage
      : fallbackMessage;
    return Response.json({ error: message }, { status: response.status || 500 });
  }

  return Response.json(body.data);
}
