import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TokenPayload } from '../auth/interfaces/auth.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 사용자 프로필 조회
   * GET /api/users/profile
   */
  @Get('profile')
  async getProfile(@CurrentUser() currentUser: TokenPayload) {
    const user = await this.userService.findById(BigInt(currentUser.userId));  // string을 BigInt로 변환

    if (!user) {
      return {
        success: false,
        data: null,
        message: '사용자를 찾을 수 없습니다.',
      };
    }

    return {
      success: true,
      data: {
        id: user.id.toString(),
        loginId: user.loginId,
        userName: user.userName,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roleCode: user.roleCode,
        userTypeCode: user.userTypeCode,
        departmentCode: user.departmentCode,
        positionCode: user.positionCode,
        lastLoginAt: user.lastLoginAt,
      },
      message: '프로필 조회 성공',
    };
  }
}
