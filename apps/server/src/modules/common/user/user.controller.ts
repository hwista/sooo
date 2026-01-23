import { Controller, Get, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TokenPayload } from "../auth/interfaces/auth.interface";
import { success } from "../../../common";
import { UserProfileDto } from "./dto/user-profile.dto";
import { ApiError } from "../../../common/swagger/api-response.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 사용자 프로필 조회
   * GET /api/users/profile
   */
  @Get("profile")
  @ApiOperation({ summary: "내 프로필" })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiNotFoundResponse({ type: ApiError })
  async getProfile(@CurrentUser() currentUser: TokenPayload) {
    const user = await this.userService.findById(BigInt(currentUser.userId));

    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    return success(
      {
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
        isAdmin: user.isAdmin,
      },
      "프로필 조회 성공",
    );
  }
}