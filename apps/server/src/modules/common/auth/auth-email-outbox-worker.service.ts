import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthEmailDeliveryStatus } from '@ssoo/types/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { DatabaseService } from '../../../database/database.service.js';

const DEFAULT_INTERVAL_MS = 30_000;
const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 60 * 60_000;
const DEFAULT_BATCH_LIMIT = 20;
const MAX_BATCH_LIMIT = 100;
const PROCESSING_RECOVERY_MS = 10 * 60_000;

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function readInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'string' || typeof value === 'number'
    ? Number(value)
    : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(Math.floor(numeric), max));
}

function maskEmail(value: string): string {
  const [local = '', domain = ''] = value.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

@Injectable()
export class AuthEmailOutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthEmailOutboxWorkerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private transporter: Transporter | undefined;
  private running = false;
  private transportVerified = false;
  private lastStartedAt: string | undefined;
  private lastFinishedAt: string | undefined;
  private lastErrorMessage: string | undefined;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = this.readConfig();
    if (!config.enabled) {
      this.logger.warn('Auth email outbox worker is disabled. Password reset delivery is not ready.');
      return;
    }

    await this.recoverStaleClaims();
    await this.verifyTransport();
    this.timer = setInterval(() => {
      this.scheduleRun('interval');
    }, config.intervalMs);

    if (config.runOnStart) {
      this.scheduleRun('startup');
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.transporter?.close();
    this.transporter = undefined;
  }

  async getStatus(): Promise<AuthEmailDeliveryStatus> {
    const config = this.readConfig();
    const grouped = await this.db.client.authEmailOutbox.groupBy({
      by: ['statusCode'],
      _count: { _all: true },
    });
    const recent = await this.db.client.authEmailOutbox.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const counts = Object.fromEntries(grouped.map((entry) => [entry.statusCode, entry._count._all]));

    const state = !config.enabled
      ? 'disabled'
      : !config.configured || !this.transportVerified ? 'blocked' : 'ready';
    const reason = state === 'ready'
      ? 'SMTP transport verification passed and the outbox worker is enabled.'
      : !config.enabled
        ? 'AUTH_EMAIL_OUTBOX_WORKER_ENABLED=false'
        : !config.configured
          ? 'SMTP host, port, from address, username, or password is missing.'
          : this.lastErrorMessage ?? 'SMTP transport verification has not completed.';

    return {
      state,
      reason,
      workerEnabled: config.enabled,
      configured: config.configured,
      transportVerified: this.transportVerified,
      running: this.running,
      intervalMs: config.intervalMs,
      batchLimit: config.batchLimit,
      lastStartedAt: this.lastStartedAt,
      lastFinishedAt: this.lastFinishedAt,
      lastErrorMessage: this.lastErrorMessage,
      counts,
      recent: recent.map((message) => ({
        messageId: message.messageId,
        recipient: maskEmail(message.toEmail),
        templateCode: message.templateCode,
        statusCode: message.statusCode,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        sentAt: message.sentAt?.toISOString() ?? null,
        failedAt: message.failedAt?.toISOString() ?? null,
        failReason: message.failReason,
      })),
    };
  }

  async runOnce(trigger = 'manual'): Promise<AuthEmailDeliveryStatus> {
    if (this.running) return this.getStatus();

    const config = this.readConfig();
    this.lastStartedAt = new Date().toISOString();
    this.lastFinishedAt = undefined;
    this.lastErrorMessage = undefined;

    if (!config.enabled || !config.configured) {
      this.lastErrorMessage = 'Auth email delivery is disabled or incompletely configured.';
      this.lastFinishedAt = new Date().toISOString();
      return this.getStatus();
    }

    this.running = true;
    try {
      if (!this.transportVerified) {
        await this.verifyTransport();
      }
      if (!this.transportVerified) {
        return this.getStatus();
      }

      const candidates = await this.db.client.authEmailOutbox.findMany({
        where: { statusCode: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: config.batchLimit,
      });

      for (const message of candidates) {
        const claimed = await this.db.client.authEmailOutbox.updateMany({
          where: { messageId: message.messageId, statusCode: 'pending' },
          data: {
            statusCode: 'processing',
            failedAt: null,
            failReason: null,
            lastSource: `auth-email-worker:${trigger}`,
            lastActivity: 'claim',
          },
        });
        if (claimed.count !== 1) continue;

        try {
          await this.getTransporter().sendMail({
            from: message.fromEmail || config.fromAddress,
            to: message.toEmail,
            subject: message.subject,
            text: message.bodyText,
          });
          await this.db.client.authEmailOutbox.update({
            where: { messageId: message.messageId },
            data: {
              statusCode: 'sent',
              sentAt: new Date(),
              failedAt: null,
              failReason: null,
              lastSource: `auth-email-worker:${trigger}`,
              lastActivity: 'sent',
            },
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.lastErrorMessage = reason;
          await this.db.client.authEmailOutbox.update({
            where: { messageId: message.messageId },
            data: {
              statusCode: 'failed',
              failedAt: new Date(),
              failReason: reason.slice(0, 1000),
              lastSource: `auth-email-worker:${trigger}`,
              lastActivity: 'failed',
            },
          });
          this.logger.error(`Auth email delivery failed for message ${message.messageId}: ${reason}`);
        }
      }
    } finally {
      this.running = false;
      this.lastFinishedAt = new Date().toISOString();
    }

    return this.getStatus();
  }

  async retry(messageId: string): Promise<AuthEmailDeliveryStatus> {
    await this.db.client.authEmailOutbox.updateMany({
      where: { messageId, statusCode: 'failed' },
      data: {
        statusCode: 'pending',
        failedAt: null,
        failReason: null,
        lastSource: 'auth-email-worker:admin',
        lastActivity: 'retry-requested',
      },
    });
    return this.runOnce('admin-retry');
  }

  triggerRun(trigger: string): void {
    this.scheduleRun(trigger);
  }

  private scheduleRun(trigger: string): void {
    void this.runOnce(trigger).catch((error) => {
      const reason = error instanceof Error ? error.message : String(error);
      this.lastErrorMessage = reason;
      this.lastFinishedAt = new Date().toISOString();
      this.logger.error(`Auth email worker run failed (${trigger}): ${reason}`);
    });
  }

  private async recoverStaleClaims(): Promise<void> {
    await this.db.client.authEmailOutbox.updateMany({
      where: {
        statusCode: 'processing',
        updatedAt: { lt: new Date(Date.now() - PROCESSING_RECOVERY_MS) },
      },
      data: {
        statusCode: 'pending',
        failReason: 'Recovered a stale processing claim after worker restart.',
        lastSource: 'auth-email-worker:startup',
        lastActivity: 'stale-claim-recovered',
      },
    });
  }

  private async verifyTransport(): Promise<void> {
    const config = this.readConfig();
    if (!config.enabled || !config.configured) {
      this.transportVerified = false;
      return;
    }

    try {
      await this.getTransporter().verify();
      this.transportVerified = true;
      this.lastErrorMessage = undefined;
      this.logger.log(`Auth email SMTP transport verified: ${config.host}:${config.port}`);
    } catch (error) {
      this.transportVerified = false;
      this.lastErrorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Auth email SMTP verification failed: ${this.lastErrorMessage}`);
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const config = this.readConfig();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    return this.transporter;
  }

  private readConfig() {
    const host = this.configService.get<string>('AUTH_EMAIL_SMTP_HOST')?.trim() ?? '';
    const port = readInteger(
      this.configService.get<string>('AUTH_EMAIL_SMTP_PORT'),
      587,
      1,
      65_535,
    );
    const username = this.configService.get<string>('AUTH_EMAIL_SMTP_USERNAME')?.trim() ?? '';
    const password = this.configService.get<string>('AUTH_EMAIL_SMTP_PASSWORD') ?? '';
    const fromAddress = this.configService.get<string>('AUTH_EMAIL_FROM_ADDRESS')?.trim() ?? '';
    return {
      enabled: readBoolean(this.configService.get<string>('AUTH_EMAIL_OUTBOX_WORKER_ENABLED'), false),
      host,
      port,
      secure: readBoolean(this.configService.get<string>('AUTH_EMAIL_SMTP_SECURE'), port === 465),
      username,
      password,
      fromAddress,
      configured: Boolean(host && port && username && password && fromAddress),
      intervalMs: readInteger(
        this.configService.get<string>('AUTH_EMAIL_OUTBOX_INTERVAL_MS'),
        DEFAULT_INTERVAL_MS,
        MIN_INTERVAL_MS,
        MAX_INTERVAL_MS,
      ),
      batchLimit: readInteger(
        this.configService.get<string>('AUTH_EMAIL_OUTBOX_BATCH_LIMIT'),
        DEFAULT_BATCH_LIMIT,
        1,
        MAX_BATCH_LIMIT,
      ),
      runOnStart: readBoolean(this.configService.get<string>('AUTH_EMAIL_OUTBOX_RUN_ON_START'), true),
    };
  }
}
