import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { BusinessPlanController } from './business-plan.controller.js';
import { BusinessPlanService } from './business-plan.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule, OpportunityModule, ContractModule],
  controllers: [BusinessPlanController],
  providers: [BusinessPlanService],
})
export class BusinessPlanModule {}
