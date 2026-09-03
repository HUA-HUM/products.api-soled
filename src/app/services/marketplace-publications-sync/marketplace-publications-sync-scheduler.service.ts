import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  MARKETPLACE_PUBLICATIONS_SYNC_CRON_PATTERN,
  MARKETPLACE_PUBLICATIONS_SYNC_JOB_NAME,
  MARKETPLACE_PUBLICATIONS_SYNC_QUEUE,
  MARKETPLACE_PUBLICATIONS_SYNC_REPEAT_JOB_ID,
} from 'src/app/modules/publisher-queue/publisher-queue.constants';

@Injectable()
export class MarketplacePublicationsSyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(
    MarketplacePublicationsSyncSchedulerService.name,
  );

  constructor(
    @InjectQueue(MARKETPLACE_PUBLICATIONS_SYNC_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // BullMQ dedupe los repeatable jobs por (name + jobId + pattern), asi
    // que llamar esto en cada arranque de la app no duplica el schedule.
    await this.queue.add(
      MARKETPLACE_PUBLICATIONS_SYNC_JOB_NAME,
      {},
      {
        jobId: MARKETPLACE_PUBLICATIONS_SYNC_REPEAT_JOB_ID,
        repeat: {
          pattern: MARKETPLACE_PUBLICATIONS_SYNC_CRON_PATTERN,
        },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(
      `[MARKETPLACE-PUBLICATIONS-SYNC] Cron registrado | pattern=${MARKETPLACE_PUBLICATIONS_SYNC_CRON_PATTERN}`,
    );
  }
}
