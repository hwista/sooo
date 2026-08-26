import { SetMetadata } from '@nestjs/common';
import type { CrmOperationsCapabilityKey } from './access.service.js';

export const CRM_REQUIRED_OPERATIONS_FEATURE_KEY = 'crm-required-operations-feature';

export const RequireCrmOperationsFeature = (capability: CrmOperationsCapabilityKey) =>
  SetMetadata(CRM_REQUIRED_OPERATIONS_FEATURE_KEY, capability);
