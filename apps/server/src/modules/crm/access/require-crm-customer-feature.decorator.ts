import { SetMetadata } from '@nestjs/common';
import type { CrmCustomerCapabilityKey } from './access.service.js';

export interface CrmCustomerFeatureRequirement {
  capability: CrmCustomerCapabilityKey;
  customerIdParam?: string;
}

export const CRM_REQUIRED_CUSTOMER_FEATURE_KEY = 'crm-required-customer-feature';

export const RequireCrmCustomerFeature = (
  capability: CrmCustomerCapabilityKey,
  options?: { customerIdParam?: string },
) =>
  SetMetadata(CRM_REQUIRED_CUSTOMER_FEATURE_KEY, {
    capability,
    customerIdParam: options?.customerIdParam,
  } satisfies CrmCustomerFeatureRequirement);
