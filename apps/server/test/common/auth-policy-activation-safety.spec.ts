import { jest } from '@jest/globals';
import { AuthPolicyService } from '../../src/modules/common/auth/auth-policy.service.js';

function createSettings(overrides: Record<string, unknown> = {}) {
  return {
    settingKey: 'default',
    passwordLoginEnabled: true,
    passwordResetEnabled: true,
    passwordChangeEnabled: true,
    resetCodeTtlMinutes: 15,
    resetCodeLength: 6,
    internalSsoEnabled: false,
    internalSsoLoginUrl: null,
    microsoftLoginEnabled: false,
    microsoftSignupRequestEnabled: false,
    microsoftTenantId: null,
    microsoftClientId: null,
    microsoftClientSecretCiphertext: null,
    microsoftClientSecretNonce: null,
    microsoftClientSecretTag: null,
    microsoftRedirectUri: null,
    microsoftScopes: ['openid', 'profile', 'email', 'User.Read'],
    allowedTenantIds: [],
    allowedEmailDomains: [],
    selfSignupEnabled: false,
    emailDeliveryMode: 'outbox',
    emailFromAddress: null,
    updatedAt: new Date('2026-08-14T00:00:00.000Z'),
    ...overrides,
  };
}

function createService(existing = createSettings()) {
  const update = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...existing,
    ...data,
    updatedAt: new Date('2026-08-14T00:00:00.000Z'),
  }));
  const service = new AuthPolicyService(
    {
      client: {
        authProviderSetting: {
          findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(existing),
          create: jest.fn(),
          update,
        },
      },
    } as never,
    {
      get: (key: string) => key === 'AUTH_CONFIG_ENCRYPTION_KEY'
        ? 'launch-auth-config-encryption-key'
        : undefined,
    } as never,
  );
  return { service, update };
}

describe('AuthPolicyService activation safety', () => {
  it('blocks an internal SSO toggle without a start URL', async () => {
    const { service, update } = createService();

    await expect(service.updateSettings({ internalSsoEnabled: true }, 1n))
      .rejects.toThrow(/시작 URL/);
    expect(update).not.toHaveBeenCalled();
  });

  it('blocks Microsoft activation until the encrypted runtime contract is complete', async () => {
    const { service, update } = createService();

    await expect(service.updateSettings({ microsoftLoginEnabled: true }, 1n))
      .rejects.toThrow(/tenant, client, redirect URI/);
    expect(update).not.toHaveBeenCalled();
  });

  it('blocks unsupported self signup instead of persisting a no-op setting', async () => {
    const { service, update } = createService();

    await expect(service.updateSettings({ selfSignupEnabled: true }, 1n))
      .rejects.toThrow(/현재 지원하지 않습니다/);
    expect(update).not.toHaveBeenCalled();
  });

  it('prevents disabling every interactive login method', async () => {
    const { service, update } = createService();

    await expect(service.updateSettings({ passwordLoginEnabled: false }, 1n))
      .rejects.toThrow(/모든 로그인 방식을 비활성화/);
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts a fully configured tenant-scoped Microsoft login', async () => {
    const { service, update } = createService();

    const result = await service.updateSettings({
      microsoftLoginEnabled: true,
      microsoftTenantId: 'contoso-tenant',
      microsoftClientId: 'contoso-client',
      microsoftClientSecret: 'contoso-secret',
      microsoftRedirectUri: 'https://api.example.com/api/auth/microsoft/callback',
    }, 1n);

    expect(result.microsoftLoginEnabled).toBe(true);
    expect(result.microsoftClientSecretConfigured).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
