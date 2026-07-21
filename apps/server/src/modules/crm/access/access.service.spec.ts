import { ForbiddenException } from '@nestjs/common';
import type { PermissionResolutionTrace } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from './access.service.js';

const basePolicy = (patch: Partial<PermissionResolutionTrace> = {}): PermissionResolutionTrace => ({
  hasSystemOverride: false,
  grantedPermissionCodes: [],
  rolePermissionCodes: [],
  organizationPermissionCodes: [],
  userGrantedPermissionCodes: [],
  userRevokedPermissionCodes: [],
  domainGrantedPermissionCodes: [],
  objectGrantedPermissionCodes: [],
  objectRevokedPermissionCodes: [],
  ...patch,
});

const testUser: TokenPayload = {
  userId: '4',
  loginId: 'am.park',
  userName: '박영업',
};

function createService(options?: {
  actionPermissionCodes?: string[];
  objectRevokedPermissionCodes?: string[];
  systemOverride?: boolean;
  row?: Partial<{
    ownerName: string;
    ownerUserId: bigint | null;
  }>;
  customerRow?: Partial<{
    ownerName: string;
    ownerUserId: bigint | null;
  }>;
}) {
  const row = {
    id: 1n,
    opportunityCode: 'crm-opp-001',
    opportunityGroupCode: 'crm-opp-001',
    ownerName: options?.row?.ownerName ?? '김민준',
    ownerUserId: options?.row?.ownerUserId === undefined ? 4n : options.row.ownerUserId,
  };
  const customerRow = {
    id: 201n,
    customerCode: 'crm-cust-001',
    ownerName: options?.customerRow?.ownerName ?? '김민준',
    ownerUserId: options?.customerRow?.ownerUserId === undefined ? 4n : options.customerRow.ownerUserId,
  };
  const calls = {
    findFirst: [] as unknown[],
    findCustomerFirst: [] as unknown[],
    resolveObject: [] as unknown[],
  };
  const db = {
    client: {
      crmOpportunity: {
        findFirst: async (args: unknown) => {
          calls.findFirst.push(args);
          return row;
        },
      },
      crmCustomer: {
        findFirst: async (args: unknown) => {
          calls.findCustomerFirst.push(args);
          return customerRow;
        },
      },
    },
  } as unknown as DatabaseService;
  const actionPermissionCodes = new Set(options?.actionPermissionCodes ?? []);
  const objectRevokedPermissionCodes = new Set(options?.objectRevokedPermissionCodes ?? []);
  const accessFoundation = {
    resolveActionPermissionContext: async () => ({
      grantedPermissionCodes: new Set(actionPermissionCodes),
      roleCode: 'user',
      policy: basePolicy({
        hasSystemOverride: options?.systemOverride === true,
        grantedPermissionCodes: Array.from(actionPermissionCodes).sort(),
        rolePermissionCodes: Array.from(actionPermissionCodes).sort(),
      }),
    }),
    resolveObjectPermissionContext: async (args: {
      actionContext: { grantedPermissionCodes: Set<string>; policy: PermissionResolutionTrace; roleCode: string | null };
      domainGrantedPermissionCodes?: Iterable<string>;
    }) => {
      calls.resolveObject.push(args);
      const domainPermissionCodes = Array.from(args.domainGrantedPermissionCodes ?? []);
      const grantedPermissionCodes = new Set([
        ...args.actionContext.grantedPermissionCodes,
        ...domainPermissionCodes,
      ]);
      for (const permissionCode of objectRevokedPermissionCodes) {
        grantedPermissionCodes.delete(permissionCode);
      }

      return {
        grantedPermissionCodes,
        roleCode: args.actionContext.roleCode,
        policy: {
          ...args.actionContext.policy,
          grantedPermissionCodes: Array.from(grantedPermissionCodes).sort(),
          domainGrantedPermissionCodes: domainPermissionCodes.sort(),
          objectRevokedPermissionCodes: Array.from(objectRevokedPermissionCodes).sort(),
        },
      };
    },
  } as unknown as AccessFoundationService;

  return {
    service: new CrmAccessService(db, accessFoundation),
    calls,
  };
}

