'use client';

import { BarChart3, ChevronLeft, ChevronRight, Home, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { CRM_HOME_TAB, useTabStore } from '@/stores/tab.store';

function getCrmTabIcon(path: string) {
  return path === CRM_HOME_TAB.path ? Home : BarChart3;
}

export function TabBar() {
  const router = useRouter();
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();

  return (
    <SsooMdiTabBar
      tabs={tabs}
      activeTabId={activeTabId}
      homeTabId={CRM_HOME_TAB.id}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        const Icon = getCrmTabIcon(tab.path);
        return <Icon />;
      }}
      getTabActionIcon={(tab) => (tab.closable ? <X /> : null)}
      onActivateTab={(tab) => {
        activateTab(tab.id);
        router.push(tab.path);
      }}
      onActionTab={(tab, event) => {
        event.stopPropagation();
        const wasActive = tab.id === activeTabId;
        closeTab(tab.id);
        if (wasActive) {
          const nextState = useTabStore.getState();
          const nextActiveTab = nextState.tabs.find((candidate) => candidate.id === nextState.activeTabId);
          router.push(nextActiveTab?.path ?? CRM_HOME_TAB.path);
        }
      }}
      onReorderTabs={reorderTabs}
    />
  );
}
