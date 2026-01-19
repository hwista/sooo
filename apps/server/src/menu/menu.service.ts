import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface MenuTreeItem {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuNameEn: string | null;
  menuType: string;
  menuPath: string | null;
  icon: string | null;
  sortOrder: number;
  menuLevel: number;
  parentMenuId: string | null;
  isVisible: boolean;
  description: string | null;
  accessType: string;
  children: MenuTreeItem[];
}

@Injectable()
export class MenuService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 사용자별 메뉴 트리 조회
   * - cm_user_menu_r 테이블에서 사용자 권한 조회
   * - 트리 구조로 변환
   */
  async getMenuTreeByUserId(userId: bigint): Promise<MenuTreeItem[]> {
    // 사용자 권한이 있는 메뉴만 조회
    const userMenus = await this.db.$queryRaw<
      Array<{
        menu_id: bigint;
        menu_code: string;
        menu_name: string;
        menu_name_en: string | null;
        menu_type: string;
        menu_path: string | null;
        icon: string | null;
        sort_order: number;
        menu_level: number;
        parent_menu_id: bigint | null;
        is_visible: boolean;
        description: string | null;
        access_type: string;
      }>
    >`
      SELECT 
        m.menu_id,
        m.menu_code,
        m.menu_name,
        m.menu_name_en,
        m.menu_type,
        m.menu_path,
        m.icon,
        m.sort_order,
        m.menu_level,
        m.parent_menu_id,
        m.is_visible,
        m.description,
        um.access_type
      FROM cm_menu_m m
      INNER JOIN cm_user_menu_r um ON m.menu_id = um.menu_id
      WHERE um.user_id = ${userId}
        AND um.is_active = true
        AND um.override_type = 'grant'
        AND m.is_active = true
      ORDER BY m.menu_level, m.sort_order
    `;

    // 플랫 리스트를 트리로 변환
    return this.buildMenuTree(userMenus);
  }

  /**
   * 플랫 메뉴 리스트를 트리 구조로 변환
   */
  private buildMenuTree(
    menus: Array<{
      menu_id: bigint;
      menu_code: string;
      menu_name: string;
      menu_name_en: string | null;
      menu_type: string;
      menu_path: string | null;
      icon: string | null;
      sort_order: number;
      menu_level: number;
      parent_menu_id: bigint | null;
      is_visible: boolean;
      description: string | null;
      access_type: string;
    }>
  ): MenuTreeItem[] {
    const menuMap = new Map<string, MenuTreeItem>();
    const rootMenus: MenuTreeItem[] = [];

    // 먼저 모든 메뉴를 맵에 저장
    for (const menu of menus) {
      const menuItem: MenuTreeItem = {
        menuId: menu.menu_id.toString(),
        menuCode: menu.menu_code,
        menuName: menu.menu_name,
        menuNameEn: menu.menu_name_en,
        menuType: menu.menu_type,
        menuPath: menu.menu_path,
        icon: menu.icon,
        sortOrder: menu.sort_order,
        menuLevel: menu.menu_level,
        parentMenuId: menu.parent_menu_id?.toString() || null,
        isVisible: menu.is_visible,
        description: menu.description,
        accessType: menu.access_type,
        children: [],
      };
      menuMap.set(menuItem.menuId, menuItem);
    }

    // 부모-자식 관계 구성
    for (const menu of menuMap.values()) {
      if (menu.parentMenuId && menuMap.has(menu.parentMenuId)) {
        const parent = menuMap.get(menu.parentMenuId);
        parent?.children.push(menu);
      } else if (!menu.parentMenuId) {
        rootMenus.push(menu);
      }
    }

    // 각 레벨에서 sortOrder로 정렬
    const sortChildren = (items: MenuTreeItem[]): MenuTreeItem[] => {
      items.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const item of items) {
        if (item.children.length > 0) {
          sortChildren(item.children);
        }
      }
      return items;
    };

    return sortChildren(rootMenus);
  }

  /**
   * 사용자 즐겨찾기 메뉴 조회
   */
  async getFavoritesByUserId(userId: bigint) {
    const favorites = await this.db.$queryRaw<
      Array<{
        favorite_id: bigint;
        menu_id: bigint;
        menu_code: string;
        menu_name: string;
        menu_path: string | null;
        icon: string | null;
        sort_order: number;
      }>
    >`
      SELECT 
        f.user_favorite_id as favorite_id,
        m.menu_id,
        m.menu_code,
        m.menu_name,
        m.menu_path,
        m.icon,
        f.sort_order
      FROM cm_user_favorite_r f
      INNER JOIN cm_menu_m m ON f.menu_id = m.menu_id
      WHERE f.user_id = ${userId}
        AND f.is_active = true
        AND m.is_active = true
      ORDER BY f.sort_order
    `;

    return favorites.map((f) => ({
      id: f.favorite_id.toString(),
      menuId: f.menu_id.toString(),
      menuCode: f.menu_code,
      menuName: f.menu_name,
      menuPath: f.menu_path,
      icon: f.icon,
      sortOrder: f.sort_order,
    }));
  }
}
