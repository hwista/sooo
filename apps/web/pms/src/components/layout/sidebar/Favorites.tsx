'use client';

import { useMenuStore, useTabStore } from '@/stores';
import { Star, X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

/**
 * 사이드바 즐겨찾기 목록
 * - 각 항목에 삭제 버튼 포함
 */
export function Favorites() {
  const { favorites, removeFavorite } = useMenuStore();
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

  const handleRemove = (e: React.MouseEvent, menuId: string) => {
    e.stopPropagation();
    removeFavorite(menuId);
  };

  return (
    <div className="space-y-0.5">
      {favorites.map((favorite) => {
        const IconComponent = getIconComponent(favorite.icon);

        return (
          <div
            key={favorite.id}
            className="flex items-center gap-2 w-full h-control-h px-3 text-sm text-gray-700 hover:bg-ssoo-sitemap-bg rounded-md transition-colors group"
          >
            <button
              onClick={() => handleClick(favorite)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {IconComponent ? (
                <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              )}
              <span className="truncate">{favorite.menuName}</span>
            </button>
            <button
              onClick={(e) => handleRemove(e, favorite.menuId)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
              title="즐겨찾기 해제"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
