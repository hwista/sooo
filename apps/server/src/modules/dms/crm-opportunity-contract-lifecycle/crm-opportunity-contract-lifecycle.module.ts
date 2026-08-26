import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module.js';
import { storageAdapterService } from '../storage/storage-adapter.service.js';
import { TemplatesModule } from '../templates/templates.module.js';
import {
  DMS_CRM_OPPORTUNITY_CONTRACT_LIFECYCLE_STORAGE,
  DmsCrmOpportunityContractLifecycleService,
} from './crm-opportunity-contract-lifecycle.service.js';

@Module({
  imports: [FileModule, TemplatesModule],
  providers: [
    DmsCrmOpportunityContractLifecycleService,
    {
      provide: DMS_CRM_OPPORTUNITY_CONTRACT_LIFECYCLE_STORAGE,
      useValue: storageAdapterService,
    },
  ],
  exports: [DmsCrmOpportunityContractLifecycleService],
})
export class DmsCrmOpportunityContractLifecycleModule {}
