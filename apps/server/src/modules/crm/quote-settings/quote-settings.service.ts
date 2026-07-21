import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerCiStatus,
  CrmQuoteSellerProfile,
  CrmQuoteSellerProfileUpsertRequest,
} from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';

const DEFAULT_PROFILE_CODE = 'default';
const CI_STATUSES: CrmQuoteSellerCiStatus[] = ['not-configured', 'dms-planned', 'configured'];

interface CrmQuoteSellerProfileRow {
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

@Injectable()
export class QuoteSettingsService {
  constructor(private readonly db: DatabaseService) {}

  async getSellerProfile(): Promise<CrmQuoteSellerProfile> {
    const row = await this.findSellerProfileRow({ activeOnly: true });
    return row ? this.toContract(row) : this.getUnconfiguredProfile();
  }

  async upsertSellerProfile(
    dto: CrmQuoteSellerProfileUpsertRequest,
    currentUserId?: bigint,
  ): Promise<CrmQuoteSellerProfile> {
    const companyName = this.requiredText(dto.companyName, '회사명', 200);
    const payload = {
      companyName,
      ceoName: this.optionalText(dto.ceoName, 120),
      businessRegistrationNo: this.optionalText(dto.businessRegistrationNo, 80),
      address: this.optionalText(dto.address, 500),
      tel: this.optionalText(dto.tel, 80),
      fax: this.optionalText(dto.fax, 80),
      website: this.optionalText(dto.website, 200),
      email: this.optionalText(dto.email, 200),
      ciStatusCode: this.toCiStatus(dto.ciStatus),
      ciStorageRef: this.optionalText(dto.ciStorageRef, 300),
      memo: this.optionalText(dto.memo, 4000),
      isActive: true,
      updatedBy: currentUserId,
      lastSource: 'crm.quote-settings',
      lastActivity: 'quote-seller-profile-upsert',
    };

    const existing = await this.findSellerProfileRow({ activeOnly: false });
    const row = existing
      ? await this.db.client.crmQuoteSellerProfile.update({
        where: { id: existing.id },
        data: payload,
      }) as unknown as CrmQuoteSellerProfileRow
      : await this.db.client.crmQuoteSellerProfile.create({
        data: {
          profileCode: DEFAULT_PROFILE_CODE,
          ...payload,
          createdBy: currentUserId,
        },
      }) as unknown as CrmQuoteSellerProfileRow;

    return this.toContract(row);
  }

  toSellerInfoStatus(profile: CrmQuoteSellerProfile | null | undefined): CrmQuotePreviewSellerInfoStatus {
    if (!profile || profile.ciStatus === 'not-configured') {
      return 'not-configured';
    }
    if (profile.ciStatus === 'dms-planned') {
      return 'dms-ci-planned';
    }
    return 'configured';
  }

  private async findSellerProfileRow({ activeOnly }: { activeOnly: boolean }): Promise<CrmQuoteSellerProfileRow | null> {
    const row = await this.db.client.crmQuoteSellerProfile.findFirst({
      where: {
        profileCode: DEFAULT_PROFILE_CODE,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { id: 'asc' },
    }) as unknown as CrmQuoteSellerProfileRow | null;

    return row;
  }

  private getUnconfiguredProfile(): CrmQuoteSellerProfile {
    return {
      id: '',
      profileCode: DEFAULT_PROFILE_CODE,
      companyName: '공급자 회사 정보 미설정',
      ciStatus: 'not-configured',
      updatedAt: new Date(0).toISOString(),
    };
  }

  private toContract(row: CrmQuoteSellerProfileRow): CrmQuoteSellerProfile {
    return {
      id: row.id.toString(),
      profileCode: row.profileCode,
      companyName: row.companyName,
      ceoName: row.ceoName ?? undefined,
      businessRegistrationNo: row.businessRegistrationNo ?? undefined,
      address: row.address ?? undefined,
      tel: row.tel ?? undefined,
      fax: row.fax ?? undefined,
      website: row.website ?? undefined,
      email: row.email ?? undefined,
      ciStatus: this.toCiStatus(row.ciStatusCode),
      ciStorageRef: row.ciStorageRef ?? undefined,
      memo: row.memo ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
      lastActivity: row.lastActivity ?? undefined,
    };
  }

  private requiredText(value: string | undefined, label: string, maxLength: number): string {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      throw new BadRequestException(`${label}은 필수입니다.`);
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(`${label}은 ${maxLength}자를 초과할 수 없습니다.`);
    }
    return normalized;
  }

  private optionalText(value: string | undefined, maxLength: number): string | null {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      return null;
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(`입력값은 ${maxLength}자를 초과할 수 없습니다.`);
    }
    return normalized;
  }

  private toCiStatus(value: string | undefined): CrmQuoteSellerCiStatus {
    return value && CI_STATUSES.includes(value as CrmQuoteSellerCiStatus)
      ? value as CrmQuoteSellerCiStatus
      : 'dms-planned';
  }
}
