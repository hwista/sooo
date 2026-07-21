import { Module } from '@nestjs/common';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { QuoteSettingsModule } from '../quote-settings/quote-settings.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [CrmAccessModule, OpportunityModule, ContractModule, QuoteSettingsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
