import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'PLATFORM-DEV' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  orgCode!: string;

  @ApiProperty({ example: '플랫폼개발팀' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  orgName!: string;

  @ApiProperty({ enum: ['company', 'division', 'department', 'team', 'external'] })
  @IsIn(['company', 'division', 'department', 'team', 'external'])
  orgType!: string;

  @ApiPropertyOptional({ enum: ['internal', 'external'], default: 'internal' })
  @IsOptional()
  @IsIn(['internal', 'external'])
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  levelType?: string;

  @ApiPropertyOptional({ description: '상위 조직 ID' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  parentOrgId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  orgName?: string;

  @ApiPropertyOptional({ enum: ['company', 'division', 'department', 'team', 'external'] })
  @IsOptional()
  @IsIn(['company', 'division', 'department', 'team', 'external'])
  orgType?: string;

  @ApiPropertyOptional({ enum: ['internal', 'external'] })
  @IsOptional()
  @IsIn(['internal', 'external'])
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  levelType?: string;

  @ApiPropertyOptional({ description: '상위 조직 ID. null이면 최상위로 이동' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  parentOrgId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
