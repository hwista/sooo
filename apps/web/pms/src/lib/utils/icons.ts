import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

// Lucide 아이콘 컴포넌트 타입
type IconComponent = ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
>;

// 아이콘 맵 (타입 안전한 접근을 위해)
const iconMap: Record<string, IconComponent | undefined> = LucideIcons as unknown as Record<string, IconComponent | undefined>;

/**
 * Lucide 아이콘 이름으로 컴포넌트 가져오기
 * @param iconName - 아이콘 이름 (예: 'Home', 'Settings', 'FileText')
 * @returns 아이콘 컴포넌트 또는 null
 */
export function getIconComponent(iconName: string | undefined | null): IconComponent | null {
  if (!iconName) return null;
  return iconMap[iconName] ?? null;
}

/**
 * 아이콘이 존재하는지 확인
 */
export function hasIcon(iconName: string): boolean {
  return iconName in iconMap;
}
