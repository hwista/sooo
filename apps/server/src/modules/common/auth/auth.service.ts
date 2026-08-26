import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../access/access-foundation.service.js';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { type AuthUserRecord, type AuthTokens, type TokenPayload } from './interfaces/auth.interface.js';
import { getRequiredJwtExpiry, getRequiredJwtSecret, isSessionIdle } from './jwt-config.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';

interface AuthSessionContext {
  issuedApp?: string;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {}

  private normalizePrincipalIds(values: unknown): string[] | undefined {
    if (!Array.isArray(values)) {
      return undefined;
    }

    const normalized = Array.from(new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ));

    return normalized.length > 0 ? normalized : undefined;
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private buildTokenPayload(user: AuthUserRecord, sessionId?: string): TokenPayload {
    return {
      userId: user.userId.toString(),
      loginId: user.loginId,
      userName: user.userName,
      sessionId,
    };
  }

  private verifyRefreshToken(refreshToken: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: getRequiredJwtSecret(this.configService, 'JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  async changePassword(userId: bigint, sessionId: string | undefined, dto: ChangePasswordDto) {
    const authUser = await this.userService.findAuthUserById(userId);
    if (!authUser || !authUser.isActive || authUser.accountStatusCode !== 'active') {
      throw new UnauthorizedException('활성 로그인 계정을 찾을 수 없습니다.');
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, authUser.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }
    if (await bcrypt.compare(dto.newPassword, authUser.passwordHash)) {
      throw new UnauthorizedException('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const now = new Date();
    const result = await this.db.client.$transaction(async (tx) => {
      await tx.userAuth.update({
        where: { userId },
        data: {
          passwordHash,
          loginFailCount: 0,
          lockedUntil: null,
          updatedBy: userId,
          lastSource: 'shared-account-center',
          lastActivity: 'auth.password.change-own',
        },
      });

      const revoked = await tx.userSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(sessionId ? { sessionId: { not: sessionId } } : {}),
        },
        data: {
          revokedAt: now,
          revokeReason: 'password-changed-by-user',
          updatedBy: userId,
          lastSource: 'shared-account-center',
          lastActivity: 'auth.password.revoke-other-sessions',
        },
      });

      return revoked.count;
    });

    return { changed: true, revokedOtherSessionCount: result };
  }

  private async persistSession(
    userId: bigint,
    sessionId: string,
    refreshToken: string,
    sessionContext: AuthSessionContext,
    currentIssuedApp?: string,
    currentUserAgent?: string | null,
  ): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const issuedApp = sessionContext.issuedApp?.trim() || currentIssuedApp || 'unknown';
    const userAgent = sessionContext.userAgent ?? currentUserAgent ?? null;

