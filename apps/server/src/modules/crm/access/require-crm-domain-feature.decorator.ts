import { SetMetadata } from '@nestjs/common';
import type { CrmDomainAccessCapabilityKey } from './access.service.js';

export const CRM_REQUIRED_DOMAIN_FEATURE_KEY = 'crm-required-domain-feature';

export const RequireCrmDomainFeature = (capability: CrmDomainAccessCapabilityKey) =>
  SetMetadata(CRM_REQUIRED_DOMAIN_FEATURE_KEY, capability);
