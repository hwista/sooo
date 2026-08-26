import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class GitSettingsUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  repositoryPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  bootstrapRemoteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bootstrapBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoInit?: boolean;
}

class StorageProviderUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  basePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  webBaseUrl?: string;
}

class StorageSettingsUpdateDto {
  @ApiPropertyOptional({ enum: ['local', 'nas'] })
  @IsOptional()
  @IsIn(['local', 'nas'])
  defaultProvider?: 'local' | 'nas';

  @ApiPropertyOptional({ type: () => StorageProviderUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StorageProviderUpdateDto)
  local?: StorageProviderUpdateDto;

  @ApiPropertyOptional({ type: () => StorageProviderUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StorageProviderUpdateDto)
  nas?: StorageProviderUpdateDto;
}

class IngestSettingsUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  queuePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 64 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  maxConcurrentJobs?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 3650 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays?: number;
}

class ExtractionSettingsUpdateDto {
  @ApiPropertyOptional({ minimum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  maxTextLength?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxImages?: number;

  @ApiPropertyOptional({ minimum: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  maxImageSizeMb?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pdfMaxRenderPages?: number;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(4)
  pdfRenderScale?: number;
}

class UploadSettingsUpdateDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 10240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10240)
  attachmentMaxSizeMb?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10240)
  imageMaxSizeMb?: number;
}

class SearchSettingsUpdateDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxResults?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  semanticThreshold?: number;

  @ApiPropertyOptional({ minimum: 100 })
  @IsOptional()
  @IsInt()
  @Min(100)
  chunkSize?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  chunkOverlap?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 64 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  summaryConcurrency?: number;
}

class DocAssistSettingsUpdateDto {
  @ApiPropertyOptional({ minimum: 500 })
  @IsOptional()
  @IsInt()
  @Min(500)
  maxCurrentContentChars?: number;

  @ApiPropertyOptional({ minimum: 100 })
  @IsOptional()
  @IsInt()
  @Min(100)
  maxTemplateChars?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxSummaryFileCount?: number;

  @ApiPropertyOptional({ minimum: 100 })
  @IsOptional()
  @IsInt()
  @Min(100)
  maxSummaryFileChars?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxImagesPerRequest?: number;
}

class ApprovalRoutePolicyUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  routeKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  routeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  policyVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  organizationScope?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  requiredRoles?: string[];
}

class ExportPolicyUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  policyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  policyVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  organizationScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  markdownRecordRootPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  storageArtifactRootPath?: string;
}

class LegacyTemplateSettingsUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  rootPath?: string;
}

class SystemSettingsUpdateDto {
  @ApiPropertyOptional({ type: () => GitSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GitSettingsUpdateDto)
  git?: GitSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => StorageSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => StorageSettingsUpdateDto)
  storage?: StorageSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => IngestSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IngestSettingsUpdateDto)
  ingest?: IngestSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => LegacyTemplateSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LegacyTemplateSettingsUpdateDto)
  templates?: LegacyTemplateSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => ExtractionSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExtractionSettingsUpdateDto)
  extraction?: ExtractionSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => UploadSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UploadSettingsUpdateDto)
  uploads?: UploadSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => SearchSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SearchSettingsUpdateDto)
  search?: SearchSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => DocAssistSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DocAssistSettingsUpdateDto)
  docAssist?: DocAssistSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => ApprovalRoutePolicyUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ApprovalRoutePolicyUpdateDto)
  crmContractApprovalRoute?: ApprovalRoutePolicyUpdateDto;

  @ApiPropertyOptional({ type: () => ExportPolicyUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExportPolicyUpdateDto)
  crmContractExportPolicy?: ExportPolicyUpdateDto;
}

class PersonalIdentityUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
}

class PersonalWorkspaceUpdateDto {
  @ApiPropertyOptional({ enum: ['system', 'personal'] })
  @IsOptional()
  @IsIn(['system', 'personal'])
  defaultSettingsScope?: 'system' | 'personal';

  @ApiPropertyOptional({ enum: ['system-default', 'local', 'nas'] })
  @IsOptional()
  @IsIn(['system-default', 'local', 'nas'])
  preferredStorageProvider?: 'system-default' | 'local' | 'nas';
}

class PersonalViewerUpdateDto {
  @ApiPropertyOptional({ enum: [75, 100, 125, 150, 175, 200] })
  @IsOptional()
  @IsIn([75, 100, 125, 150, 175, 200])
  defaultZoom?: number;
}

class PersonalSidebarSectionsUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bookmarks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openTabs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fileTree?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  changes?: boolean;
}

class PersonalSidebarUpdateDto {
  @ApiPropertyOptional({ type: () => PersonalSidebarSectionsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PersonalSidebarSectionsUpdateDto)
  sections?: PersonalSidebarSectionsUpdateDto;
}

class PersonalSettingsUpdateDto {
  @ApiPropertyOptional({ type: () => PersonalIdentityUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PersonalIdentityUpdateDto)
  identity?: PersonalIdentityUpdateDto;

  @ApiPropertyOptional({ type: () => PersonalWorkspaceUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PersonalWorkspaceUpdateDto)
  workspace?: PersonalWorkspaceUpdateDto;

  @ApiPropertyOptional({ type: () => PersonalViewerUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PersonalViewerUpdateDto)
  viewer?: PersonalViewerUpdateDto;

  @ApiPropertyOptional({ type: () => PersonalSidebarUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PersonalSidebarUpdateDto)
  sidebar?: PersonalSidebarUpdateDto;
}

class DmsSettingsUpdateConfigDto {
  @ApiPropertyOptional({ type: () => SystemSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SystemSettingsUpdateDto)
  system?: SystemSettingsUpdateDto;

  @ApiPropertyOptional({ type: () => PersonalSettingsUpdateDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PersonalSettingsUpdateDto)
  personal?: PersonalSettingsUpdateDto;
}

export class UpdateDmsSettingsDto {
  @ApiPropertyOptional({ enum: ['update', 'updateGitPath'], default: 'update' })
  @IsOptional()
  @IsIn(['update', 'updateGitPath'])
  action?: 'update' | 'updateGitPath';

  @ApiPropertyOptional({ type: () => DmsSettingsUpdateConfigDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DmsSettingsUpdateConfigDto)
  config?: DmsSettingsUpdateConfigDto;
}
