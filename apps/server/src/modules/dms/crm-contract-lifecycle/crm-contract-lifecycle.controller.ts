import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { DmsCrmContractLifecycleExecutionDto } from './dto/crm-contract-lifecycle.dto.js';
import { DmsCrmContractLifecycleService } from './crm-contract-lifecycle.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/crm-contract-lifecycle')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canWriteDocuments')
export class DmsCrmContractLifecycleController {
  constructor(private readonly lifecycleService: DmsCrmContractLifecycleService) {}

  @Post('executions')
  @ApiOperation({ summary: 'CRM 계약 handoff 기반 DMS lifecycle artifact 생성' })
  @ApiBody({ type: DmsCrmContractLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS artifact와 CRM evidence step 반환' })
  async execute(
    @Body() body: DmsCrmContractLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.lifecycleService.execute(body, currentUser));
  }
}
