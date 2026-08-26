import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization-operations.dto.js';

@Injectable()
export class OrganizationOperationsService {
  constructor(private readonly db: DatabaseService) {}

  async list(includeInactive = false) {
    const organizations = await this.db.client.organization.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ parentOrgId: 'asc' }, { orgName: 'asc' }],
      select: {
        orgId: true,
        orgCode: true,
        orgName: true,
        orgType: true,
        orgClass: true,
        scope: true,
        levelType: true,
        parentOrgId: true,
        isActive: true,
        memo: true,
        createdAt: true,
        updatedAt: true,
        parent: { select: { orgId: true, orgCode: true, orgName: true } },
        children: { where: { isActive: true }, select: { orgId: true } },
        userRelations: { where: { isActive: true }, select: { userOrgRelationId: true } },
      },
    });
    return organizations.map((organization) => this.toSnapshot(organization));
  }

  async create(dto: CreateOrganizationDto, operatorUserId: bigint) {
    const parentOrgId = this.toOptionalId(dto.parentOrgId);
    await this.assertParentIsUsable(parentOrgId);
    const created = await this.db.client.organization.create({
      data: {
        orgCode: dto.orgCode.trim(),
        orgName: dto.orgName.trim(),
        orgType: dto.orgType,
        orgClass: 'permanent',
        scope: dto.scope ?? (dto.orgType === 'external' ? 'external' : 'internal'),
        levelType: this.normalizeOptionalText(dto.levelType),
        parentOrgId,
        memo: this.normalizeOptionalText(dto.memo),
        createdBy: operatorUserId,
        updatedBy: operatorUserId,
        lastSource: 'admin-organization-operations',
        lastActivity: 'organization.admin.create',
      },
    });
    return this.getById(created.orgId);
  }

  async update(orgId: bigint, dto: UpdateOrganizationDto, operatorUserId: bigint) {
    await this.assertExists(orgId);
    let parentOrgId: bigint | null | undefined;
    if (dto.parentOrgId !== undefined) {
      parentOrgId = this.toOptionalId(dto.parentOrgId);
      await this.assertParentIsUsable(parentOrgId);
      await this.assertNoHierarchyCycle(orgId, parentOrgId);
    }

    await this.db.client.organization.update({
      where: { orgId },
      data: {
        ...(dto.orgName !== undefined ? { orgName: dto.orgName.trim() } : {}),
        ...(dto.orgType !== undefined ? { orgType: dto.orgType } : {}),
        ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
        ...(dto.levelType !== undefined ? { levelType: this.normalizeOptionalText(dto.levelType) } : {}),
        ...(parentOrgId !== undefined ? { parentOrgId } : {}),
        ...(dto.memo !== undefined ? { memo: this.normalizeOptionalText(dto.memo) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: operatorUserId,
        lastSource: 'admin-organization-operations',
        lastActivity: dto.isActive === true ? 'organization.admin.reactivate' : 'organization.admin.update',
      },
    });
    return this.getById(orgId);
  }

  async deactivate(orgId: bigint, operatorUserId: bigint) {
    await this.assertExists(orgId);
    const [activeChildren, activeMemberships] = await Promise.all([
      this.db.client.organization.count({ where: { parentOrgId: orgId, isActive: true } }),
      this.db.client.userOrganizationRelation.count({ where: { orgId, isActive: true } }),
    ]);
    if (activeChildren > 0 || activeMemberships > 0) {
      throw new ConflictException(
        `활성 하위 조직 ${activeChildren}건과 활성 소속 ${activeMemberships}건을 먼저 이동하거나 비활성화해야 합니다.`,
      );
    }

    await this.db.client.$transaction(async (tx) => {
      await tx.organization.update({
        where: { orgId },
        data: {
          isActive: false,
          updatedBy: operatorUserId,
          lastSource: 'admin-organization-operations',
          lastActivity: 'organization.admin.deactivate',
        },
      });
      await tx.organizationPermission.updateMany({
        where: { orgId, isActive: true },
        data: {
          isActive: false,
          effectiveTo: new Date(),
          updatedBy: operatorUserId,
          lastSource: 'admin-organization-operations',
          lastActivity: 'organization.admin.deactivate-permissions',
        },
      });
    });
    return this.getById(orgId);
  }

  private async getById(orgId: bigint) {
    const organization = await this.db.client.organization.findUnique({
      where: { orgId },
      select: {
        orgId: true,
        orgCode: true,
        orgName: true,
        orgType: true,
        orgClass: true,
        scope: true,
        levelType: true,
        parentOrgId: true,
        isActive: true,
        memo: true,
        createdAt: true,
        updatedAt: true,
        parent: { select: { orgId: true, orgCode: true, orgName: true } },
        children: { where: { isActive: true }, select: { orgId: true } },
        userRelations: { where: { isActive: true }, select: { userOrgRelationId: true } },
      },
    });
    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }
    return this.toSnapshot(organization);
  }

  private toSnapshot(organization: {
    orgId: bigint;
    orgCode: string;
    orgName: string;
    orgType: string;
    orgClass: string;
    scope: string;
    levelType: string | null;
    parentOrgId: bigint | null;
    isActive: boolean;
    memo: string | null;
    createdAt: Date;
    updatedAt: Date;
    parent: { orgId: bigint; orgCode: string; orgName: string } | null;
    children: Array<{ orgId: bigint }>;
    userRelations: Array<{ userOrgRelationId: bigint }>;
  }) {
    return {
      ...organization,
      orgId: organization.orgId.toString(),
      parentOrgId: organization.parentOrgId?.toString() ?? null,
      parent: organization.parent
        ? { ...organization.parent, orgId: organization.parent.orgId.toString() }
        : null,
      activeChildCount: organization.children.length,
      activeMemberCount: organization.userRelations.length,
      children: undefined,
      userRelations: undefined,
    };
  }

  private async assertExists(orgId: bigint): Promise<void> {
    const organization = await this.db.client.organization.findUnique({
      where: { orgId },
      select: { orgId: true },
    });
    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }
  }

  private async assertParentIsUsable(parentOrgId: bigint | null): Promise<void> {
    if (parentOrgId === null) return;
    const parent = await this.db.client.organization.findUnique({
      where: { orgId: parentOrgId },
      select: { isActive: true, orgClass: true },
    });
    if (!parent || !parent.isActive || parent.orgClass !== 'permanent') {
      throw new BadRequestException('활성 permanent 상위 조직을 선택해야 합니다.');
    }
  }

  private async assertNoHierarchyCycle(orgId: bigint, parentOrgId: bigint | null): Promise<void> {
    let cursor = parentOrgId;
    const visited = new Set<string>();
    while (cursor !== null) {
      if (cursor === orgId) {
        throw new BadRequestException('조직 계층에 순환 관계를 만들 수 없습니다.');
      }
      const key = cursor.toString();
      if (visited.has(key)) {
        throw new BadRequestException('기존 조직 계층에 순환 관계가 있습니다.');
      }
      visited.add(key);
      const parent = await this.db.client.organization.findUnique({
        where: { orgId: cursor },
        select: { parentOrgId: true },
      });
      cursor = parent?.parentOrgId ?? null;
    }
  }

  private toOptionalId(value: string | null | undefined): bigint | null {
    if (value === null || value === undefined || value.trim() === '') return null;
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('조직 ID 형식이 올바르지 않습니다.');
    }
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
