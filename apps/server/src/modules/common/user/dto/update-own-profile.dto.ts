import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @ApiPropertyOptional({ description: '이름' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  userName?: string;

  @ApiPropertyOptional({ description: '표시명' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: '전화번호' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: '부서' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departmentCode?: string;

  @ApiPropertyOptional({ description: '직책' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  positionCode?: string;
}
