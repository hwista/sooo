import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ExtendedPrismaClient, Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreatePmsMasterImportProfileDto,
  CreatePlantSiteDto,
  CreateSystemCatalogDto,
  CreateSystemInstanceDto,
  CreateSystemIntegrationDto,
  FindMasterItemsDto,
  FindPmsMasterImportProfilesDto,
  ImportPlantSiteDto,
  ImportSystemCatalogDto,
  ImportSystemInstanceDto,
  ImportSystemIntegrationDto,
  PmsMasterImportProfileEntityType,
  PmsMasterImportDto,
  UpdatePmsMasterImportProfileDto,
  UpdatePlantSiteDto,
  UpdateSystemCatalogDto,
  UpdateSystemInstanceDto,
  UpdateSystemIntegrationDto,
} from './dto/master.dto.js';

interface PageWindow {
  page: number;
  limit: number;
  skip: number;
}

type MasterImportMode = 'preview' | 'apply';
type MasterImportEntityType = 'site' | 'systemCatalog' | 'systemInstance' | 'integration';
type MasterImportRowStatus = 'create' | 'update' | 'skip' | 'error';
type MasterImportProfileEntityType = PmsMasterImportProfileEntityType;
type MasterEntityClient = Pick<
  ExtendedPrismaClient,
  'plantSite' | 'systemCatalog' | 'systemInstance' | 'systemIntegration'
>;

const MASTER_IMPORT_PROFILE_ENTITIES: MasterImportProfileEntityType[] = [
  'sites',
  'systemCatalogs',
  'systemInstances',
  'integrations',
];

interface MasterImportOptions {
  updateExisting: boolean;
  reactivateExisting: boolean;
}

interface MasterImportRowResult {
  entityType: MasterImportEntityType;
  index: number;
  code: string;
  name?: string | null;
  status: MasterImportRowStatus;
  message: string;
}

interface MasterImportPlan extends MasterImportRowResult {
  row:
    | ImportPlantSiteDto
    | ImportSystemCatalogDto
    | ImportSystemInstanceDto
    | ImportSystemIntegrationDto;
  existingId?: bigint;
  reactivateExisting?: boolean;
  refs: {
    customerId?: bigint | null;
    siteId?: bigint | null;
    siteCode?: string | null;
    systemCatalogId?: bigint | null;
    systemCatalogCode?: string | null;
    parentSystemCatalogId?: bigint | null;
    parentCatalogCode?: string | null;
    sourceSystemInstanceId?: bigint | null;
    sourceSystemInstanceCode?: string | null;
    targetSystemInstanceId?: bigint | null;
    targetSystemInstanceCode?: string | null;
  };
}

interface ImportLookupRow {
  id?: bigint;
  code: string;
  isActive: boolean;
  customerId?: bigint | null;
}

interface ImportLookupContext {
  customersById: Map<string, ImportLookupRow>;
  customersByCode: Map<string, ImportLookupRow>;
  sitesById: Map<string, ImportLookupRow>;
  sitesByCode: Map<string, ImportLookupRow>;
  catalogsById: Map<string, ImportLookupRow>;
  catalogsByCode: Map<string, ImportLookupRow>;
  instancesById: Map<string, ImportLookupRow>;
  instancesByCode: Map<string, ImportLookupRow>;
}

interface MasterImportRuntimeRefs {
  siteIdsByCode: Map<string, bigint>;
  catalogIdsByCode: Map<string, bigint>;
  instanceIdsByCode: Map<string, bigint>;
}

@Injectable()
export class MasterService {
  constructor(private readonly db: DatabaseService) {}

  async getSummary() {
    const where = { isActive: true };
    const [sites, systemCatalogs, systemInstances, integrations] = await Promise.all([
      this.db.client.plantSite.count({ where }),
      this.db.client.systemCatalog.count({ where }),
      this.db.client.systemInstance.count({ where }),
      this.db.client.systemIntegration.count({ where }),
    ]);

    return {
      sites,
      systemCatalogs,
      systemInstances,
      integrations,
    };
  }

  async findImportProfiles(params: FindPmsMasterImportProfilesDto) {
    const entityType = params.entityType
      ? this.requiredImportProfileEntity(params.entityType)
      : undefined;
    const rows = await this.db.client.pmsMasterImportProfile.findMany({
      where: {
        isActive: true,
        ...(entityType && { entityType }),
      },
      orderBy: [
        { entityType: 'asc' },
        { isDefault: 'desc' },
        { profileName: 'asc' },
      ],
    });

    return rows.map((row) => this.serializeImportProfile(row));
  }

  async createImportProfile(dto: CreatePmsMasterImportProfileDto) {
    const entityType = this.requiredImportProfileEntity(dto.entityType);
    const profileName = this.requiredString(dto.profileName, 'profileName');
    const columnMapping = this.normalizeImportProfileMapping(dto.columnMapping);
    const existing = await this.db.client.pmsMasterImportProfile.findFirst({
      where: { entityType, profileName },
    });

    if (existing?.isActive) {
      throw new ConflictException(`Import profile '${profileName}' already exists for ${entityType}`);
    }

    if (dto.isDefault === true) {
      await this.clearDefaultImportProfiles(entityType);
    }

    const result = existing
      ? await this.db.client.pmsMasterImportProfile.update({
          where: { profileId: existing.profileId },
          data: {
            columnMapping,
            isDefault: dto.isDefault === true,
            isActive: true,
            memo: this.optionalString(dto.memo),
            lastSource: 'PMS',
            lastActivity: 'master_import_profile_reactivate',
          },
        })
      : await this.db.client.pmsMasterImportProfile.create({
          data: {
            entityType,
            profileName,
            columnMapping,
            isDefault: dto.isDefault === true,
            memo: this.optionalString(dto.memo),
            lastSource: 'PMS',
            lastActivity: 'master_import_profile_create',
          },
        });

    return this.serializeImportProfile(result);
  }

  async findImportProfileHistory(profileId: bigint) {
    const existing = await this.db.client.pmsMasterImportProfile.findUnique({ where: { profileId } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Import profile ${profileId} not found`);
    }

    const rows = await this.db.client.pmsMasterImportProfileHistory.findMany({
      where: { profileId },
      orderBy: [{ historySeq: 'desc' }],
      take: 30,
    });

    return rows.map((row) => this.serializeImportProfileHistory(row));
  }

  async updateImportProfile(profileId: bigint, dto: UpdatePmsMasterImportProfileDto) {
    const existing = await this.db.client.pmsMasterImportProfile.findUnique({ where: { profileId } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Import profile ${profileId} not found`);
    }

    const profileName = dto.profileName !== undefined
      ? this.requiredString(dto.profileName, 'profileName')
      : undefined;
    if (profileName && profileName !== existing.profileName) {
      const duplicate = await this.db.client.pmsMasterImportProfile.findFirst({
        where: {
          entityType: existing.entityType,
          profileName,
          isActive: true,
          NOT: { profileId },
        },
        select: { profileId: true },
      });
      if (duplicate) {
        throw new ConflictException(`Import profile '${profileName}' already exists for ${existing.entityType}`);
      }
    }

    if (dto.isDefault === true) {
      await this.clearDefaultImportProfiles(existing.entityType as MasterImportProfileEntityType, profileId);
    }

    const result = await this.db.client.pmsMasterImportProfile.update({
      where: { profileId },
      data: {
        ...(profileName !== undefined && { profileName }),
        ...(dto.columnMapping !== undefined && {
          columnMapping: this.normalizeImportProfileMapping(dto.columnMapping),
        }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.memo !== undefined && { memo: this.optionalString(dto.memo) }),
        lastSource: 'PMS',
        lastActivity: 'master_import_profile_update',
      },
    });

    return this.serializeImportProfile(result);
  }

  async restoreImportProfileHistory(profileId: bigint, historySeq: bigint) {
    const existing = await this.db.client.pmsMasterImportProfile.findUnique({ where: { profileId } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Import profile ${profileId} not found`);
    }

    const history = await this.db.client.pmsMasterImportProfileHistory.findFirst({
      where: { profileId, historySeq },
    });
    if (!history) {
      throw new NotFoundException(`Import profile history ${profileId}/${historySeq} not found`);
    }

    const entityType = this.requiredImportProfileEntity(history.entityType);
    const duplicate = await this.db.client.pmsMasterImportProfile.findFirst({
      where: {
        entityType,
        profileName: history.profileName,
        NOT: { profileId },
      },
      select: { profileId: true },
    });
    if (duplicate) {
      throw new ConflictException(`Import profile '${history.profileName}' already exists for ${entityType}`);
    }

    if (history.isDefault) {
      await this.clearDefaultImportProfiles(entityType, profileId);
    }

    const result = await this.db.client.pmsMasterImportProfile.update({
      where: { profileId },
      data: {
        profileName: history.profileName,
        columnMapping: this.normalizeImportProfileMapping(history.columnMapping),
        isDefault: history.isDefault,
        isActive: true,
        memo: history.memo,
        lastSource: 'PMS',
        lastActivity: 'master_import_profile_restore',
      },
    });

    return this.serializeImportProfile(result);
  }

  async deactivateImportProfile(profileId: bigint) {
    const existing = await this.db.client.pmsMasterImportProfile.findUnique({ where: { profileId } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Import profile ${profileId} not found`);
    }

    const result = await this.db.client.pmsMasterImportProfile.update({
      where: { profileId },
      data: {
        isActive: false,
        isDefault: false,
        lastSource: 'PMS',
        lastActivity: 'master_import_profile_deactivate',
      },
    });
    return this.serializeImportProfile(result);
  }

