import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  MELI_RECONCILIATION_CRON_PATTERN,
  MELI_RECONCILIATION_JOB_NAME,
  MELI_RECONCILIATION_QUEUE,
  MELI_RECONCILIATION_REPEAT_JOB_ID,
} from 'src/app/modules/publisher-queue/publisher-queue.constants';

@Injectable()
export class MeliPublicationsReconciliationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(
    MeliPublicationsReconciliationSchedulerService.name,
  );

  constructor(
    @InjectQueue(MELI_RECONCILIATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      MELI_RECONCILIATION_JOB_NAME,
      {},
      {
        jobId: MELI_RECONCILIATION_REPEAT_JOB_ID,
        repeat: {
          pattern: MELI_RECONCILIATION_CRON_PATTERN,
        },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(
      `[MELI-RECONCILIATION] Cron registrado | pattern=${MELI_RECONCILIATION_CRON_PATTERN}`,
    );
  }
}
