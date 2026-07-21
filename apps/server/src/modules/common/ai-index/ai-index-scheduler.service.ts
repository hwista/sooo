import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiIndexJobRunSummary, AiIndexJobSchedulerStatus } from '@ssoo/types/common';
import { AiIndexWorkerService } from './ai-index-worker.service.js';

const DEFAULT_SCHEDULER_INTERVAL_MS = 60_000;
const MIN_SCHEDULER_INTERVAL_MS = 5_000;
const MAX_SCHEDULER_INTERVAL_MS = 60 * 60_000;
const DEFAULT_SCHEDULER_BATCH_LIMIT = 20;
const MAX_SCHEDULER_BATCH_LIMIT = 100;

function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function readInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numericValue = typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.floor(numericValue), max));
}

@Injectable()
export class AiIndexSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiIndexSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private lastTrigger: string | undefined;
  private lastStartedAt: string | undefined;
  private lastFinishedAt: string | undefined;
  private lastErrorMessage: string | undefined;
  private lastRun: AiIndexJobRunSummary | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiIndexWorkerService: AiIndexWorkerService,
  ) {}

  onModuleInit(): void {
    const status = this.getStatus();
    if (!status.enabled) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runOnce('interval');
    }, status.intervalMs);

    if (status.runOnStart) {
      void this.runOnce('startup');
    }

    this.logger.log(`AI index scheduler enabled: intervalMs=${status.intervalMs}, batchLimit=${status.batchLimit}`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  getStatus(): AiIndexJobSchedulerStatus {
    const schedulerConfig = this.readSchedulerConfig();
    return {
      ...schedulerConfig,
      running: this.running,
      lastTrigger: this.lastTrigger,
      lastStartedAt: this.lastStartedAt,
      lastFinishedAt: this.lastFinishedAt,
      lastErrorMessage: this.lastErrorMessage,
      lastRun: this.lastRun,
    };
  }

  async runOnce(trigger = 'manual'): Promise<AiIndexJobSchedulerStatus> {
    if (this.running) {
      return this.getStatus();
    }

    const { batchLimit } = this.readSchedulerConfig();
    this.running = true;
    this.lastTrigger = trigger;
    this.lastStartedAt = new Date().toISOString();
    this.lastFinishedAt = undefined;
    this.lastErrorMessage = undefined;

    try {
      this.lastRun = await this.aiIndexWorkerService.runPendingJobs(batchLimit);
    } catch (error) {
      this.lastErrorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI index scheduler run failed: ${this.lastErrorMessage}`);
    } finally {
      this.lastFinishedAt = new Date().toISOString();
      this.running = false;
    }

    return this.getStatus();
  }

  private readSchedulerConfig(): Pick<
    AiIndexJobSchedulerStatus,
    'enabled' | 'intervalMs' | 'batchLimit' | 'runOnStart'
  > {
    return {
      enabled: readBoolean(this.configService.get<string>('AI_INDEX_WORKER_ENABLED'), false),
      intervalMs: readInteger(
        this.configService.get<string>('AI_INDEX_WORKER_INTERVAL_MS'),
        DEFAULT_SCHEDULER_INTERVAL_MS,
        MIN_SCHEDULER_INTERVAL_MS,
        MAX_SCHEDULER_INTERVAL_MS,
      ),
      batchLimit: readInteger(
        this.configService.get<string>('AI_INDEX_WORKER_BATCH_LIMIT'),
        DEFAULT_SCHEDULER_BATCH_LIMIT,
        1,
        MAX_SCHEDULER_BATCH_LIMIT,
      ),
      runOnStart: readBoolean(this.configService.get<string>('AI_INDEX_WORKER_RUN_ON_START'), false),
    };
  }
}
