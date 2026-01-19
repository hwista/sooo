import { Controller, Get, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TokenPayload } from '../auth/interfaces/auth.interface';

@Controller('menus')
@UseGuards(JwtAuthGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 현재 사용자의 메뉴 트리 조회
   * GET /api/menus/my
   */
  @Get('my')
  async getMyMenu(@CurrentUser() currentUser: TokenPayload) {
    const userId = BigInt(currentUser.userId);

    const [menuTree, favorites] = await Promise.all([
      this.menuService.getMenuTreeByUserId(userId),
      this.menuService.getFavoritesByUserId(userId),
    ]);

    return {
      success: true,
      data: {
        menus: menuTree,
        favorites,
      },
    };
  }
}
