import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiOkEnvelopeResponse } from '../../../common/swagger/api-response.decorator.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import {
  CleanupIngestJobsDto,
  CleanupIngestJobsResultDto,
  IngestJobDto,
  IngestJobListDto,
  IngestQueueMetricsDto,
  SubmitIngestDto,
} from './dto/ingest-operations.dto.js';
import { IngestQueueService } from './ingest-queue.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/ingest')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canManageStorage')
export class IngestController {
  constructor(
    private readonly ingestQueueService: IngestQueueService,
  ) {}

  @Post('submit')
  @ApiOperation({ summary: 'DMS 수집 작업 생성' })
  @ApiOkEnvelopeResponse(IngestJobDto, { description: '수집 작업 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async submit(
    @Body() body: SubmitIngestDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.ingestQueueService.submit({
      title: body.title,
      content: body.content,
      requestedBy: body.requestedBy?.trim() || currentUser.loginId,
      submittedBy: currentUser.loginId,
      provider: body.provider,
      relativePath: body.relativePath,
      origin: body.origin }));
  }

  @Get('jobs')
  @ApiOperation({ summary: 'DMS 수집 작업 목록 조회' })
  @ApiOkEnvelopeResponse(IngestJobListDto, { description: '수집 작업 목록 반환' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  list() {
    return success({ jobs: this.ingestQueueService.list() });
  }

  @Get('jobs/metrics')
  @ApiOperation({ summary: 'DMS 수집 큐 운영 지표 조회' })
  @ApiOkEnvelopeResponse(IngestQueueMetricsDto, { description: '상태별 작업 수와 동시 처리/보존 정책 반환' })
  metrics() {
    return success(this.ingestQueueService.getMetrics());
  }

  @Post('jobs/cleanup')
  @ApiOperation({ summary: '보존 기간이 지난 게시·취소 수집 작업 정리' })
  @ApiOkEnvelopeResponse(CleanupIngestJobsResultDto, { description: '정리 결과 반환' })
  async cleanup(@Body() body: CleanupIngestJobsDto) {
    return success(await this.ingestQueueService.cleanup(body.olderThanDays));
  }

  @Post('jobs/:id/confirm')
  @ApiOperation({ summary: 'DMS 수집 작업 승인' })
  @ApiOkEnvelopeResponse(IngestJobDto, { description: '승인된 수집 작업 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async confirm(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    if (!id.trim()) {
      throw new BadRequestException('job id가 필요합니다.');
    }

    return success(await this.ingestQueueService.confirm(id, currentUser.loginId));
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: '실패한 DMS 수집 작업 재시도' })
  @ApiOkEnvelopeResponse(IngestJobDto, { description: '재시도된 수집 작업 반환' })
  async retry(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    if (!id.trim()) throw new BadRequestException('job id가 필요합니다.');
    return success(await this.ingestQueueService.retry(id, currentUser.loginId));
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: '대기·실패 DMS 수집 작업 취소' })
  @ApiOkEnvelopeResponse(IngestJobDto, { description: '취소된 수집 작업 반환' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    if (!id.trim()) throw new BadRequestException('job id가 필요합니다.');
    return success(await this.ingestQueueService.cancel(id, currentUser.loginId));
  }
}
