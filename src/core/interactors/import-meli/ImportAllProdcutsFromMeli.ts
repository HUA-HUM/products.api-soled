import { Injectable, Logger } from '@nestjs/common';
import { GetItemsId } from 'src/core/drivers/repositories/meli-api/itemsId/GetItemsId';
import { GetDetailsProductsBulkRepository } from 'src/core/drivers/repositories/meli-api/detailsProductsBulk/GetDetailsProductsBulkRepository';
import { PostMeliProductRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/insert/PostMeliProductRepository';
import { InteranlSoledHttpError } from 'src/core/drivers/repositories/internal-soled/http/errors/InteranlSoledHttpError';
import type { GetDetailsProductsResponse } from 'src/core/entitis/meli-api/detailsProducts/GetDetailsProductsResponse';
import type { GetDetailsProductsBulkResponse } from 'src/core/entitis/meli-api/detailsProductsBulk/GetDetailsProductsBulkResponse';
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

export type ImportAllProdcutsFromMeliSummary = {
  pagesProcessed: number;
  itemsFound: number;
  detailsFetched: number;
  productsInserted: number;
  detailFailures: number;
  insertFailures: number;
  lastScrollId: string | null;
  hasNext: boolean;
  errors: Array<{
    stage: 'detail' | 'insert';
    meliItemId?: string;
    message: string;
  }>;
};

@Injectable()
export class ImportAllProdcutsFromMeli {
  private readonly logger = new Logger(ImportAllProdcutsFromMeli.name);
  private readonly DEFAULT_STATUS = 'active';
  private readonly DEFAULT_LIMIT = 50;
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly INSERT_MAX_ATTEMPTS = 5;
  private readonly INSERT_RETRY_DELAYS_MS = [1000, 3000, 7000, 15000];

  constructor(
    private readonly getItemsId: GetItemsId,
    private readonly getDetailsProductsBulk: GetDetailsProductsBulkRepository,
    private readonly postMeliProduct: PostMeliProductRepository,
  ) {}

  async execute(): Promise<ImportAllProdcutsFromMeliSummary> {
    const summary: ImportAllProdcutsFromMeliSummary = {
      pagesProcessed: 0,
      itemsFound: 0,
      detailsFetched: 0,
      productsInserted: 0,
      detailFailures: 0,
      insertFailures: 0,
      lastScrollId: null,
      hasNext: true,
      errors: [],
    };

    let scrollId: string | undefined;

    while (summary.hasNext) {
      const page = await this.getItemsId.getItems({
        status: this.DEFAULT_STATUS,
        useScan: true,
        scrollId,
        limit: this.DEFAULT_LIMIT,
      });

      summary.pagesProcessed += 1;
      summary.itemsFound += page.items.length;
      scrollId = page.scroll_id ?? undefined;
      summary.lastScrollId = page.scroll_id ?? null;
      summary.hasNext = page.pagination.has_next === true && Boolean(scrollId);

      this.logger.log(
        `[MELI-IMPORT] Page fetched | page=${summary.pagesProcessed} items=${page.items.length} hasNext=${summary.hasNext}`,
      );

      const itemBatches = this.chunkItems(page.items, this.DEFAULT_BATCH_SIZE);

      for (const [index, itemBatch] of itemBatches.entries()) {
        this.logger.log(
          `[MELI-IMPORT] Processing batch | page=${summary.pagesProcessed} batch=${index + 1}/${itemBatches.length} items=${itemBatch.length}`,
        );

        const productsBatch = await this.fetchProductsBatch(itemBatch, summary);

        if (productsBatch.length === 0) {
          this.logger.warn(
            `[MELI-IMPORT] Batch skipped | page=${summary.pagesProcessed} batch=${index + 1}/${itemBatches.length} reason=no-details-fetched`,
          );
          continue;
        }

        await this.flushBatch(productsBatch, summary, productsBatch.length);
      }

      if (!summary.hasNext) {
        break;
      }
    }

    return summary;
  }

  private async fetchProductsBatch(
    meliItemIds: string[],
    summary: ImportAllProdcutsFromMeliSummary,
  ): Promise<PostMeliProductPayload[]> {
    try {
      const response = await this.getDetailsProductsBulk.getByMlas({
        itemIds: meliItemIds,
      });
      const products = this.extractBulkProducts(response);
      const notFound = this.extractBulkNotFound(response);

      summary.detailsFetched += products.length;

      if (notFound.length > 0) {
        for (const meliItemId of notFound) {
          summary.detailFailures += 1;
          summary.errors.push({
            stage: 'detail',
            meliItemId,
            message: 'Product detail reported as not found by bulk endpoint',
          });
        }
      }

      if (products.length + notFound.length < meliItemIds.length) {
        const fetchedIds = new Set(
          products.map((product) => product.meli_item_id),
        );
        const notFoundIds = new Set(notFound);

        for (const meliItemId of meliItemIds) {
          if (!fetchedIds.has(meliItemId) && !notFoundIds.has(meliItemId)) {
            summary.detailFailures += 1;
            summary.errors.push({
              stage: 'detail',
              meliItemId,
              message: 'Product detail not returned by bulk endpoint',
            });
          }
        }
      }

      return products.map((product) => this.mapToPostPayload(product));
    } catch (error) {
      summary.detailFailures += meliItemIds.length;
      const message = this.getErrorMessage(error);

      for (const meliItemId of meliItemIds) {
        summary.errors.push({
          stage: 'detail',
          meliItemId,
          message,
        });
      }

      this.logger.warn(
        `[MELI-IMPORT] Bulk detail failed | meliItemIds=${meliItemIds.join(',')} error=${message}`,
      );
      return [];
    }
  }

  private extractBulkProducts(
    response: GetDetailsProductsBulkResponse,
  ): GetDetailsProductsResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response.products)) {
      return response.products;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.results)) {
      return response.results;
    }

    this.logger.warn(
      `[MELI-IMPORT] Unexpected bulk detail response shape | keys=${Object.keys(response).join(',')}`,
    );

    return [];
  }

  private extractBulkNotFound(
    response: GetDetailsProductsBulkResponse,
  ): string[] {
    if (Array.isArray(response)) {
      return [];
    }

    if (Array.isArray(response.notFound)) {
      return response.notFound;
    }

    return [];
  }

  private async flushBatch(
    products: PostMeliProductPayload[],
    summary: ImportAllProdcutsFromMeliSummary,
    originalBatchSize: number,
  ): Promise<void> {
    const result = await this.tryPostProducts(products);

    if (result.ok) {
      summary.productsInserted += products.length;

      this.logger.log(
        `[MELI-IMPORT] Products inserted | batchSize=${products.length} total=${summary.productsInserted}`,
      );
      return;
    }

    const error = 'error' in result ? result.error : undefined;
    const message = this.getErrorMessage(error);

    if (products.length > 1 && this.shouldSplitFailedBatch(error)) {
      this.logger.warn(
        `[MELI-IMPORT] Products insert failed, splitting batch | batchSize=${products.length} reason=${this.getSplitReason(error)}`,
      );

      const smallerBatches = this.chunkItems(
        products,
        Math.max(1, Math.floor(products.length / 2)),
      );

      for (const smallerBatch of smallerBatches) {
        await this.flushBatch(smallerBatch, summary, originalBatchSize);
      }

      return;
    }

    summary.insertFailures += products.length;
    summary.errors.push({
      stage: 'insert',
      message,
    });
    this.logger.error(
      `[MELI-IMPORT] Products insert failed | batchSize=${products.length} originalBatchSize=${originalBatchSize} meliItemIds=${products.map((product) => product.meli_item_id).join(',')} error=${message}`,
    );
  }

  private async tryPostProducts(
    products: PostMeliProductPayload[],
  ): Promise<{ ok: true } | { ok: false; error: unknown }> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.INSERT_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.postMeliProduct.postProducts(products);
        return { ok: true };
      } catch (error) {
        lastError = error;

        if (attempt < this.INSERT_MAX_ATTEMPTS) {
          const delayMs = this.getRetryDelay(attempt);

          this.logger.warn(
            `[MELI-IMPORT] Products insert retry | attempt=${attempt}/${this.INSERT_MAX_ATTEMPTS} batchSize=${products.length} retryInMs=${delayMs} error=${this.getErrorMessage(error)}`,
          );
          await this.sleep(delayMs);
        }
      }
    }

    return { ok: false, error: lastError };
  }

  private getRetryDelay(attempt: number): number {
    return this.INSERT_RETRY_DELAYS_MS[attempt - 1] ?? 15000;
  }

  private async sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private mapToPostPayload(
    product: GetDetailsProductsResponse,
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
      last_webhook_at: product.last_webhook_at,
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if ('response' in error && error.response !== undefined) {
        const response = error.response;
        return `${error.message} | response=${JSON.stringify(response)}`;
      }

      return error.message;
    }

    return String(error);
  }

  private isPayloadTooLarge(error: unknown): boolean {
    if (error instanceof InteranlSoledHttpError) {
      return error.statusCode === 413;
    }

    return false;
  }

  private isInternalServerError(error: unknown): boolean {
    if (error instanceof InteranlSoledHttpError) {
      return error.statusCode >= 500;
    }

    return false;
  }

  private shouldSplitFailedBatch(error: unknown): boolean {
    return this.isPayloadTooLarge(error) || this.isInternalServerError(error);
  }

  private getSplitReason(error: unknown): string {
    if (this.isPayloadTooLarge(error)) {
      return 'payload-too-large';
    }

    if (this.isInternalServerError(error)) {
      return 'internal-server-error';
    }

    return 'unknown';
  }
  private chunkItems<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
