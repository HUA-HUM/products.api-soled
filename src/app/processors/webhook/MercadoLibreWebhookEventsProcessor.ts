import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { MELI_WEBHOOK_EVENTS_QUEUE } from 'src/app/modules/publisher-queue/publisher-queue.constants';
import { MarketplaceChangeActionsQueueService } from 'src/app/services/marketplace-change-actions/marketplace-change-actions-queue.service';
import type { MercadoLibreWebhookJobData } from 'src/app/services/webhook/mercadolibre-webhook-queue.service';
import { InteranlSoledHttpError } from 'src/core/drivers/repositories/internal-soled/http/errors/InteranlSoledHttpError';
import { MarketplaceChangeActionRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-change-actions/MarketplaceChangeActionRepository';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetMeliProductByMlaRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/get-by-mla/GetMeliProductByMlaRepository';
import type {
  CreateMarketplaceChangeAction,
  MarketplaceChangeActionType,
} from 'src/core/entitis/internal-soled/marketplace-change-actions/MarketplaceChangeAction';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import type { MarketplacePublicationResponse } from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import { ImportWebHookChanges } from 'src/core/interactors/webhook/importWebHookChanges';

@Processor(MELI_WEBHOOK_EVENTS_QUEUE, {
  concurrency: 3,
  lockDuration: 5 * 60 * 1000,
  lockRenewTime: 30 * 1000,
  stalledInterval: 60 * 1000,
  maxStalledCount: 3,
})
export class MercadoLibreWebhookEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(MercadoLibreWebhookEventsProcessor.name);

  constructor(
    private readonly importWebHookChanges: ImportWebHookChanges,
    private readonly getMeliProductByMla: GetMeliProductByMlaRepository,
    private readonly marketplacePublications: MarketplacePublicationRepository,
    private readonly changeActions: MarketplaceChangeActionRepository,
    private readonly changeActionsQueue: MarketplaceChangeActionsQueueService,
  ) {
    super();
  }

  async process(job: Job<MercadoLibreWebhookJobData>): Promise<void> {
    this.logger.log(
      `[MELI-WEBHOOK-WORKER] Processing | jobId=${job.id} topic=${job.data.topic} meliItemId=${job.data.meliItemId}`,
    );

    const oldProduct = await this.findOldProduct(job.data.meliItemId);
    const result = await this.importWebHookChanges.execute(job.data.payload);

    if (!result.processed) {
      throw new Error(result.ignoredReason ?? 'MELI_WEBHOOK_PROCESS_FAILED');
    }

    const newProduct = await this.getMeliProductByMla.getByMla(
      result.meliItemId!,
    );
    const changes = this.detectChanges(oldProduct, newProduct);

    if (!changes.length) {
      this.logger.log(
        `[MELI-WEBHOOK-WORKER] No marketplace changes detected | meliItemId=${result.meliItemId}`,
      );
      return;
    }

    const publications = await this.marketplacePublications.list({
      sku: newProduct.sku ?? undefined,
      limit: 100,
      offset: 0,
    });
    const actions = this.buildActions(
      newProduct,
      oldProduct,
      changes,
      publications.items,
    );

    if (!actions.length) {
      this.logger.log(
        `[MELI-WEBHOOK-WORKER] No marketplace publications to update | sku=${newProduct.sku}`,
      );
      return;
    }

    const createdActions = await this.changeActions.bulkCreateOrGet({
      actions,
    });
    const maxAttemptsByActionId = new Map(
      actions.map((action) => [action.actionId, action.maxAttempts]),
    );
    const queuedActions = createdActions.items
      .filter((item) => item.status === 'queued')
      .map((item) => ({
        actionId: item.actionId,
        maxAttempts: maxAttemptsByActionId.get(item.actionId),
      }));
    const enqueued = await this.changeActionsQueue.enqueue(queuedActions);

    await Promise.allSettled(
      enqueued.map((item) =>
        this.changeActions.updateBullmqJobId(item.actionId, item.bullmqJobId),
      ),
    );
  }

  private async findOldProduct(
    meliItemId: string | null,
  ): Promise<InternalMeliProduct | null> {
    if (!meliItemId) {
      return null;
    }

    try {
      return await this.getMeliProductByMla.getByMla(meliItemId);
    } catch (error) {
      if (error instanceof InteranlSoledHttpError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  private detectChanges(
    oldProduct: InternalMeliProduct | null,
    newProduct: InternalMeliProduct,
  ): Array<{
    type: MarketplaceChangeActionType;
    oldValue: any;
    newValue: any;
  }> {
    if (!oldProduct) {
      return [];
    }

    const changes: Array<{
      type: MarketplaceChangeActionType;
      oldValue: any;
      newValue: any;
    }> = [];
    const oldPrice = this.numberOrNull(oldProduct.price);
    const newPrice = this.numberOrNull(newProduct.price);

    if (oldPrice !== null && newPrice !== null && oldPrice !== newPrice) {
      changes.push({
        type: 'price',
        oldValue: { price: oldPrice },
        newValue: { price: newPrice },
      });
    }

    if (oldProduct.available_quantity !== newProduct.available_quantity) {
      changes.push({
        type: 'stock',
        oldValue: { stock: oldProduct.available_quantity },
        newValue: { stock: newProduct.available_quantity },
      });
    }

    if (oldProduct.status !== newProduct.status) {
      changes.push({
        type: 'status',
        oldValue: { status: oldProduct.status },
        newValue: { status: newProduct.status },
      });
    }

    return changes;
  }

  private buildActions(
    newProduct: InternalMeliProduct,
    oldProduct: InternalMeliProduct | null,
    changes: Array<{
      type: MarketplaceChangeActionType;
      oldValue: any;
      newValue: any;
    }>,
    publications: MarketplacePublicationResponse[],
  ): CreateMarketplaceChangeAction[] {
    const sku = newProduct.sku;

    if (!sku) {
      return [];
    }

    return publications
      .filter((publication) => this.isActionablePublication(publication))
      .flatMap((publication) =>
        changes.map((change) => {
          const dedupeValue = JSON.stringify(change.newValue);

          return {
            actionId: `chg_${Date.now()}_${randomUUID().slice(0, 8)}`,
            dedupeKey: [
              'mercadolibre_webhook',
              sku,
              publication.marketplace,
              change.type,
              dedupeValue,
            ].join(':'),
            source: 'mercadolibre_webhook',
            sku,
            meliItemId: newProduct.meli_item_id ?? oldProduct?.meli_item_id,
            marketplace: publication.marketplace as 'oncity' | 'fravega',
            changeType: change.type,
            oldValue: change.oldValue,
            newValue: change.newValue,
            publicationId: publication.id,
            externalProductId: publication.externalProductId,
            externalSku: publication.externalSku,
            maxAttempts: 2,
          };
        }),
      );
  }

  private isActionablePublication(
    publication: MarketplacePublicationResponse,
  ): boolean {
    return (
      publication.marketplace === 'oncity' ||
      publication.marketplace === 'fravega'
    );
  }

  private numberOrNull(value: unknown): number | null {
    const parsed = Math.round(Number(value));
    return Number.isFinite(parsed) ? parsed : null;
  }
}
