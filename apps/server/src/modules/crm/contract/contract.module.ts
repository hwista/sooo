import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { DmsCrmContractLifecycleModule } from '../../dms/crm-contract-lifecycle/crm-contract-lifecycle.module.js';
import { FileModule } from '../../dms/file/file.module.js';
import { TemplatesModule } from '../../dms/templates/templates.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { QuoteSettingsModule } from '../quote-settings/quote-settings.module.js';
import { ContractController } from './contract.controller.js';
import { ContractService } from './contract.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule, QuoteSettingsModule, FileModule, TemplatesModule, DmsCrmContractLifecycleModule],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
