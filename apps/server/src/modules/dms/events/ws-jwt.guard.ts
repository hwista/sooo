import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { AuthService } from '../../common/auth/auth.service.js';

/**
 * WebSocket JWT 토큰 검증.
 * HTTP JwtStrategy와 동일한 시크릿/옵션을 사용하되,
 * WebSocket handshake에서는 Passport 미사용.
 */
export async function verifyWsToken(
  token: string,
  authService: Pick<AuthService, 'validateToken'>,
): Promise<TokenPayload | null> {
  return authService.validateToken(token);
}
