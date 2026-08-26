import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeUserSessionsDto {
  @ApiPropertyOptional({ description: '운영자 세션 회수 사유' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
