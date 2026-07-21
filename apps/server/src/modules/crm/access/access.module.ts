import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { CrmAccessService } from './access.service.js';
import { CrmCustomerFeatureGuard } from './crm-customer-feature.guard.js';
import { CrmOpportunityFeatureGuard } from './crm-opportunity-feature.guard.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule],
  providers: [CrmAccessService, CrmOpportunityFeatureGuard, CrmCustomerFeatureGuard],
  exports: [CrmAccessService, CrmOpportunityFeatureGuard, CrmCustomerFeatureGuard],
})
export class CrmAccessModule {}
