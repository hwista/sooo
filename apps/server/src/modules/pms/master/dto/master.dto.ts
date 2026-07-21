import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

const PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES = ['sites', 'systemCatalogs', 'systemInstances', 'integrations'] as const;

export type PmsMasterImportProfileEntityType = typeof PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES[number];

export class FindMasterItemsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: '플랜트/사이트 ID' })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({ description: '시스템 카탈로그 ID' })
  @IsString()
  @IsOptional()
  systemCatalogId?: string;

  @ApiPropertyOptional({ description: '시스템 인스턴스 ID' })
  @IsString()
  @IsOptional()
  systemInstanceId?: string;

  @ApiPropertyOptional({ description: '비활성 데이터 포함 여부' })
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;
}

export class MasterSummaryDto {
  @ApiProperty()
  sites!: number;

  @ApiProperty()
  systemCatalogs!: number;

  @ApiProperty()
  systemInstances!: number;

  @ApiProperty()
  integrations!: number;
}

export class FindPmsMasterImportProfilesDto {
  @ApiPropertyOptional({ enum: PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES })
  @IsIn(PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES)
  @IsOptional()
  entityType?: PmsMasterImportProfileEntityType;
}

export class PmsMasterImportProfileDto {
  @ApiProperty()
  profileId!: string;

  @ApiProperty({ enum: PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES })
  entityType!: PmsMasterImportProfileEntityType;

  @ApiProperty()
  profileName!: string;

