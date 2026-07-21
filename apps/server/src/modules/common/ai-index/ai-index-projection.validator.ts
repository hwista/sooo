import type {
  AiIndexAccessScopeCode,
  AiIndexAclProjection,
  AiIndexChunkProjection,
  AiIndexJsonValue,
  AiIndexObjectProjection,
  AiIndexSensitivityCode,
  AiIndexSourceApp,
} from '@ssoo/types/common';

const AI_INDEX_SOURCE_APPS: AiIndexSourceApp[] = ['admin', 'crm', 'dms', 'pms', 'sns'];
const AI_INDEX_SENSITIVITY_CODES: AiIndexSensitivityCode[] = [
  'public',
  'internal',
  'confidential',
  'restricted',
  'secret',
  'pii',
];
const AI_INDEX_ACCESS_SCOPE_CODES: AiIndexAccessScopeCode[] = ['public', 'organization', 'owner', 'acl', 'policy'];

export class AiIndexProjectionValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`AI index projection invalid: ${issues.join('; ')}`);
    this.name = 'AiIndexProjectionValidationError';
  }
}

export function assertAiIndexObjectProjection(projection: AiIndexObjectProjection): void {
  const issues: string[] = [];

  assertKnownValue(projection.sourceApp, AI_INDEX_SOURCE_APPS, 'sourceApp', issues);
  assertNonEmptyString(projection.entityType, 'entityType', issues);
  assertNonEmptyString(projection.entityId, 'entityId', issues);
  assertOptionalNonEmptyString(projection.sourceName, 'sourceName', issues);
  assertOptionalNonEmptyString(projection.sourceKind, 'sourceKind', issues);
  assertOptionalNonEmptyString(projection.adapterCode, 'adapterCode', issues);
  assertOptionalNonEmptyString(projection.embeddingProfileCode, 'embeddingProfileCode', issues);
  assertOptionalNonEmptyString(projection.sourceVersion, 'sourceVersion', issues);
  assertNonEmptyString(projection.title, 'title', issues);
  assertNonEmptyString(projection.bodyText, 'bodyText', issues);
  assertOptionalNonEmptyString(projection.summary, 'summary', issues);
  assertOptionalNonEmptyString(projection.contentHash, 'contentHash', issues);
  assertKnownValue(projection.sensitivity, AI_INDEX_SENSITIVITY_CODES, 'sensitivity', issues);
  assertAclProjection(projection.acl, projection.sensitivity, 'acl', issues);

  if (projection.metadata !== undefined && !isJsonObject(projection.metadata)) {
    issues.push('metadata must be a JSON object when provided');
  }

  if (projection.target) {
    if (projection.target.sourceApp !== projection.sourceApp) {
      issues.push(`target.sourceApp must match sourceApp ${projection.sourceApp}`);
    }
    assertNonEmptyString(projection.target.path, 'target.path', issues);
    assertOptionalNonEmptyString(projection.target.externalHref, 'target.externalHref', issues);
  }

  if (projection.capabilities) {
    for (const key of ['keyword', 'metadata', 'semantic', 'vector', 'ragContext', 'indexing']) {
      const value = projection.capabilities[key as keyof typeof projection.capabilities];
      if (value !== undefined && typeof value !== 'boolean') {
        issues.push(`capabilities.${key} must be boolean when provided`);
      }
    }
  }

  assertChunkProjections(projection.chunks, projection.sensitivity, issues);

  if (issues.length > 0) {
    throw new AiIndexProjectionValidationError(issues);
  }
}

