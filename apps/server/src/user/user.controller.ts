import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TokenPayload } from '../auth/interfaces/auth.interface';
import { success, notFound } from '../common';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 사용자 프로필 조회
   * GET /api/users/profile
   */
  @Get('profile')
  async getProfile(@CurrentUser() currentUser: TokenPayload) {
    const user = await this.userService.findById(BigInt(currentUser.userId));

    if (!user) {
      return notFound('사용자');
    }

    return success({
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
    }, '프로필 조회 성공');
  }
}