    await this.db.client.userSession.upsert({
      where: { sessionId },
      update: {
        sessionTokenHash: refreshTokenHash,
        issuedApp,
        userAgent,
        lastSeenAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
        revokedAt: null,
        revokeReason: null,
      },
      create: {
        sessionId,
        userId,
        sessionTokenHash: refreshTokenHash,
        issuedApp,
        userAgent,
        lastSeenAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
      },
    });
  }

  /**
   * 로그인 처리
   */
  async login(loginDto: LoginDto, sessionContext: AuthSessionContext = {}): Promise<AuthTokens> {
    const { loginId, password } = loginDto;

    const foundUser = await this.userService.findAuthUserByLoginId(loginId);
    if (!foundUser) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    if (!foundUser.isActive || foundUser.accountStatusCode !== 'active') {
      throw new UnauthorizedException('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    if (foundUser.lockedUntil && foundUser.lockedUntil > new Date()) {
      throw new UnauthorizedException('계정이 잠겨있습니다. 잠시 후 다시 시도하세요.');
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isPasswordValid) {
      await this.userService.incrementLoginFailCount(foundUser.userId);
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    await this.userService.resetLoginFailCount(foundUser.userId);
    await this.userService.updateLastLogin(foundUser.userId);

    const sessionId = randomUUID();
    const tokens = await this.generateTokens(this.buildTokenPayload(foundUser, sessionId));
    await this.persistSession(foundUser.userId, sessionId, tokens.refreshToken, sessionContext);

    return tokens;
  }

  async loginWithExternalIdentity(
    providerCode: string,
    tenantId: string,
    subjectId: string,
    sessionContext: AuthSessionContext = {},
  ): Promise<AuthTokens> {
    const externalIdentity = await this.db.client.userExternalIdentity.findFirst({
      where: {
        providerCode,
        tenantId,
        subjectId,
        isActive: true,
      },
      include: {
        user: {
          include: {
            authAccount: true,
          },
        },
      },
    });

    const authAccount = externalIdentity?.user.authAccount;
    if (!externalIdentity || !authAccount) {
      throw new UnauthorizedException('승인된 외부 인증 계정이 아닙니다.');
    }

    if (!externalIdentity.user.isActive || authAccount.accountStatusCode !== 'active') {
      throw new UnauthorizedException('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    const authUser: AuthUserRecord = {
      userId: externalIdentity.user.id,
      loginId: authAccount.loginId,
      userName: externalIdentity.user.userName,
      passwordHash: authAccount.passwordHash,
      accountStatusCode: authAccount.accountStatusCode,
      lastLoginAt: authAccount.lastLoginAt,
      loginFailCount: authAccount.loginFailCount,
      lockedUntil: authAccount.lockedUntil,
      roleCode: externalIdentity.user.roleCode,
      isActive: externalIdentity.user.isActive,
    };

    const sessionId = randomUUID();
    const tokens = await this.generateTokens(this.buildTokenPayload(authUser, sessionId));
    await this.persistSession(authUser.userId, sessionId, tokens.refreshToken, sessionContext);

    await Promise.all([
      this.userService.updateLastLogin(authUser.userId),
      this.db.client.userExternalIdentity.update({
        where: { externalIdentityId: externalIdentity.externalIdentityId },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return tokens;
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(refreshToken: string, sessionContext: AuthSessionContext = {}): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.userService.findAuthUserById(BigInt(payload.userId));
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (!user.isActive || user.accountStatusCode !== 'active') {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('계정이 잠겨있습니다. 잠시 후 다시 시도하세요.');
    }

    const sessionId = payload.sessionId;
    let currentIssuedApp: string | undefined;
    let currentUserAgent: string | null | undefined;

    if (!sessionId) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const session = await this.db.client.userSession.findUnique({
      where: { sessionId },
    });

    if (
      !session
      || session.userId !== BigInt(payload.userId)
      || session.revokedAt
      || session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (isSessionIdle(this.configService, session.lastSeenAt, session.createdAt)) {
      await this.db.client.userSession.updateMany({
        where: { sessionId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokeReason: 'idle-timeout',
          lastActivity: 'auth.session.idle-timeout',
        },
      });
      throw new UnauthorizedException('30분 동안 활동이 없어 세션이 만료되었습니다. 다시 로그인하세요.');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, session.sessionTokenHash);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    currentIssuedApp = session.issuedApp;
    currentUserAgent = session.userAgent;

    const tokens = await this.generateTokens(this.buildTokenPayload(user, sessionId));
    await this.persistSession(
      user.userId,
      sessionId,
      tokens.refreshToken,
      sessionContext,
      currentIssuedApp,
      currentUserAgent,
    );

    return tokens;
  }

  /**
   * 로그아웃
   */
  async logout(userId: bigint, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.db.client.userSession.updateMany({
        where: {
          sessionId,
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'logout',
          lastSeenAt: new Date(),
        },
      });
      return;
    }

    await this.db.client.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: 'logout-all',
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Access Token + Refresh Token 생성
   */
  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        {
          secret: getRequiredJwtSecret(this.configService, 'JWT_SECRET'),
          expiresIn: getRequiredJwtExpiry(this.configService, 'JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: getRequiredJwtSecret(this.configService, 'JWT_REFRESH_SECRET'),
          expiresIn: getRequiredJwtExpiry(this.configService, 'JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 토큰에서 사용자 정보 추출
   */
  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: getRequiredJwtSecret(this.configService, 'JWT_SECRET'),
      });
      if (payload.type !== 'access' || !payload.sessionId) {
        return null;
      }

      const userId = BigInt(payload.userId);
      const [user, session, organizationIds] = await Promise.all([
        this.userService.findAuthUserById(userId),
        this.db.client.userSession.findUnique({ where: { sessionId: payload.sessionId } }),
        this.accessFoundationService.getUserOrganizationIds(userId),
      ]);

      if (
        !user
        || !user.isActive
        || user.accountStatusCode !== 'active'
        || !session
        || session.userId !== userId
        || session.revokedAt
        || session.expiresAt < new Date()
        || isSessionIdle(this.configService, session.lastSeenAt, session.createdAt)
      ) {
        return null;
      }

      return {
        userId: userId.toString(),
        loginId: user.loginId,
        userName: user.userName,
        organizationIds: organizationIds.map((organizationId) => organizationId.toString()),
        teamIds: this.normalizePrincipalIds(payload.teamIds),
        groupIds: this.normalizePrincipalIds(payload.groupIds),
        sessionId: payload.sessionId,
        type: 'access',
      };
    } catch {
      return null;
    }
  }
}
