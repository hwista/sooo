import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { DmsCrmQuoteLifecycleService } from './crm-quote-lifecycle.service.js';
import { DmsCrmQuoteLifecycleExecutionDto } from './dto/crm-quote-lifecycle.dto.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/crm-quote-lifecycle')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canWriteDocuments')
export class DmsCrmQuoteLifecycleController {
  constructor(private readonly lifecycleService: DmsCrmQuoteLifecycleService) {}

  @Post('executions')
  @ApiOperation({ summary: 'CRM 견적 handoff 기반 DMS lifecycle artifact 생성' })
  @ApiBody({ type: DmsCrmQuoteLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS 견적 artifact와 CRM evidence step 반환' })
  async execute(
    @Body() body: DmsCrmQuoteLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.lifecycleService.execute(body, currentUser));
  }
}
