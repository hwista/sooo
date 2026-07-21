import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from './access.service.js';
import {
  CRM_REQUIRED_OPPORTUNITY_FEATURE_KEY,
  type CrmOpportunityFeatureRequirement,
} from './require-crm-opportunity-feature.decorator.js';

@Injectable()
export class CrmOpportunityFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: CrmAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<CrmOpportunityFeatureRequirement>(
      CRM_REQUIRED_OPPORTUNITY_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { params?: Record<string, string | undefined>; user?: TokenPayload }
    >();

    if (!request.user) {
      return false;
    }

    const opportunityId = requirement.opportunityIdParam
      ? request.params?.[requirement.opportunityIdParam]
      : undefined;

    await this.accessService.assertOpportunityCapability(
      request.user,
      requirement.capability,
      opportunityId,
    );
    return true;
  }
}
