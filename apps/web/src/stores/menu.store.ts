import { create } from 'zustand';
import type { MenuItem, FavoriteMenuItem, AccessType } from '@/types';
import { useAuthStore } from './auth.store';

interface MenuStoreState {
  // 전체 메뉴 트리 (권한 적용된 상태)
  menuTree: MenuItem[];
  // 플랫 메뉴 맵 (빠른 조회용)
  menuMap: Map<string, MenuItem>;
  // 즐겨찾기 메뉴
  favorites: FavoriteMenuItem[];
  // 메뉴 로딩 상태
  isLoading: boolean;
  // 마지막 갱신 시각
  lastUpdatedAt: Date | null;
}

interface MenuStoreActions {
  // 메뉴 로드 (API 호출 후 설정)
  setMenuTree: (menus: MenuItem[]) => void;
  // 즐겨찾기 설정
  setFavorites: (favorites: FavoriteMenuItem[]) => void;
  // 즐겨찾기 여부 확인
  isFavorite: (menuId: string) => boolean;
  // 즐겨찾기 추가
  addFavorite: (item: Omit<FavoriteMenuItem, 'id' | 'sortOrder'>) => Promise<void>;
  // 즐겨찾기 삭제
  removeFavorite: (menuId: string) => Promise<void>;
  // 즐겨찾기 순서 변경
  reorderFavorites: (fromIndex: number, toIndex: number) => Promise<void>;
  // 메뉴 새로고침
  refreshMenu: () => Promise<void>;
  // 특정 메뉴 권한 확인
  getMenuAccess: (menuCode: string) => AccessType;
  // 메뉴 코드로 메뉴 찾기
  getMenuByCode: (menuCode: string) => MenuItem | undefined;
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  // 메뉴 초기화 (로그아웃 시)
  clearMenu: () => void;
}

interface MenuStore extends MenuStoreState, MenuStoreActions {}

// 메뉴 트리를 플랫 맵으로 변환
const buildMenuMap = (menus: MenuItem[]): Map<string, MenuItem> => {
  const map = new Map<string, MenuItem>();

  const traverse = (items: MenuItem[]) => {
    for (const item of items) {
      map.set(item.menuCode, item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(menus);
  return map;
};

export const useMenuStore = create<MenuStore>()((set, get) => ({
  // Initial State
  menuTree: [],
  menuMap: new Map(),
  favorites: [],
  isLoading: false,
  lastUpdatedAt: null,

  // Actions
  setMenuTree: (menus: MenuItem[]) => {
    const menuMap = buildMenuMap(menus);
    set({
      menuTree: menus,
      menuMap,
      lastUpdatedAt: new Date(),
    });
  },

  setFavorites: (favorites: FavoriteMenuItem[]) => {
    set({ favorites });
  },

  isFavorite: (menuId: string): boolean => {
    return get().favorites.some((f) => f.menuId === menuId);
  },

  addFavorite: async (item: Omit<FavoriteMenuItem, 'id' | 'sortOrder'>) => {
    // TODO: API 호출
    // const response = await menuApi.addFavorite(item.menuId);
    const newFavorite: FavoriteMenuItem = {
      id: `fav-${item.menuId}`,
      ...item,
      sortOrder: get().favorites.length,
    };
    set((state) => ({
      favorites: [...state.favorites, newFavorite],
    }));
  },

  removeFavorite: async (menuId: string) => {
    // TODO: API 호출
    // await menuApi.removeFavorite(menuId);
    set((state) => ({
      favorites: state.favorites.filter((f) => f.menuId !== menuId),
    }));
  },

  reorderFavorites: async (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newFavorites = [...state.favorites];
      const removed = newFavorites.splice(fromIndex, 1)[0];
      if (!removed) return state;
      newFavorites.splice(toIndex, 0, removed);
      // sortOrder 재정렬
      return {
        favorites: newFavorites.map((f, i) => ({ ...f, sortOrder: i })),
      };
    });
    // TODO: API 호출로 서버에 순서 저장
    // await menuApi.reorderFavorites(get().favorites);
  },

  refreshMenu: async () => {
    set({ isLoading: true });
    try {
      const accessToken = useAuthStore.getState().accessToken;
      console.log('[MenuStore] refreshMenu called, accessToken:', accessToken ? 'exists' : 'null');
      
      if (!accessToken) {
        console.warn('[MenuStore] No access token available for menu refresh');
        return;
      }
      
      const response = await fetch('http://localhost:4000/api/menus/my', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      console.log('[MenuStore] Menu API response status:', response.status);
      const result = await response.json();
      console.log('[MenuStore] Menu API result:', result);
      
      if (result.success) {
        get().setMenuTree(result.data.menus);
        get().setFavorites(result.data.favorites);
      }
      set({ lastUpdatedAt: new Date() });
    } catch (error) {
      console.error('Failed to refresh menu:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getMenuAccess: (menuCode: string): AccessType => {
    const menu = get().menuMap.get(menuCode);
    return menu?.accessType ?? 'none';
  },

  getMenuByCode: (menuCode: string): MenuItem | undefined => {
    return get().menuMap.get(menuCode);
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  clearMenu: () => {
    set({
      menuTree: [],
      menuMap: new Map(),
      favorites: [],
      isLoading: false,
      lastUpdatedAt: null,
    });
  },
}));
