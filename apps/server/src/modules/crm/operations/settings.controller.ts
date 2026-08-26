import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmOperationsFeatureGuard } from '../access/crm-operations-feature.guard.js';
import { RequireCrmOperationsFeature } from '../access/require-crm-operations-feature.decorator.js';
import { UpdateCrmSettingsDto } from './dto/settings.dto.js';
import { CrmSettingsService } from './settings.service.js';
import { CrmLaunchReadinessService } from './launch-readiness.service.js';

@ApiTags('crm-settings')
@ApiBearerAuth()
@Controller('crm/settings')
@UseGuards(RolesGuard, CrmOperationsFeatureGuard)
export class CrmSettingsController {
  constructor(
    private readonly settingsService: CrmSettingsService,
    private readonly launchReadinessService: CrmLaunchReadinessService,
  ) {}

  @Get()
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM 시스템 설정 조회' })
  @ApiOkResponse({ description: '비밀정보가 없는 CRM 도메인 설정과 provenance 반환' })
  async getSettings() {
    return success(await this.settingsService.getDefault());
  }

  @Get('history')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM 시스템 설정 변경 이력 조회' })
  async history(@Query('limit') limit?: string) {
    const parsed = Number.parseInt(limit ?? '50', 10);
    return success(await this.settingsService.listHistory(Number.isFinite(parsed) ? parsed : 50));
  }

  @Put()
  @RequireCrmOperationsFeature('canManageSettings')
  @ApiOperation({ summary: 'CRM 시스템 설정 갱신' })
  async update(
    @Body() body: UpdateCrmSettingsDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const settings = await this.settingsService.updateDefault(body, BigInt(currentUser.userId));
    this.launchReadinessService.invalidate();
    return success(settings);
  }
}
