import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';
import { createDmsLogger } from './dms-logger.js';

describe('DMS logger secret masking', () => {
  it('redacts credentials in errors and structured metadata', () => {
    const marker = 'crm-s10-secret-marker';
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const logger = createDmsLogger('SecretMaskingTest');

    logger.info('provider token is configured', {
      endpoint: `https://operator:${marker}@git.example/repo.git`,
      token: marker,
    });
    logger.error('probe failed', new Error(`Password=${marker};Host=db.internal`));

    const output = JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls]);
    expect(output).not.toContain(marker);
    expect(output).toContain('***');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