function assertChunkProjections(
  chunks: AiIndexChunkProjection[] | undefined,
  objectSensitivity: AiIndexSensitivityCode,
  issues: string[],
): void {
  if (chunks === undefined) {
    return;
  }

  if (!Array.isArray(chunks)) {
    issues.push('chunks must be an array when provided');
    return;
  }

  const chunkKeys = new Set<string>();
  const chunkSeqs = new Set<number>();
  chunks.forEach((chunk, index) => {
    const label = `chunks[${index}]`;
    assertNonEmptyString(chunk.chunkKey, `${label}.chunkKey`, issues);
    if (chunkKeys.has(chunk.chunkKey)) {
      issues.push(`${label}.chunkKey must be unique`);
    }
    chunkKeys.add(chunk.chunkKey);

    assertNonNegativeInteger(chunk.chunkSeq, `${label}.chunkSeq`, issues);
    if (chunkSeqs.has(chunk.chunkSeq)) {
      issues.push(`${label}.chunkSeq must be unique`);
    }
    chunkSeqs.add(chunk.chunkSeq);

    assertNonEmptyString(chunk.chunkText, `${label}.chunkText`, issues);
    assertOptionalNonEmptyString(chunk.chunkHash, `${label}.chunkHash`, issues);
    assertOptionalNonNegativeInteger(chunk.tokenCount, `${label}.tokenCount`, issues);
    assertOptionalNonNegativeInteger(chunk.charStart, `${label}.charStart`, issues);
    assertOptionalNonNegativeInteger(chunk.charEnd, `${label}.charEnd`, issues);
    if (chunk.charStart !== undefined && chunk.charEnd !== undefined && chunk.charEnd < chunk.charStart) {
      issues.push(`${label}.charEnd must be greater than or equal to charStart`);
    }
    assertOptionalNonEmptyString(chunk.citationLabel, `${label}.citationLabel`, issues);
    if (chunk.metadata !== undefined && !isJsonObject(chunk.metadata)) {
      issues.push(`${label}.metadata must be a JSON object when provided`);
    }
    if (chunk.acl) {
      assertAclProjection(chunk.acl, objectSensitivity, `${label}.acl`, issues);
    }
  });
}

function assertAclProjection(
  acl: AiIndexAclProjection | undefined,
  objectSensitivity: AiIndexSensitivityCode,
  label: string,
  issues: string[],
): void {
  if (!acl) {
    issues.push(`${label} is required`);
    return;
  }

  assertKnownValue(acl.accessScope, AI_INDEX_ACCESS_SCOPE_CODES, `${label}.accessScope`, issues);
  assertKnownValue(acl.sensitivity, AI_INDEX_SENSITIVITY_CODES, `${label}.sensitivity`, issues);
  if (acl.sensitivity !== objectSensitivity) {
    issues.push(`${label}.sensitivity must match object sensitivity ${objectSensitivity}`);
  }
  if (typeof acl.searchEligible !== 'boolean') {
    issues.push(`${label}.searchEligible must be boolean`);
  }
  if (typeof acl.contextEligible !== 'boolean') {
    issues.push(`${label}.contextEligible must be boolean`);
  }
  if (acl.contextEligible === true && acl.searchEligible !== true) {
    issues.push(`${label}.contextEligible requires searchEligible`);
  }
  assertOptionalNonEmptyString(acl.policyHash, `${label}.policyHash`, issues);
  if (!isJsonObject(acl.snapshot)) {
    issues.push(`${label}.snapshot must be a JSON object`);
  }
}

function assertNonEmptyString(value: unknown, label: string, issues: string[]): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(`${label} must be a non-empty string`);
  }
}

function assertOptionalNonEmptyString(value: unknown, label: string, issues: string[]): void {
  if (value !== undefined) {
    assertNonEmptyString(value, label, issues);
  }
}

function assertNonNegativeInteger(value: unknown, label: string, issues: string[]): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    issues.push(`${label} must be a non-negative integer`);
  }
}

function assertOptionalNonNegativeInteger(value: unknown, label: string, issues: string[]): void {
  if (value !== undefined) {
    assertNonNegativeInteger(value, label, issues);
  }
}

function assertKnownValue<T extends string>(value: unknown, allowed: T[], label: string, issues: string[]): void {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    issues.push(`${label} must be one of ${allowed.join(', ')}`);
  }
}

function isJsonObject(value: unknown): value is Record<string, AiIndexJsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => isJsonValue(entry));
}

function isJsonValue(value: unknown): value is AiIndexJsonValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry));
  }

  return isJsonObject(value);
}
