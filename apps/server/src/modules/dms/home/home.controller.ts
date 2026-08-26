import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { ApiOkObjectResponse } from '../../../common/swagger/api-response.decorator.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { AcknowledgeHomeSeenDto, RecordDocumentVisitDto } from './dto/home.dto.js';
import { HomeService } from './home.service.js';

@ApiTags('dms-home')
@ApiBearerAuth()
@Controller('dms/home')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canReadDocuments')
export class DmsHomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOperation({ summary: '사용자별 DMS 홈 작업 허브 조회' })
  @ApiOkObjectResponse({ description: '권한 필터링된 홈 작업 요약' })
  @ApiInternalServerErrorResponse({ type: ApiError })
  async getSummary(@CurrentUser() user: TokenPayload) {
    return success(await this.homeService.getSummary(user));
  }

  @Post('visits')
  @ApiOperation({ summary: '성공한 문서 열람 기록' })
  @ApiOkObjectResponse({ description: '갱신된 사용자별 문서 열람 이력' })
  @ApiBadRequestResponse({ type: ApiError })
  async recordVisit(
    @CurrentUser() user: TokenPayload,
    @Body() body: RecordDocumentVisitDto,
  ) {
    return success(await this.homeService.recordVisit(user, body.path));
  }

  @Post('seen')
  @ApiOperation({ summary: '홈 변경 요약 확인 시각 기록' })
  @ApiOkObjectResponse({ description: '단조 증가로 저장된 마지막 확인 시각' })
  @ApiBadRequestResponse({ type: ApiError })
  async acknowledgeSeen(
    @CurrentUser() user: TokenPayload,
    @Body() body: AcknowledgeHomeSeenDto,
  ) {
    return success(await this.homeService.acknowledgeSeen(user, body.seenAt));
  }
}
