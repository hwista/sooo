import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TabItem,
  OpenTabOptions,
  TabStoreState,
  TabStoreActions,
} from '@/types';

// 탭 ID 생성 (menuCode + params 조합)
const generateTabId = (menuCode: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return menuCode;
  }
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${menuCode}?${paramStr}`;
};

interface TabStore extends TabStoreState, TabStoreActions {}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      // Initial State
      tabs: [],
      activeTabId: null,
      maxTabs: 10,

      // Actions
      openTab: (options: OpenTabOptions): string => {
        const {
          menuCode,
          menuId,
          title,
          icon,
          path,
          params,
          closable = true,
          activate = true,
          replaceExisting = false,
        } = options;

        const tabId = generateTabId(menuCode, params);
        const { tabs, maxTabs } = get();

        // 이미 존재하는 탭 확인
        const existingTab = tabs.find((t) => t.id === tabId);
        if (existingTab) {
          if (activate) {
            set({ activeTabId: tabId });
          }
          return tabId;
        }

        // 같은 menuCode 탭 교체 옵션
        if (replaceExisting) {
          const sameCodeTab = tabs.find((t) => t.menuCode === menuCode);
          if (sameCodeTab) {
            get().closeTab(sameCodeTab.id);
          }
        }

        // 최대 탭 수 초과 시 가장 오래된 탭 닫기
        const currentTabs = get().tabs;
        if (currentTabs.length >= maxTabs) {
          const closableTabs = currentTabs.filter((t) => t.closable);
          if (closableTabs.length > 0) {
            // 가장 오래전에 활성화된 탭 닫기
            const sorted = closableTabs.sort(
              (a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime()
            );
            const oldest = sorted[0];
            if (oldest) {
              get().closeTab(oldest.id);
            }
          }
        }

        const now = new Date();
        const newTab: TabItem = {
          id: tabId,
          menuCode,
          menuId,
          title,
          icon,
          path,
          closable,
          status: 'active',
          params,
          openedAt: now,
          lastActiveAt: now,
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: activate ? tabId : state.activeTabId,
        }));

        return tabId;
      },

      closeTab: (tabId: string): void => {
        const { tabs, activeTabId } = get();
        const tabToClose = tabs.find((t) => t.id === tabId);

        if (!tabToClose || !tabToClose.closable) return;

        const newTabs = tabs.filter((t) => t.id !== tabId);

        // 닫는 탭이 활성 탭이면 다른 탭 활성화
        let newActiveTabId = activeTabId;
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex((t) => t.id === tabId);
          if (newTabs.length > 0) {
            // 왼쪽 탭 우선, 없으면 오른쪽
            newActiveTabId =
              newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id ?? null;
          } else {
            newActiveTabId = null;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveTabId });
      },

      closeAllTabs: (): void => {
        const { tabs } = get();
        const unclosableTabs = tabs.filter((t) => !t.closable);
        const newActiveTabId = unclosableTabs[0]?.id ?? null;
        set({ tabs: unclosableTabs, activeTabId: newActiveTabId });
      },

      closeOtherTabs: (tabId: string): void => {
        const { tabs } = get();
        const keepTabs = tabs.filter((t) => t.id === tabId || !t.closable);
        set({ tabs: keepTabs, activeTabId: tabId });
      },

      activateTab: (tabId: string): void => {
        set((state) => ({
          activeTabId: tabId,
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, status: 'active' as const, lastActiveAt: new Date() }
              : { ...t, status: 'inactive' as const }
          ),
        }));
      },

      updateTabTitle: (tabId: string, title: string): void => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
        }));
      },

      updateTabData: (tabId: string, data: unknown): void => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, data } : t)),
        }));
      },

      reorderTabs: (fromIndex: number, toIndex: number): void => {
        set((state) => {
          const newTabs = [...state.tabs];
          const removed = newTabs.splice(fromIndex, 1)[0];
          if (!removed) return state;
          newTabs.splice(toIndex, 0, removed);
          return { tabs: newTabs };
        });
      },

      getTabByMenuCode: (
        menuCode: string,
        params?: Record<string, string>
      ): TabItem | undefined => {
        const tabId = generateTabId(menuCode, params);
        return get().tabs.find((t) => t.id === tabId);
      },
    }),
    {
      name: 'ssoo-tabs',
      storage: createJSONStorage(() => sessionStorage), // 세션 스토리지 (브라우저 닫으면 초기화)
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Date 객체 직렬화 처리
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tabs = state.tabs.map((tab) => ({
            ...tab,
            openedAt: new Date(tab.openedAt),
            lastActiveAt: new Date(tab.lastActiveAt),
          }));
        }
      },
    }
  )
);
