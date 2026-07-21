import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from './access.service.js';
import {
  CRM_REQUIRED_CUSTOMER_FEATURE_KEY,
  type CrmCustomerFeatureRequirement,
} from './require-crm-customer-feature.decorator.js';

@Injectable()
export class CrmCustomerFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: CrmAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<CrmCustomerFeatureRequirement>(
      CRM_REQUIRED_CUSTOMER_FEATURE_KEY,
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

    const customerId = requirement.customerIdParam
      ? request.params?.[requirement.customerIdParam]
      : undefined;

    await this.accessService.assertCustomerCapability(
      request.user,
      requirement.capability,
      customerId,
    );
    return true;
  }
}
