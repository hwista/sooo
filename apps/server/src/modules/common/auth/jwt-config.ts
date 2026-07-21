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
