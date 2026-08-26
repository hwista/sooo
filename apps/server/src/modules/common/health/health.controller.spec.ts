import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns platform readiness only after a successful DB probe', async () => {
    const query = jest.fn<() => Promise<unknown>>().mockResolvedValue([{ '?column?': 1 }]);
    const dmsReadiness = jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'ready' });
    const controller = new HealthController({
      client: { $queryRawUnsafe: query },
    } as never, {
      getReadiness: dmsReadiness,
    } as never);

    await expect(controller.checkReadiness()).resolves.toMatchObject({
      success: true,
      data: { status: 'ready', database: 'ready', dms: 'ready' },
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(dmsReadiness).toHaveBeenCalledTimes(1);
  });

  it('fails readiness when the DB probe fails while keeping liveness separate', async () => {
    const dmsReadiness = jest.fn<() => Promise<unknown>>();
    const controller = new HealthController({
      client: {
        $queryRawUnsafe: jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error('offline')),
      },
    } as never, {
      getReadiness: dmsReadiness,
    } as never);

    expect(controller.check().data?.status).toBe('ok');
    await expect(controller.checkReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(dmsReadiness).not.toHaveBeenCalled();
  });

  it('fails readiness when the DMS runtime is blocked', async () => {
    const controller = new HealthController({
      client: {
        $queryRawUnsafe: jest.fn<() => Promise<unknown>>().mockResolvedValue([{ '?column?': 1 }]),
      },
    } as never, {
      getReadiness: jest.fn<() => Promise<unknown>>().mockResolvedValue({ status: 'blocked' }),
    } as never);

    await expect(controller.checkReadiness()).rejects.toMatchObject({
      response: {
        code: 'DMS_RUNTIME_NOT_READY',
      },
    });
  });
});
