import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 미들웨어
 * - 존재하지 않는 경로 접근 시 not-found 페이지로 리다이렉트
 * - 권한이 없는 직접 URL 접근 차단
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트는 제외
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 정적 파일은 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // 파일 확장자가 있는 경우
  ) {
    return NextResponse.next();
  }

  // 허용된 경로 목록 (오직 메인 페이지만 허용)
  const allowedPaths = [
    '/',
    '/docs',
  ];

  // 허용된 경로면 통과
  if (allowedPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // 그 외 모든 경로는 차단 (404 페이지로 리다이렉트)
  // 404 페이지에서 자동으로 로그인 상태에 따라 메인 또는 로그인 페이지로 이동
  return NextResponse.rewrite(new URL('/not-found', request.url));
}
