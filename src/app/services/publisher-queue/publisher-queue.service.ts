import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  PUBLISHER_RUN_JOB_NAME,
  PUBLISHER_RUNS_QUEUE,
} from 'src/app/modules/publisher-queue/publisher-queue.constants';
import type { PublisherJobItem } from 'src/core/entitis/internal-soled/publisher/PublisherJob';

export type PublisherRunJobData = {
  runId: string;
};

export type EnqueuedPublisherRun = {
  runId: string;
  bullmqJobId: string;
};

@Injectable()
export class PublisherQueueService {
  private readonly logger = new Logger(PublisherQueueService.name);

  constructor(
    @InjectQueue(PUBLISHER_RUNS_QUEUE)
    private readonly publisherRunsQueue: Queue<PublisherRunJobData>,
  ) {}

  async enqueueRuns(
    items: PublisherJobItem[],
  ): Promise<EnqueuedPublisherRun[]> {
    const runnableItems = items
      .map((item) => ({
        ...item,
        runId: this.getRunId(item),
      }))
      .filter((item): item is PublisherJobItem & { runId: string } =>
        Boolean(item.runId),
      );

    if (runnableItems.length === 0) {
      return [];
    }

    const jobs = await this.publisherRunsQueue.addBulk(
      runnableItems.map((item) => ({
        name: PUBLISHER_RUN_JOB_NAME,
        data: { runId: item.runId },
        opts: {
          jobId: item.runId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      })),
    );

    this.logger.log(
      `[PUBLISHER-QUEUE] Runs enqueued | count=${runnableItems.length}`,
    );

    return jobs.map((job) => ({
      runId: String(job.data.runId),
      bullmqJobId: String(job.id),
    }));
  }

  private getRunId(item: PublisherJobItem): string | undefined {
    return item.runId ?? item.run_id;
  }
}
