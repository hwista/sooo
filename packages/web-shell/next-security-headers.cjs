const ssooCspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.gravatar.com",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https:",
  "frame-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'trusted-types ssoo-dms-markdown default nextjs nextjs#bundler dompurify',
].join('; ');

const releaseSha = process.env.SSOO_RELEASE_SHA?.trim();
const releaseHeaders = /^[0-9a-f]{40}$/u.test(releaseSha ?? '')
  ? [{ key: 'X-SSOO-Release-SHA', value: releaseSha }]
  : [];

const ssooSecurityHeaders = [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
      },
      {
        key: 'Content-Security-Policy-Report-Only',
        value: ssooCspReportOnly,
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      ...releaseHeaders,
    ],
  },
];

module.exports = ssooSecurityHeaders;
