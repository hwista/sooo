import { NotFoundException } from '@nestjs/common';
import type { DatabaseService } from '../../../database/database.service.js';
import { CrmSettingsService } from './settings.service.js';

const configRow = {
  id: 1n,
  configCode: 'default',
  revision: 1,
  quoteTemplateKey: 'crm-quote-v1',
  contractTemplateKey: 'crm-contract-v1',
  dmsHandoffEnabled: true,
  pmsHandoffEnabled: false,
  accountingHandoffEnabled: false,
  accountingProviderModeCode: 'disabled',
  stalledAfterMinutes: 30,
  attemptRetentionDays: 90,
  isActive: true,
  memo: null,
  createdBy: 1n,
  createdAt: new Date('2026-08-13T00:00:00.000Z'),
  updatedBy: 1n,
  updatedAt: new Date('2026-08-13T00:00:00.000Z'),
  lastSource: 'crm-launch-operations-seed',
  lastActivity: 'seed.crm-launch-operations',
  transactionId: null,
};

function createService(row: typeof configRow | null = configRow) {
  const calls = { updates: [] as unknown[] };
  let currentRow = row;
  const db = {
    client: {
      crmConfig: {
        findUnique: async (args: { select?: unknown }) => args.select
          ? (currentRow ? { id: currentRow.id, isActive: currentRow.isActive, revision: currentRow.revision } : null)
          : currentRow,
        updateMany: async (args: { data: unknown; where: { revision: number } }) => {
          calls.updates.push(args.data);
          if (!currentRow || args.where.revision !== currentRow.revision) return { count: 0 };
          currentRow = { ...currentRow, revision: currentRow.revision + 1, updatedAt: new Date('2026-08-13T01:00:00.000Z') };
          return { count: 1 };
        },
      },
      crmConfigHistory: { findMany: async () => [] },
    },
  } as unknown as DatabaseService;
  return { service: new CrmSettingsService(db), calls };
}

describe('CrmSettingsService', () => {
  it('returns persisted settings with DB provenance and no secret field', async () => {
    const { service } = createService();

    const result = await service.getDefault();

    expect(result).toMatchObject({
      configCode: 'default',
      accountingProviderMode: 'disabled',
      source: { kind: 'database', configCode: 'default' },
    });
    expect(Object.keys(result)).not.toContain('providerUrl');
    expect(Object.keys(result)).not.toContain('secret');
  });

  it('fails closed when the launch settings seed is missing', async () => {
    const { service } = createService(null);

    await expect(service.getDefault()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates only validated non-secret settings with actor audit metadata', async () => {
    const { service, calls } = createService();

    await service.updateDefault({
      expectedRevision: 1,
      quoteTemplateKey: ' crm-quote-v2 ',
      contractTemplateKey: 'crm-contract-v2',
      dmsHandoffEnabled: true,
      pmsHandoffEnabled: false,
      accountingHandoffEnabled: false,
      accountingProviderMode: 'disabled',
      stalledAfterMinutes: 45,
      attemptRetentionDays: 120,
      memo: ' launch ',
    }, 7n);

    expect(calls.updates[0]).toMatchObject({
      quoteTemplateKey: 'crm-quote-v2',
      updatedBy: 7n,
      lastActivity: 'crm-settings-update',
    });
  });
});
