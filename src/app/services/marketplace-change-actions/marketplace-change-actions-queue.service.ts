import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  MARKETPLACE_CHANGE_ACTION_JOB_NAME,
  MARKETPLACE_CHANGE_ACTIONS_QUEUE,
} from 'src/app/modules/publisher-queue/publisher-queue.constants';

export type MarketplaceChangeActionJobData = {
  actionId: string;
};

export type MarketplaceChangeActionToEnqueue = {
  actionId: string;
  maxAttempts?: number;
};

const DEFAULT_MAX_ATTEMPTS = 3;

@Injectable()
export class MarketplaceChangeActionsQueueService {
  private readonly logger = new Logger(
    MarketplaceChangeActionsQueueService.name,
  );

  constructor(
    @InjectQueue(MARKETPLACE_CHANGE_ACTIONS_QUEUE)
    private readonly queue: Queue<MarketplaceChangeActionJobData>,
  ) {}

  async enqueue(
    actions: MarketplaceChangeActionToEnqueue[],
  ): Promise<Array<{ actionId: string; bullmqJobId: string }>> {
    if (!actions.length) {
      return [];
    }

    const jobs = await this.queue.addBulk(
      actions.map(({ actionId, maxAttempts }) => ({
        name: MARKETPLACE_CHANGE_ACTION_JOB_NAME,
        data: { actionId },
        opts: {
          jobId: actionId,
          attempts: maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          removeOnComplete: 5000,
          removeOnFail: 10000,
        },
      })),
    );

    this.logger.log(
      `[MARKETPLACE-CHANGES-QUEUE] Actions enqueued | count=${jobs.length}`,
    );

    return jobs.map((job) => ({
      actionId: String(job.data.actionId),
      bullmqJobId: String(job.id),
    }));
  }
}
