import { Injectable } from '@nestjs/common';
import type { AiIndexJobRunSummary } from '@ssoo/types/common';
import { AiIndexingService } from './ai-indexing.service.js';

@Injectable()
export class AiIndexWorkerService {
  constructor(private readonly aiIndexingService: AiIndexingService) {}

  async runPendingJobs(limit?: number): Promise<AiIndexJobRunSummary> {
    return this.aiIndexingService.runPendingJobs(limit);
  }
}
