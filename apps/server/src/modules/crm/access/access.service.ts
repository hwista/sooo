import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CrmCustomerAccessFeatures,
  CrmCustomerAccessSnapshot,
  CrmCustomerGlobalAccessSnapshot,
  CrmOpportunityAccessFeatures,
  CrmOpportunityAccessSnapshot,
  CrmOpportunityGlobalAccessSnapshot,
} from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const CRM_OPPORTUNITY_OBJECT_TYPE = 'crm.opportunity';
const CRM_CUSTOMER_OBJECT_TYPE = 'crm.customer';

const CRM_OPPORTUNITY_PERMISSION_CODES = {
  read: 'crm.opportunity.read',
  write: 'crm.opportunity.write',
  confirm: 'crm.opportunity.confirm',
  manageVersion: 'crm.opportunity.version.manage',
} as const;

const CRM_CUSTOMER_PERMISSION_CODES = {
  read: 'crm.customer.read',
  write: 'crm.customer.write',
  activityRead: 'crm.customer.activity.read',
  activityWrite: 'crm.customer.activity.write',
} as const;

const CAPABILITY_ERROR_MESSAGES: Record<CrmOpportunityCapabilityKey, string> = {
  canViewOpportunity: 'CRM 영업기회를 조회할 권한이 없습니다.',
  canCreateOpportunity: 'CRM 영업기회를 등록할 권한이 없습니다.',
  canEditOpportunity: 'CRM 영업기회를 수정할 권한이 없습니다.',
  canConfirmOpportunity: 'CRM 영업기회를 확정하거나 확정 해제할 권한이 없습니다.',
  canAddVersion: 'CRM 영업기회 차수를 추가할 권한이 없습니다.',
};

const CUSTOMER_CAPABILITY_ERROR_MESSAGES: Record<CrmCustomerCapabilityKey, string> = {
  canViewCustomer: 'CRM 고객을 조회할 권한이 없습니다.',
  canCreateCustomer: 'CRM 고객을 등록할 권한이 없습니다.',
  canEditCustomer: 'CRM 고객을 수정할 권한이 없습니다.',
  canViewCustomerActivity: 'CRM 고객 활동을 조회할 권한이 없습니다.',
  canCreateCustomerActivity: 'CRM 고객 활동을 등록할 권한이 없습니다.',
};

const buildOpportunityFeatures = (enabled: boolean): CrmOpportunityAccessFeatures => ({
  canViewOpportunity: enabled,
  canCreateOpportunity: enabled,
  canEditOpportunity: enabled,
  canConfirmOpportunity: enabled,
  canAddVersion: enabled,
});

const buildCustomerFeatures = (enabled: boolean): CrmCustomerAccessFeatures => ({
  canViewCustomer: enabled,
  canCreateCustomer: enabled,
  canEditCustomer: enabled,
  canViewCustomerActivity: enabled,
  canCreateCustomerActivity: enabled,
});

export type CrmOpportunityCapabilityKey = keyof CrmOpportunityAccessFeatures;
export type CrmCustomerCapabilityKey = keyof CrmCustomerAccessFeatures;

interface CrmOpportunityAccessRow {
  id: bigint;
  opportunityCode: string;
  opportunityGroupCode: string;
  ownerName: string;
  ownerUserId: bigint | null;
}

interface CrmCustomerAccessRow {
  id: bigint;
  customerCode: string;
  ownerName: string;
  ownerUserId: bigint | null;
}

