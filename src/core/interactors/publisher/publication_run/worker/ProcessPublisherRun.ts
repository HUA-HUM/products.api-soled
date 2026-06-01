import { Injectable, Logger } from '@nestjs/common';
import { InteranlSoledHttpError } from 'src/core/drivers/repositories/internal-soled/http/errors/InteranlSoledHttpError';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetMeliProductBySkuRepository } from 'src/core/drivers/repositories/internal-soled/meli-products/get-by-sku/GetMeliProductBySkuRepository';
import { GetPublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/GetPublisherRunRepository';
import { UpdatePublisherRunRepository } from 'src/core/drivers/repositories/internal-soled/publisher/runs/UpdatePublisherRunRepository';
import type { PublisherRunStatus } from 'src/core/entitis/internal-soled/publisher/PublisherRun';
import type { UpsertMarketplacePublicationRequest } from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { PublishFravegaProduct } from '../../fravega/PublishFravegaProduct';
import type { PublishResult as FravegaPublishResult } from '../../fravega/PublishFravegaProduct';
import { PublishOncityProduct } from '../../oncity/PublishOncityProduct';
import type { PublishResult as OncityPublishResult } from '../../oncity/PublishOncityProduct';

type PublisherResult = FravegaPublishResult | OncityPublishResult;

@Injectable()
export class ProcessPublisherRun {
  private readonly logger = new Logger(ProcessPublisherRun.name);

  constructor(
    private readonly getPublisherRun: GetPublisherRunRepository,
    private readonly updatePublisherRun: UpdatePublisherRunRepository,
    private readonly marketplacePublication: MarketplacePublicationRepository,
    private readonly getMeliProductBySku: GetMeliProductBySkuRepository,
    private readonly publishOncityProduct: PublishOncityProduct,
    private readonly publishFravegaProduct: PublishFravegaProduct,
  ) {}

  async execute(runId: string): Promise<void> {
    const run = await this.getPublisherRun.getByRunId(runId);

    await this.updatePublisherRun.updateStatus(runId, {
      status: 'processing',
      message: 'Validando publicacion existente',
    });

    const existingPublication = await this.findExistingPublication(
      run.marketplace,
      run.sku,
    );

    if (existingPublication) {
      await this.updatePublisherRun.updateSnapshots(runId, {
        responseSnapshot: existingPublication,
      });
      await this.updatePublisherRun.updateStatus(runId, {
        status: 'skipped',
        message: `Producto ya existe en ${run.marketplace}`,
      });

      this.logger.log(
        `[PUBLISHER-RUN] Product already exists | runId=${runId} sku=${run.sku} marketplace=${run.marketplace}`,
      );
      return;
    }

    await this.updatePublisherRun.updateStatus(runId, {
      status: 'processing',
      message: 'Buscando producto base en Mercado Libre products',
    });

    const product = await this.getMeliProductBySku.getBySku(run.sku);

    await this.updatePublisherRun.updateSnapshots(runId, {
      sourceProductSnapshot: product,
    });

    await this.updatePublisherRun.updateStatus(runId, {
      status: 'processing',
      message: `Armando payload y publicando en ${run.marketplace}`,
    });

    const result = await this.publish(run.marketplace, product);

    await this.updatePublisherRun.updateSnapshots(runId, {
      payloadSnapshot: result.payload,
      responseSnapshot: result.response,
    });

    if (result.status === 'success') {
      await this.updatePublisherRun.updateStatus(runId, {
        status: 'processing',
        message: 'Guardando publicacion en marketplace_product_publications',
      });

      await this.marketplacePublication.upsert(
        run.marketplace,
        run.sku,
        this.buildPublicationSnapshot(run, product, result),
      );
    }

    await this.updatePublisherRun.updateStatus(runId, {
      status: this.mapPublishStatus(result.status),
      message: result.message ?? this.buildDefaultMessage(result.status),
      errorCode: result.status === 'failed' ? 'PUBLISHER_FAILED' : undefined,
      errorMessage: result.status === 'failed' ? result.message : undefined,
    });
  }

  private async publish(
    marketplace: string,
    product: Parameters<PublishOncityProduct['execute']>[0],
  ): Promise<PublisherResult> {
    if (marketplace === 'oncity') {
      return this.publishOncityProduct.execute(product);
    }

    if (marketplace === 'fravega') {
      return this.publishFravegaProduct.execute(product);
    }

    return {
      status: 'failed',
      message: `UNSUPPORTED_MARKETPLACE_${marketplace.toUpperCase()}`,
      payload: {
        marketplace,
        sku: product.sku,
      },
      response: null,
    };
  }

  private mapPublishStatus(
    status: PublisherResult['status'],
  ): PublisherRunStatus {
    if (status === 'success') {
      return 'completed';
    }

    return status;
  }

  private buildDefaultMessage(status: PublisherResult['status']): string {
    if (status === 'success') {
      return 'Producto publicado correctamente';
    }

    if (status === 'skipped') {
      return 'Publicacion omitida';
    }

    return 'Publicacion fallida';
  }

  private buildPublicationSnapshot(
    run: { runId: string; jobId: string; marketplace: string; sku: string },
    product: InternalMeliProduct,
    result: PublisherResult,
  ): UpsertMarketplacePublicationRequest {
    if (run.marketplace === 'oncity') {
      return this.buildOncityPublicationSnapshot(run, product, result);
    }

    if (run.marketplace === 'fravega') {
      return this.buildFravegaPublicationSnapshot(run, product, result);
    }

    return {
      source: 'publisher',
      meliItemId: product.meli_item_id,
      publicationStatus: 'published',
      syncStatus: 'synced',
      payload: result.payload,
      lastResponse: result.response,
      lastJobId: run.jobId,
      lastRunId: run.runId,
    };
  }

  private buildOncityPublicationSnapshot(
    run: { runId: string; jobId: string },
    product: InternalMeliProduct,
    result: PublisherResult,
  ): UpsertMarketplacePublicationRequest {
    const payload = this.asRecord(result.payload);
    const response = this.asRecord(result.response);
    const createResponse = this.asRecord(response.create);
    const createdProduct = this.asRecord(createResponse.raw);
    const firstSku = Array.isArray(createdProduct.skus)
      ? this.asRecord(createdProduct.skus[0])
      : {};
    const imageRequest = this.asRecord(payload.imageRequest);
    const priceRequest = this.asRecord(payload.priceRequest);
    const stockRequest = this.asRecord(payload.stockRequest);
    const images = Array.isArray(imageRequest.images)
      ? imageRequest.images
      : createdProduct.images;

    return {
      source: 'publisher',
      meliItemId: product.meli_item_id,
      externalProductId: this.stringifyOrNull(createdProduct.id),
      externalSku: this.stringifyOrNull(firstSku.id ?? firstSku.externalId),
      externalUrl: this.stringifyOrNull(createdProduct.slug),
      publicationStatus: 'published',
      syncStatus: 'synced',
      title: this.stringifyOrNull(createdProduct.name ?? product.title),
      description: this.stringifyOrNull(
        createdProduct.description ?? product.description,
      ),
      brand: this.stringifyOrNull(createdProduct.brandName ?? product.brand),
      model: product.model,
      gtin: product.gtin,
      categoryId: Array.isArray(createdProduct.categoryIds)
        ? createdProduct.categoryIds.join(',')
        : this.stringifyOrNull(product.category_id),
      categoryName: Array.isArray(createdProduct.categoryNames)
        ? createdProduct.categoryNames.join(' > ')
        : null,
      categoryPath: createdProduct.categoryNames ?? product.category_path,
      listPrice: this.numberOrNull(priceRequest.listPrice),
      salePrice: this.numberOrNull(priceRequest.listPrice),
      netPrice: this.numberOrNull(priceRequest.costPrice),
      stock: this.numberOrNull(stockRequest.quantity),
      thumbnail: Array.isArray(images)
        ? this.stringifyOrNull(this.asRecord(images[0]).url)
        : null,
      images: images ?? [],
      attributes: {
        specs: createdProduct.specs ?? [],
        attributes: createdProduct.attributes ?? [],
      },
      payload: result.payload,
      lastResponse: result.response,
      lastJobId: run.jobId,
      lastRunId: run.runId,
    };
  }

  private buildFravegaPublicationSnapshot(
    run: { runId: string; jobId: string },
    product: InternalMeliProduct,
    result: PublisherResult,
  ): UpsertMarketplacePublicationRequest {
    const payload = this.asRecord(result.payload);
    const firstItem = Array.isArray(payload.items)
      ? this.asRecord(payload.items[0])
      : {};
    const response = this.asRecord(result.response);
    const data = this.asRecord(response.data);
    const price = this.asRecord(firstItem.price);
    const stock = this.asRecord(firstItem.stock);

    return {
      source: 'publisher',
      meliItemId: product.meli_item_id,
      externalProductId: this.stringifyOrNull(data.fravegaId),
      externalSku: this.stringifyOrNull(firstItem.refId ?? data.refID),
      publicationStatus: 'published',
      syncStatus: 'synced',
      title: this.stringifyOrNull(firstItem.title ?? product.title),
      description: this.stringifyOrNull(
        firstItem.description ?? product.description,
      ),
      brand: this.stringifyOrNull(firstItem.brandId ?? product.brand),
      model: product.model,
      gtin: this.stringifyOrNull(firstItem.ean ?? product.gtin),
      categoryId: this.stringifyOrNull(firstItem.primaryCategoryId),
      listPrice: this.numberOrNull(price.list),
      salePrice: this.numberOrNull(price.sale),
      netPrice: this.numberOrNull(price.net),
      stock: this.numberOrNull(stock.quantity),
      thumbnail: Array.isArray(firstItem.images)
        ? this.stringifyOrNull(this.asRecord(firstItem.images[0]).url)
        : null,
      images: firstItem.images ?? [],
      attributes: firstItem.attributes ?? [],
      payload: result.payload,
      lastResponse: result.response,
      lastJobId: run.jobId,
      lastRunId: run.runId,
    };
  }

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object'
      ? (value as Record<string, any>)
      : {};
  }

  private stringifyOrNull(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  }

  private numberOrNull(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async findExistingPublication(marketplace: string, sku: string) {
    try {
      return await this.marketplacePublication.getByMarketplaceAndSku(
        marketplace,
        sku,
      );
    } catch (error) {
      if (error instanceof InteranlSoledHttpError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }
}
