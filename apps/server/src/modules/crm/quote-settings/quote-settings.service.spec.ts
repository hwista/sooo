import type { DatabaseService } from '../../../database/database.service.js';
import { QuoteSettingsService } from './quote-settings.service.js';

interface SellerRow {
  id: bigint;
  profileCode: string;
  companyName: string;
  ceoName: string | null;
  businessRegistrationNo: string | null;
  address: string | null;
  tel: string | null;
  fax: string | null;
  website: string | null;
  email: string | null;
  ciStatusCode: string;
  ciStorageRef: string | null;
  memo: string | null;
  updatedAt: Date;
  lastActivity: string | null;
}

interface SellerMutationData {
  profileCode?: string;
  companyName: string;
  ceoName: string | null;
  businessRegistrationNo: string | null;
  address: string | null;
  tel: string | null;
  fax: string | null;
  website: string | null;
  email: string | null;
  ciStatusCode: string;
  ciStorageRef: string | null;
  memo: string | null;
  isActive: boolean;
  createdBy?: bigint;
  updatedBy?: bigint;
  lastSource: string;
  lastActivity: string;
}

function createRow(overrides: Partial<SellerRow> = {}): SellerRow {
  return {
    id: 1n,
    profileCode: 'default',
    companyName: 'SSOO 영업팀',
    ceoName: null,
    businessRegistrationNo: null,
    address: null,
    tel: null,
    fax: null,
    website: null,
    email: null,
    ciStatusCode: 'dms-planned',
    ciStorageRef: null,
    memo: null,
    updatedAt: new Date('2026-07-07T00:00:00.000Z'),
    lastActivity: 'seed',
    ...overrides,
  };
}

function createService(initialRow: SellerRow | null = createRow()) {
  let storedRow = initialRow;
  const calls = {
    findFirst: [] as unknown[],
    create: [] as Array<{ data: SellerMutationData & { profileCode: string } }>,
    update: [] as Array<{ where: { id: bigint }; data: SellerMutationData }>,
  };
  const db = {
    client: {
      crmQuoteSellerProfile: {
        findFirst: async (args: unknown) => {
          calls.findFirst.push(args);
          return storedRow;
        },
        create: async ({ data }: { data: SellerMutationData & { profileCode: string } }) => {
          calls.create.push({ data });
          storedRow = createRow({
            id: 10n,
            profileCode: data.profileCode,
            companyName: data.companyName,
            ceoName: data.ceoName,
            businessRegistrationNo: data.businessRegistrationNo,
            address: data.address,
            tel: data.tel,
            fax: data.fax,
            website: data.website,
            email: data.email,
            ciStatusCode: data.ciStatusCode,
            ciStorageRef: data.ciStorageRef,
            memo: data.memo,
            lastActivity: data.lastActivity,
          });
          return storedRow;
        },
        update: async ({ where, data }: { where: { id: bigint }; data: SellerMutationData }) => {
          calls.update.push({ where, data });
          storedRow = createRow({
            ...(storedRow ?? {}),
            id: where.id,
            companyName: data.companyName,
            ceoName: data.ceoName,
            businessRegistrationNo: data.businessRegistrationNo,
            address: data.address,
            tel: data.tel,
            fax: data.fax,
            website: data.website,
            email: data.email,
            ciStatusCode: data.ciStatusCode,
            ciStorageRef: data.ciStorageRef,
            memo: data.memo,
            lastActivity: data.lastActivity,
          });
          return storedRow;
        },
      },
    },
  } as unknown as DatabaseService;

  return {
    service: new QuoteSettingsService(db),
    calls,
  };
}

describe('QuoteSettingsService', () => {
  it('returns an unconfigured seller profile when no default row exists', async () => {
    const { service } = createService(null);

    const profile = await service.getSellerProfile();

    expect(profile).toMatchObject({
      profileCode: 'default',
      companyName: '공급자 회사 정보 미설정',
      ciStatus: 'not-configured',
    });
  });

  it('creates a default seller profile for quote display without uploading CI files', async () => {
    const { service, calls } = createService(null);

    const profile = await service.upsertSellerProfile({
      companyName: ' 삼삼오오 ',
      ceoName: ' 대표 ',
      tel: ' 02-1234-5678 ',
      ciStatus: 'dms-planned',
      memo: ' DMS 연결 전 표시 정보 ',
    }, 77n);

    expect(calls.create).toHaveLength(1);
    expect(calls.create[0]?.data).toMatchObject({
      profileCode: 'default',
      companyName: '삼삼오오',
      ceoName: '대표',
      tel: '02-1234-5678',
      ciStatusCode: 'dms-planned',
      createdBy: 77n,
      updatedBy: 77n,
      lastActivity: 'quote-seller-profile-upsert',
    });
    expect(profile).toMatchObject({
      companyName: '삼삼오오',
      ciStatus: 'dms-planned',
      memo: 'DMS 연결 전 표시 정보',
    });
  });

  it('updates the existing default seller profile and reports configured CI status', async () => {
    const { service, calls } = createService(createRow());

    const profile = await service.upsertSellerProfile({
      companyName: 'SSOO 플랫폼',
      ciStatus: 'configured',
      ciStorageRef: 'dms://documents/ci/current',
    }, 88n);

    expect(calls.update).toHaveLength(1);
    expect(calls.update[0]?.where).toEqual({ id: 1n });
    expect(calls.update[0]?.data).toMatchObject({
      companyName: 'SSOO 플랫폼',
      ciStatusCode: 'configured',
      ciStorageRef: 'dms://documents/ci/current',
      updatedBy: 88n,
    });
    expect(profile).toMatchObject({
      companyName: 'SSOO 플랫폼',
      ciStatus: 'configured',
      ciStorageRef: 'dms://documents/ci/current',
    });
    expect(service.toSellerInfoStatus(profile)).toBe('configured');
  });
});
