import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type { FindCustomersDto } from './dto/customer.dto.js';

const CUSTOMER_SELECT = {
  id: true,
  customerCode: true,
  customerName: true,
  customerType: true,
  industry: true,
  address: true,
  phone: true,
  email: true,
  contactPerson: true,
  contactPhone: true,
  website: true,
  isActive: true,
  memo: true,
  createdAt: true,
  updatedAt: true,
} as const;

const EXTERNAL_ORGANIZATION_SELECT = {
  orgId: true,
  orgCode: true,
  orgName: true,
  orgType: true,
  scope: true,
  isActive: true,
} as const;

type CustomerLookupRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;
type ExternalOrganizationLookupRow = Prisma.OrganizationGetPayload<{ select: typeof EXTERNAL_ORGANIZATION_SELECT }>;
type CustomerLookupProjection = CustomerLookupRow & {
  organizationId: bigint | null;
  organizationCode: string | null;
  organizationName: string | null;
  organizationType: string | null;
  organizationScope: string | null;
};

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindCustomersDto) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;
    const search = params.search?.trim();
    const organizationMatchedCodes = search
      ? await this.findExternalOrganizationCodes(search)
      : [];

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' as const } },
          { customerCode: { contains: search, mode: 'insensitive' as const } },
          ...(organizationMatchedCodes.length > 0
            ? [{ customerCode: { in: organizationMatchedCodes } }]
            : []),
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.customer.findMany({
        where,
        select: CUSTOMER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.customer.count({ where }),
    ]);

    return { data: await this.attachOrganizationAnchors(data), total, page, limit };
  }

  async findOne(id: bigint) {
    const customer = await this.db.client.customer.findUnique({
      where: { id },
      select: CUSTOMER_SELECT,
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    const [projected] = await this.attachOrganizationAnchors([customer]);
    return projected;
  }

  private async findExternalOrganizationCodes(search: string): Promise<string[]> {
    const rows = await this.db.client.organization.findMany({
      where: {
        orgType: 'external',
        isActive: true,
        OR: [
          { orgName: { contains: search, mode: 'insensitive' } },
          { orgCode: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        orgCode: true,
      },
      take: 50,
    });

    return rows.map((row) => row.orgCode);
  }

  private async attachOrganizationAnchors(customers: CustomerLookupRow[]): Promise<CustomerLookupProjection[]> {
    if (customers.length === 0) {
      return [];
    }

    const organizations = await this.db.client.organization.findMany({
      where: {
        orgType: 'external',
        orgCode: {
          in: customers.map((customer) => customer.customerCode),
        },
      },
      select: EXTERNAL_ORGANIZATION_SELECT,
    });
    const organizationsByCode = new Map<string, ExternalOrganizationLookupRow>(
      organizations.map((organization) => [organization.orgCode, organization]),
    );

    return customers.map((customer) => {
      const organization = organizationsByCode.get(customer.customerCode);

      return {
        ...customer,
        organizationId: organization?.orgId ?? null,
        organizationCode: organization?.orgCode ?? null,
        organizationName: organization?.orgName ?? null,
        organizationType: organization?.orgType ?? null,
        organizationScope: organization?.scope ?? null,
      };
    });
  }
}
