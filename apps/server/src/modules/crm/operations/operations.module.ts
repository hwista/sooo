import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { TemplatesModule } from '../../dms/templates/templates.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { CostPlanModule } from '../cost-plan/cost-plan.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { QuoteSettingsModule } from '../quote-settings/quote-settings.module.js';
import { OperationsController } from './operations.controller.js';
import { CrmSettingsController } from './settings.controller.js';
import { CrmDataQualityService } from './data-quality.service.js';
import { OperationsService } from './operations.service.js';
import { CrmOperationAttemptModule } from './operation-attempt.module.js';
import { CrmOperationRetryService } from './operation-retry.service.js';
import { CrmLaunchReadinessService } from './launch-readiness.service.js';
import { CrmReadinessService } from './readiness.service.js';
import { CrmSettingsService } from './settings.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule, OpportunityModule, ContractModule, CostPlanModule, QuoteSettingsModule, TemplatesModule, CrmOperationAttemptModule],
  controllers: [OperationsController, CrmSettingsController],
  providers: [OperationsService, CrmSettingsService, CrmReadinessService, CrmLaunchReadinessService, CrmDataQualityService, CrmOperationRetryService],
  exports: [CrmSettingsService, CrmReadinessService, CrmLaunchReadinessService, CrmDataQualityService],
})
export class OperationsModule {}