  async importMaster(dto: PmsMasterImportDto) {
    const payload = this.normalizeImportPayload(dto);
    const mode: MasterImportMode = dto.mode === 'apply' ? 'apply' : 'preview';
    const options: MasterImportOptions = {
      updateExisting: dto.options?.updateExisting === true,
      reactivateExisting: dto.options?.reactivateExisting === true,
    };
    const totalRows = payload.sites.length +
      payload.systemCatalogs.length +
      payload.systemInstances.length +
      payload.integrations.length;

    if (totalRows > 500) {
      throw new BadRequestException('A single PMS master import can include up to 500 rows');
    }

    const context = await this.loadImportLookup(payload);
    const plans = [
      ...this.planSiteImports(payload.sites, context, options),
      ...this.planCatalogImports(payload.systemCatalogs, context, options),
      ...this.planInstanceImports(payload.systemInstances, context, options),
      ...this.planIntegrationImports(payload.integrations, context, options),
    ];
    const hasError = plans.some((plan) => plan.status === 'error');

    if (mode === 'apply' && !hasError) {
      await this.applyImportPlans(plans);
    }

    return {
      mode,
      applied: mode === 'apply' && !hasError,
      summary: this.summarizeImportRows(plans),
      rows: plans.map(({ entityType, index, code, name, status, message }) => ({
        entityType,
        index,
        code,
        name,
        status,
        message,
      })),
    };
  }

  async findSites(params: FindMasterItemsDto) {
    const { page, limit, skip } = this.pageWindow(params);
    const customerId = this.toBigIntOrUndefined(params.customerId);
    const where = {
      ...this.activeWhere(params),
      ...(customerId !== undefined && { customerId }),
      ...(params.search && {
        OR: [
          { siteName: { contains: params.search, mode: 'insensitive' as const } },
          { siteCode: { contains: params.search, mode: 'insensitive' as const } },
          { address: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.db.client.plantSite.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ siteName: 'asc' }, { siteCode: 'asc' }],
      }),
      this.db.client.plantSite.count({ where }),
    ]);
    const customerNames = await this.customerNameMap(rows.map((row) => row.customerId));

