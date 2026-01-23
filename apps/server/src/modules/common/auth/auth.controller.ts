import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { TokenPayload } from './interfaces/auth.interface';
import { success } from '../../../common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 로그인
   * POST /api/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const tokens = await this.authService.login(loginDto);
    return success(tokens, '로그인 성공');
  }

  /**
   * 토큰 갱신
   * POST /api/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    return success(tokens, '토큰 갱신 성공');
  }

  /**
   * 로그아웃
   * POST /api/auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: TokenPayload) {
    await this.authService.logout(BigInt(user.userId));
    return success(null, '로그아웃 성공');
  }

  /**
   * 현재 사용자 정보
   * POST /api/auth/me
   */
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: TokenPayload) {
    return success({
      userId: user.userId,
      loginId: user.loginId,
      roleCode: user.roleCode,
      userTypeCode: user.userTypeCode,
      isAdmin: user.isAdmin,
    }, '사용자 정보 조회 성공');
  }
}
