import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PUBLISHER_RUNS_QUEUE } from 'src/app/modules/publisher-queue/publisher-queue.constants';
import type { PublisherRunJobData } from 'src/app/services/publisher-queue/publisher-queue.service';
import { ProcessPublisherRun } from 'src/core/interactors/publisher/publication_run/worker/ProcessPublisherRun';

@Processor(PUBLISHER_RUNS_QUEUE, {
  concurrency: 1,
  lockDuration: 10 * 60 * 1000,
  lockRenewTime: 60 * 1000,
  stalledInterval: 2 * 60 * 1000,
  maxStalledCount: 3,
})
export class PublisherRunsProcessor extends WorkerHost {
  private readonly logger = new Logger(PublisherRunsProcessor.name);

  constructor(private readonly processPublisherRun: ProcessPublisherRun) {
    super();
  }

  async process(job: Job<PublisherRunJobData>): Promise<void> {
    this.logger.log(`[PUBLISHER-RUN] Processing | runId=${job.data.runId}`);
    await this.processPublisherRun.execute(job.data.runId);
  }
}
