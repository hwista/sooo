import { SetMetadata } from '@nestjs/common';
import type { CrmOpportunityCapabilityKey } from './access.service.js';

export interface CrmOpportunityFeatureRequirement {
  capability: CrmOpportunityCapabilityKey;
  opportunityIdParam?: string;
}

export const CRM_REQUIRED_OPPORTUNITY_FEATURE_KEY = 'crm-required-opportunity-feature';

export const RequireCrmOpportunityFeature = (
  capability: CrmOpportunityCapabilityKey,
  options?: { opportunityIdParam?: string },
) =>
  SetMetadata(CRM_REQUIRED_OPPORTUNITY_FEATURE_KEY, {
    capability,
    opportunityIdParam: options?.opportunityIdParam,
  } satisfies CrmOpportunityFeatureRequirement);
