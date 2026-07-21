import { serializeBigInt } from './bigint.util.js';

class Decimal {
  constructor(private readonly value: number) {}

  toNumber(): number {
    return this.value;
  }

  toJSON(): string {
    return String(this.value);
  }
}

describe('serializeBigInt', () => {
  it('serializes nested BigInt identifiers without exposing Decimal internals', () => {
    const createdAt = new Date('2026-07-15T00:00:00.000Z');

    expect(serializeBigInt({
      id: 42n,
      actualHours: new Decimal(0.5),
      nested: [{ amount: new Decimal(123.4), ownerId: 7n }],
      createdAt,
    })).toEqual({
      id: '42',
      actualHours: 0.5,
      nested: [{ amount: 123.4, ownerId: '7' }],
      createdAt,
    });
  });
});
