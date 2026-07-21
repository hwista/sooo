import type { AiIndexObjectProjection } from '@ssoo/types/common';
import {
  AiIndexProjectionValidationError,
  assertAiIndexObjectProjection,
} from './ai-index-projection.validator.js';

function createProjection(overrides: Partial<AiIndexObjectProjection> = {}): AiIndexObjectProjection {
  return {
    sourceApp: 'crm',
    sourceName: 'CRM',
    sourceKind: 'domain',
    adapterCode: 'crm.opportunity.ai-index',
    embeddingProfileCode: 'default',
    capabilities: {
      keyword: true,
      metadata: true,
      semantic: false,
      vector: false,
      ragContext: false,
      indexing: true,
    },
    entityType: 'opportunity',
    entityId: 'opp-001',
    sourceVersion: '7',
    title: 'Cloud migration opportunity',
    bodyText: 'Customer wants a cloud migration assessment and project transition plan.',
    summary: 'Cloud migration opportunity for AI/RAG projection contract validation.',
    target: {
      sourceApp: 'crm',
      path: '/opportunities/opp-001',
    },
    metadata: {
      customerId: 'customer-001',
      expectedRevenue: 120000000,
      tags: ['cloud', 'migration'],
    },
    contentHash: 'projection-hash-001',
    sensitivity: 'internal',
    acl: {
      accessScope: 'organization',
      sensitivity: 'internal',
      searchEligible: true,
      contextEligible: true,
      snapshot: {
        organizationIds: ['10'],
        policy: 'crm.opportunity.read',
      },
    },
    chunks: [
      {
        chunkKey: 'opportunity:opp-001:summary',
        chunkSeq: 0,
        chunkText: 'Customer wants a cloud migration assessment.',
        chunkHash: 'chunk-hash-001',
        citationLabel: 'Cloud migration opportunity',
        metadata: {
          field: 'summary',
        },
      },
      {
        chunkKey: 'opportunity:opp-001:transition',
        chunkSeq: 1,
        chunkText: 'The opportunity should transition into PMS after contract approval.',
        citationLabel: 'PMS transition plan',
      },
    ],
    ...overrides,
  };
}

describe('AI index object projection validator', () => {
  it('accepts a domain RDB object projection that preserves source identity, ACL, and chunks', () => {
    expect(() => assertAiIndexObjectProjection(createProjection())).not.toThrow();
  });

  it('rejects projections with source/target drift before DB upsert', () => {
    const projection = createProjection({
      target: {
        sourceApp: 'pms',
        path: '/projects/prj-001',
      },
    });

    expect(() => assertAiIndexObjectProjection(projection)).toThrow(AiIndexProjectionValidationError);
    try {
      assertAiIndexObjectProjection(projection);
    } catch (error) {
      expect(error).toBeInstanceOf(AiIndexProjectionValidationError);
      expect(error instanceof AiIndexProjectionValidationError ? error.issues : []).toContain(
        'target.sourceApp must match sourceApp crm',
      );
    }
  });

  it('rejects context eligible ACLs that are not search eligible', () => {
    const projection = createProjection({
      acl: {
        accessScope: 'organization',
        sensitivity: 'internal',
        searchEligible: false,
        contextEligible: true,
        snapshot: {
          organizationIds: ['10'],
        },
      },
    });

    expect(() => assertAiIndexObjectProjection(projection)).toThrow(AiIndexProjectionValidationError);
  });

  it('rejects duplicate or empty chunks before embedding jobs are attempted', () => {
    const projection = createProjection({
      chunks: [
        {
          chunkKey: 'opportunity:opp-001:summary',
          chunkSeq: 0,
          chunkText: 'A valid first chunk.',
        },
        {
          chunkKey: 'opportunity:opp-001:summary',
          chunkSeq: 0,
          chunkText: '',
        },
      ],
    });

    expect(() => assertAiIndexObjectProjection(projection)).toThrow(AiIndexProjectionValidationError);
  });
});
