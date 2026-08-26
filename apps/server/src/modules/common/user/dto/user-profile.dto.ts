import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  loginId!: string;

  @ApiPropertyOptional({ nullable: true })
  userName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'email' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  departmentCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  positionCode!: string | null;

  @ApiProperty()
  roleCode!: string;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: Date | null;
}
