import { jest } from '@jest/globals';
import { AuthEmailOutboxWorkerService } from '../../src/modules/common/auth/auth-email-outbox-worker.service.js';

describe('AuthEmailOutboxWorkerService', () => {
  it('claims a pending message and records successful SMTP delivery', async () => {
    const now = new Date('2026-08-14T00:00:00.000Z');
    const message = {
      messageId: '34e0798e-0790-4f98-85f7-901d6a5f85b0',
      toEmail: 'launch.user@example.com',
      fromEmail: null,
      templateCode: 'auth.password-reset',
      subject: 'Reset',
      bodyText: 'code: 123456',
      referenceType: 'password-reset-challenge',
      referenceId: 'challenge-1',
      statusCode: 'pending',
      sentAt: null,
      failedAt: null,
      failReason: null,
      createdAt: now,
      updatedAt: now,
    };
    let finalStatus = 'pending';
    const sendMail = jest.fn<() => Promise<unknown>>().mockResolvedValue({ messageId: 'smtp-1' });
    const verify = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const update = jest.fn(async ({ data }: { data: { statusCode?: string } }) => {
      finalStatus = data.statusCode ?? finalStatus;
      return { ...message, statusCode: finalStatus };
    });
    const authEmailOutbox = {
      findMany: jest.fn(async ({ where }: { where?: { statusCode?: string } }) => (
        where?.statusCode === 'pending'
          ? [{ ...message, statusCode: 'pending' }]
          : [{ ...message, statusCode: finalStatus }]
      )),
      updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 }),
      update,
      groupBy: jest.fn<() => Promise<Array<{ statusCode: string; _count: { _all: number } }>>>()
        .mockResolvedValue([{ statusCode: 'sent', _count: { _all: 1 } }]),
    };
    const config = new Map<string, string>([
      ['AUTH_EMAIL_OUTBOX_WORKER_ENABLED', 'true'],
      ['AUTH_EMAIL_SMTP_HOST', 'smtp.example.com'],
      ['AUTH_EMAIL_SMTP_PORT', '587'],
      ['AUTH_EMAIL_SMTP_SECURE', 'false'],
      ['AUTH_EMAIL_SMTP_USERNAME', 'mailer'],
      ['AUTH_EMAIL_SMTP_PASSWORD', 'strong-mail-password'],
      ['AUTH_EMAIL_FROM_ADDRESS', 'no-reply@example.com'],
    ]);
    const worker = new AuthEmailOutboxWorkerService(
      { client: { authEmailOutbox } } as never,
      { get: (key: string) => config.get(key) } as never,
    );
    (worker as unknown as { transporter: unknown }).transporter = {
      verify,
      sendMail,
      close: jest.fn(),
    };

    const status = await worker.runOnce('test');

    expect(verify).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'no-reply@example.com',
      to: 'launch.user@example.com',
      subject: 'Reset',
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statusCode: 'sent', lastActivity: 'sent' }),
    }));
    expect(status.state).toBe('ready');
    expect(status.recent[0]?.recipient).toBe('la*********@example.com');
  });

  it('reports disabled instead of pretending delivery readiness', async () => {
    const worker = new AuthEmailOutboxWorkerService(
      {
        client: {
          authEmailOutbox: {
            groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
            findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
          },
        },
      } as never,
      { get: () => undefined } as never,
    );

    const status = await worker.getStatus();

    expect(status.state).toBe('disabled');
    expect(status.reason).toContain('AUTH_EMAIL_OUTBOX_WORKER_ENABLED=false');
  });

  it('accepts Joi-coerced boolean and numeric configuration values', async () => {
    const authEmailOutbox = {
      groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    };
    const config = new Map<string, unknown>([
      ['AUTH_EMAIL_OUTBOX_WORKER_ENABLED', true],
      ['AUTH_EMAIL_OUTBOX_INTERVAL_MS', 45_000],
      ['AUTH_EMAIL_OUTBOX_BATCH_LIMIT', 12],
      ['AUTH_EMAIL_SMTP_HOST', 'smtp.example.com'],
      ['AUTH_EMAIL_SMTP_PORT', 587],
      ['AUTH_EMAIL_SMTP_SECURE', false],
      ['AUTH_EMAIL_SMTP_USERNAME', 'mailer'],
      ['AUTH_EMAIL_SMTP_PASSWORD', 'strong-mail-password'],
      ['AUTH_EMAIL_FROM_ADDRESS', 'no-reply@example.com'],
    ]);
    const worker = new AuthEmailOutboxWorkerService(
      { client: { authEmailOutbox } } as never,
      { get: (key: string) => config.get(key) } as never,
    );

    const status = await worker.getStatus();

    expect(status.workerEnabled).toBe(true);
    expect(status.configured).toBe(true);
    expect(status.intervalMs).toBe(45_000);
    expect(status.batchLimit).toBe(12);
    expect(status.state).toBe('blocked');
    expect(status.reason).toContain('verification has not completed');
  });
});
