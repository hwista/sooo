export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '서버 DOCX 템플릿 업로드 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '서버 DOCX 템플릿 업로드 중 오류가 발생했습니다.';
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contentType = req.headers.get('content-type');
  const response = await fetch(
    createServerApiUrl(`/dms/templates/${encodeURIComponent(id)}/docx`),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: contentType ? { 'Content-Type': contentType } : undefined,
      body: await req.arrayBuffer(),
    }),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;

  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(responseBody) },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}