@Injectable()
export class CrmAccessService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {}

  async getGlobalOpportunityAccess(user: TokenPayload): Promise<CrmOpportunityGlobalAccessSnapshot> {
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        features: buildOpportunityFeatures(true),
        policy: actionContext.policy,
      };
    }

    return {
      features: this.buildFeaturesFromPermissionCodes(actionContext.grantedPermissionCodes),
      policy: actionContext.policy,
    };
  }

  async getOpportunityAccess(
    id: string,
    user: TokenPayload,
  ): Promise<CrmOpportunityAccessSnapshot> {
    const row = await this.findOpportunityRow(id);
    if (!row) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);
    const isOpportunityOwnerUserMatch = this.isOwnerUserMatch(row.ownerUserId, user);
    const isOpportunityOwnerNameMatch = this.isOwnerNameMatch(row.ownerName, user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        opportunityId: row.opportunityCode,
        groupId: row.opportunityGroupCode,
        features: buildOpportunityFeatures(true),
        roles: {
          isOpportunityOwnerUserMatch,
          isOpportunityOwnerNameMatch,
          ownerUserId: row.ownerUserId?.toString() ?? null,
          ownerName: row.ownerName,
        },
        policy: actionContext.policy,
      };
    }

    const domainGrantedPermissionCodes = new Set<string>();
    if (isOpportunityOwnerUserMatch || isOpportunityOwnerNameMatch) {
      domainGrantedPermissionCodes.add(CRM_OPPORTUNITY_PERMISSION_CODES.read);
      domainGrantedPermissionCodes.add(CRM_OPPORTUNITY_PERMISSION_CODES.write);
    }

    const objectContext = await this.accessFoundationService.resolveObjectPermissionContext({
      user,
      targetObjectType: CRM_OPPORTUNITY_OBJECT_TYPE,
      targetObjectId: row.opportunityCode,
      actionContext,
      domainGrantedPermissionCodes,
    });

    return {
      opportunityId: row.opportunityCode,
      groupId: row.opportunityGroupCode,
      features: this.buildFeaturesFromPermissionCodes(objectContext.grantedPermissionCodes),
      roles: {
        isOpportunityOwnerUserMatch,
        isOpportunityOwnerNameMatch,
        ownerUserId: row.ownerUserId?.toString() ?? null,
        ownerName: row.ownerName,
      },
      policy: objectContext.policy,
    };
  }

  async assertOpportunityCapability(
    user: TokenPayload,
    capability: CrmOpportunityCapabilityKey,
    opportunityId?: string,
  ): Promise<CrmOpportunityGlobalAccessSnapshot | CrmOpportunityAccessSnapshot> {
    const snapshot = opportunityId
      ? await this.getOpportunityAccess(opportunityId, user)
      : await this.getGlobalOpportunityAccess(user);

    if (!snapshot.features[capability]) {
      throw new ForbiddenException(CAPABILITY_ERROR_MESSAGES[capability]);
    }

    return snapshot;
  }

  async getGlobalCustomerAccess(user: TokenPayload): Promise<CrmCustomerGlobalAccessSnapshot> {
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        features: buildCustomerFeatures(true),
        policy: actionContext.policy,
      };
    }

    return {
      features: this.buildCustomerFeaturesFromPermissionCodes(
        this.mapOpportunityPermissionsToCustomerCompatCodes(actionContext.grantedPermissionCodes),
      ),
      policy: actionContext.policy,
    };
  }

  async getCustomerAccess(
    id: string,
    user: TokenPayload,
  ): Promise<CrmCustomerAccessSnapshot> {
    const row = await this.findCustomerRow(id);
    if (!row) {
      throw new NotFoundException('CRM customer not found');
    }

    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);
    const isCustomerOwnerUserMatch = this.isOwnerUserMatch(row.ownerUserId, user);
    const isCustomerOwnerNameMatch = this.isOwnerNameMatch(row.ownerName, user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        customerId: row.id.toString(),
        customerCode: row.customerCode,
        features: buildCustomerFeatures(true),
        roles: {
          isCustomerOwnerUserMatch,
          isCustomerOwnerNameMatch,
          ownerUserId: row.ownerUserId?.toString() ?? null,
          ownerName: row.ownerName,
        },
        policy: actionContext.policy,
      };
    }

    const domainGrantedPermissionCodes = this.mapOpportunityPermissionsToCustomerCompatCodes(
      actionContext.grantedPermissionCodes,
    );
    if (isCustomerOwnerUserMatch || isCustomerOwnerNameMatch) {
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.read);
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.write);
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityRead);
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityWrite);
    }

    const objectContext = await this.accessFoundationService.resolveObjectPermissionContext({
      user,
      targetObjectType: CRM_CUSTOMER_OBJECT_TYPE,
      targetObjectId: row.customerCode,
      actionContext,
      domainGrantedPermissionCodes,
    });

    return {
      customerId: row.id.toString(),
      customerCode: row.customerCode,
      features: this.buildCustomerFeaturesFromPermissionCodes(objectContext.grantedPermissionCodes),
      roles: {
        isCustomerOwnerUserMatch,
        isCustomerOwnerNameMatch,
        ownerUserId: row.ownerUserId?.toString() ?? null,
        ownerName: row.ownerName,
      },
      policy: objectContext.policy,
    };
  }

  async assertCustomerCapability(
    user: TokenPayload,
    capability: CrmCustomerCapabilityKey,
    customerId?: string,
  ): Promise<CrmCustomerGlobalAccessSnapshot | CrmCustomerAccessSnapshot> {
    const snapshot = customerId
      ? await this.getCustomerAccess(customerId, user)
      : await this.getGlobalCustomerAccess(user);

    if (!snapshot.features[capability]) {
      throw new ForbiddenException(CUSTOMER_CAPABILITY_ERROR_MESSAGES[capability]);
    }

    return snapshot;
  }

  private buildFeaturesFromPermissionCodes(permissionCodes: Set<string>): CrmOpportunityAccessFeatures {
    const canWrite = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.write);
    const canConfirm = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.confirm);
    const canAddVersion = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.manageVersion);
    const canView =
      permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.read)
      || canWrite
      || canConfirm
      || canAddVersion;

    return {
      canViewOpportunity: canView,
      canCreateOpportunity: canWrite,
      canEditOpportunity: canWrite,
      canConfirmOpportunity: canConfirm,
      canAddVersion,
    };
  }

  private buildCustomerFeaturesFromPermissionCodes(permissionCodes: Set<string>): CrmCustomerAccessFeatures {
    const canWrite = permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.write);
    const canActivityWrite = permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.activityWrite) || canWrite;
    const canActivityRead =
      permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.activityRead)
      || canActivityWrite;
    const canView =
      permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.read)
      || canWrite
      || canActivityRead;

    return {
      canViewCustomer: canView,
      canCreateCustomer: canWrite,
      canEditCustomer: canWrite,
      canViewCustomerActivity: canActivityRead || canView,
      canCreateCustomerActivity: canActivityWrite,
    };
  }

  private mapOpportunityPermissionsToCustomerCompatCodes(permissionCodes: Set<string>): Set<string> {
    const mappedCodes = new Set(permissionCodes);
    const hasOpportunityWrite = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.write);
    const hasOpportunityRead =
      permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.read)
      || hasOpportunityWrite
      || permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.confirm)
      || permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.manageVersion);

    if (hasOpportunityRead) {
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.read);
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityRead);
    }

    if (hasOpportunityWrite) {
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.write);
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityWrite);
    }

    return mappedCodes;
  }

  private async findOpportunityRow(id: string): Promise<CrmOpportunityAccessRow | null> {
    const normalizedId = id.trim();
    const numericId = /^\d+$/.test(normalizedId) ? BigInt(normalizedId) : null;

    return this.db.client.crmOpportunity.findFirst({
      where: {
        isActive: true,
        OR: [
          { opportunityCode: normalizedId },
          ...(numericId ? [{ id: numericId }] : []),
        ],
      },
      select: {
        id: true,
        opportunityCode: true,
        opportunityGroupCode: true,
        ownerName: true,
        ownerUserId: true,
      },
    }) as Promise<CrmOpportunityAccessRow | null>;
  }

  private async findCustomerRow(id: string): Promise<CrmCustomerAccessRow | null> {
    const normalizedId = id.trim();
    const numericId = /^\d+$/.test(normalizedId) ? BigInt(normalizedId) : null;

    return this.db.client.crmCustomer.findFirst({
      where: {
        isActive: true,
        OR: [
          { customerCode: normalizedId },
          ...(numericId ? [{ id: numericId }] : []),
        ],
      },
      select: {
        id: true,
        customerCode: true,
        ownerName: true,
        ownerUserId: true,
      },
    }) as Promise<CrmCustomerAccessRow | null>;
  }

  private isOwnerUserMatch(ownerUserId: bigint | null | undefined, user: TokenPayload): boolean {
    return ownerUserId !== null && ownerUserId !== undefined && ownerUserId.toString() === user.userId;
  }

  private isOwnerNameMatch(ownerName: string | null | undefined, user: TokenPayload): boolean {
    const normalizedOwnerName = this.normalizeIdentity(ownerName);
    if (!normalizedOwnerName) {
      return false;
    }

    return [
      user.loginId,
      user.userName,
    ].some((candidate) => this.normalizeIdentity(candidate) === normalizedOwnerName);
  }

  private normalizeIdentity(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
  }
}
