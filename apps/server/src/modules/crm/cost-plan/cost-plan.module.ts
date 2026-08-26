import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { CrmOperationAttemptModule } from '../operations/operation-attempt.module.js';
import { AccountingPaymentExternalExecutorService } from './accounting-payment-external-executor.service.js';
import { CostPlanController } from './cost-plan.controller.js';
import { CostPlanService } from './cost-plan.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule, OpportunityModule, ContractModule, CrmOperationAttemptModule],
  controllers: [CostPlanController],
  providers: [AccountingPaymentExternalExecutorService, CostPlanService],
  exports: [CostPlanService],
})
export class CostPlanModule {}
