import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MELI_RECONCILIATION_QUEUE } from 'src/app/modules/publisher-queue/publisher-queue.constants';
import { ReconcileMeliPublicationsStatus } from 'src/core/interactors/reconciliation/ReconcileMeliPublicationsStatus';

@Processor(MELI_RECONCILIATION_QUEUE, {
  concurrency: 1,
  lockDuration: 30 * 60 * 1000,
  lockRenewTime: 60 * 1000,
})
export class MeliPublicationsReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(
    MeliPublicationsReconciliationProcessor.name,
  );

  constructor(
    private readonly reconcileMeliPublicationsStatus: ReconcileMeliPublicationsStatus,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(
      `[MELI-RECONCILIATION] Barrido de estado iniciado | jobId=${job.id}`,
    );

    const summary = await this.reconcileMeliPublicationsStatus.execute('cron');

    if (summary.meliLookupErrors > 0) {
      this.logger.warn(
        `[MELI-RECONCILIATION-ALERT] Hubo errores consultando MELI | errores=${summary.meliLookupErrors} publicaciones=${summary.publicationsChecked}`,
      );
    }
  }
}
