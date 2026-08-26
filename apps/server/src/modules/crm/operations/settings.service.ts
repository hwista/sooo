import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type {
  CrmAccountingProviderMode,
  CrmSettings,
  CrmSettingsHistoryItem,
  CrmSettingsUpdateRequest,
} from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';

const DEFAULT_CONFIG_CODE = 'default';
const ACCOUNTING_PROVIDER_MODES: CrmAccountingProviderMode[] = ['disabled', 'external-api'];

type CrmConfigRow = Prisma.CrmConfigGetPayload<Record<string, never>>;
type CrmConfigHistoryRow = Prisma.CrmConfigHistoryGetPayload<Record<string, never>>;

@Injectable()
export class CrmSettingsService {
  constructor(private readonly db: DatabaseService) {}

  async findDefault(): Promise<CrmSettings | null> {
    const row = await this.db.client.crmConfig.findUnique({
      where: { configCode: DEFAULT_CONFIG_CODE },
    });
    return row && row.isActive ? this.toSettings(row) : null;
  }

  async getDefault(): Promise<CrmSettings> {
    const settings = await this.findDefault();
    if (!settings) {
      throw new NotFoundException('CRM 기본 운영 설정이 없습니다. launch migration과 seed를 적용하세요.');
    }
    return settings;
  }

  async updateDefault(input: CrmSettingsUpdateRequest, currentUserId: bigint): Promise<CrmSettings> {
    if (!input.dmsHandoffEnabled) {
      throw new BadRequestException('DMS 문서 인계는 CRM 런칭 필수 경계이므로 비활성화할 수 없습니다.');
    }
    if (input.accountingHandoffEnabled !== (input.accountingProviderMode === 'external-api')) {
      throw new BadRequestException('회계·지급 인계 활성 상태와 provider mode가 일치해야 합니다.');
    }
    const existing = await this.db.client.crmConfig.findUnique({
      where: { configCode: DEFAULT_CONFIG_CODE },
      select: { id: true, isActive: true, revision: true },
    });
    if (!existing?.isActive) {
      throw new NotFoundException('CRM 기본 운영 설정이 없습니다. launch migration과 seed를 적용하세요.');
    }

    const result = await this.db.client.crmConfig.updateMany({
      where: {
        id: existing.id,
        revision: input.expectedRevision,
        isActive: true,
      },
      data: {
        revision: { increment: 1 },
        quoteTemplateKey: input.quoteTemplateKey.trim(),
        contractTemplateKey: input.contractTemplateKey.trim(),
        dmsHandoffEnabled: input.dmsHandoffEnabled,
        pmsHandoffEnabled: input.pmsHandoffEnabled,
        accountingHandoffEnabled: input.accountingHandoffEnabled,
        accountingProviderModeCode: input.accountingProviderMode,
        stalledAfterMinutes: input.stalledAfterMinutes,
        attemptRetentionDays: input.attemptRetentionDays,
        memo: this.optionalText(input.memo),
        updatedBy: currentUserId,
        lastSource: 'crm.launch-settings',
        lastActivity: 'crm-settings-update',
      },
    });
    if (result.count !== 1) {
      throw new ConflictException(
        `CRM 설정이 다른 운영자에 의해 변경되었습니다. 현재 revision은 ${existing.revision}입니다. 새로고침 후 다시 저장하세요.`,
      );
    }
    return this.getDefault();
  }

  async listHistory(limit = 50): Promise<CrmSettingsHistoryItem[]> {
    const current = await this.db.client.crmConfig.findUnique({
      where: { configCode: DEFAULT_CONFIG_CODE },
      select: { id: true },
    });
    if (!current) {
      return [];
    }
    const rows = await this.db.client.crmConfigHistory.findMany({
      where: { crmConfigId: current.id },
      orderBy: { historySeq: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map((row) => this.toHistory(row));
  }

  private toSettings(row: CrmConfigRow): CrmSettings {
    return {
      id: row.id.toString(),
      configCode: row.configCode,
      revision: row.revision,
      quoteTemplateKey: row.quoteTemplateKey,
      contractTemplateKey: row.contractTemplateKey,
      dmsHandoffEnabled: row.dmsHandoffEnabled,
      pmsHandoffEnabled: row.pmsHandoffEnabled,
      accountingHandoffEnabled: row.accountingHandoffEnabled,
      accountingProviderMode: this.toProviderMode(row.accountingProviderModeCode),
      stalledAfterMinutes: row.stalledAfterMinutes,
      attemptRetentionDays: row.attemptRetentionDays,
      memo: row.memo ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy?.toString(),
      source: {
        kind: 'database',
        configCode: row.configCode,
        lastActivity: row.lastActivity ?? undefined,
        transactionId: row.transactionId ?? undefined,
      },
    };
  }

  private toHistory(row: CrmConfigHistoryRow): CrmSettingsHistoryItem {
    const base = this.toSettings({
      id: row.crmConfigId,
      configCode: row.configCode,
      revision: row.revision,
      quoteTemplateKey: row.quoteTemplateKey,
      contractTemplateKey: row.contractTemplateKey,
      dmsHandoffEnabled: row.dmsHandoffEnabled,
      pmsHandoffEnabled: row.pmsHandoffEnabled,
      accountingHandoffEnabled: row.accountingHandoffEnabled,
      accountingProviderModeCode: row.accountingProviderModeCode,
      stalledAfterMinutes: row.stalledAfterMinutes,
      attemptRetentionDays: row.attemptRetentionDays,
      isActive: row.isActive,
      memo: row.memo,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
      lastSource: row.lastSource,
      lastActivity: row.lastActivity,
      transactionId: row.transactionId,
    });
    return {
      ...base,
      historySequence: row.historySeq.toString(),
      eventType: row.eventType as CrmSettingsHistoryItem['eventType'],
      eventAt: row.eventAt.toISOString(),
      eventBy: row.eventBy?.toString(),
    };
  }

  private toProviderMode(value: string): CrmAccountingProviderMode {
    return ACCOUNTING_PROVIDER_MODES.includes(value as CrmAccountingProviderMode)
      ? value as CrmAccountingProviderMode
      : 'disabled';
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }
}
