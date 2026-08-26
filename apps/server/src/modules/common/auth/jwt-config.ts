import type { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';

type JwtSecretKey = 'JWT_SECRET' | 'JWT_REFRESH_SECRET';
type JwtExpiryKey = 'JWT_ACCESS_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN';

export function getRequiredJwtSecret(configService: ConfigService, key: JwtSecretKey): string {
  return configService.getOrThrow<string>(key, { infer: true });
}

export function getRequiredJwtExpiry(
  configService: ConfigService,
  key: JwtExpiryKey,
): NonNullable<JwtSignOptions['expiresIn']> {
  return configService.getOrThrow<string>(key, { infer: true }) as NonNullable<
    JwtSignOptions['expiresIn']
  >;
}

export function getSessionIdleTimeoutMs(configService: ConfigService): number {
  const minutes = configService.get<number>('AUTH_SESSION_IDLE_TIMEOUT_MINUTES', { infer: true }) ?? 30;
  return Math.max(1, minutes) * 60 * 1000;
}

export function isSessionIdle(
  configService: ConfigService,
  lastSeenAt: Date | null | undefined,
  createdAt: Date | null | undefined,
  now = new Date(),
): boolean {
  const activityAt = lastSeenAt ?? createdAt ?? now;
  return now.getTime() - activityAt.getTime() >= getSessionIdleTimeoutMs(configService);
}
