import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MarketplaceChangeActionsQueueService } from 'src/app/services/marketplace-change-actions/marketplace-change-actions-queue.service';
import { MarketplaceChangeActionRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-change-actions/MarketplaceChangeActionRepository';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetDetailsProductsBulkRepository } from 'src/core/drivers/repositories/meli-api/detailsProductsBulk/GetDetailsProductsBulkRepository';
import type { CreateMarketplaceChangeAction } from 'src/core/entitis/internal-soled/marketplace-change-actions/MarketplaceChangeAction';
import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';
import type { GetDetailsProductsBulkResponse } from 'src/core/entitis/meli-api/detailsProductsBulk/GetDetailsProductsBulkResponse';
import type { MarketplacePublicationResponse } from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import type { PublisherMarketplace } from 'src/core/entitis/internal-soled/publisher/PublisherJob';

const RECONCILIATION_SOURCE = 'meli_reconciliation';
const FULFILLMENT_LOGISTIC_TYPE = 'fulfillment';
const MELI_BULK_CHUNK_SIZE = 20;
const PUBLICATION_PAGE_SIZE = 200;
const RECONCILIABLE_MARKETPLACES: PublisherMarketplace[] = [
  'oncity',
  'fravega',
];

export type ReconcileMeliPublicationsStatusSummary = {
  publicationsChecked: number;
  meliItemsChecked: number;
  correctionsQueued: number;
  meliLookupErrors: number;
};

// Chequea, para cada SKU publicado en un retailer, cual es el estado REAL
// del item en MELI (llamando en vivo, no contra el espejo local que solo se
// refresca por webhook) y fuerza pausa + stock 0 si MELI lo tiene inactivo
// o en fulfillment. Es un respaldo por si algun webhook se perdio: solo
// corrige en un sentido (pausar), nunca reactiva algo pausado por otra razon.
@Injectable()
export class ReconcileMeliPublicationsStatus {
  private readonly logger = new Logger(ReconcileMeliPublicationsStatus.name);

  constructor(
    private readonly marketplacePublications: MarketplacePublicationRepository,
    private readonly getDetailsProductsBulk: GetDetailsProductsBulkRepository,
    private readonly changeActions: MarketplaceChangeActionRepository,
    private readonly changeActionsQueue: MarketplaceChangeActionsQueueService,
  ) {}

  async execute(): Promise<ReconcileMeliPublicationsStatusSummary> {
    const publications = await this.fetchActivePublications();
    const publicationsByMla = this.groupByMeliItemId(publications);
    const meliItemIds = [...publicationsByMla.keys()];

    let meliItemsChecked = 0;
    let meliLookupErrors = 0;
    const actions: CreateMarketplaceChangeAction[] = [];

    for (const idsChunk of this.chunk(meliItemIds, MELI_BULK_CHUNK_SIZE)) {
      let meliProducts: GetDetailsProductsResponse[];

      try {
        const response = await this.getDetailsProductsBulk.getByMlas({
          itemIds: idsChunk,
        });
        meliProducts = this.normalizeBulkResponse(response);
      } catch (error) {
        meliLookupErrors += idsChunk.length;
        this.logger.warn(
          `[MELI-RECONCILIATION] Bulk lookup failed | itemIds=${idsChunk.join(',')} error=${this.getErrorMessage(error)}`,
        );
        continue;
      }

      meliItemsChecked += meliProducts.length;

      for (const meliProduct of meliProducts) {
        const relatedPublications =
          publicationsByMla.get(meliProduct.meli_item_id) ?? [];

        actions.push(
          ...this.buildCorrectionActions(meliProduct, relatedPublications),
        );
      }
    }

    const correctionsQueued = await this.enqueueActions(actions);

    const summary: ReconcileMeliPublicationsStatusSummary = {
      publicationsChecked: publications.length,
      meliItemsChecked,
      correctionsQueued,
      meliLookupErrors,
    };

    this.logger.log(
      `[MELI-RECONCILIATION] Barrido finalizado | publicaciones=${summary.publicationsChecked} melis=${summary.meliItemsChecked} correcciones=${summary.correctionsQueued} erroresLookup=${summary.meliLookupErrors}`,
    );

    return summary;
  }

  private async fetchActivePublications(): Promise<
    MarketplacePublicationResponse[]
  > {
    const publications: MarketplacePublicationResponse[] = [];

    for (const marketplace of RECONCILIABLE_MARKETPLACES) {
      let offset = 0;

      while (true) {
        const page = await this.marketplacePublications.list({
          marketplace,
          status: 'published',
          limit: PUBLICATION_PAGE_SIZE,
          offset,
        });

        publications.push(...page.items);

        if (page.items.length < PUBLICATION_PAGE_SIZE) {
          break;
        }

        offset += PUBLICATION_PAGE_SIZE;
      }
    }

    return publications;
  }

  private groupByMeliItemId(
    publications: MarketplacePublicationResponse[],
  ): Map<string, MarketplacePublicationResponse[]> {
    const map = new Map<string, MarketplacePublicationResponse[]>();

    for (const publication of publications) {
      const meliItemId =
        publication.meliItemId ?? publication.meli_item_id ?? null;

      if (!meliItemId) {
        continue;
      }

      const existing = map.get(meliItemId) ?? [];
      existing.push(publication);
      map.set(meliItemId, existing);
    }

    return map;
  }

  private buildCorrectionActions(
    meliProduct: GetDetailsProductsResponse,
    publications: MarketplacePublicationResponse[],
  ): CreateMarketplaceChangeAction[] {
    const isFulfillment =
      meliProduct.logistic_type === FULFILLMENT_LOGISTIC_TYPE;
    const shouldBePaused = meliProduct.status !== 'active' || isFulfillment;

    if (!shouldBePaused) {
      return [];
    }

    const reason = isFulfillment ? 'fulfillment' : meliProduct.status;
    const pendingPublications = publications.filter(
      (publication) => !this.isAlreadyPaused(publication),
    );

    if (!pendingPublications.length) {
      return [];
    }

    this.logger.log(
      `[MELI-FULFILLMENT-DETECTED] sku=${pendingPublications[0].sku} meliItemId=${meliProduct.meli_item_id} logisticType=${meliProduct.logistic_type} meliStatus=${meliProduct.status} reason=${reason} marketplaces=${pendingPublications.map((publication) => publication.marketplace).join(',')} source=reconciliation`,
    );

    return pendingPublications.flatMap((publication) =>
      this.buildPauseActions(meliProduct, publication, reason),
    );
  }

  private isAlreadyPaused(
    publication: MarketplacePublicationResponse,
  ): boolean {
    const status =
      publication.publicationStatus ?? publication.publication_status;
    const stock = publication.stock ?? 0;

    return status === 'paused' && stock === 0;
  }

  private buildPauseActions(
    meliProduct: GetDetailsProductsResponse,
    publication: MarketplacePublicationResponse,
    reason: string,
  ): CreateMarketplaceChangeAction[] {
    const sku = publication.sku;
    const marketplace = publication.marketplace as 'oncity' | 'fravega';

    return [
      {
        actionId: `chg_${Date.now()}_${randomUUID().slice(0, 8)}`,
        dedupeKey: [
          RECONCILIATION_SOURCE,
          sku,
          marketplace,
          'status',
          reason,
        ].join(':'),
        source: RECONCILIATION_SOURCE,
        sku,
        meliItemId: meliProduct.meli_item_id,
        marketplace,
        changeType: 'status',
        oldValue: {
          status: publication.publicationStatus ?? null,
        },
        newValue: {
          status: 'paused',
          meliStatus: meliProduct.status,
          reason,
        },
        publicationId: publication.id,
        externalProductId:
          publication.externalProductId ?? publication.external_product_id,
        externalSku: publication.externalSku ?? publication.external_sku,
        maxAttempts: 2,
      },
      {
        actionId: `chg_${Date.now()}_${randomUUID().slice(0, 8)}`,
        dedupeKey: [RECONCILIATION_SOURCE, sku, marketplace, 'stock', '0'].join(
          ':',
        ),
        source: RECONCILIATION_SOURCE,
        sku,
        meliItemId: meliProduct.meli_item_id,
        marketplace,
        changeType: 'stock',
        oldValue: {
          stock: publication.stock ?? null,
        },
        newValue: {
          stock: 0,
        },
        publicationId: publication.id,
        externalProductId:
          publication.externalProductId ?? publication.external_product_id,
        externalSku: publication.externalSku ?? publication.external_sku,
        maxAttempts: 2,
      },
    ];
  }

  private async enqueueActions(
    actions: CreateMarketplaceChangeAction[],
  ): Promise<number> {
    if (!actions.length) {
      return 0;
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

    if (!queuedActions.length) {
      return 0;
    }

    const enqueued = await this.changeActionsQueue.enqueue(queuedActions);

    await Promise.allSettled(
      enqueued.map((item) =>
        this.changeActions.updateBullmqJobId(item.actionId, item.bullmqJobId),
      ),
    );

    return queuedActions.length;
  }

  private normalizeBulkResponse(
    response: GetDetailsProductsBulkResponse,
  ): GetDetailsProductsResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return (
      response.products ??
      response.items ??
      response.data ??
      response.results ??
      []
    );
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }

    return chunks;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
