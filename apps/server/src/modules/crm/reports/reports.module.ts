import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule, OpportunityModule, ContractModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
