import {
  Controller,
  
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { TokenPayload } from "./interfaces/auth.interface";
import { success } from "../../../common";
import { ApiSuccess } from "../../../common/swagger/api-response.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * �α���
   * POST /api/auth/login
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "로그인", description: "JWT Access/Refresh 토큰 발급" })
  @ApiOkResponse({ type: ApiSuccess })
  async login(@Body() loginDto: LoginDto) {
    const tokens = await this.authService.login(loginDto);
    return success(tokens, "�α��ο� �����߽��ϴ�");
  }

  /**
   * ��ū ����
   * POST /api/auth/refresh
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Refresh 토큰으로 재발급" })
  @ApiOkResponse({ type: ApiSuccess })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    return success(tokens, "��ū ���� ����");
  }

  /**
   * �α׾ƿ�
   * POST /api/auth/logout
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "�α׾ƿ�", description: "������ ����� Refresh Token ��ȿȭ" })
  @ApiOkResponse({ type: ApiSuccess })
  async logout(@CurrentUser() user: TokenPayload) {
    await this.authService.logout(BigInt(user.userId));
    return success(null, "�α׾ƿ� ����");
  }

  /**
   * ���� ����� ����
   * POST /api/auth/me
   */
  @Post("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "�� ���� ��ȸ" })
  @ApiOkResponse({ type: ApiSuccess })
  async me(@CurrentUser() user: TokenPayload) {
    return success(
      {
        userId: user.userId,
        loginId: user.loginId,
        roleCode: user.roleCode,
        userTypeCode: user.userTypeCode,
        isAdmin: user.isAdmin,
      },
      "����� ���� ��ȸ ����",
    );
  }
}
