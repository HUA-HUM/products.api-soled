import { Injectable, Logger } from '@nestjs/common';
import { GetDetailsProductsRepository } from 'src/core/drivers/repositories/meli-api/detailsProducts/GetDetailsProductsRepository';
import { PostMeliProductRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/insert/PostMeliProductRepository';
import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';
import type { PostMeliProductPayload } from 'src/core/entitis/internal-soled/meli-products/insert/PostMeliProduct';

type RawMeliPicture = {
  id?: unknown;
  url?: unknown;
  secure_url?: unknown;
};

type RawMeliPayload = {
  item?: {
    id?: unknown;
    site_id?: unknown;
    title?: unknown;
    status?: unknown;
    last_updated?: unknown;
    pictures?: RawMeliPicture[];
  };
};

export type MercadoLibreWebhookPayload = Record<string, unknown>;

export type ImportWebHookChangesResult = {
  ok: true;
  received: true;
  topic: string | null;
  resource: string | null;
  meliItemId: string | null;
  processed: boolean;
  ignoredReason: string | null;
};

@Injectable()
export class ImportWebHookChanges {
  private readonly logger = new Logger(ImportWebHookChanges.name);
  private readonly PROCESSABLE_TOPICS = new Set(['items', 'items_prices']);

  constructor(
    private readonly getDetailsProducts: GetDetailsProductsRepository,
    private readonly postMeliProduct: PostMeliProductRepository,
  ) {}

  async execute(
    payload: MercadoLibreWebhookPayload,
  ): Promise<ImportWebHookChangesResult> {
    const topic = this.getStringOrNull(payload.topic);
    const resource = this.getStringOrNull(payload.resource);
    const meliItemId = this.extractMeliItemId(resource);

    if (!topic || !this.PROCESSABLE_TOPICS.has(topic)) {
      return this.buildResult(
        topic,
        resource,
        meliItemId,
        false,
        'topic_ignored',
      );
    }

    if (!meliItemId) {
      return this.buildResult(
        topic,
        resource,
        meliItemId,
        false,
        'meli_item_id_not_found',
      );
    }

    const updated = await this.updateProductChanges(meliItemId, payload);

    return this.buildResult(
      topic,
      resource,
      meliItemId,
      updated,
      updated ? null : 'update_failed',
    );
  }

  private async updateProductChanges(
    meliItemId: string,
    payload: MercadoLibreWebhookPayload,
  ): Promise<boolean> {
    let product: GetDetailsProductsResponse;

    try {
      product = await this.getDetailsProducts.getByMla(meliItemId);
    } catch (error) {
      this.logger.error(
        `[MELI-WEBHOOK] Product detail failed | meliItemId=${meliItemId} error=${this.getErrorMessage(error)}`,
      );
      return false;
    }

    try {
      await this.postMeliProduct.postProducts([
        this.mapToPostPayload(product, payload),
      ]);

      this.logger.log(
        `[MELI-WEBHOOK] Internal product upserted | meliItemId=${meliItemId}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `[MELI-WEBHOOK] Internal product upsert failed | meliItemId=${meliItemId} error=${this.getErrorMessage(error)}`,
      );
      return false;
    }
  }

  private mapToPostPayload(
    product: GetDetailsProductsResponse,
    payload: MercadoLibreWebhookPayload,
  ): PostMeliProductPayload {
    return {
      meli_item_id: product.meli_item_id,
      seller_id: String(product.seller_id),
      sku: product.sku ?? product.sellerSku,
      title: product.title,
      description: product.description,
      condition_type: product.condition_type,
      status: product.status,
      permalink: product.permalink,
      price: product.price,
      base_price: product.base_price,
      original_price: product.original_price,
      available_quantity: product.available_quantity,
      sold_quantity: product.sold_quantity,
      listing_type_id: product.listing_type_id,
      buying_mode: product.buying_mode,
      catalog_listing: product.catalog_listing,
      category_id: product.category_id,
      category_name: product.category_name,
      category_path: product.category_path.map((category) => category.name),
      domain_id: product.domain_id,
      brand: product.brand,
      model: product.model,
      gtin: product.gtin,
      attributes: product.attributes.map((attribute) => ({
        id: attribute.id,
        name: attribute.name,
        value_name: attribute.value_name,
      })),
      thumbnail: product.thumbnail,
      pictures: this.mapPictures(product),
      video_id: product.video_id,
      logistic_type: product.logistic_type,
      shipping_mode: product.shipping_mode,
      free_shipping: product.free_shipping,
      local_pick_up: product.local_pick_up,
      has_variations: product.has_variations,
      variations: product.variations,
      raw_payload: this.mapRawPayload(product),
      last_webhook_at: this.getWebhookDate(payload),
      last_seen_at: product.last_seen_at,
    };
  }

  private mapRawPayload(
    product: GetDetailsProductsResponse,
  ): Record<string, unknown> {
    const rawItem = (product.raw_payload as RawMeliPayload).item;

    return {
      id: this.getStringOrFallback(rawItem?.id, product.meli_item_id),
      site_id: this.getStringOrFallback(rawItem?.site_id, 'MLA'),
      title: this.getStringOrFallback(rawItem?.title, product.title),
      status: this.getStringOrFallback(rawItem?.status, product.status),
      last_updated: this.getStringOrFallback(
        rawItem?.last_updated,
        product.updated_at ?? product.lastUpdated ?? undefined,
      ),
    };
  }

  private mapPictures(
    product: GetDetailsProductsResponse,
  ): PostMeliProductPayload['pictures'] {
    const rawPictures = (product.raw_payload as RawMeliPayload).item?.pictures;

    if (Array.isArray(rawPictures) && rawPictures.length > 0) {
      return rawPictures
        .map((picture): PostMeliProductPayload['pictures'][number] | null => {
          const url = this.getPictureUrl(picture);

          if (!url) {
            return null;
          }

          return {
            id: typeof picture.id === 'string' ? picture.id : undefined,
            url,
            secure_url:
              typeof picture.secure_url === 'string'
                ? picture.secure_url
                : undefined,
          };
        })
        .filter(
          (picture): picture is PostMeliProductPayload['pictures'][number] =>
            picture !== null,
        );
    }

    return product.pictures.map((url) => ({ url }));
  }

  private getPictureUrl(picture: RawMeliPicture): string {
    if (typeof picture.secure_url === 'string') {
      return picture.secure_url;
    }

    if (typeof picture.url === 'string') {
      return picture.url;
    }

    return '';
  }

  private getStringOrFallback(
    value: unknown,
    fallback: string | undefined,
  ): string | undefined {
    return typeof value === 'string' ? value : fallback;
  }

  private getWebhookDate(payload: MercadoLibreWebhookPayload): string | null {
    const received = this.getStringOrNull(payload.received);

    if (received) {
      return received;
    }

    return this.getStringOrNull(payload.sent);
  }

  private buildResult(
    topic: string | null,
    resource: string | null,
    meliItemId: string | null,
    processed: boolean,
    ignoredReason: string | null,
  ): ImportWebHookChangesResult {
    return {
      ok: true,
      received: true,
      topic,
      resource,
      meliItemId,
      processed,
      ignoredReason,
    };
  }

  private extractMeliItemId(resource: string | null): string | null {
    if (!resource) {
      return null;
    }

    const match = resource.match(/(?<meliItemId>MLA\d+)/i);
    return match?.groups?.meliItemId ?? null;
  }

  private getStringOrNull(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
