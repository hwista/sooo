import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService, type CrmDomainAccessCapabilityKey } from './access.service.js';
import { CRM_REQUIRED_DOMAIN_FEATURE_KEY } from './require-crm-domain-feature.decorator.js';

@Injectable()
export class CrmDomainFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: CrmAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.getAllAndOverride<CrmDomainAccessCapabilityKey>(
      CRM_REQUIRED_DOMAIN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!capability) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: TokenPayload }>();
    if (!request.user) return false;

    await this.accessService.assertDomainCapability(request.user, capability);
    return true;
  }
}