  @ApiProperty()
  columnMapping!: Record<string, string>;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  memo?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PmsMasterImportProfileHistoryDto {
  @ApiProperty()
  profileId!: string;

  @ApiProperty()
  historySeq!: string;

  @ApiProperty({ enum: ['C', 'U', 'D'] })
  eventType!: 'C' | 'U' | 'D';

  @ApiProperty()
  eventAt!: string;

  @ApiProperty({ enum: PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES })
  entityType!: PmsMasterImportProfileEntityType;

  @ApiProperty()
  profileName!: string;

  @ApiProperty()
  columnMapping!: Record<string, string>;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  memo?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreatePmsMasterImportProfileDto {
  @ApiProperty({ enum: PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES })
  @IsIn(PMS_MASTER_IMPORT_PROFILE_ENTITY_TYPES)
  entityType!: PmsMasterImportProfileEntityType;

  @ApiProperty({ description: '프로필명', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  profileName!: string;

  @ApiProperty({ description: '반입 필드명과 파일 컬럼명의 매핑' })
  @IsObject()
  columnMapping!: Record<string, string>;

  @ApiPropertyOptional({ description: '대상 엔터티의 기본 공유 매핑으로 설정' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class UpdatePmsMasterImportProfileDto {
  @ApiPropertyOptional({ description: '프로필명', maxLength: 160 })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  profileName?: string;

  @ApiPropertyOptional({ description: '반입 필드명과 파일 컬럼명의 매핑' })
  @IsObject()
  @IsOptional()
  columnMapping?: Record<string, string>;

  @ApiPropertyOptional({ description: '대상 엔터티의 기본 공유 매핑으로 설정' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class RestorePmsMasterImportProfileDto {
  @ApiProperty({ description: '복구할 히스토리 순번' })
  @IsString()
  @IsNotEmpty()
  historySeq!: string;
}

export class CreatePlantSiteDto {
  @ApiProperty({ description: '플랜트/사이트 코드', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  siteCode!: string;

  @ApiProperty({ description: '플랜트/사이트명', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  siteName!: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string | null;

  @ApiPropertyOptional({ description: '사이트 유형 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  siteTypeCode?: string | null;

  @ApiPropertyOptional({ description: '지역 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  regionCode?: string | null;

  @ApiPropertyOptional({ description: '주소', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ description: '타임존', maxLength: 80 })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  timezone?: string | null;

  @ApiPropertyOptional({ description: '운영 담당자명', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  operationOwnerName?: string | null;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class UpdatePlantSiteDto {
  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string | null;

  @ApiPropertyOptional({ description: '플랜트/사이트명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  siteName?: string;

  @ApiPropertyOptional({ description: '사이트 유형 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  siteTypeCode?: string | null;

  @ApiPropertyOptional({ description: '지역 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  regionCode?: string | null;

  @ApiPropertyOptional({ description: '주소', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ description: '타임존', maxLength: 80 })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  timezone?: string | null;

  @ApiPropertyOptional({ description: '운영 담당자명', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  operationOwnerName?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class CreateSystemCatalogDto {
  @ApiProperty({ description: '시스템 종류 코드', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  catalogCode!: string;

  @ApiProperty({ description: '시스템 종류명', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  catalogName!: string;

  @ApiPropertyOptional({ description: '상위 시스템 종류 ID' })
  @IsString()
  @IsOptional()
  parentSystemCatalogId?: string | null;

  @ApiPropertyOptional({ description: '분류 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  categoryCode?: string | null;

  @ApiPropertyOptional({ description: '벤더명', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  vendorName?: string | null;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class UpdateSystemCatalogDto {
  @ApiPropertyOptional({ description: '상위 시스템 종류 ID' })
  @IsString()
  @IsOptional()
  parentSystemCatalogId?: string | null;

  @ApiPropertyOptional({ description: '시스템 종류명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  catalogName?: string;

  @ApiPropertyOptional({ description: '분류 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  categoryCode?: string | null;

  @ApiPropertyOptional({ description: '벤더명', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  vendorName?: string | null;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class CreateSystemInstanceDto {
  @ApiProperty({ description: '시스템 인스턴스 코드', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceCode!: string;

  @ApiProperty({ description: '시스템 인스턴스명', maxLength: 220 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  instanceName!: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string | null;

  @ApiPropertyOptional({ description: '플랜트/사이트 ID' })
  @IsString()
  @IsOptional()
  siteId?: string | null;

  @ApiPropertyOptional({ description: '시스템 종류 ID' })
  @IsString()
  @IsOptional()
  systemCatalogId?: string | null;

  @ApiPropertyOptional({ description: '환경 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  environmentCode?: string | null;

  @ApiPropertyOptional({ description: '운영 담당 유형 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  operationOwnerTypeCode?: string | null;

  @ApiPropertyOptional({ description: '운영 담당자명', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  operationOwnerName?: string | null;

  @ApiPropertyOptional({ description: '수명주기 상태 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  lifecycleStatusCode?: string | null;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class UpdateSystemInstanceDto {
  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string | null;

  @ApiPropertyOptional({ description: '플랜트/사이트 ID' })
  @IsString()
  @IsOptional()
  siteId?: string | null;

  @ApiPropertyOptional({ description: '시스템 종류 ID' })
  @IsString()
  @IsOptional()
  systemCatalogId?: string | null;

  @ApiPropertyOptional({ description: '시스템 인스턴스명', maxLength: 220 })
  @IsString()
  @IsOptional()
  @MaxLength(220)
  instanceName?: string;

  @ApiPropertyOptional({ description: '환경 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  environmentCode?: string | null;

  @ApiPropertyOptional({ description: '운영 담당 유형 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  operationOwnerTypeCode?: string | null;

  @ApiPropertyOptional({ description: '운영 담당자명', maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  operationOwnerName?: string | null;

  @ApiPropertyOptional({ description: '수명주기 상태 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  lifecycleStatusCode?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class CreateSystemIntegrationDto {
  @ApiProperty({ description: '인터페이스 코드', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  integrationCode!: string;

  @ApiProperty({ description: '인터페이스명', maxLength: 220 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  integrationName!: string;

  @ApiProperty({ description: '출발 시스템 인스턴스 ID' })
  @IsString()
  @IsNotEmpty()
  sourceSystemInstanceId!: string;

  @ApiProperty({ description: '도착 시스템 인스턴스 ID' })
  @IsString()
  @IsNotEmpty()
  targetSystemInstanceId!: string;

  @ApiPropertyOptional({ description: '방향 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  directionCode?: string | null;

  @ApiPropertyOptional({ description: '인터페이스 방식 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  interfaceTypeCode?: string | null;

  @ApiPropertyOptional({ description: '상태 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  statusCode?: string | null;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class UpdateSystemIntegrationDto {
  @ApiPropertyOptional({ description: '인터페이스명', maxLength: 220 })
  @IsString()
  @IsOptional()
  @MaxLength(220)
  integrationName?: string;

  @ApiPropertyOptional({ description: '출발 시스템 인스턴스 ID' })
  @IsString()
  @IsOptional()
  sourceSystemInstanceId?: string | null;

  @ApiPropertyOptional({ description: '도착 시스템 인스턴스 ID' })
  @IsString()
  @IsOptional()
  targetSystemInstanceId?: string | null;

  @ApiPropertyOptional({ description: '방향 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  directionCode?: string | null;

  @ApiPropertyOptional({ description: '인터페이스 방식 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  interfaceTypeCode?: string | null;

  @ApiPropertyOptional({ description: '상태 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  statusCode?: string | null;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class ImportPlantSiteDto extends CreatePlantSiteDto {
  @ApiPropertyOptional({ description: '고객사 코드' })
  @IsString()
  @IsOptional()
  customerCode?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ImportSystemCatalogDto extends CreateSystemCatalogDto {
  @ApiPropertyOptional({ description: '상위 시스템 종류 코드' })
  @IsString()
  @IsOptional()
  parentCatalogCode?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ImportSystemInstanceDto extends CreateSystemInstanceDto {
  @ApiPropertyOptional({ description: '고객사 코드' })
  @IsString()
  @IsOptional()
  customerCode?: string | null;

  @ApiPropertyOptional({ description: '플랜트/사이트 코드' })
  @IsString()
  @IsOptional()
  siteCode?: string | null;

  @ApiPropertyOptional({ description: '시스템 종류 코드' })
  @IsString()
  @IsOptional()
  systemCatalogCode?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ImportSystemIntegrationDto {
  @ApiProperty({ description: '인터페이스 코드', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  integrationCode!: string;

  @ApiProperty({ description: '인터페이스명', maxLength: 220 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  integrationName!: string;

  @ApiPropertyOptional({ description: '출발 시스템 인스턴스 ID' })
  @IsString()
  @IsOptional()
  sourceSystemInstanceId?: string | null;

  @ApiPropertyOptional({ description: '출발 시스템 인스턴스 코드' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sourceSystemInstanceCode?: string | null;

  @ApiPropertyOptional({ description: '도착 시스템 인스턴스 ID' })
  @IsString()
  @IsOptional()
  targetSystemInstanceId?: string | null;

  @ApiPropertyOptional({ description: '도착 시스템 인스턴스 코드' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  targetSystemInstanceCode?: string | null;

  @ApiPropertyOptional({ description: '방향 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  directionCode?: string | null;

  @ApiPropertyOptional({ description: '인터페이스 방식 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  interfaceTypeCode?: string | null;

  @ApiPropertyOptional({ description: '상태 코드', maxLength: 40 })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  statusCode?: string | null;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string | null;
}

export class PmsMasterImportOptionsDto {
  @ApiPropertyOptional({ description: '기존 코드가 있으면 갱신' })
  @IsBoolean()
  @IsOptional()
  updateExisting?: boolean;

  @ApiPropertyOptional({ description: '기존 비활성 행을 갱신할 때 활성화' })
  @IsBoolean()
  @IsOptional()
  reactivateExisting?: boolean;
}

export class PmsMasterImportDto {
  @ApiPropertyOptional({ enum: ['preview', 'apply'], default: 'preview' })
  @IsString()
  @IsOptional()
  mode?: 'preview' | 'apply';

  @ApiPropertyOptional({ type: PmsMasterImportOptionsDto })
  @IsObject()
  @IsOptional()
  options?: PmsMasterImportOptionsDto;

  @ApiPropertyOptional({ type: [ImportPlantSiteDto] })
  @IsArray()
  @IsOptional()
  sites?: ImportPlantSiteDto[];

  @ApiPropertyOptional({ type: [ImportSystemCatalogDto] })
  @IsArray()
  @IsOptional()
  systemCatalogs?: ImportSystemCatalogDto[];

  @ApiPropertyOptional({ type: [ImportSystemInstanceDto] })
  @IsArray()
  @IsOptional()
  systemInstances?: ImportSystemInstanceDto[];

  @ApiPropertyOptional({ type: [ImportSystemIntegrationDto] })
  @IsArray()
  @IsOptional()
  integrations?: ImportSystemIntegrationDto[];
}

export class PlantSiteDto {
  @ApiProperty()
  siteId!: string;

  @ApiPropertyOptional()
  customerId?: string | null;

  @ApiPropertyOptional()
  customerName?: string | null;

  @ApiProperty()
  siteCode!: string;

  @ApiProperty()
  siteName!: string;

  @ApiPropertyOptional()
  siteTypeCode?: string | null;

  @ApiPropertyOptional()
  regionCode?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  timezone?: string | null;

  @ApiPropertyOptional()
  operationOwnerName?: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class SystemCatalogDto {
  @ApiProperty()
  systemCatalogId!: string;

  @ApiPropertyOptional()
  parentSystemCatalogId?: string | null;

  @ApiProperty()
  catalogCode!: string;

  @ApiProperty()
  catalogName!: string;

  @ApiPropertyOptional()
  categoryCode?: string | null;

  @ApiPropertyOptional()
  vendorName?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class SystemInstanceDto {
  @ApiProperty()
  systemInstanceId!: string;

  @ApiPropertyOptional()
  customerId?: string | null;

  @ApiPropertyOptional()
  customerName?: string | null;

  @ApiPropertyOptional()
  siteId?: string | null;

  @ApiPropertyOptional()
  siteName?: string | null;

  @ApiPropertyOptional()
  systemCatalogId?: string | null;

  @ApiPropertyOptional()
  catalogName?: string | null;

  @ApiProperty()
  instanceCode!: string;

  @ApiProperty()
  instanceName!: string;

  @ApiPropertyOptional()
  environmentCode?: string | null;

  @ApiPropertyOptional()
  operationOwnerTypeCode?: string | null;

  @ApiPropertyOptional()
  operationOwnerName?: string | null;

  @ApiProperty()
  lifecycleStatusCode!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class SystemIntegrationDto {
  @ApiProperty()
  integrationId!: string;

  @ApiProperty()
  integrationCode!: string;

  @ApiProperty()
  integrationName!: string;

  @ApiProperty()
  sourceSystemInstanceId!: string;

  @ApiPropertyOptional()
  sourceSystemInstanceName?: string | null;

  @ApiProperty()
  targetSystemInstanceId!: string;

  @ApiPropertyOptional()
  targetSystemInstanceName?: string | null;

  @ApiPropertyOptional()
  directionCode?: string | null;

  @ApiPropertyOptional()
  interfaceTypeCode?: string | null;

  @ApiProperty()
  statusCode!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isActive!: boolean;
}
