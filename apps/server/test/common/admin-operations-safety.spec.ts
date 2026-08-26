import { jest } from '@jest/globals';
import { AccessOperationsService } from '../../src/modules/common/access/access-operations.service.js';
import { OrganizationOperationsService } from '../../src/modules/common/access/organization-operations.service.js';
import { UserService } from '../../src/modules/common/user/user.service.js';

describe('Admin operations safety', () => {
  it('blocks deactivation of the last active administrator before mutation', async () => {
    const transaction = jest.fn();
    const db = {
      user: {
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ roleCode: 'admin', isActive: true }),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      },
      client: { $transaction: transaction },
    };
    const service = new UserService(db as never);

    await expect(service.deactivate(1n, 99n)).rejects.toThrow(/마지막 활성 관리자/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('blocks demotion of the last active administrator before mutation', async () => {
    const transaction = jest.fn();
    const db = {
      user: {
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ roleCode: 'admin', isActive: true }),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      },
      client: { $transaction: transaction },
    };
    const service = new UserService(db as never);

    await expect(service.update(1n, { roleCode: 'user' }, 99n)).rejects.toThrow(/마지막 활성 관리자/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('blocks organization hierarchy cycles before update', async () => {
    const update = jest.fn();
    const findUnique = jest.fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ orgId: 1n })
      .mockResolvedValueOnce({ isActive: true, orgClass: 'permanent' })
      .mockResolvedValueOnce({ parentOrgId: 1n });
    const service = new OrganizationOperationsService({
      client: { organization: { findUnique, update } },
    } as never);

    await expect(service.update(1n, { parentOrgId: '2' }, 99n)).rejects.toThrow(/순환 관계/);
    expect(update).not.toHaveBeenCalled();
  });

  it('blocks organization deactivation while active children or memberships remain', async () => {
    const transaction = jest.fn();
    const service = new OrganizationOperationsService({
      client: {
        organization: {
          findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ orgId: 1n }),
          count: jest.fn<() => Promise<number>>().mockResolvedValue(2),
        },
        userOrganizationRelation: {
          count: jest.fn<() => Promise<number>>().mockResolvedValue(3),
        },
        $transaction: transaction,
      },
    } as never);

    await expect(service.deactivate(1n, 99n)).rejects.toThrow(/활성 하위 조직 2건과 활성 소속 3건/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('preserves an organization parent when reactivation omits parentOrgId', async () => {
    const update = jest.fn<() => Promise<unknown>>().mockResolvedValue({ orgId: 2n });
    const findUnique = jest.fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ orgId: 2n })
      .mockResolvedValueOnce({
        orgId: 2n,
        orgCode: 'CHILD',
        orgName: 'Child',
        orgType: 'team',
        orgClass: 'permanent',
        scope: 'internal',
        levelType: 'team',
        parentOrgId: 1n,
        isActive: true,
        memo: null,
        createdAt: new Date('2026-08-12T00:00:00Z'),
        updatedAt: new Date('2026-08-12T00:00:00Z'),
        parent: { orgId: 1n, orgCode: 'PARENT', orgName: 'Parent' },
        children: [],
        userRelations: [],
      });
    const service = new OrganizationOperationsService({
      client: { organization: { findUnique, update } },
    } as never);

    await service.update(2n, { isActive: true, parentOrgId: undefined }, 99n);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ parentOrgId: expect.anything() }),
    }));
  });

  it('prevents removal of system.override from the admin role', async () => {
    const transaction = jest.fn();
    const service = new AccessOperationsService({
      client: {
        role: {
          findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            roleId: 1n,
            roleCode: 'admin',
            isActive: true,
          }),
        },
        permission: { findMany: jest.fn() },
        $transaction: transaction,
      },
    } as never, {} as never);

    await expect(service.updateRolePermissions('admin', { permissionCodes: ['common.user.manage'] }, 99n))
      .rejects.toThrow(/system.override/);
    expect(transaction).not.toHaveBeenCalled();
  });
});
