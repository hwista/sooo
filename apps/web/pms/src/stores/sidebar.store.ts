import { create } from 'zustand';
import type {
  SidebarState,
  SidebarActions,
  SidebarSection,
} from '@/types';

interface SidebarStore extends SidebarState, SidebarActions {}

// 기본 펼쳐진 섹션
const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['favorites', 'menuTree'];

export const useSidebarStore = create<SidebarStore>()((set, get) => ({
  // Initial State
  isCollapsed: false,
  activeFloatSection: null,
  expandedSections: DEFAULT_EXPANDED_SECTIONS,
  searchQuery: '',
  expandedMenuIds: [],

  // Actions
  toggleCollapse: () => {
    set((state) => ({
      isCollapsed: !state.isCollapsed,
      activeFloatSection: null, // 토글 시 플로팅 닫기
    }));
  },

  setCollapsed: (collapsed: boolean) => {
    set({
      isCollapsed: collapsed,
      activeFloatSection: null,
    });
  },

  // 플로팅 패널
  openFloatSection: (section: SidebarSection) => {
    // 접힌 상태에서만 플로팅 열기
    if (get().isCollapsed) {
      set({ activeFloatSection: section });
    }
  },

  closeFloatSection: () => {
    set({ activeFloatSection: null });
  },

  // 섹션 접기/펼치기
  toggleSection: (section: SidebarSection) => {
    set((state) => {
      const isExpanded = state.expandedSections.includes(section);
      return {
        expandedSections: isExpanded
          ? state.expandedSections.filter((s) => s !== section)
          : [...state.expandedSections, section],
      };
    });
  },

  setExpandedSections: (sections: SidebarSection[]) => {
    set({ expandedSections: sections });
  },

  // 검색
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSearch: () => {
    set({ searchQuery: '' });
  },

  // 메뉴 트리 펼치기
  toggleMenuExpand: (menuId: string) => {
    set((state) => {
      const isExpanded = state.expandedMenuIds.includes(menuId);
      return {
        expandedMenuIds: isExpanded
          ? state.expandedMenuIds.filter((id) => id !== menuId)
          : [...state.expandedMenuIds, menuId],
      };
    });
  },

  expandMenu: (menuId: string) => {
    set((state) => ({
      expandedMenuIds: state.expandedMenuIds.includes(menuId)
        ? state.expandedMenuIds
        : [...state.expandedMenuIds, menuId],
    }));
  },

  collapseMenu: (menuId: string) => {
    set((state) => ({
      expandedMenuIds: state.expandedMenuIds.filter((id) => id !== menuId),
    }));
  },

  collapseAllMenus: () => {
    set({ expandedMenuIds: [] });
  },
}));
