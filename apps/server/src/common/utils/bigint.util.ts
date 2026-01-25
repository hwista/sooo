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
