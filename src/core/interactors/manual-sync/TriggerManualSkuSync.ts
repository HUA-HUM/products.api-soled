import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MarketplaceChangeActionsQueueService } from 'src/app/services/marketplace-change-actions/marketplace-change-actions-queue.service';
import { MarketplaceChangeActionRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-change-actions/MarketplaceChangeActionRepository';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetMeliProductBySkuRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/get-by-sku/GetMeliProductBySkuRepository';
import type {
  CreateMarketplaceChangeAction,
  MarketplaceChangeActionMarketplace,
  MarketplaceChangeActionType,
} from 'src/core/entitis/internal-soled/marketplace-change-actions/MarketplaceChangeAction';
import type { MarketplacePublicationResponse } from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';

const MANUAL_SYNC_SOURCE = 'manual_sku_sync';
const FULFILLMENT_LOGISTIC_TYPE = 'fulfillment';
const ALL_MARKETPLACES: MarketplaceChangeActionMarketplace[] = [
  'oncity',
  'fravega',
];
const ALL_FIELDS: MarketplaceChangeActionType[] = ['price', 'stock', 'status'];

export type TriggerManualSkuSyncInput = {
  sku: string;
  marketplaces?: MarketplaceChangeActionMarketplace[];
  fields?: MarketplaceChangeActionType[];
};

export type TriggerManualSkuSyncSummary = {
  sku: string;
  meliItemId: string | null;
  meliStatus: string | null;
  isFulfillment: boolean;
  actionsQueued: number;
  marketplacesQueued: MarketplaceChangeActionMarketplace[];
  skippedMarketplaces: Array<{
    marketplace: MarketplaceChangeActionMarketplace;
    reason: string;
  }>;
};

// Fuerza, para UN sku puntual, la misma logica que ya corre sola via webhook
// o reconciliacion: mira el estado REAL en MELI y empuja precio/stock/status
// a Fravega/OnCity a traves del mismo pipeline de change-actions. Pensado
// para corregir a mano un caso puntual sin esperar al proximo cron.
@Injectable()
export class TriggerManualSkuSync {
  private readonly logger = new Logger(TriggerManualSkuSync.name);

  constructor(
    private readonly getMeliProductBySku: GetMeliProductBySkuRepository,
    private readonly marketplacePublications: MarketplacePublicationRepository,
    private readonly changeActions: MarketplaceChangeActionRepository,
    private readonly changeActionsQueue: MarketplaceChangeActionsQueueService,
  ) {}

  async execute(
    input: TriggerManualSkuSyncInput,
  ): Promise<TriggerManualSkuSyncSummary> {
    const sku = input.sku;
    const requestedMarketplaces = input.marketplaces?.length
      ? input.marketplaces
      : ALL_MARKETPLACES;
    const requestedFields = input.fields?.length ? input.fields : ALL_FIELDS;

    const meliProduct = await this.getMeliProductBySku.getBySku(sku);
    const publications = await this.marketplacePublications.list({
      sku,
      limit: 100,
      offset: 0,
    });

    const isFulfillment =
      meliProduct.logistic_type === FULFILLMENT_LOGISTIC_TYPE;
    const shouldBePaused = meliProduct.status !== 'active' || isFulfillment;

    const skippedMarketplaces: TriggerManualSkuSyncSummary['skippedMarketplaces'] =
      [];
    const actions: CreateMarketplaceChangeAction[] = [];

    for (const marketplace of requestedMarketplaces) {
      const publication = publications.items.find(
        (item) => item.marketplace === marketplace,
      );

      if (!publication) {
        skippedMarketplaces.push({
          marketplace,
          reason:
            'NO_PUBLICATION_FOUND: no hay publicacion registrada en internal-soled para este sku en este marketplace (puede estar guardada bajo otra clave, ver sync de catalogo)',
        });
        continue;
      }

      actions.push(
        ...this.buildActionsForPublication(
          sku,
          meliProduct,
          publication,
          shouldBePaused,
          isFulfillment,
          requestedFields,
        ),
      );
    }

    const marketplacesQueued = [
      ...new Set(actions.map((action) => action.marketplace)),
    ];
    const actionsQueued = await this.enqueueActions(actions);

    this.logger.log(
      `[MANUAL-SKU-SYNC] sku=${sku} meliItemId=${meliProduct.meli_item_id} meliStatus=${meliProduct.status} isFulfillment=${isFulfillment} actionsQueued=${actionsQueued} marketplaces=${marketplacesQueued.join(',')}`,
    );

    return {
      sku,
      meliItemId: meliProduct.meli_item_id ?? null,
      meliStatus: meliProduct.status ?? null,
      isFulfillment,
      actionsQueued,
      marketplacesQueued,
      skippedMarketplaces,
    };
  }

  private buildActionsForPublication(
    sku: string,
    meliProduct: InternalMeliProduct,
    publication: MarketplacePublicationResponse,
    shouldBePaused: boolean,
    isFulfillment: boolean,
    requestedFields: MarketplaceChangeActionType[],
  ): CreateMarketplaceChangeAction[] {
    const marketplace = publication.marketplace as MarketplaceChangeActionMarketplace;
    const changes: Array<{
      type: MarketplaceChangeActionType;
      newValue: Record<string, unknown>;
    }> = [];

    if (shouldBePaused) {
      if (requestedFields.includes('status')) {
        changes.push({ type: 'status', newValue: { status: 'paused' } });
      }
      if (requestedFields.includes('stock')) {
        changes.push({ type: 'stock', newValue: { stock: 0 } });
      }
    } else {
      if (requestedFields.includes('status')) {
        changes.push({
          type: 'status',
          newValue: { status: meliProduct.status },
        });
      }
      if (requestedFields.includes('stock')) {
        changes.push({
          type: 'stock',
          newValue: { stock: meliProduct.available_quantity },
        });
      }
      if (requestedFields.includes('price')) {
        changes.push({ type: 'price', newValue: { price: meliProduct.price } });
      }
    }

    const meliItemId = meliProduct.meli_item_id ?? null;

    return changes.map((change) => ({
      actionId: `chg_${Date.now()}_${randomUUID().slice(0, 8)}`,
      dedupeKey: [
        MANUAL_SYNC_SOURCE,
        sku,
        marketplace,
        change.type,
        Date.now(),
        randomUUID().slice(0, 8),
      ].join(':'),
      source: isFulfillment ? 'meli_fulfillment' : MANUAL_SYNC_SOURCE,
      sku,
      meliItemId: meliItemId ?? undefined,
      marketplace,
      changeType: change.type,
      newValue: change.newValue,
      publicationId: publication.id,
      externalProductId:
        publication.externalProductId ?? publication.external_product_id,
      externalSku: publication.externalSku ?? publication.external_sku,
      maxAttempts: 2,
    }));
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
}
