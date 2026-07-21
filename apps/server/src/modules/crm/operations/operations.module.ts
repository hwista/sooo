import { Module } from '@nestjs/common';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { QuoteSettingsModule } from '../quote-settings/quote-settings.module.js';
import { OperationsController } from './operations.controller.js';
import { OperationsService } from './operations.service.js';

@Module({
  imports: [CrmAccessModule, OpportunityModule, ContractModule, QuoteSettingsModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
