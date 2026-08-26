import { redactSecretsInText, redactSecretsInValue, redactUrlCredentials } from './secret-redaction.js';

describe('secret redaction', () => {
  const marker = 'crm-s10-secret-marker';

  it('redacts URL credentials, connection properties, query tokens, and authorization headers', () => {
    const raw = [
      `postgresql://operator:${marker}@db.internal:5432/crm`,
      `https://operator:${marker}@git.example/repo.git`,
      `https://api.example/run?access_token=${marker}&mode=probe`,
      `Password=${marker};Host=db.internal`,
      `Authorization: Bearer ${marker}`,
    ].join(' | ');

    const sanitized = redactSecretsInText(raw);

    expect(sanitized).not.toContain(marker);
    expect(sanitized).toContain('postgresql://operator:***@db.internal:5432/crm');
    expect(sanitized).toContain('Host=db.internal');
  });

  it('recursively masks secret-shaped object fields while preserving useful metadata', () => {
    const sanitized = redactSecretsInValue({
      provider: 'external-api',
      nested: { token: marker, endpoint: `https://operator:${marker}@api.example/run` },
    });

    expect(sanitized).toEqual({
      provider: 'external-api',
      nested: { token: '***', endpoint: 'https://operator:***@api.example/run' },
    });
    expect(redactUrlCredentials(`ssh+https://operator:${marker}@git.example/repo.git`)).not.toContain(marker);
  });
});

