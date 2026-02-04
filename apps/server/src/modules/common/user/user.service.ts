import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Login ID로 사용자 조회
   */
  async findByLoginId(loginId: string) {
    return this.db.user.findUnique({
      where: { loginId },
    });
  }

  /**
   * ID로 사용자 조회
   */
  async findById(userId: bigint) {
    return this.db.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  /**
   * 로그인 실패 횟수 증가
   */
  async incrementLoginFailCount(userId: bigint) {
    const user = await this.findById(userId);
    if (!user) return;

    const newFailCount = user.loginFailCount + 1;
    const MAX_FAIL_COUNT = 5;
    const LOCK_DURATION_MINUTES = 30;

    await this.db.user.update({
      where: { id: userId },
      data: {
        loginFailCount: newFailCount,
        // 5회 이상 실패 시 30분 잠금
        lockedUntil:
          newFailCount >= MAX_FAIL_COUNT
            ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
            : null,
      },
    });
  }

  /**
   * 로그인 실패 횟수 초기화
   */
  async resetLoginFailCount(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        loginFailCount: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  async updateLastLogin(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Refresh Token 저장
   */
  async updateRefreshToken(
    userId: bigint,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }

  /**
   * Refresh Token 삭제 (로그아웃)
   */
  async clearRefreshToken(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }
}
