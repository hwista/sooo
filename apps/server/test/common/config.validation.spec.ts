import { configValidationSchema } from '../../src/config/config.validation.js';

function productionConfig(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://ssoo:password@db:5432/ssoo',
    CORS_ORIGIN: 'https://dms.example.com',
    JWT_SECRET: 'jwt-access-secret-1234567890-abcdef',
    JWT_REFRESH_SECRET: 'jwt-refresh-secret-123456789-abcdef',
    AUTH_CONFIG_ENCRYPTION_KEY: 'config-encryption-key-123456789-abcdef',
    AUTH_SESSION_COOKIE_SECURE: true,
    AUTH_EMAIL_OUTBOX_WORKER_ENABLED: true,
    AUTH_EMAIL_SMTP_HOST: 'smtp.example.com',
    AUTH_EMAIL_SMTP_PORT: 587,
    AUTH_EMAIL_SMTP_SECURE: false,
    AUTH_EMAIL_SMTP_USERNAME: 'ssoo-mailer',
    AUTH_EMAIL_SMTP_PASSWORD: 'smtp-password-123456789',
    AUTH_EMAIL_FROM_ADDRESS: 'no-reply@example.com',
    ...overrides,
  };
}

describe('configValidationSchema production email delivery hardening', () => {
  it('accepts a complete production SMTP worker configuration and preserves coerced types', () => {
    const result = configValidationSchema.validate(productionConfig(), { abortEarly: false });

    expect(result.error).toBeUndefined();
    expect(result.value.AUTH_EMAIL_OUTBOX_WORKER_ENABLED).toBe(true);
    expect(result.value.AUTH_EMAIL_SMTP_PORT).toBe(587);
  });

  it('fails closed when the production outbox worker is disabled', () => {
    const result = configValidationSchema.validate(productionConfig({
      AUTH_EMAIL_OUTBOX_WORKER_ENABLED: false,
    }), { abortEarly: false });

    expect(result.error?.message).toContain('AUTH_EMAIL_OUTBOX_WORKER_ENABLED must be true in production');
  });

  it('rejects missing or placeholder SMTP credentials in production', () => {
    const result = configValidationSchema.validate(productionConfig({
      AUTH_EMAIL_SMTP_USERNAME: '',
      AUTH_EMAIL_SMTP_PASSWORD: 'replace-with-password',
    }), { abortEarly: false });

    expect(result.error?.message).toContain('AUTH_EMAIL_SMTP_USERNAME must be configured in production');
    expect(result.error?.message).toContain('AUTH_EMAIL_SMTP_PASSWORD must be a non-placeholder secret');
  });
});
