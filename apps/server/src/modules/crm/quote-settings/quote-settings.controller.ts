import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import { CrmQuoteSellerProfileUpsertDto } from './dto/quote-settings.dto.js';
import { QuoteSettingsService } from './quote-settings.service.js';

@ApiTags('crm-quote-settings')
@ApiBearerAuth()
@Controller('crm/quote-seller-profile')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class QuoteSettingsController {
  constructor(private readonly quoteSettingsService: QuoteSettingsService) {}

  @Get()
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 견적서 공급자 표시 정보 조회' })
  @ApiOkResponse({ description: '견적서에 표시할 공급자 회사 정보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 조회 권한 없음' })
  async sellerProfile() {
    return success(await this.quoteSettingsService.getSellerProfile());
  }

  @Put()
  @RequireCrmOpportunityFeature('canEditOpportunity')
  @ApiOperation({ summary: 'CRM 견적서 공급자 표시 정보 저장' })
  @ApiBody({ type: CrmQuoteSellerProfileUpsertDto })
  @ApiOkResponse({ description: '저장된 견적서 공급자 회사 정보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 수정 권한 없음' })
  async updateSellerProfile(
    @Body() body: CrmQuoteSellerProfileUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.quoteSettingsService.upsertSellerProfile(body, BigInt(currentUser.userId)));
  }
}