describe('CrmAccessService', () => {
  it('returns global CRM opportunity access from role permissions', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.opportunity.read', 'crm.opportunity.write'],
    });

    const result = await service.getGlobalOpportunityAccess(testUser);

    expect(result.features).toEqual({
      canViewOpportunity: true,
      canCreateOpportunity: true,
      canEditOpportunity: true,
      canConfirmOpportunity: false,
      canAddVersion: false,
    });
    expect(result.policy.grantedPermissionCodes).toEqual(['crm.opportunity.read', 'crm.opportunity.write']);
  });

  it('adds owner-user baseline permissions before object exception resolution', async () => {
    const { service } = createService({ actionPermissionCodes: ['crm.opportunity.read'] });

    const result = await service.getOpportunityAccess('crm-opp-001', testUser);

    expect(result.roles).toEqual({
      isOpportunityOwnerUserMatch: true,
      isOpportunityOwnerNameMatch: false,
      ownerUserId: '4',
      ownerName: '김민준',
    });
    expect(result.features.canEditOpportunity).toBe(true);
    expect(result.policy.domainGrantedPermissionCodes).toEqual([
      'crm.opportunity.read',
      'crm.opportunity.write',
    ]);
  });

  it('adds owner-name baseline permissions before object exception resolution', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.opportunity.read'],
      row: {
        ownerName: '박영업',
        ownerUserId: null,
      },
    });

    const result = await service.getOpportunityAccess('crm-opp-001', testUser);

    expect(result.roles).toEqual({
      isOpportunityOwnerUserMatch: false,
      isOpportunityOwnerNameMatch: true,
      ownerUserId: null,
      ownerName: '박영업',
    });
    expect(result.features.canEditOpportunity).toBe(true);
    expect(result.policy.domainGrantedPermissionCodes).toEqual([
      'crm.opportunity.read',
      'crm.opportunity.write',
    ]);
  });

  it('lets object-level revokes remove owner-name write access', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.opportunity.read'],
      objectRevokedPermissionCodes: ['crm.opportunity.write'],
      row: {
        ownerName: '박영업',
        ownerUserId: null,
      },
    });

    const result = await service.getOpportunityAccess('crm-opp-001', testUser);

    expect(result.features.canViewOpportunity).toBe(true);
    expect(result.features.canEditOpportunity).toBe(false);
    expect(result.policy.objectRevokedPermissionCodes).toEqual(['crm.opportunity.write']);
  });

  it('denies missing CRM opportunity capabilities', async () => {
    const { service } = createService({ actionPermissionCodes: ['crm.opportunity.read'] });

    await expect(service.assertOpportunityCapability(
      testUser,
      'canAddVersion',
      'crm-opp-001',
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows every CRM opportunity capability with system override', async () => {
    const { service } = createService({ systemOverride: true });

    const result = await service.getOpportunityAccess('crm-opp-001', testUser);

    expect(result.features).toEqual({
      canViewOpportunity: true,
      canCreateOpportunity: true,
      canEditOpportunity: true,
      canConfirmOpportunity: true,
      canAddVersion: true,
    });
  });

  it('returns global CRM customer access from customer permissions', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.customer.read', 'crm.customer.activity.read'],
    });

    const result = await service.getGlobalCustomerAccess(testUser);

    expect(result.features).toEqual({
      canViewCustomer: true,
      canCreateCustomer: false,
      canEditCustomer: false,
      canViewCustomerActivity: true,
      canCreateCustomerActivity: false,
    });
    expect(result.policy.grantedPermissionCodes).toEqual([
      'crm.customer.activity.read',
      'crm.customer.read',
    ]);
  });

  it('keeps CRM customer access compatible with legacy opportunity permissions', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.opportunity.read', 'crm.opportunity.write'],
    });

    const result = await service.getGlobalCustomerAccess(testUser);

    expect(result.features).toEqual({
      canViewCustomer: true,
      canCreateCustomer: true,
      canEditCustomer: true,
      canViewCustomerActivity: true,
      canCreateCustomerActivity: true,
    });
  });

  it('adds customer owner baseline permissions before customer object exception resolution', async () => {
    const { service } = createService({ actionPermissionCodes: ['crm.customer.read'] });

    const result = await service.getCustomerAccess('crm-cust-001', testUser);

    expect(result.roles).toEqual({
      isCustomerOwnerUserMatch: true,
      isCustomerOwnerNameMatch: false,
      ownerUserId: '4',
      ownerName: '김민준',
    });
    expect(result.features.canEditCustomer).toBe(true);
    expect(result.features.canCreateCustomerActivity).toBe(true);
    expect(result.policy.domainGrantedPermissionCodes).toEqual([
      'crm.customer.activity.read',
      'crm.customer.activity.write',
      'crm.customer.read',
      'crm.customer.write',
    ]);
  });

  it('lets customer object-level revokes remove owner activity write access', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.customer.read'],
      objectRevokedPermissionCodes: ['crm.customer.activity.write', 'crm.customer.write'],
      customerRow: {
        ownerName: '박영업',
        ownerUserId: null,
      },
    });

    const result = await service.getCustomerAccess('crm-cust-001', testUser);

    expect(result.roles.isCustomerOwnerNameMatch).toBe(true);
    expect(result.features.canViewCustomer).toBe(true);
    expect(result.features.canEditCustomer).toBe(false);
    expect(result.features.canCreateCustomerActivity).toBe(false);
    expect(result.policy.objectRevokedPermissionCodes).toEqual([
      'crm.customer.activity.write',
      'crm.customer.write',
    ]);
  });

  it('denies missing CRM customer capabilities', async () => {
    const { service } = createService({
      actionPermissionCodes: ['crm.customer.read'],
      customerRow: {
        ownerName: '김민준',
        ownerUserId: 77n,
      },
    });

    await expect(service.assertCustomerCapability(
      testUser,
      'canCreateCustomerActivity',
      'crm-cust-001',
    )).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows every CRM customer capability with system override', async () => {
    const { service } = createService({ systemOverride: true });

    const result = await service.getCustomerAccess('crm-cust-001', testUser);

    expect(result.features).toEqual({
      canViewCustomer: true,
      canCreateCustomer: true,
      canEditCustomer: true,
      canViewCustomerActivity: true,
      canCreateCustomerActivity: true,
    });
  });
});
