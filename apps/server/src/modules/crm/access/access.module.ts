import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { CrmAccessService } from './access.service.js';
import { CrmAccessController } from './access.controller.js';
import { CrmCustomerFeatureGuard } from './crm-customer-feature.guard.js';
import { CrmDomainFeatureGuard } from './crm-domain-feature.guard.js';
import { CrmOpportunityFeatureGuard } from './crm-opportunity-feature.guard.js';
import { CrmOperationsFeatureGuard } from './crm-operations-feature.guard.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule],
  controllers: [CrmAccessController],
  providers: [CrmAccessService, CrmOpportunityFeatureGuard, CrmCustomerFeatureGuard, CrmDomainFeatureGuard, CrmOperationsFeatureGuard],
  exports: [CrmAccessService, CrmOpportunityFeatureGuard, CrmCustomerFeatureGuard, CrmDomainFeatureGuard, CrmOperationsFeatureGuard],
})
export class CrmAccessModule {}
