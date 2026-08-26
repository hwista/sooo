import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { jest } from '@jest/globals';
import { GlobalHttpExceptionFilter } from './http-exception.filter.js';

describe('GlobalHttpExceptionFilter secret masking', () => {
  it('redacts exception messages and sensitive query values from the response', () => {
    const marker = 'crm-s10-secret-marker';
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          path: '/api/crm/operations/attempts/invalid',
          url: `/api/crm/operations/attempts/invalid?access_token=${marker}`,
        }),
      }),
    } as unknown as ArgumentsHost;

    new GlobalHttpExceptionFilter().catch(
      new BadRequestException(`postgresql://operator:${marker}@db.internal/crm`),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    const payload = JSON.stringify(json.mock.calls[0]?.[0]);
    expect(payload).not.toContain(marker);
    expect(payload).toContain('***');
  });
});
