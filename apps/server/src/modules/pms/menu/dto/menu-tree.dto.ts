import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuTreeItemDto {
  @ApiProperty()
  menuId!: string;

  @ApiProperty()
  menuCode!: string;

  @ApiProperty()
  menuName!: string;

  @ApiPropertyOptional({ nullable: true })
  menuNameEn!: string | null;

  @ApiProperty()
  menuType!: string;

  @ApiPropertyOptional({ nullable: true })
  menuPath!: string | null;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  menuLevel!: number;

  @ApiPropertyOptional({ nullable: true })
  parentMenuId!: string | null;

  @ApiProperty()
  isVisible!: boolean;

  @ApiProperty()
  isAdminMenu!: boolean;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  accessType!: string;

  @ApiProperty({ type: () => [MenuTreeItemDto] })
  children!: MenuTreeItemDto[];
}

export class FavoriteMenuDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  menuId!: string;

  @ApiProperty()
  menuCode!: string;

  @ApiProperty()
  menuName!: string;

  @ApiPropertyOptional({ nullable: true })
  menuPath!: string | null;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class MenuResponseDto {
  @ApiProperty({ type: [MenuTreeItemDto] })
  generalMenus!: MenuTreeItemDto[];

  @ApiProperty({ type: [MenuTreeItemDto] })
  adminMenus!: MenuTreeItemDto[];

  @ApiProperty({ type: [FavoriteMenuDto] })
  favorites!: FavoriteMenuDto[];
}
