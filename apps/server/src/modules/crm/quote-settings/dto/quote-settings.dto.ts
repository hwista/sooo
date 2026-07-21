import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { CrmQuoteSellerCiStatus, CrmQuoteSellerProfileUpsertRequest } from '@ssoo/types/crm';

const CRM_QUOTE_SELLER_CI_STATUSES = ['not-configured', 'dms-planned', 'configured'] as const;

export class CrmQuoteSellerProfileUpsertDto implements CrmQuoteSellerProfileUpsertRequest {
  @ApiProperty({ description: '견적서에 표시할 공급자 회사명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({ description: '대표이사명', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  ceoName?: string;

  @ApiPropertyOptional({ description: '사업자등록번호', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  businessRegistrationNo?: string;

  @ApiPropertyOptional({ description: '회사 주소', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '대표 전화번호', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  tel?: string;

  @ApiPropertyOptional({ description: '팩스 번호', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  fax?: string;

  @ApiPropertyOptional({ description: '웹사이트', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: '대표 이메일', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'CI 연결 상태', enum: CRM_QUOTE_SELLER_CI_STATUSES })
  @IsString()
  @IsIn(CRM_QUOTE_SELLER_CI_STATUSES)
  @IsOptional()
  ciStatus?: CrmQuoteSellerCiStatus;

  @ApiPropertyOptional({ description: 'CI 파일 저장소 참조. 업로드는 DMS가 소유하고 계약 DMS 문서 패킷에서 참조를 검증합니다.', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  ciStorageRef?: string;

  @ApiPropertyOptional({ description: '관리 메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}
