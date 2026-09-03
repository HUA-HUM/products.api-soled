import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MARKETPLACE_PUBLICATIONS_SYNC_QUEUE } from 'src/app/modules/publisher-queue/publisher-queue.constants';
import { SyncMarketplacePublicationsCatalog } from 'src/core/interactors/import-marketplaces/SyncMarketplacePublicationsCatalog';

@Processor(MARKETPLACE_PUBLICATIONS_SYNC_QUEUE, {
  concurrency: 1,
  lockDuration: 30 * 60 * 1000,
  lockRenewTime: 60 * 1000,
})
export class MarketplacePublicationsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(
    MarketplacePublicationsSyncProcessor.name,
  );

  constructor(
    private readonly syncMarketplacePublicationsCatalog: SyncMarketplacePublicationsCatalog,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(
      `[MARKETPLACE-PUBLICATIONS-SYNC] Barrido de catalogo iniciado | jobId=${job.id}`,
    );

    const summary = await this.syncMarketplacePublicationsCatalog.execute();

    for (const marketplaceSummary of summary.marketplaces) {
      this.logger.log(
        `[MARKETPLACE-PUBLICATIONS-SYNC] ${marketplaceSummary.marketplace} | paginas=${marketplaceSummary.pagesProcessed} encontrados=${marketplaceSummary.productsFound} sincronizados=${marketplaceSummary.productsSynced} errores=${marketplaceSummary.errors.length}`,
      );

      if (marketplaceSummary.errors.length) {
        this.logger.warn(
          `[MARKETPLACE-PUBLICATIONS-SYNC-ALERT] ${marketplaceSummary.marketplace} tuvo ${marketplaceSummary.errors.length} errores | ejemplo=${JSON.stringify(marketplaceSummary.errors[0])}`,
        );
      }
    }
  }
}
