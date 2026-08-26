import { describe, expect, it, jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import { getSessionIdleTimeoutMs, isSessionIdle } from './jwt-config.js';

function config(minutes?: number): ConfigService {
  return {
    get: jest.fn(() => minutes),
  } as unknown as ConfigService;
}

describe('session idle timeout', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');

  it('defaults to 30 minutes', () => {
    expect(getSessionIdleTimeoutMs(config())).toBe(30 * 60 * 1000);
  });

  it('keeps a session active before the configured deadline', () => {
    expect(isSessionIdle(
      config(30),
      new Date('2026-08-12T11:30:00.001Z'),
      undefined,
      now,
    )).toBe(false);
  });

  it('expires a session at the configured deadline', () => {
    expect(isSessionIdle(
      config(30),
      new Date('2026-08-12T11:30:00.000Z'),
      undefined,
      now,
    )).toBe(true);
  });

  it('uses session creation time when no activity has been recorded', () => {
    expect(isSessionIdle(
      config(30),
      null,
      new Date('2026-08-12T11:29:59.999Z'),
      now,
    )).toBe(true);
  });
});
