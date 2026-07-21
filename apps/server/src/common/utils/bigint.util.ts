/**
 * BigInt helpers to keep ID handling consistent between DB, API, and JSON.
 */

export function toBigInt(value: string | number | bigint): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

export function toIdString(value: bigint | number | string): string {
  return value.toString();
}

/**
 * Serialize BigInt-safe object by converting bigint values to strings.
 * Shallow transform to keep overhead low.
 */
export function serializeBigIntShallow<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v]),
  );
}

/**
 * Deep-serialize an object tree, converting every bigint to string.
 * Handles nested objects and arrays.
 */
export function serializeBigInt(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (isDecimalLike(value)) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serializeBigInt);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeBigInt(v)]),
    );
  }
  return value;
}

interface DecimalLike {
  toJSON: () => string;
  toNumber: () => number;
}

function isDecimalLike(value: unknown): value is DecimalLike {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DecimalLike>;
  return typeof candidate.toNumber === 'function'
    && typeof candidate.toJSON === 'function';
}
