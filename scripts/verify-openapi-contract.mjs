#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
const DOMAIN_SPEC_PATHS = [
  'docs/common/reference/api/openapi.json',
  'docs/pms/reference/api/openapi.json',
  'docs/sns/reference/api/openapi.json',
  'docs/dms/reference/api/openapi.json',
  'docs/crm/reference/api/openapi.json',
];

const runtimeUrl = readOption('runtime-url') ?? process.env.OPENAPI_CONTRACT_RUNTIME_URL;

const staticSpecs = DOMAIN_SPEC_PATHS.map((specPath) => ({
  source: specPath,
  spec: JSON.parse(fs.readFileSync(path.resolve(specPath), 'utf8')),
}));

verifySpecCollection(staticSpecs, 'static domain specs');

if (runtimeUrl) {
  const response = await fetch(runtimeUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Runtime OpenAPI request failed: ${response.status} ${runtimeUrl}`);
  }
  const runtimeSpec = await response.json();
  verifySpecCollection([{ source: runtimeUrl, spec: runtimeSpec }], 'runtime spec');
  assertExactOperationInventory(staticSpecs, [{ source: runtimeUrl, spec: runtimeSpec }]);
}

const operationCount = operationMap(staticSpecs).size;
console.log(
  `[openapi-contract] passed: static-domains=${staticSpecs.length}, operations=${operationCount}, runtime=${runtimeUrl ? 'matched' : 'not-requested'}`,
);

function verifySpecCollection(specs, label) {
  for (const entry of specs) {
    assertOpenApiDocument(entry);
    assertLocalRefsResolve(entry);
    assertNoEmptyObjectSchemas(entry);
  }
  assertNoDuplicateOperations(specs, label);
  assertNoDuplicateOperationIds(specs, label);
  assertCriticalContracts(specs, label);
}

function assertOpenApiDocument({ source, spec }) {
  if (spec?.openapi !== '3.0.0') {
    throw new Error(`${source}: expected OpenAPI 3.0.0, got ${spec?.openapi ?? '(missing)'}`);
  }
  if (operationMap([{ source, spec }]).size === 0) {
    throw new Error(`${source}: no operations were generated`);
  }
}

function assertLocalRefsResolve({ source, spec }) {
  walk(spec, (value) => {
    if (typeof value?.$ref !== 'string') {
      return;
    }
    if (!value.$ref.startsWith('#/')) {
      throw new Error(`${source}: external OpenAPI ref is not allowed: ${value.$ref}`);
    }
    resolveRef(spec, value.$ref, source);
  });
}

function assertNoEmptyObjectSchemas({ source, spec }) {
  const emptySchemas = Object.entries(spec.components?.schemas ?? {})
    .filter(([, schema]) => isEmptyObjectSchema(schema))
    .map(([name]) => name);

  if (emptySchemas.length > 0) {
    throw new Error(`${source}: empty component schemas are not allowed: ${emptySchemas.join(', ')}`);
  }
}

function isEmptyObjectSchema(schema) {
  if (!schema || typeof schema !== 'object' || '$ref' in schema) {
    return false;
  }
  const schemaType = schema.type ?? 'object';
  if (schemaType !== 'object') {
    return false;
  }
  return Object.keys(schema.properties ?? {}).length === 0
    && schema.additionalProperties === undefined
    && !schema.allOf
    && !schema.oneOf
    && !schema.anyOf;
}

function assertNoDuplicateOperations(specs, label) {
  const owners = new Map();
  for (const { source, spec } of specs) {
    for (const key of operationMap([{ source, spec }]).keys()) {
      owners.set(key, [...(owners.get(key) ?? []), source]);
    }
  }
  const duplicates = [...owners.entries()].filter(([, sources]) => sources.length > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `${label}: operations must have one canonical domain owner: ${duplicates.map(([key, sources]) => `${key} (${sources.join(', ')})`).join('; ')}`,
    );
  }
}

function assertNoDuplicateOperationIds(specs, label) {
  const operationIds = new Map();
  for (const [key, entry] of operationMap(specs)) {
    const operationId = entry.operation.operationId;
    if (!operationId) {
      continue;
    }
    operationIds.set(operationId, [...(operationIds.get(operationId) ?? []), key]);
  }
  const duplicates = [...operationIds.entries()].filter(([, keys]) => keys.length > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `${label}: duplicate operationId values: ${duplicates.map(([id, keys]) => `${id} (${keys.join(', ')})`).join('; ')}`,
    );
  }
}

function assertCriticalContracts(specs, label) {
  const operations = operationMap(specs);
  const critical = [
    'GET /api/health',
    'POST /api/auth/login',
    'GET /api/users/profile',
    'GET /api/projects',
    'GET /api/menus/my',
    'GET /api/sns/posts',
    'GET /api/sns/access/me',
    'GET /api/dms/access/me',
    'GET /api/crm/opportunities',
    'GET /api/crm/customers',
  ];

  for (const key of critical) {
    const entry = operations.get(key);
    if (!entry) {
      throw new Error(`${label}: critical operation missing: ${key}`);
    }
    const responseSchema = jsonResponseSchema(entry, '200');
    assertProperties(entry.spec, responseSchema, ['success', 'data'], `${entry.source}: ${key} response envelope`);
  }

  const health = operations.get('GET /api/health');
  const healthData = propertySchema(health, jsonResponseSchema(health, '200'), 'data');
  assertProperties(health.spec, healthData, ['status', 'timestamp', 'service', 'version', 'releaseSha'], 'health data');

  const login = operations.get('POST /api/auth/login');
  const loginRequest = login.operation.requestBody?.content?.['application/json']?.schema;
  if (!loginRequest) {
    throw new Error(`${login.source}: login request schema missing`);
  }
  assertProperties(login.spec, loginRequest, ['loginId', 'password'], 'login request');
  assertRequired(login.spec, loginRequest, ['loginId', 'password'], 'login request');
  const loginData = propertySchema(login, jsonResponseSchema(login, '200'), 'data');
  assertProperties(login.spec, loginData, ['accessToken'], 'login response data');

  const profile = operations.get('GET /api/users/profile');
  const profileData = propertySchema(profile, jsonResponseSchema(profile, '200'), 'data');
  assertProperties(profile.spec, profileData, ['id', 'loginId', 'userName', 'displayName', 'email', 'roleCode'], 'profile data');
  const legacyProfileFields = ['userTypeCode', 'isAdmin']
    .filter((field) => field in collectProperties(profile.spec, profileData));
  if (legacyProfileFields.length > 0) {
    throw new Error(`${profile.source}: profile schema exposes removed legacy fields: ${legacyProfileFields.join(', ')}`);
  }

  assertPaginatedContract(operations.get('GET /api/projects'), ['id', 'projectName', 'lifecycle'], 'project list');
  assertPaginatedContract(operations.get('GET /api/sns/posts'), ['id', 'authorUserId', 'content'], 'SNS post list');

  const menu = operations.get('GET /api/menus/my');
  const menuData = propertySchema(menu, jsonResponseSchema(menu, '200'), 'data');
  assertProperties(menu.spec, menuData, ['generalMenus', 'adminMenus', 'favorites'], 'menu snapshot');

  const errorSchemaEntry = specs
    .map(({ source, spec }) => ({ source, spec, schema: spec.components?.schemas?.ApiError }))
    .find((entry) => entry.schema);
  if (!errorSchemaEntry) {
    throw new Error(`${label}: ApiError component schema missing`);
  }
  assertProperties(
    errorSchemaEntry.spec,
    errorSchemaEntry.schema,
    ['success', 'error', 'timestamp'],
    'ApiError',
  );
  const errorDetail = propertySchema(errorSchemaEntry, errorSchemaEntry.schema, 'error');
  assertProperties(errorSchemaEntry.spec, errorDetail, ['code', 'message'], 'ApiError.error');
}

function assertPaginatedContract(entry, itemProperties, label) {
  const responseSchema = jsonResponseSchema(entry, '200');
  assertProperties(entry.spec, responseSchema, ['success', 'data', 'meta'], `${label} envelope`);
  const properties = collectProperties(entry.spec, responseSchema);
  const dataSchema = resolveSchema(entry.spec, properties.data, entry.source);
  if (dataSchema?.type !== 'array' || !dataSchema.items) {
    throw new Error(`${entry.source}: ${label} data must be an array`);
  }
  assertProperties(entry.spec, dataSchema.items, itemProperties, `${label} item`);
  assertProperties(entry.spec, properties.meta, ['page', 'limit', 'total'], `${label} meta`);
}

function assertProperties(spec, schema, expected, label) {
  const properties = collectProperties(spec, schema);
  const missing = expected.filter((property) => !(property in properties));
  if (missing.length > 0) {
    throw new Error(`${label}: missing properties: ${missing.join(', ')}`);
  }
}

function assertRequired(spec, schema, expected, label) {
  const required = collectRequired(spec, schema);
  const missing = expected.filter((property) => !required.has(property));
  if (missing.length > 0) {
    throw new Error(`${label}: missing required properties: ${missing.join(', ')}`);
  }
}

function propertySchema(entry, schema, property) {
  const properties = collectProperties(entry.spec, schema);
  if (!properties[property]) {
    throw new Error(`${entry.source}: schema property missing: ${property}`);
  }
  return properties[property];
}

function collectProperties(spec, schema, visited = new Set()) {
  const resolved = resolveSchema(spec, schema, 'schema', visited);
  const properties = { ...(resolved?.properties ?? {}) };
  for (const part of resolved?.allOf ?? []) {
    Object.assign(properties, collectProperties(spec, part, visited));
  }
  return properties;
}

function collectRequired(spec, schema, visited = new Set()) {
  const resolved = resolveSchema(spec, schema, 'schema', visited);
  const required = new Set(resolved?.required ?? []);
  for (const part of resolved?.allOf ?? []) {
    for (const property of collectRequired(spec, part, visited)) {
      required.add(property);
    }
  }
  return required;
}

function resolveSchema(spec, schema, source, visited = new Set()) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  if (!schema.$ref) {
    return schema;
  }
  if (visited.has(schema.$ref)) {
    return {};
  }
  visited.add(schema.$ref);
  return resolveRef(spec, schema.$ref, source);
}

function resolveRef(spec, ref, source) {
  const segments = ref.slice(2).split('/').map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  let current = spec;
  for (const segment of segments) {
    current = current?.[segment];
  }
  if (!current) {
    throw new Error(`${source}: unresolved OpenAPI ref: ${ref}`);
  }
  return current;
}

function jsonResponseSchema(entry, status) {
  const response = entry.operation.responses?.[status];
  const schema = response?.content?.['application/json']?.schema;
  if (!schema) {
    throw new Error(`${entry.source}: ${entry.key} ${status} application/json response schema missing`);
  }
  return schema;
}

function operationMap(specs) {
  const map = new Map();
  for (const { source, spec } of specs) {
    for (const [pathValue, pathItem] of Object.entries(spec.paths ?? {})) {
      for (const [method, operation] of Object.entries(pathItem ?? {})) {
        if (!HTTP_METHODS.has(method)) {
          continue;
        }
        const key = `${method.toUpperCase()} ${pathValue}`;
        map.set(key, { key, source, spec, operation });
      }
    }
  }
  return map;
}

function assertExactOperationInventory(expectedSpecs, actualSpecs) {
  const expected = operationMap(expectedSpecs);
  const actual = operationMap(actualSpecs);
  const missing = [...expected.keys()].filter((key) => !actual.has(key));
  const extra = [...actual.keys()].filter((key) => !expected.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Runtime/static OpenAPI operation drift. missing-runtime=${missing.join(', ') || '(none)'} undocumented-runtime=${extra.join(', ') || '(none)'}`,
    );
  }
}

function walk(value, visitor) {
  if (!value || typeof value !== 'object') {
    return;
  }
  visitor(value);
  for (const nested of Object.values(value)) {
    walk(nested, visitor);
  }
}

function readOption(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}
