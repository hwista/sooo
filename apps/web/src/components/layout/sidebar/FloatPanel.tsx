'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { useSidebarStore } from '@/stores';
import { FLOAT_PANEL_CONFIG, SidebarSection } from '@/types';

interface FloatPanelProps {
  section: SidebarSection;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

/**
 * 접힌 사이드바에서 호버 시 나타나는 플로팅 패널
 * - 마우스가 패널을 벗어나면 일정 시간 후 닫힘
 * - 패널 위에 마우스가 있으면 유지
 */
export function FloatPanel({ section, title, icon, children }: FloatPanelProps) {
  const { activeFloatSection, openFloatSection, closeFloatSection } = useSidebarStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isOpen = activeFloatSection === section;

  const handleMouseEnter = () => {
    // 닫힘 타이머 취소
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    // 일정 시간 후 닫힘
    closeTimerRef.current = setTimeout(() => {
      closeFloatSection();
    }, FLOAT_PANEL_CONFIG.closeDelay);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed left-14 top-12 w-64 max-h-[calc(100vh-96px)] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        {icon}
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>

      {/* 내용 */}
      <div className="overflow-y-auto max-h-[calc(100vh-144px)]">
        {children}
      </div>
    </div>
  );
}

interface FloatPanelTriggerProps {
  section: SidebarSection;
  icon: ReactNode;
  tooltip: string;
}

/**
 * 접힌 사이드바의 플로팅 패널 트리거 버튼
 */
export function FloatPanelTrigger({ section, icon, tooltip }: FloatPanelTriggerProps) {
  const { openFloatSection, closeFloatSection, activeFloatSection } = useSidebarStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      openFloatSection(section);
    }, FLOAT_PANEL_CONFIG.openDelay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // 패널이 이미 열려 있으면 패널쪽에서 닫힘 처리
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isActive = activeFloatSection === section;

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
        isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
      }`}
      title={tooltip}
    >
      {icon}
    </button>
  );
}
