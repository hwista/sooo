import { apiClient } from '../client';
import { ApiResponse } from '../types';

/**
 * 메뉴 타입
 */
export type MenuType = 'group' | 'page' | 'action' | 'external';

/**
 * 접근 권한 타입
 */
export type AccessType = 'full' | 'read' | 'none';

/**
 * 메뉴 아이템
 */
export interface MenuItem {
  menuId: number;
  menuCode: string;
  menuName: string;
  menuType: MenuType;
  parentId: number | null;
  menuPath: string | null;
  iconName: string | null;
  sortOrder: number;
  menuLevel: number;
  accessType: AccessType;
  children?: MenuItem[];
}

/**
 * 즐겨찾기 메뉴
 */
export interface FavoriteMenu {
  menuId: number;
  menuCode: string;
  menuName: string;
  menuPath: string | null;
  iconName: string | null;
  sortOrder: number;
}

/**
 * 내 메뉴 응답
 */
export interface MyMenuResponse {
  menus: MenuItem[];
  favorites: FavoriteMenu[];
}

/**
 * 메뉴 API
 */
export const menusApi = {
  /**
   * 내 메뉴 조회 (트리 + 즐겨찾기)
   */
  getMyMenus: async (): Promise<ApiResponse<MyMenuResponse>> => {
    const response = await apiClient.get<ApiResponse<MyMenuResponse>>('/menus/my');
    return response.data;
  },

  /**
   * 즐겨찾기 추가
   */
  addFavorite: async (menuId: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>('/menus/favorites', { menuId });
    return response.data;
  },

  /**
   * 즐겨찾기 삭제
   */
  removeFavorite: async (menuId: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/menus/favorites/${menuId}`);
    return response.data;
  },

  /**
   * 즐겨찾기 순서 변경
   */
  reorderFavorites: async (menuIds: number[]): Promise<ApiResponse<null>> => {
    const response = await apiClient.put<ApiResponse<null>>('/menus/favorites/reorder', {
      menuIds,
    });
    return response.data;
  },
};
