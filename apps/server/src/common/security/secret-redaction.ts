const SECRET_KEY_PATTERN = '(?:password|passwd|pwd|secret|token|access[_-]?token|refresh[_-]?token|authorization|api[_-]?key|client[_-]?secret|connection[_-]?string)';

/**
 * 사용자 응답과 운영 로그에 들어갈 문자열에서 일반적인 credential 표현을 제거합니다.
 * 존재 여부와 endpoint/host 같은 운영 단서는 보존하되 값은 절대 반환하지 않습니다.
 */
export function redactSecretsInText(value: string): string {
  return value
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu, '$1$2:***@')
    .replace(new RegExp(`([?&]${SECRET_KEY_PATTERN}=)[^&#\\s]+`, 'giu'), '$1***')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/giu, '$1 ***')
    .replace(new RegExp(`\\b(${SECRET_KEY_PATTERN})\\s*[:=]\\s*(?:["']([^"']*)["']|[^\\s,;]+)`, 'giu'), '$1=***');
}

export function redactUrlCredentials(value: string | undefined): string | undefined {
  return value === undefined ? undefined : redactSecretsInText(value);
}

export function redactSecretsInValue(value: unknown): unknown {
  if (typeof value === 'string') return redactSecretsInText(value);
  if (Array.isArray(value)) return value.map(redactSecretsInValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      new RegExp(`^${SECRET_KEY_PATTERN}$`, 'iu').test(key) ? '***' : redactSecretsInValue(entry),
    ]));
  }
  return value;
}
