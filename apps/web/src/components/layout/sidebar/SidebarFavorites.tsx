'use client';

import { useMenuStore, useTabStore } from '@/stores';
import { Star } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

/**
 * 사이드바 즐겨찾기 목록
 */
export function SidebarFavorites() {
  const { favorites } = useMenuStore();
  const { openTab } = useTabStore();

  if (favorites.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400">
        즐겨찾기한 메뉴가 없습니다.
      </div>
    );
  }

  const handleClick = (favorite: typeof favorites[0]) => {
    openTab({
      menuCode: favorite.menuCode,
      menuId: favorite.menuId,
      title: favorite.menuName,
      icon: favorite.icon,
      path: favorite.menuPath,
    });
    // URL 변경 없음
  };

  return (
    <div className="space-y-0.5">
      {favorites.map((favorite) => {
        const IconComponent = getIconComponent(favorite.icon);

        return (
          <button
            key={favorite.id}
            onClick={() => handleClick(favorite)}
            className="flex items-center gap-2 w-full h-control-h px-3 text-sm text-gray-700 hover:bg-[#F6FBFF] rounded-md transition-colors"
          >
            {IconComponent ? (
              <IconComponent className="w-4 h-4 text-gray-500" />
            ) : (
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            )}
            <span className="truncate">{favorite.menuName}</span>
          </button>
        );
      })}
    </div>
  );
}