    return {
      data: rows.map((row) => ({
        ...row,
        customerName: this.lookupName(customerNames, row.customerId),
      })),
      total,
      page,
      limit,
    };
  }

  async findSystemCatalogs(params: FindMasterItemsDto) {
    const { page, limit, skip } = this.pageWindow(params);
    const where = {
      ...this.activeWhere(params),
      ...(params.search && {
        OR: [
          { catalogName: { contains: params.search, mode: 'insensitive' as const } },
          { catalogCode: { contains: params.search, mode: 'insensitive' as const } },
          { categoryCode: { contains: params.search, mode: 'insensitive' as const } },
          { vendorName: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.systemCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ catalogName: 'asc' }, { catalogCode: 'asc' }],
      }),
      this.db.client.systemCatalog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findSystemInstances(params: FindMasterItemsDto) {
    const { page, limit, skip } = this.pageWindow(params);
    const customerId = this.toBigIntOrUndefined(params.customerId);
    const siteId = this.toBigIntOrUndefined(params.siteId);
    const systemCatalogId = this.toBigIntOrUndefined(params.systemCatalogId);
    const where = {
      ...this.activeWhere(params),
      ...(customerId !== undefined && { customerId }),
      ...(siteId !== undefined && { siteId }),
      ...(systemCatalogId !== undefined && { systemCatalogId }),
      ...(params.search && {
        OR: [
          { instanceName: { contains: params.search, mode: 'insensitive' as const } },
          { instanceCode: { contains: params.search, mode: 'insensitive' as const } },
          { operationOwnerName: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.db.client.systemInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ instanceName: 'asc' }, { instanceCode: 'asc' }],
      }),
      this.db.client.systemInstance.count({ where }),
    ]);
    const [customerNames, siteNames, catalogNames] = await Promise.all([
      this.customerNameMap(rows.map((row) => row.customerId)),
      this.siteNameMap(rows.map((row) => row.siteId)),
      this.catalogNameMap(rows.map((row) => row.systemCatalogId)),
    ]);

    return {
      data: rows.map((row) => ({
        ...row,
        customerName: this.lookupName(customerNames, row.customerId),
        siteName: this.lookupName(siteNames, row.siteId),
        catalogName: this.lookupName(catalogNames, row.systemCatalogId),
      })),
      total,
      page,
      limit,
    };
  }

  async findIntegrations(params: FindMasterItemsDto) {
    const { page, limit, skip } = this.pageWindow(params);
    const systemInstanceId = this.toBigIntOrUndefined(params.systemInstanceId);
    const andFilters = [
      ...(systemInstanceId !== undefined
        ? [{
            OR: [
              { sourceSystemInstanceId: systemInstanceId },
              { targetSystemInstanceId: systemInstanceId },
            ],
          }]
        : []),
      ...(params.search
        ? [{
            OR: [
              { integrationName: { contains: params.search, mode: 'insensitive' as const } },
              { integrationCode: { contains: params.search, mode: 'insensitive' as const } },
              { interfaceTypeCode: { contains: params.search, mode: 'insensitive' as const } },
              { statusCode: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }]
        : []),
    ];
    const where = {
      ...this.activeWhere(params),
      ...(andFilters.length > 0 && { AND: andFilters }),
    };

    const [rows, total] = await Promise.all([
      this.db.client.systemIntegration.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ integrationName: 'asc' }, { integrationCode: 'asc' }],
      }),
      this.db.client.systemIntegration.count({ where }),
    ]);
    const instanceNames = await this.instanceNameMap(
      rows.flatMap((row) => [row.sourceSystemInstanceId, row.targetSystemInstanceId]),
    );

    return {
      data: rows.map((row) => ({
        ...row,
        sourceSystemInstanceName: this.lookupName(instanceNames, row.sourceSystemInstanceId),
        targetSystemInstanceName: this.lookupName(instanceNames, row.targetSystemInstanceId),
      })),
      total,
      page,
      limit,
    };
  }

  async createSite(dto: CreatePlantSiteDto) {
    const existing = await this.db.client.plantSite.findUnique({
      where: { siteCode: this.requiredString(dto.siteCode, 'siteCode') },
      select: { siteId: true },
    });
    if (existing) {
      throw new ConflictException(`Site code '${dto.siteCode}' already exists`);
    }

    const customerId = this.toNullableBigInt(dto.customerId, 'customerId');
    await this.assertCustomerExists(customerId);

    return this.db.client.plantSite.create({
      data: {
        customerId,
        siteCode: this.requiredString(dto.siteCode, 'siteCode'),
        siteName: this.requiredString(dto.siteName, 'siteName'),
        siteTypeCode: this.optionalString(dto.siteTypeCode),
        regionCode: this.optionalString(dto.regionCode),
        address: this.optionalString(dto.address),
        timezone: this.optionalString(dto.timezone),
        operationOwnerName: this.optionalString(dto.operationOwnerName),
        memo: this.optionalString(dto.memo),
      },
    });
  }

  async updateSite(siteId: bigint, dto: UpdatePlantSiteDto) {
    const existing = await this.db.client.plantSite.findUnique({ where: { siteId } });
    if (!existing) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    const customerId = this.toNullableBigIntForUpdate(dto.customerId, 'customerId');
    if (customerId !== undefined) {
      await this.assertCustomerExists(customerId);
    }

    return this.db.client.plantSite.update({
      where: { siteId },
      data: {
        ...(customerId !== undefined && { customerId }),
        ...(dto.siteName !== undefined && { siteName: this.requiredString(dto.siteName, 'siteName') }),
        ...(dto.siteTypeCode !== undefined && { siteTypeCode: this.optionalString(dto.siteTypeCode) }),
        ...(dto.regionCode !== undefined && { regionCode: this.optionalString(dto.regionCode) }),
        ...(dto.address !== undefined && { address: this.optionalString(dto.address) }),
        ...(dto.timezone !== undefined && { timezone: this.optionalString(dto.timezone) }),
        ...(dto.operationOwnerName !== undefined && { operationOwnerName: this.optionalString(dto.operationOwnerName) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: this.optionalString(dto.memo) }),
      },
    });
  }

  async deactivateSite(siteId: bigint) {
    const existing = await this.db.client.plantSite.findUnique({ where: { siteId } });
    if (!existing) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }

    return this.db.client.plantSite.update({
      where: { siteId },
      data: { isActive: false },
    });
  }

  async createSystemCatalog(dto: CreateSystemCatalogDto) {
    const existing = await this.db.client.systemCatalog.findUnique({
      where: { catalogCode: this.requiredString(dto.catalogCode, 'catalogCode') },
      select: { systemCatalogId: true },
    });
    if (existing) {
      throw new ConflictException(`System catalog code '${dto.catalogCode}' already exists`);
    }

    const parentSystemCatalogId = this.toNullableBigInt(dto.parentSystemCatalogId, 'parentSystemCatalogId');
    await this.assertSystemCatalogExists(parentSystemCatalogId);

    return this.db.client.systemCatalog.create({
      data: {
        parentSystemCatalogId,
        catalogCode: this.requiredString(dto.catalogCode, 'catalogCode'),
        catalogName: this.requiredString(dto.catalogName, 'catalogName'),
        categoryCode: this.optionalString(dto.categoryCode),
        vendorName: this.optionalString(dto.vendorName),
        description: this.optionalString(dto.description),
        memo: this.optionalString(dto.memo),
      },
    });
  }

  async updateSystemCatalog(systemCatalogId: bigint, dto: UpdateSystemCatalogDto) {
    const existing = await this.db.client.systemCatalog.findUnique({ where: { systemCatalogId } });
    if (!existing) {
      throw new NotFoundException(`System catalog ${systemCatalogId} not found`);
    }

    const parentSystemCatalogId = this.toNullableBigIntForUpdate(
      dto.parentSystemCatalogId,
      'parentSystemCatalogId',
    );
    if (parentSystemCatalogId !== undefined) {
      if (parentSystemCatalogId === systemCatalogId) {
        throw new BadRequestException('parentSystemCatalogId cannot be the same as systemCatalogId');
      }
      await this.assertSystemCatalogExists(parentSystemCatalogId);
    }

    return this.db.client.systemCatalog.update({
      where: { systemCatalogId },
      data: {
        ...(parentSystemCatalogId !== undefined && { parentSystemCatalogId }),
        ...(dto.catalogName !== undefined && { catalogName: this.requiredString(dto.catalogName, 'catalogName') }),
        ...(dto.categoryCode !== undefined && { categoryCode: this.optionalString(dto.categoryCode) }),
        ...(dto.vendorName !== undefined && { vendorName: this.optionalString(dto.vendorName) }),
        ...(dto.description !== undefined && { description: this.optionalString(dto.description) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: this.optionalString(dto.memo) }),
      },
    });
  }

  async deactivateSystemCatalog(systemCatalogId: bigint) {
    const existing = await this.db.client.systemCatalog.findUnique({ where: { systemCatalogId } });
    if (!existing) {
      throw new NotFoundException(`System catalog ${systemCatalogId} not found`);
    }

    return this.db.client.systemCatalog.update({
      where: { systemCatalogId },
      data: { isActive: false },
    });
  }

  async createSystemInstance(dto: CreateSystemInstanceDto) {
    const existing = await this.db.client.systemInstance.findUnique({
      where: { instanceCode: this.requiredString(dto.instanceCode, 'instanceCode') },
      select: { systemInstanceId: true },
    });
    if (existing) {
      throw new ConflictException(`System instance code '${dto.instanceCode}' already exists`);
    }

    let customerId = this.toNullableBigInt(dto.customerId, 'customerId');
    const siteId = this.toNullableBigInt(dto.siteId, 'siteId');
    const systemCatalogId = this.toNullableBigInt(dto.systemCatalogId, 'systemCatalogId');
    const site = await this.assertSiteExists(siteId);
    await Promise.all([
      this.assertCustomerExists(customerId),
      this.assertSystemCatalogExists(systemCatalogId),
    ]);
    customerId = this.resolveSiteCustomer(site?.customerId ?? null, customerId);

    return this.db.client.systemInstance.create({
      data: {
        customerId,
        siteId,
        systemCatalogId,
        instanceCode: this.requiredString(dto.instanceCode, 'instanceCode'),
        instanceName: this.requiredString(dto.instanceName, 'instanceName'),
        environmentCode: this.optionalString(dto.environmentCode),
        operationOwnerTypeCode: this.optionalString(dto.operationOwnerTypeCode),
        operationOwnerName: this.optionalString(dto.operationOwnerName),
        lifecycleStatusCode: this.optionalString(dto.lifecycleStatusCode) ?? 'active',
        memo: this.optionalString(dto.memo),
      },
    });
  }

  async updateSystemInstance(systemInstanceId: bigint, dto: UpdateSystemInstanceDto) {
    const existing = await this.db.client.systemInstance.findUnique({ where: { systemInstanceId } });
    if (!existing) {
      throw new NotFoundException(`System instance ${systemInstanceId} not found`);
    }

    let customerId = this.toNullableBigIntForUpdate(dto.customerId, 'customerId');
    const siteId = this.toNullableBigIntForUpdate(dto.siteId, 'siteId');
    const systemCatalogId = this.toNullableBigIntForUpdate(dto.systemCatalogId, 'systemCatalogId');
    const finalSiteId = siteId === undefined ? existing.siteId : siteId;
    const finalCustomerId = customerId === undefined ? existing.customerId : customerId;

    const site = siteId !== undefined || (customerId !== undefined && finalSiteId !== null)
      ? await this.assertSiteExists(finalSiteId)
      : null;
    await Promise.all([
      customerId !== undefined ? this.assertCustomerExists(customerId) : Promise.resolve(),
      systemCatalogId !== undefined ? this.assertSystemCatalogExists(systemCatalogId) : Promise.resolve(),
    ]);
    if (siteId !== undefined || customerId !== undefined) {
      customerId = this.resolveSiteCustomer(site?.customerId ?? null, finalCustomerId);
    }

    return this.db.client.systemInstance.update({
      where: { systemInstanceId },
      data: {
        ...(customerId !== undefined && { customerId }),
        ...(siteId !== undefined && { siteId }),
        ...(systemCatalogId !== undefined && { systemCatalogId }),
        ...(dto.instanceName !== undefined && { instanceName: this.requiredString(dto.instanceName, 'instanceName') }),
        ...(dto.environmentCode !== undefined && { environmentCode: this.optionalString(dto.environmentCode) }),
        ...(dto.operationOwnerTypeCode !== undefined && { operationOwnerTypeCode: this.optionalString(dto.operationOwnerTypeCode) }),
        ...(dto.operationOwnerName !== undefined && { operationOwnerName: this.optionalString(dto.operationOwnerName) }),
        ...(dto.lifecycleStatusCode !== undefined && {
          lifecycleStatusCode: this.optionalString(dto.lifecycleStatusCode) ?? 'active',
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: this.optionalString(dto.memo) }),
      },
    });
  }

  async deactivateSystemInstance(systemInstanceId: bigint) {
    const existing = await this.db.client.systemInstance.findUnique({ where: { systemInstanceId } });
    if (!existing) {
      throw new NotFoundException(`System instance ${systemInstanceId} not found`);
    }

    return this.db.client.systemInstance.update({
      where: { systemInstanceId },
      data: { isActive: false },
    });
  }

  async createIntegration(dto: CreateSystemIntegrationDto) {
    const existing = await this.db.client.systemIntegration.findUnique({
      where: { integrationCode: this.requiredString(dto.integrationCode, 'integrationCode') },
      select: { integrationId: true },
    });
    if (existing) {
      throw new ConflictException(`Integration code '${dto.integrationCode}' already exists`);
    }

    const sourceSystemInstanceId = this.toRequiredBigInt(dto.sourceSystemInstanceId, 'sourceSystemInstanceId');
    const targetSystemInstanceId = this.toRequiredBigInt(dto.targetSystemInstanceId, 'targetSystemInstanceId');
    await this.assertDistinctIntegrationEndpoints(sourceSystemInstanceId, targetSystemInstanceId);
    await Promise.all([
      this.assertSystemInstanceExists(sourceSystemInstanceId),
      this.assertSystemInstanceExists(targetSystemInstanceId),
    ]);

    return this.db.client.systemIntegration.create({
      data: {
        integrationCode: this.requiredString(dto.integrationCode, 'integrationCode'),
        integrationName: this.requiredString(dto.integrationName, 'integrationName'),
        sourceSystemInstanceId,
        targetSystemInstanceId,
        directionCode: this.optionalString(dto.directionCode),
        interfaceTypeCode: this.optionalString(dto.interfaceTypeCode),
        statusCode: this.optionalString(dto.statusCode) ?? 'active',
        description: this.optionalString(dto.description),
        memo: this.optionalString(dto.memo),
      },
    });
  }

  async updateIntegration(integrationId: bigint, dto: UpdateSystemIntegrationDto) {
    const existing = await this.db.client.systemIntegration.findUnique({ where: { integrationId } });
    if (!existing) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    const sourceSystemInstanceId = this.toRequiredBigIntForUpdate(
      dto.sourceSystemInstanceId,
      'sourceSystemInstanceId',
    );
    const targetSystemInstanceId = this.toRequiredBigIntForUpdate(
      dto.targetSystemInstanceId,
      'targetSystemInstanceId',
    );
    const finalSourceId = sourceSystemInstanceId ?? existing.sourceSystemInstanceId;
    const finalTargetId = targetSystemInstanceId ?? existing.targetSystemInstanceId;
    await this.assertDistinctIntegrationEndpoints(finalSourceId, finalTargetId);
    await Promise.all([
      sourceSystemInstanceId !== undefined
        ? this.assertSystemInstanceExists(sourceSystemInstanceId)
        : Promise.resolve(),
      targetSystemInstanceId !== undefined
        ? this.assertSystemInstanceExists(targetSystemInstanceId)
        : Promise.resolve(),
    ]);

    return this.db.client.systemIntegration.update({
      where: { integrationId },
      data: {
        ...(dto.integrationName !== undefined && {
          integrationName: this.requiredString(dto.integrationName, 'integrationName'),
        }),
        ...(sourceSystemInstanceId !== undefined && { sourceSystemInstanceId }),
        ...(targetSystemInstanceId !== undefined && { targetSystemInstanceId }),
        ...(dto.directionCode !== undefined && { directionCode: this.optionalString(dto.directionCode) }),
        ...(dto.interfaceTypeCode !== undefined && { interfaceTypeCode: this.optionalString(dto.interfaceTypeCode) }),
        ...(dto.statusCode !== undefined && { statusCode: this.optionalString(dto.statusCode) ?? 'active' }),
        ...(dto.description !== undefined && { description: this.optionalString(dto.description) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: this.optionalString(dto.memo) }),
      },
    });
  }

  async deactivateIntegration(integrationId: bigint) {
    const existing = await this.db.client.systemIntegration.findUnique({ where: { integrationId } });
    if (!existing) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    return this.db.client.systemIntegration.update({
      where: { integrationId },
      data: { isActive: false },
    });
  }

  private normalizeImportPayload(dto: PmsMasterImportDto) {
    return {
      sites: Array.isArray(dto.sites) ? dto.sites : [],
      systemCatalogs: Array.isArray(dto.systemCatalogs) ? dto.systemCatalogs : [],
      systemInstances: Array.isArray(dto.systemInstances) ? dto.systemInstances : [],
      integrations: Array.isArray(dto.integrations) ? dto.integrations : [],
    };
  }

  private async loadImportLookup(payload: ReturnType<MasterService['normalizeImportPayload']>): Promise<ImportLookupContext> {
    const customerIds = new Set<string>();
    const customerCodes = new Set<string>();
    const siteIds = new Set<string>();
    const siteCodes = new Set<string>();
    const catalogIds = new Set<string>();
    const catalogCodes = new Set<string>();
    const instanceIds = new Set<string>();
    const instanceCodes = new Set<string>();

    for (const row of payload.sites) {
      this.collectPositiveId(customerIds, row.customerId);
      this.collectCode(customerCodes, row.customerCode);
      this.collectCode(siteCodes, row.siteCode);
    }
    for (const row of payload.systemCatalogs) {
      this.collectPositiveId(catalogIds, row.parentSystemCatalogId);
      this.collectCode(catalogCodes, row.catalogCode);
      this.collectCode(catalogCodes, row.parentCatalogCode);
    }
    for (const row of payload.systemInstances) {
      this.collectPositiveId(customerIds, row.customerId);
      this.collectCode(customerCodes, row.customerCode);
      this.collectPositiveId(siteIds, row.siteId);
      this.collectCode(siteCodes, row.siteCode);
      this.collectPositiveId(catalogIds, row.systemCatalogId);
      this.collectCode(catalogCodes, row.systemCatalogCode);
      this.collectCode(instanceCodes, row.instanceCode);
    }
    for (const row of payload.integrations) {
      this.collectPositiveId(instanceIds, row.sourceSystemInstanceId);
      this.collectPositiveId(instanceIds, row.targetSystemInstanceId);
      this.collectCode(instanceCodes, row.sourceSystemInstanceCode);
      this.collectCode(instanceCodes, row.targetSystemInstanceCode);
      this.collectCode(instanceCodes, row.integrationCode);
    }

    const [
      customersById,
      customersByCode,
      sitesById,
      sitesByCode,
      catalogsById,
      catalogsByCode,
      instancesById,
      instancesByCode,
    ] = await Promise.all([
      this.findCustomersByIds([...customerIds]),
      this.findCustomersByCodes([...customerCodes]),
      this.findSitesByIds([...siteIds]),
      this.findSitesByCodes([...siteCodes]),
      this.findCatalogsByIds([...catalogIds]),
      this.findCatalogsByCodes([...catalogCodes]),
      this.findInstancesByIds([...instanceIds]),
      this.findInstancesByCodes([...instanceCodes]),
    ]);

    return {
      customersById,
      customersByCode,
      sitesById,
      sitesByCode,
      catalogsById,
      catalogsByCode,
      instancesById,
      instancesByCode,
    };
  }

  private planSiteImports(
    rows: ImportPlantSiteDto[],
    context: ImportLookupContext,
    options: MasterImportOptions,
  ): MasterImportPlan[] {
    const seenCodes = new Set<string>();
    return rows.map((row, index) => {
      const code = this.importRequiredText(row.siteCode);
      const name = this.importRequiredText(row.siteName);
      const base = this.importPlanBase('site', index, code, name, row);
      const error = this.validateImportCode(code, seenCodes, 'siteCode') ||
        this.validateRequiredImportName(name, 'siteName');
      const customer = this.resolveCustomerImportRef(row.customerId, row.customerCode, context);
      const existing = code ? context.sitesByCode.get(code) : undefined;
      const status = this.resolveImportStatus(existing, options);

      if (error || customer.error) {
        return { ...base, status: 'error', message: error ?? customer.error ?? '검증 오류', refs: {} };
      }

      const customerId = customer.id ?? null;
      const effectiveCustomerId = status === 'skip' ? existing?.customerId ?? null : customerId;
      context.sitesByCode.set(code, {
        id: existing?.id,
        code,
        isActive: status === 'skip'
          ? existing?.isActive ?? true
          : row.isActive ?? (options.reactivateExisting && existing ? true : existing?.isActive ?? true),
        customerId: effectiveCustomerId,
      });

      return {
        ...base,
        status,
        message: this.importStatusMessage(status, '플랜트/사이트'),
        existingId: existing?.id,
        reactivateExisting: options.reactivateExisting,
        refs: { customerId },
      };
    });
  }

  private planCatalogImports(
    rows: ImportSystemCatalogDto[],
    context: ImportLookupContext,
    options: MasterImportOptions,
  ): MasterImportPlan[] {
    const seenCodes = new Set<string>();
    return rows.map((row, index) => {
      const code = this.importRequiredText(row.catalogCode);
      const name = this.importRequiredText(row.catalogName);
      const base = this.importPlanBase('systemCatalog', index, code, name, row);
      const error = this.validateImportCode(code, seenCodes, 'catalogCode') ||
        this.validateRequiredImportName(name, 'catalogName');
      const parent = this.resolveCatalogImportRef(
        row.parentSystemCatalogId,
        row.parentCatalogCode,
        context,
        code,
      );
      const existing = code ? context.catalogsByCode.get(code) : undefined;
      const status = this.resolveImportStatus(existing, options);

      if (error || parent.error) {
        return { ...base, status: 'error', message: error ?? parent.error ?? '검증 오류', refs: {} };
      }

      context.catalogsByCode.set(code, {
        id: existing?.id,
        code,
        isActive: status === 'skip'
          ? existing?.isActive ?? true
          : row.isActive ?? (options.reactivateExisting && existing ? true : existing?.isActive ?? true),
      });

      return {
        ...base,
        status,
        message: this.importStatusMessage(status, '시스템 종류'),
        existingId: existing?.id,
        reactivateExisting: options.reactivateExisting,
        refs: {
          parentSystemCatalogId: parent.id,
          parentCatalogCode: parent.code,
        },
      };
    });
  }

  private planInstanceImports(
    rows: ImportSystemInstanceDto[],
    context: ImportLookupContext,
    options: MasterImportOptions,
  ): MasterImportPlan[] {
    const seenCodes = new Set<string>();
    return rows.map((row, index) => {
      const code = this.importRequiredText(row.instanceCode);
      const name = this.importRequiredText(row.instanceName);
      const base = this.importPlanBase('systemInstance', index, code, name, row);
      const error = this.validateImportCode(code, seenCodes, 'instanceCode') ||
        this.validateRequiredImportName(name, 'instanceName');
      const customer = this.resolveCustomerImportRef(row.customerId, row.customerCode, context);
      const site = this.resolveSiteImportRef(row.siteId, row.siteCode, context);
      const catalog = this.resolveCatalogImportRef(
        row.systemCatalogId,
        row.systemCatalogCode,
        context,
        null,
      );
      const existing = code ? context.instancesByCode.get(code) : undefined;
      const status = this.resolveImportStatus(existing, options);
      const relationError = this.validateImportSiteCustomer(customer.id ?? null, site.row?.customerId ?? null);

      if (error || customer.error || site.error || catalog.error || relationError) {
        return {
          ...base,
          status: 'error',
          message: error ?? customer.error ?? site.error ?? catalog.error ?? relationError ?? '검증 오류',
          refs: {},
        };
      }

      const customerId = customer.id ?? site.row?.customerId ?? null;
      const effectiveCustomerId = status === 'skip' ? existing?.customerId ?? null : customerId;
      context.instancesByCode.set(code, {
        id: existing?.id,
        code,
        isActive: status === 'skip'
          ? existing?.isActive ?? true
          : row.isActive ?? (options.reactivateExisting && existing ? true : existing?.isActive ?? true),
        customerId: effectiveCustomerId,
      });

      return {
        ...base,
        status,
        message: this.importStatusMessage(status, '시스템 인스턴스'),
        existingId: existing?.id,
        reactivateExisting: options.reactivateExisting,
        refs: {
          customerId,
          siteId: site.id,
          siteCode: site.code,
          systemCatalogId: catalog.id,
          systemCatalogCode: catalog.code,
        },
      };
    });
  }

  private planIntegrationImports(
    rows: ImportSystemIntegrationDto[],
    context: ImportLookupContext,
    options: MasterImportOptions,
  ): MasterImportPlan[] {
    const seenCodes = new Set<string>();
    return rows.map((row, index) => {
      const code = this.importRequiredText(row.integrationCode);
      const name = this.importRequiredText(row.integrationName);
      const base = this.importPlanBase('integration', index, code, name, row);
      const error = this.validateImportCode(code, seenCodes, 'integrationCode') ||
        this.validateRequiredImportName(name, 'integrationName');
      const source = this.resolveInstanceImportRef(
        row.sourceSystemInstanceId,
        row.sourceSystemInstanceCode,
        context,
        'sourceSystemInstance',
      );
      const target = this.resolveInstanceImportRef(
        row.targetSystemInstanceId,
        row.targetSystemInstanceCode,
        context,
        'targetSystemInstance',
      );
      const integrationExisting = code
        ? this.importIntegrationLookup(context, code)
        : undefined;
      const status = this.resolveImportStatus(integrationExisting, options);
      const sameEndpoint = this.sameImportReference(source, target)
        ? '출발 시스템과 도착 시스템은 서로 달라야 합니다'
        : null;

      if (error || source.error || target.error || sameEndpoint) {
        return {
          ...base,
          status: 'error',
          message: error ?? source.error ?? target.error ?? sameEndpoint ?? '검증 오류',
          refs: {},
        };
      }

      return {
        ...base,
        status,
        message: this.importStatusMessage(status, '인터페이스'),
        existingId: integrationExisting?.id,
        reactivateExisting: options.reactivateExisting,
        refs: {
          sourceSystemInstanceId: source.id,
          sourceSystemInstanceCode: source.code,
          targetSystemInstanceId: target.id,
          targetSystemInstanceCode: target.code,
        },
      };
    });
  }

  private async applyImportPlans(plans: MasterImportPlan[]) {
    const orderedPlans = this.orderImportPlansForApply(plans);
    await this.db.client.$transaction(async (tx) => {
      const refs = await this.loadRuntimeImportRefs(tx, orderedPlans);
      for (const plan of orderedPlans) {
        if (plan.status !== 'create' && plan.status !== 'update') continue;
        if (plan.entityType === 'site') {
          const row = plan.row as ImportPlantSiteDto;
          const result = await this.applySiteImport(tx, plan, row);
          refs.siteIdsByCode.set(plan.code, result.siteId);
          continue;
        }
        if (plan.entityType === 'systemCatalog') {
          const row = plan.row as ImportSystemCatalogDto;
          const result = await this.applyCatalogImport(tx, refs, plan, row);
          refs.catalogIdsByCode.set(plan.code, result.systemCatalogId);
          continue;
        }
        if (plan.entityType === 'systemInstance') {
          const row = plan.row as ImportSystemInstanceDto;
          const result = await this.applyInstanceImport(tx, refs, plan, row);
          refs.instanceIdsByCode.set(plan.code, result.systemInstanceId);
          continue;
        }

        const row = plan.row as ImportSystemIntegrationDto;
        await this.applyIntegrationImport(tx, refs, plan, row);
      }
    });
  }

  private async applySiteImport(tx: MasterEntityClient, plan: MasterImportPlan, row: ImportPlantSiteDto) {
    const createData = {
      customerId: plan.refs.customerId ?? null,
      siteName: this.requiredString(row.siteName, 'siteName'),
      siteTypeCode: this.optionalString(row.siteTypeCode),
      regionCode: this.optionalString(row.regionCode),
      address: this.optionalString(row.address),
      timezone: this.optionalString(row.timezone),
      operationOwnerName: this.optionalString(row.operationOwnerName),
      memo: this.optionalString(row.memo),
      ...(row.isActive !== undefined && { isActive: row.isActive }),
    };

    if (plan.status === 'update' && plan.existingId !== undefined) {
      return tx.plantSite.update({
        where: { siteId: plan.existingId },
        data: {
          ...(this.hasImportRef(row.customerId, row.customerCode) && { customerId: plan.refs.customerId ?? null }),
          siteName: this.requiredString(row.siteName, 'siteName'),
          ...(row.siteTypeCode !== undefined && { siteTypeCode: this.optionalString(row.siteTypeCode) }),
          ...(row.regionCode !== undefined && { regionCode: this.optionalString(row.regionCode) }),
          ...(row.address !== undefined && { address: this.optionalString(row.address) }),
          ...(row.timezone !== undefined && { timezone: this.optionalString(row.timezone) }),
          ...(row.operationOwnerName !== undefined && {
            operationOwnerName: this.optionalString(row.operationOwnerName),
          }),
          ...(row.memo !== undefined && { memo: this.optionalString(row.memo) }),
          ...(row.isActive === undefined && plan.reactivateExisting && { isActive: true }),
          ...(row.isActive !== undefined && { isActive: row.isActive }),
        },
      });
    }

    return tx.plantSite.create({
      data: {
        ...createData,
        siteCode: this.requiredString(row.siteCode, 'siteCode'),
      },
    });
  }

  private async applyCatalogImport(
    tx: MasterEntityClient,
    refs: MasterImportRuntimeRefs,
    plan: MasterImportPlan,
    row: ImportSystemCatalogDto,
  ) {
    const parentSystemCatalogId = this.resolveRuntimeId(
      plan.refs.parentSystemCatalogId,
      plan.refs.parentCatalogCode,
      refs.catalogIdsByCode,
      'parentSystemCatalogId',
    );
    const createData = {
      parentSystemCatalogId,
      catalogName: this.requiredString(row.catalogName, 'catalogName'),
      categoryCode: this.optionalString(row.categoryCode),
      vendorName: this.optionalString(row.vendorName),
      description: this.optionalString(row.description),
      memo: this.optionalString(row.memo),
      ...(row.isActive !== undefined && { isActive: row.isActive }),
    };

    if (plan.status === 'update' && plan.existingId !== undefined) {
      return tx.systemCatalog.update({
        where: { systemCatalogId: plan.existingId },
        data: {
          ...(this.hasImportRef(row.parentSystemCatalogId, row.parentCatalogCode) && { parentSystemCatalogId }),
          catalogName: this.requiredString(row.catalogName, 'catalogName'),
          ...(row.categoryCode !== undefined && { categoryCode: this.optionalString(row.categoryCode) }),
          ...(row.vendorName !== undefined && { vendorName: this.optionalString(row.vendorName) }),
          ...(row.description !== undefined && { description: this.optionalString(row.description) }),
          ...(row.memo !== undefined && { memo: this.optionalString(row.memo) }),
          ...(row.isActive === undefined && plan.reactivateExisting && { isActive: true }),
          ...(row.isActive !== undefined && { isActive: row.isActive }),
        },
      });
    }

    return tx.systemCatalog.create({
      data: {
        ...createData,
        catalogCode: this.requiredString(row.catalogCode, 'catalogCode'),
      },
    });
  }

  private async applyInstanceImport(
    tx: MasterEntityClient,
    refs: MasterImportRuntimeRefs,
    plan: MasterImportPlan,
    row: ImportSystemInstanceDto,
  ) {
    const siteId = this.resolveRuntimeId(plan.refs.siteId, plan.refs.siteCode, refs.siteIdsByCode, 'siteId');
    const systemCatalogId = this.resolveRuntimeId(
      plan.refs.systemCatalogId,
      plan.refs.systemCatalogCode,
      refs.catalogIdsByCode,
      'systemCatalogId',
    );
    const createData = {
      customerId: plan.refs.customerId ?? null,
      siteId,
      systemCatalogId,
      instanceName: this.requiredString(row.instanceName, 'instanceName'),
      environmentCode: this.optionalString(row.environmentCode),
      operationOwnerTypeCode: this.optionalString(row.operationOwnerTypeCode),
      operationOwnerName: this.optionalString(row.operationOwnerName),
      lifecycleStatusCode: this.optionalString(row.lifecycleStatusCode) ?? 'active',
      memo: this.optionalString(row.memo),
      ...(row.isActive !== undefined && { isActive: row.isActive }),
    };

    if (plan.status === 'update' && plan.existingId !== undefined) {
      return tx.systemInstance.update({
        where: { systemInstanceId: plan.existingId },
        data: {
          ...(this.hasImportRef(row.customerId, row.customerCode) && { customerId: plan.refs.customerId ?? null }),
          ...(this.hasImportRef(row.siteId, row.siteCode) && { siteId }),
          ...(this.hasImportRef(row.systemCatalogId, row.systemCatalogCode) && { systemCatalogId }),
          instanceName: this.requiredString(row.instanceName, 'instanceName'),
          ...(row.environmentCode !== undefined && { environmentCode: this.optionalString(row.environmentCode) }),
          ...(row.operationOwnerTypeCode !== undefined && {
            operationOwnerTypeCode: this.optionalString(row.operationOwnerTypeCode),
          }),
          ...(row.operationOwnerName !== undefined && {
            operationOwnerName: this.optionalString(row.operationOwnerName),
          }),
          ...(row.lifecycleStatusCode !== undefined && {
            lifecycleStatusCode: this.optionalString(row.lifecycleStatusCode) ?? 'active',
          }),
          ...(row.memo !== undefined && { memo: this.optionalString(row.memo) }),
          ...(row.isActive === undefined && plan.reactivateExisting && { isActive: true }),
          ...(row.isActive !== undefined && { isActive: row.isActive }),
        },
      });
    }

    return tx.systemInstance.create({
      data: {
        ...createData,
        instanceCode: this.requiredString(row.instanceCode, 'instanceCode'),
      },
    });
  }

  private async applyIntegrationImport(
    tx: MasterEntityClient,
    refs: MasterImportRuntimeRefs,
    plan: MasterImportPlan,
    row: ImportSystemIntegrationDto,
  ) {
    const sourceSystemInstanceId = this.resolveRequiredRuntimeId(
      plan.refs.sourceSystemInstanceId,
      plan.refs.sourceSystemInstanceCode ?? this.importOptionalText(row.sourceSystemInstanceCode),
      refs.instanceIdsByCode,
      'sourceSystemInstanceId',
    );
    const targetSystemInstanceId = this.resolveRequiredRuntimeId(
      plan.refs.targetSystemInstanceId,
      plan.refs.targetSystemInstanceCode ?? this.importOptionalText(row.targetSystemInstanceCode),
      refs.instanceIdsByCode,
      'targetSystemInstanceId',
    );
    const createData = {
      integrationName: this.requiredString(row.integrationName, 'integrationName'),
      sourceSystemInstanceId,
      targetSystemInstanceId,
      directionCode: this.optionalString(row.directionCode),
      interfaceTypeCode: this.optionalString(row.interfaceTypeCode),
      statusCode: this.optionalString(row.statusCode) ?? 'active',
      description: this.optionalString(row.description),
      memo: this.optionalString(row.memo),
      ...(row.isActive !== undefined && { isActive: row.isActive }),
    };

    if (plan.status === 'update' && plan.existingId !== undefined) {
      return tx.systemIntegration.update({
        where: { integrationId: plan.existingId },
        data: {
          integrationName: this.requiredString(row.integrationName, 'integrationName'),
          sourceSystemInstanceId,
          targetSystemInstanceId,
          ...(row.directionCode !== undefined && { directionCode: this.optionalString(row.directionCode) }),
          ...(row.interfaceTypeCode !== undefined && {
            interfaceTypeCode: this.optionalString(row.interfaceTypeCode),
          }),
          ...(row.statusCode !== undefined && { statusCode: this.optionalString(row.statusCode) ?? 'active' }),
          ...(row.description !== undefined && { description: this.optionalString(row.description) }),
          ...(row.memo !== undefined && { memo: this.optionalString(row.memo) }),
          ...(row.isActive === undefined && plan.reactivateExisting && { isActive: true }),
          ...(row.isActive !== undefined && { isActive: row.isActive }),
        },
      });
    }

    return tx.systemIntegration.create({
      data: {
        ...createData,
        integrationCode: this.requiredString(row.integrationCode, 'integrationCode'),
      },
    });
  }

  private summarizeImportRows(plans: MasterImportPlan[]) {
    return plans.reduce(
      (summary, plan) => ({
        ...summary,
        total: summary.total + 1,
        [plan.status]: summary[plan.status] + 1,
      }),
      { total: 0, create: 0, update: 0, skip: 0, error: 0 },
    );
  }

  private orderImportPlansForApply(plans: MasterImportPlan[]) {
    const activePlans = plans.filter((plan) => plan.status === 'create' || plan.status === 'update');
    const sitePlans = activePlans.filter((plan) => plan.entityType === 'site');
    const catalogPlans = activePlans.filter((plan) => plan.entityType === 'systemCatalog');
    const instancePlans = activePlans.filter((plan) => plan.entityType === 'systemInstance');
    const integrationPlans = activePlans.filter((plan) => plan.entityType === 'integration');
    return [
      ...sitePlans,
      ...this.orderCatalogPlansForApply(catalogPlans),
      ...instancePlans,
      ...integrationPlans,
    ];
  }

  private orderCatalogPlansForApply(plans: MasterImportPlan[]) {
    const remaining = [...plans];
    const ordered: MasterImportPlan[] = [];
    while (remaining.length > 0) {
      const nextIndex = remaining.findIndex((plan) => {
        const parentCode = plan.refs.parentCatalogCode ?? null;
        return !parentCode || !remaining.some((other) => other.code === parentCode);
      });
      if (nextIndex === -1) {
        ordered.push(...remaining);
        break;
      }
      const [next] = remaining.splice(nextIndex, 1);
      ordered.push(next);
    }
    return ordered;
  }

  private async loadRuntimeImportRefs(tx: MasterEntityClient, plans: MasterImportPlan[]): Promise<MasterImportRuntimeRefs> {
    const siteCodes = new Set<string>();
    const catalogCodes = new Set<string>();
    const instanceCodes = new Set<string>();

    for (const plan of plans) {
      if (plan.entityType === 'site') this.collectCode(siteCodes, plan.code);
      if (plan.entityType === 'systemCatalog') this.collectCode(catalogCodes, plan.code);
      if (plan.entityType === 'systemInstance') this.collectCode(instanceCodes, plan.code);
      this.collectCode(siteCodes, plan.refs.siteCode);
      this.collectCode(catalogCodes, plan.refs.parentCatalogCode);
      this.collectCode(catalogCodes, plan.refs.systemCatalogCode);
      this.collectCode(instanceCodes, plan.refs.sourceSystemInstanceCode);
      this.collectCode(instanceCodes, plan.refs.targetSystemInstanceCode);
    }

    const [sites, catalogs, instances] = await Promise.all([
      siteCodes.size > 0
        ? tx.plantSite.findMany({
            where: { siteCode: { in: [...siteCodes] } },
            select: { siteId: true, siteCode: true },
          })
        : Promise.resolve([]),
      catalogCodes.size > 0
        ? tx.systemCatalog.findMany({
            where: { catalogCode: { in: [...catalogCodes] } },
            select: { systemCatalogId: true, catalogCode: true },
          })
        : Promise.resolve([]),
      instanceCodes.size > 0
        ? tx.systemInstance.findMany({
            where: { instanceCode: { in: [...instanceCodes] } },
            select: { systemInstanceId: true, instanceCode: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      siteIdsByCode: new Map(sites.map((row) => [row.siteCode, row.siteId])),
      catalogIdsByCode: new Map(catalogs.map((row) => [row.catalogCode, row.systemCatalogId])),
      instanceIdsByCode: new Map(instances.map((row) => [row.instanceCode, row.systemInstanceId])),
    };
  }

  private resolveRuntimeId(
    id: bigint | null | undefined,
    code: string | null | undefined,
    refs: Map<string, bigint>,
    field: string,
  ): bigint | null {
    if (id !== undefined && id !== null) return id;
    if (!code) return null;
    const resolved = refs.get(code);
    if (!resolved) {
      throw new BadRequestException(`${field} reference '${code}' was not created or found`);
    }
    return resolved;
  }

  private resolveRequiredRuntimeId(
    id: bigint | null | undefined,
    code: string | null | undefined,
    refs: Map<string, bigint>,
    field: string,
  ): bigint {
    const resolved = this.resolveRuntimeId(id, code, refs, field);
    if (resolved === null) {
      throw new BadRequestException(`${field} is required`);
    }
    return resolved;
  }

  private importPlanBase(
    entityType: MasterImportEntityType,
    index: number,
    code: string,
    name: string | null,
    row: MasterImportPlan['row'],
  ): Pick<MasterImportPlan, 'entityType' | 'index' | 'code' | 'name' | 'row'> {
    return {
      entityType,
      index,
      code: code || `row-${index + 1}`,
      name,
      row,
    };
  }

  private resolveImportStatus(
    existing: ImportLookupRow | undefined,
    options: MasterImportOptions,
  ): Exclude<MasterImportRowStatus, 'error'> {
    if (!existing) return 'create';
    return options.updateExisting ? 'update' : 'skip';
  }

  private importStatusMessage(status: MasterImportRowStatus, label: string) {
    if (status === 'create') return `${label} 신규 생성 예정`;
    if (status === 'update') return `${label} 기존 코드 갱신 예정`;
    if (status === 'skip') return `${label} 동일 코드가 있어 건너뜀`;
    return '검증 오류';
  }

  private hasImportRef(...values: Array<string | null | undefined>) {
    return values.some((value) => value !== undefined);
  }

  private validateImportCode(code: string, seenCodes: Set<string>, field: string): string | null {
    if (!code) return `${field} is required`;
    if (seenCodes.has(code)) return `${field} '${code}' is duplicated in import payload`;
    seenCodes.add(code);
    return null;
  }

  private validateRequiredImportName(name: string, field: string): string | null {
    return name ? null : `${field} is required`;
  }

  private validateImportSiteCustomer(
    customerId: bigint | null,
    siteCustomerId: bigint | null | undefined,
  ): string | null {
    if (customerId !== null && siteCustomerId !== null && siteCustomerId !== undefined && customerId !== siteCustomerId) {
      return 'siteCode/siteId belongs to a different customerId/customerCode';
    }
    return null;
  }

  private resolveCustomerImportRef(
    customerId: string | null | undefined,
    customerCode: string | null | undefined,
    context: ImportLookupContext,
  ) {
    return this.resolveImportRef(
      customerId,
      customerCode,
      context.customersById,
      context.customersByCode,
      'customerId',
      'customerCode',
    );
  }

  private resolveSiteImportRef(
    siteId: string | null | undefined,
    siteCode: string | null | undefined,
    context: ImportLookupContext,
  ) {
    return this.resolveImportRef(
      siteId,
      siteCode,
      context.sitesById,
      context.sitesByCode,
      'siteId',
      'siteCode',
    );
  }

  private resolveCatalogImportRef(
    catalogId: string | null | undefined,
    catalogCode: string | null | undefined,
    context: ImportLookupContext,
    currentCode: string | null,
  ) {
    const resolved = this.resolveImportRef(
      catalogId,
      catalogCode,
      context.catalogsById,
      context.catalogsByCode,
      'systemCatalogId',
      'systemCatalogCode',
    );
    if (!resolved.error && currentCode && resolved.code === currentCode) {
      return { ...resolved, error: 'parent catalog cannot be the same as catalogCode' };
    }
    return resolved;
  }

  private resolveInstanceImportRef(
    instanceId: string | null | undefined,
    instanceCode: string | null | undefined,
    context: ImportLookupContext,
    label: string,
  ) {
    const resolved = this.resolveImportRef(
      instanceId,
      instanceCode,
      context.instancesById,
      context.instancesByCode,
      `${label}Id`,
      `${label}Code`,
    );
    if (resolved.id === null && resolved.code === null && !resolved.error) {
      return { ...resolved, error: `${label}Id or ${label}Code is required` };
    }
    return resolved;
  }

  private resolveImportRef(
    idValue: string | null | undefined,
    codeValue: string | null | undefined,
    byId: Map<string, ImportLookupRow>,
    byCode: Map<string, ImportLookupRow>,
    idField: string,
    codeField: string,
  ): { id: bigint | null; code: string | null; row?: ImportLookupRow; error?: string } {
    const idText = this.importOptionalText(idValue);
    const code = this.importOptionalText(codeValue);
    let idRow: ImportLookupRow | undefined;
    let codeRow: ImportLookupRow | undefined;
    let parsedId: bigint | null = null;

    if (idText) {
      parsedId = this.tryParsePositiveBigInt(idText);
      if (parsedId === null) {
        return { id: null, code, error: `${idField} must be a positive integer` };
      }
      idRow = byId.get(parsedId.toString());
      if (!idRow) {
        return { id: null, code, error: `${idField} '${idText}' was not found` };
      }
      if (!idRow.isActive) {
        return { id: null, code, error: `${idField} '${idText}' is inactive` };
      }
    }

    if (code) {
      codeRow = byCode.get(code);
      if (!codeRow) {
        return { id: parsedId, code, error: `${codeField} '${code}' was not found` };
      }
      if (!codeRow.isActive) {
        return { id: parsedId, code, error: `${codeField} '${code}' is inactive` };
      }
    }

    if (idRow && codeRow && idRow.id !== codeRow.id) {
      return { id: parsedId, code, error: `${idField} and ${codeField} point to different rows` };
    }

    const row = idRow ?? codeRow;
    return {
      id: row?.id ?? parsedId,
      code: code || row?.code || null,
      row,
    };
  }

  private sameImportReference(
    left: { id: bigint | null; code: string | null },
    right: { id: bigint | null; code: string | null },
  ) {
    if (left.id !== null && right.id !== null) return left.id === right.id;
    if (left.code !== null && right.code !== null) return left.code === right.code;
    return false;
  }

  private importIntegrationLookup(context: ImportLookupContext, code: string): ImportLookupRow | undefined {
    return context.instancesByCode.get(`__integration__:${code}`);
  }

  private collectPositiveId(target: Set<string>, value: string | null | undefined) {
    const parsed = this.tryParsePositiveBigInt(this.importOptionalText(value));
    if (parsed !== null) target.add(parsed.toString());
  }

  private collectCode(target: Set<string>, value: string | null | undefined) {
    const code = this.importOptionalText(value);
    if (code) target.add(code);
  }

  private importRequiredText(value: string | null | undefined): string {
    return this.importOptionalText(value) ?? '';
  }

  private importOptionalText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private tryParsePositiveBigInt(value: string | null | undefined): bigint | null {
    if (!value) return null;
    try {
      const parsed = BigInt(value);
      return parsed > 0n ? parsed : null;
    } catch {
      return null;
    }
  }

  private async findCustomersByIds(ids: string[]) {
    if (ids.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.customer.findMany({
      where: { id: { in: ids.map((id) => BigInt(id)) } },
      select: { id: true, customerCode: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.id.toString(), {
      id: row.id,
      code: row.customerCode,
      isActive: row.isActive,
    }]));
  }

  private async findCustomersByCodes(codes: string[]) {
    if (codes.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.customer.findMany({
      where: { customerCode: { in: codes } },
      select: { id: true, customerCode: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.customerCode, {
      id: row.id,
      code: row.customerCode,
      isActive: row.isActive,
    }]));
  }

  private async findSitesByIds(ids: string[]) {
    if (ids.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.plantSite.findMany({
      where: { siteId: { in: ids.map((id) => BigInt(id)) } },
      select: { siteId: true, siteCode: true, customerId: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.siteId.toString(), {
      id: row.siteId,
      code: row.siteCode,
      isActive: row.isActive,
      customerId: row.customerId,
    }]));
  }

  private async findSitesByCodes(codes: string[]) {
    if (codes.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.plantSite.findMany({
      where: { siteCode: { in: codes } },
      select: { siteId: true, siteCode: true, customerId: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.siteCode, {
      id: row.siteId,
      code: row.siteCode,
      isActive: row.isActive,
      customerId: row.customerId,
    }]));
  }

  private async findCatalogsByIds(ids: string[]) {
    if (ids.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.systemCatalog.findMany({
      where: { systemCatalogId: { in: ids.map((id) => BigInt(id)) } },
      select: { systemCatalogId: true, catalogCode: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.systemCatalogId.toString(), {
      id: row.systemCatalogId,
      code: row.catalogCode,
      isActive: row.isActive,
    }]));
  }

  private async findCatalogsByCodes(codes: string[]) {
    if (codes.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.systemCatalog.findMany({
      where: { catalogCode: { in: codes } },
      select: { systemCatalogId: true, catalogCode: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.catalogCode, {
      id: row.systemCatalogId,
      code: row.catalogCode,
      isActive: row.isActive,
    }]));
  }

  private async findInstancesByIds(ids: string[]) {
    if (ids.length === 0) return new Map<string, ImportLookupRow>();
    const rows = await this.db.client.systemInstance.findMany({
      where: { systemInstanceId: { in: ids.map((id) => BigInt(id)) } },
      select: { systemInstanceId: true, instanceCode: true, customerId: true, isActive: true },
    });
    return new Map(rows.map((row) => [row.systemInstanceId.toString(), {
      id: row.systemInstanceId,
      code: row.instanceCode,
      isActive: row.isActive,
      customerId: row.customerId,
    }]));
  }

  private async findInstancesByCodes(codes: string[]) {
    if (codes.length === 0) return new Map<string, ImportLookupRow>();
    const [instances, integrations] = await Promise.all([
      this.db.client.systemInstance.findMany({
        where: { instanceCode: { in: codes } },
        select: { systemInstanceId: true, instanceCode: true, customerId: true, isActive: true },
      }),
      this.db.client.systemIntegration.findMany({
        where: { integrationCode: { in: codes } },
        select: { integrationId: true, integrationCode: true, isActive: true },
      }),
    ]);
    return new Map([
      ...instances.map((row): [string, ImportLookupRow] => [row.instanceCode, {
        id: row.systemInstanceId,
        code: row.instanceCode,
        isActive: row.isActive,
        customerId: row.customerId,
      }]),
      ...integrations.map((row): [string, ImportLookupRow] => [`__integration__:${row.integrationCode}`, {
        id: row.integrationId,
        code: row.integrationCode,
        isActive: row.isActive,
      }]),
    ]);
  }

  private requiredImportProfileEntity(value: string): MasterImportProfileEntityType {
    if (MASTER_IMPORT_PROFILE_ENTITIES.includes(value as MasterImportProfileEntityType)) {
      return value as MasterImportProfileEntityType;
    }
    throw new BadRequestException('entityType must be one of sites, systemCatalogs, systemInstances, integrations');
  }

  private normalizeImportProfileMapping(value: Record<string, string> | Prisma.JsonValue): Prisma.InputJsonObject {
    if (!this.isPlainRecord(value)) {
      throw new BadRequestException('columnMapping must be an object');
    }

    const mapping = Object.entries(value).reduce<Record<string, string>>((record, [field, header]) => {
      if (typeof header !== 'string') {
        throw new BadRequestException('columnMapping values must be strings');
      }
      const normalizedField = field.trim();
      const normalizedHeader = header.trim();
      if (!normalizedField || !normalizedHeader || normalizedHeader === '__none__') {
        return record;
      }
      if (normalizedField.length > 80) {
        throw new BadRequestException('columnMapping field names can include up to 80 characters');
      }
      if (normalizedHeader.length > 200) {
        throw new BadRequestException('columnMapping header names can include up to 200 characters');
      }
      return {
        ...record,
        [normalizedField]: normalizedHeader,
      };
    }, {});

    if (Object.keys(mapping).length === 0) {
      throw new BadRequestException('columnMapping requires at least one mapped column');
    }

    return mapping;
  }

  private readImportProfileMapping(value: Prisma.JsonValue): Record<string, string> {
    if (!this.isPlainRecord(value)) return {};
    return Object.entries(value).reduce<Record<string, string>>((record, [field, header]) => {
      if (typeof header !== 'string') return record;
      return {
        ...record,
        [field]: header,
      };
    }, {});
  }

  private serializeImportProfile(row: {
    profileId: bigint;
    entityType: string;
    profileName: string;
    columnMapping: Prisma.JsonValue;
    isDefault: boolean;
    isActive: boolean;
    memo: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      profileId: row.profileId.toString(),
      entityType: this.requiredImportProfileEntity(row.entityType),
      profileName: row.profileName,
      columnMapping: this.readImportProfileMapping(row.columnMapping),
      isDefault: row.isDefault,
      isActive: row.isActive,
      memo: row.memo,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private serializeImportProfileHistory(row: {
    profileId: bigint;
    historySeq: bigint;
    eventType: string;
    eventAt: Date;
    entityType: string;
    profileName: string;
    columnMapping: Prisma.JsonValue;
    isDefault: boolean;
    isActive: boolean;
    memo: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      profileId: row.profileId.toString(),
      historySeq: row.historySeq.toString(),
      eventType: row.eventType,
      eventAt: row.eventAt.toISOString(),
      entityType: this.requiredImportProfileEntity(row.entityType),
      profileName: row.profileName,
      columnMapping: this.readImportProfileMapping(row.columnMapping),
      isDefault: row.isDefault,
      isActive: row.isActive,
      memo: row.memo,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async clearDefaultImportProfiles(entityType: MasterImportProfileEntityType, exceptProfileId?: bigint) {
    await this.db.client.pmsMasterImportProfile.updateMany({
      where: {
        entityType,
        isActive: true,
        ...(exceptProfileId !== undefined && { NOT: { profileId: exceptProfileId } }),
      },
      data: { isDefault: false },
    });
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private pageWindow(params: FindMasterItemsDto): PageWindow {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20;
    return { page, limit, skip: (page - 1) * limit };
  }

  private activeWhere(params: FindMasterItemsDto) {
    return this.toBoolean(params.includeInactive) ? {} : { isActive: true };
  }

  private toBoolean(value: boolean | string | undefined): boolean {
    return value === true || value === 'true';
  }

  private toBigIntOrUndefined(value: string | undefined): bigint | undefined {
    if (!value) return undefined;
    return this.parsePositiveBigInt(value, 'id');
  }

  private requiredString(value: string | undefined, field: string): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }

  private optionalString(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private toNullableBigInt(value: string | null | undefined, field: string): bigint | null {
    if (value === null || value === undefined || value.trim() === '') return null;
    return this.parsePositiveBigInt(value, field);
  }

  private toNullableBigIntForUpdate(value: string | null | undefined, field: string): bigint | null | undefined {
    if (value === undefined) return undefined;
    return this.toNullableBigInt(value, field);
  }

  private toRequiredBigInt(value: string | null | undefined, field: string): bigint {
    if (value === null || value === undefined || value.trim() === '') {
      throw new BadRequestException(`${field} is required`);
    }
    return this.parsePositiveBigInt(value, field);
  }

  private toRequiredBigIntForUpdate(value: string | null | undefined, field: string): bigint | undefined {
    if (value === undefined) return undefined;
    return this.toRequiredBigInt(value, field);
  }

  private parsePositiveBigInt(value: string, field: string): bigint {
    try {
      const parsed = BigInt(value.trim());
      if (parsed <= 0n) {
        throw new Error('not positive');
      }
      return parsed;
    } catch {
      throw new BadRequestException(`${field} must be a positive integer`);
    }
  }

  private async assertCustomerExists(customerId: bigint | null | undefined) {
    if (customerId === null || customerId === undefined) return null;
    const customer = await this.db.client.customer.findUnique({
      where: { id: customerId },
      select: { id: true, isActive: true },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
    if (!customer.isActive) {
      throw new BadRequestException(`Customer ${customerId} is inactive`);
    }
    return customer;
  }

  private async assertSiteExists(siteId: bigint | null | undefined) {
    if (siteId === null || siteId === undefined) return null;
    const site = await this.db.client.plantSite.findUnique({
      where: { siteId },
      select: { siteId: true, customerId: true, isActive: true },
    });
    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }
    if (!site.isActive) {
      throw new BadRequestException(`Site ${siteId} is inactive`);
    }
    return site;
  }

  private async assertSystemCatalogExists(systemCatalogId: bigint | null | undefined) {
    if (systemCatalogId === null || systemCatalogId === undefined) return null;
    const catalog = await this.db.client.systemCatalog.findUnique({
      where: { systemCatalogId },
      select: { systemCatalogId: true, isActive: true },
    });
    if (!catalog) {
      throw new NotFoundException(`System catalog ${systemCatalogId} not found`);
    }
    if (!catalog.isActive) {
      throw new BadRequestException(`System catalog ${systemCatalogId} is inactive`);
    }
    return catalog;
  }

  private async assertSystemInstanceExists(systemInstanceId: bigint | null | undefined) {
    if (systemInstanceId === null || systemInstanceId === undefined) return null;
    const instance = await this.db.client.systemInstance.findUnique({
      where: { systemInstanceId },
      select: { systemInstanceId: true, isActive: true },
    });
    if (!instance) {
      throw new NotFoundException(`System instance ${systemInstanceId} not found`);
    }
    if (!instance.isActive) {
      throw new BadRequestException(`System instance ${systemInstanceId} is inactive`);
    }
    return instance;
  }

  private resolveSiteCustomer(siteCustomerId: bigint | null, requestedCustomerId: bigint | null): bigint | null {
    if (siteCustomerId !== null && requestedCustomerId !== null && siteCustomerId !== requestedCustomerId) {
      throw new BadRequestException('siteId belongs to a different customerId');
    }
    return requestedCustomerId ?? siteCustomerId;
  }

  private async assertDistinctIntegrationEndpoints(sourceSystemInstanceId: bigint, targetSystemInstanceId: bigint) {
    if (sourceSystemInstanceId === targetSystemInstanceId) {
      throw new BadRequestException('sourceSystemInstanceId and targetSystemInstanceId must be different');
    }
  }

  private uniqueIds(values: Array<bigint | null | undefined>): bigint[] {
    return [
      ...new Set(
        values
          .filter((value): value is bigint => value !== null && value !== undefined)
          .map((value) => value.toString()),
      ),
    ].map((value) => BigInt(value));
  }

  private lookupName(map: Map<string, string>, id: bigint | null | undefined): string | null {
    return id === null || id === undefined ? null : map.get(id.toString()) ?? null;
  }

  private async customerNameMap(ids: Array<bigint | null | undefined>) {
    const values = this.uniqueIds(ids);
    if (values.length === 0) return new Map<string, string>();
    const rows = await this.db.client.customer.findMany({
      where: { id: { in: values } },
      select: { id: true, customerName: true },
    });
    return new Map(rows.map((row) => [row.id.toString(), row.customerName]));
  }

  private async siteNameMap(ids: Array<bigint | null | undefined>) {
    const values = this.uniqueIds(ids);
    if (values.length === 0) return new Map<string, string>();
    const rows = await this.db.client.plantSite.findMany({
      where: { siteId: { in: values } },
      select: { siteId: true, siteName: true },
    });
    return new Map(rows.map((row) => [row.siteId.toString(), row.siteName]));
  }

  private async catalogNameMap(ids: Array<bigint | null | undefined>) {
    const values = this.uniqueIds(ids);
    if (values.length === 0) return new Map<string, string>();
    const rows = await this.db.client.systemCatalog.findMany({
      where: { systemCatalogId: { in: values } },
      select: { systemCatalogId: true, catalogName: true },
    });
    return new Map(rows.map((row) => [row.systemCatalogId.toString(), row.catalogName]));
  }

  private async instanceNameMap(ids: Array<bigint | null | undefined>) {
    const values = this.uniqueIds(ids);
    if (values.length === 0) return new Map<string, string>();
    const rows = await this.db.client.systemInstance.findMany({
      where: { systemInstanceId: { in: values } },
      select: { systemInstanceId: true, instanceName: true },
    });
    return new Map(rows.map((row) => [row.systemInstanceId.toString(), row.instanceName]));
  }
}
