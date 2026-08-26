import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { DocumentHydrationService } from '../../src/modules/dms/runtime/document-hydration.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

describe('DocumentHydrationService', () => {
  let tempRoot: string;
  let docDir: string;
  let templateDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-hydration-test-'));
    docDir = path.join(tempRoot, 'documents');
    templateDir = path.join(docDir, '_templates');
    fs.mkdirSync(templateDir, { recursive: true });
    jest.spyOn(configService, 'getDocDir').mockReturnValue(docDir);
    jest.spyOn(configService, 'getTemplateDir').mockReturnValue(templateDir);
    jest.spyOn(configService, 'getGitBootstrapRemoteUrl').mockReturnValue('http://example.invalid/repo.git');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('does not mark control-plane documents missing when bootstrap repo is unavailable and the runtime root is not a git repository', async () => {
    const updateMany = jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 0 });
    const db = {
      client: {
        user: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 1n }),
        },
        dmsDocument: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
            { relativePath: 'docs/a.md', isActive: true, documentStatusCode: 'active', syncStatusCode: 'synced' },
            { relativePath: 'docs/b.md', isActive: true, documentStatusCode: 'active', syncStatusCode: 'synced' },
          ]),
          updateMany,
          create: jest.fn(),
        },
        dmsDocumentGrant: { create: jest.fn() },
        dmsDocumentSourceFile: { create: jest.fn() },
        dmsDocumentComment: { create: jest.fn() },
        dmsTemplate: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
          create: jest.fn(),
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentHydrationService>[0];

    const documentRecordService = {
      ensureDocumentRecord: jest.fn(),
    } as unknown as ConstructorParameters<typeof DocumentHydrationService>[1];
    const result = await new DocumentHydrationService(db, documentRecordService).hydrateFromDisk();

    expect(result.documentsMissing).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('reactivates a disk document whose unique control-plane record is inactive', async () => {
    fs.mkdirSync(path.join(docDir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(docDir, 'docs', 'restored.md'), '# Restored');
    fs.mkdirSync(path.join(docDir, '.git'));

    const db = {
      client: {
        user: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 1n }),
        },
        dmsDocument: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
            {
              relativePath: 'docs/restored.md',
              isActive: false,
              documentStatusCode: 'deleted',
              syncStatusCode: 'deleted',
            },
          ]),
          updateMany: jest.fn(),
          create: jest.fn(),
        },
        dmsDocumentGrant: { create: jest.fn() },
        dmsDocumentSourceFile: { create: jest.fn() },
        dmsDocumentComment: { create: jest.fn() },
        dmsTemplate: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
          create: jest.fn(),
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentHydrationService>[0];
    const ensureDocumentRecord = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
    const documentRecordService = {
      ensureDocumentRecord,
    } as unknown as ConstructorParameters<typeof DocumentHydrationService>[1];

    const result = await new DocumentHydrationService(db, documentRecordService).hydrateFromDisk();

    expect(ensureDocumentRecord).toHaveBeenCalledWith('docs/restored.md');
    expect(result.documentsReactivated).toBe(1);
    expect(db.client.dmsDocument.create).not.toHaveBeenCalled();
  });
});
