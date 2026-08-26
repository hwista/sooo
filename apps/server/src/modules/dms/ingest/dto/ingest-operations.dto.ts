import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SubmitIngestDto {
  @ApiProperty({ maxLength: 240 })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @ApiProperty({ maxLength: 5_000_000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5_000_000)
  content!: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  requestedBy?: string;

  @ApiPropertyOptional({ enum: ['local', 'nas'] })
  @IsOptional()
  @IsIn(['local', 'nas'])
  provider?: 'local' | 'nas';

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  relativePath?: string;

  @ApiPropertyOptional({ enum: ['manual', 'ingest', 'teams', 'network_drive'] })
  @IsOptional()
  @IsIn(['manual', 'ingest', 'teams', 'network_drive'])
  origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
}

export class CleanupIngestJobsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 3650, description: '미입력 시 DMS ingest.retentionDays 설정 사용' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  olderThanDays?: number;
}

export class IngestJobDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['local', 'nas'] })
  provider!: 'local' | 'nas';

  @ApiProperty()
  relativePath!: string;

  @ApiProperty()
  requestedBy!: string;

  @ApiProperty({ enum: ['manual', 'ingest', 'teams', 'network_drive'] })
  origin!: 'manual' | 'ingest' | 'teams' | 'network_drive';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ enum: ['draft', 'pending_confirm', 'processing', 'published', 'failed', 'cancelled'] })
  status!: 'draft' | 'pending_confirm' | 'processing' | 'published' | 'failed' | 'cancelled';

  @ApiProperty({ minimum: 0 })
  attemptCount!: number;

  @ApiPropertyOptional({ format: 'date-time' })
  lastAttemptAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  publishedAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  cancelledAt?: string;

  @ApiPropertyOptional()
  lastOperatedBy?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  storageUri?: string;

  @ApiPropertyOptional({ description: 'Git-managed Markdown 상대 경로' })
  docPath?: string;

  @ApiPropertyOptional({ description: '게시가 완료된 Git commit SHA' })
  commitHash?: string;

  @ApiPropertyOptional({ description: '게시가 완료된 Git branch' })
  publishedBranch?: string;
}

export class IngestJobListDto {
  @ApiProperty({ type: () => [IngestJobDto] })
  jobs!: IngestJobDto[];
}

export class IngestQueueLatestFailureDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty({ format: 'date-time' })
  at!: string;

  @ApiProperty()
  error!: string;
}

export class IngestQueueMetricsDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty()
  queueFilePath!: string;

  @ApiProperty({ minimum: 0 })
  queueFileBytes!: number;

  @ApiProperty({ minimum: 1 })
  maxConcurrentJobs!: number;

  @ApiProperty({ minimum: 0 })
  activeJobs!: number;

  @ApiProperty({ minimum: 1 })
  retentionDays!: number;

  @ApiProperty({ minimum: 0 })
  totalCount!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer', minimum: 0 },
    description: '상태별 작업 수',
  })
  counts!: Record<string, number>;

  @ApiPropertyOptional({ format: 'date-time' })
  oldestPendingAt?: string;

  @ApiPropertyOptional({ type: () => IngestQueueLatestFailureDto })
  latestFailure?: IngestQueueLatestFailureDto;
}

export class CleanupIngestJobsResultDto {
  @ApiProperty({ format: 'date-time' })
  cutoff!: string;

  @ApiProperty({ minimum: 0 })
  removedCount!: number;

  @ApiProperty({ minimum: 0 })
  retainedCount!: number;

  @ApiProperty({ type: [String] })
  removedJobIds!: string[];
}
