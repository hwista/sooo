import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { QuoteSettingsController } from './quote-settings.controller.js';
import { QuoteSettingsService } from './quote-settings.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule],
  controllers: [QuoteSettingsController],
  providers: [QuoteSettingsService],
  exports: [QuoteSettingsService],
})
export class QuoteSettingsModule {}
