import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from './access.service.js';

@ApiTags('crm-access')
@ApiBearerAuth()
@Controller('crm/access')
@UseGuards(RolesGuard)
export class CrmAccessController {
  constructor(private readonly accessService: CrmAccessService) {}

  @Get('me')
  @ApiOperation({ summary: 'CRM 계약·계획·원가·보고·공급자 설정 전역 접근 스냅샷' })
  @ApiOkResponse({ description: '공용 permission resolution 기반 CRM 도메인 접근 스냅샷' })
  async myAccess(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getDomainAccess(currentUser));
  }
}
