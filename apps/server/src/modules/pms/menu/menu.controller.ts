import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface';
import { success } from '../../../common';

@Controller('menus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 현재 사용자의 메뉴 트리 조회
   * GET /api/menus/my
   * 응답: { generalMenus: [], adminMenus: [], favorites: [] }
   */
  @Get('my')
  async getMyMenu(@CurrentUser() currentUser: TokenPayload) {
    const userId = BigInt(currentUser.userId);

    const [menuData, favorites] = await Promise.all([
      this.menuService.getMenuTreeByUserId(userId),
      this.menuService.getFavoritesByUserId(userId),
    ]);

    return success({
      generalMenus: menuData.generalMenus,
      adminMenus: menuData.adminMenus,
      favorites,
    });
  }

  /**
   * 즐겨찾기 추가
   * POST /api/menus/favorites
   */
  @Post('favorites')
  async addFavorite(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: { menuId: string }
  ) {
    const userId = BigInt(currentUser.userId);
    const menuId = BigInt(body.menuId);

    const favorite = await this.menuService.addFavorite(userId, menuId);
    return success(favorite);
  }

  /**
   * 즐겨찾기 삭제
   * DELETE /api/menus/favorites/:menuId
   */
  @Delete('favorites/:menuId')
  async removeFavorite(
    @CurrentUser() currentUser: TokenPayload,
    @Param('menuId') menuId: string
  ) {
    const userId = BigInt(currentUser.userId);
    await this.menuService.removeFavorite(userId, BigInt(menuId));
    return success({ removed: true });
  }
}
