import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { FileModule } from '../file/file.module.js';
import { storageAdapterService } from '../storage/storage-adapter.service.js';
import { TemplatesModule } from '../templates/templates.module.js';
import { DmsCrmQuoteLifecycleController } from './crm-quote-lifecycle.controller.js';
import {
  DMS_CRM_QUOTE_LIFECYCLE_STORAGE,
  DmsCrmQuoteLifecycleService,
} from './crm-quote-lifecycle.service.js';

@Module({
  imports: [AccessModule, FileModule, TemplatesModule],
  controllers: [DmsCrmQuoteLifecycleController],
  providers: [
    DmsCrmQuoteLifecycleService,
    {
      provide: DMS_CRM_QUOTE_LIFECYCLE_STORAGE,
      useValue: storageAdapterService,
    },
  ],
  exports: [DmsCrmQuoteLifecycleService],
})
export class DmsCrmQuoteLifecycleModule {}
