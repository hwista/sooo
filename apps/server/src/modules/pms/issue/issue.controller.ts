import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, GoneException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { IssueService } from './issue.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { UpdateIssueDto } from '@ssoo/types';

@ApiTags('issues')
@ApiBearerAuth()
@Controller('projects/:projectId/issues')
@UseGuards(RolesGuard, ProjectFeatureGuard)
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 이슈 목록' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('statusCode') statusCode?: string,
    @Query('issueTypeCode') issueTypeCode?: string,
  ) {
    const data = await this.issueService.findByProject(BigInt(projectId), { statusCode, issueTypeCode });
    return success(data.map((i) => serializeBigInt(i)));
  }

  @Get('cleanup-summary')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '기존 Issue cleanup 요약' })
  async getCleanupSummary(@Param('projectId') projectId: string) {
    const data = await this.issueService.getCleanupSummary(BigInt(projectId));
    return success(data);
  }

  @Post('cleanup-terminal/archive')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '완료된 기존 Issue cleanup 행 일괄 숨김' })
  async archiveTerminalCleanupRows(@Param('projectId') projectId: string) {
    const data = await this.issueService.archiveTerminalCleanupRows(BigInt(projectId));
    return success(data);
  }

  @Post('cleanup-pending/canonicalize')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '열린 기존 Issue cleanup 행 일괄 정식 전환' })
  async canonicalizePendingCleanupRows(@Param('projectId') projectId: string) {
    const data = await this.issueService.canonicalizePendingCleanupRows(BigInt(projectId));
    return success(data);
  }

  @Get(':id')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '이슈 상세' })
  async findOne(@Param('id') id: string) {
    const result = await this.issueService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '기존 Issue 신규 생성 차단' })
  async create() {
    throw new GoneException({
      code: 'PMS_LEGACY_ISSUE_WRITE_DISABLED',
      message: '기존 Issue 신규 생성은 중단되었습니다. 정식 통제 이슈/리스크/변경요청 API를 사용하세요.',
    });
  }

  @Put(':id')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '이슈 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    const result = await this.issueService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @RequireProjectFeature('canManageIssues')
  @ApiOperation({ summary: '이슈 삭제' })
  async remove(@Param('id') id: string) {
    const result = await this.issueService.remove(BigInt(id));
    return deleted(!!result);
  }
}
