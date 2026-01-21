'use client';

import { useTabStore } from '@/stores';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import { useRef, useState, useEffect } from 'react';

/**
 * MDI 탭바 컴포넌트
 * - 열린 탭 목록 표시
 * - 탭 활성화, 닫기
 * - 스크롤 네비게이션
 */
export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab } = useTabStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // 스크롤 상태 체크
  const checkScrollState = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    return () => window.removeEventListener('resize', checkScrollState);
  }, [tabs]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="h-[53px] flex items-end bg-gray-50 border-b border-gray-200">
      {/* 왼쪽 스크롤 버튼 */}
      {showLeftArrow && (
        <button
          onClick={() => handleScroll('left')}
          className="flex-shrink-0 h-control-h px-2 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {/* 탭 목록 */}
      <div
        ref={scrollRef}
        onScroll={checkScrollState}
        className="flex-1 flex items-end overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab) => {
          const IconComponent = getIconComponent(tab.icon);
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-control-h border-r border-gray-200 transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-white border-b-2 border-b-ssoo-primary'
                  : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => activateTab(tab.id)}
                className="flex items-center gap-1.5"
              >
                {IconComponent && (
                  <IconComponent className="w-4 h-4 text-gray-500" />
                )}
                <span
                  className={`text-sm truncate max-w-[120px] ${
                    isActive ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {tab.title}
                </span>
              </button>
              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 오른쪽 스크롤 버튼 */}
      {showRightArrow && (
        <button
          onClick={() => handleScroll('right')}
          className="flex-shrink-0 h-control-h px-2 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}
