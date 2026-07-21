import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class FindCustomersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (고객사명, 코드)' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class CustomerDto {
  @ApiProperty({ description: '고객사 ID' })
  id!: string;

  @ApiProperty({ description: '고객사 코드' })
  customerCode!: string;

  @ApiProperty({ description: '고객사명' })
  customerName!: string;

  @ApiPropertyOptional({ description: '고객사 유형' })
  customerType?: string;

  @ApiPropertyOptional({ description: '공용 Organization ID' })
  organizationId?: string | null;

  @ApiPropertyOptional({ description: '공용 Organization 코드' })
  organizationCode?: string | null;

  @ApiPropertyOptional({ description: '공용 Organization 명' })
  organizationName?: string | null;

  @ApiPropertyOptional({ description: '공용 Organization 유형' })
  organizationType?: string | null;

  @ApiPropertyOptional({ description: '공용 Organization 범위' })
  organizationScope?: string | null;

  @ApiPropertyOptional({ description: '업종' })
  industry?: string;

  @ApiPropertyOptional({ description: '주소' })
  address?: string;

  @ApiPropertyOptional({ description: '전화번호' })
  phone?: string;

  @ApiPropertyOptional({ description: '이메일' })
  email?: string;

  @ApiPropertyOptional({ description: '담당자명' })
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처' })
  contactPhone?: string;

  @ApiPropertyOptional({ description: '웹사이트' })
  website?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
