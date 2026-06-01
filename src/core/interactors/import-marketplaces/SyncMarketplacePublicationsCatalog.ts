import { Injectable, Logger } from '@nestjs/common';
import { GetFravegaProductsRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/get/GetFravegaProductsRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import type { FravegaProduct } from 'src/core/entitis/marketplace-api/fravega/products/get/FravegaProduct';
import type { FravegaProductsPaginatedResponse } from 'src/core/entitis/marketplace-api/fravega/products/get/FravegaProductsPaginatedResponse';
import type { OnCityProducts } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityProducts';
import type { OnCityRawProduct } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityRawProduct';
import type {
  PublicationStatus,
  UpsertMarketplacePublicationRequest,
} from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';

type SupportedMarketplace = 'oncity' | 'fravega';

export type SyncMarketplacePublicationsCatalogInput = {
  marketplaces?: SupportedMarketplace[];
};

export type SyncMarketplacePublicationsCatalogSummary = {
  marketplaces: Array<{
    marketplace: SupportedMarketplace;
    pagesProcessed: number;
    productsFound: number;
    productsSynced: number;
    errors: Array<{
      sku?: string;
      message: string;
    }>;
  }>;
};

@Injectable()
export class SyncMarketplacePublicationsCatalog {
  private readonly logger = new Logger(SyncMarketplacePublicationsCatalog.name);
  private readonly DEFAULT_MARKETPLACES: SupportedMarketplace[] = [
    'oncity',
    'fravega',
  ];
  private readonly PAGE_LIMIT = 100;

  constructor(
    private readonly getOncityProducts: GetOncityProductRepository,
    private readonly getFravegaProducts: GetFravegaProductsRepository,
    private readonly marketplacePublication: MarketplacePublicationRepository,
  ) {}

  async execute(
    input: SyncMarketplacePublicationsCatalogInput = {},
  ): Promise<SyncMarketplacePublicationsCatalogSummary> {
    const marketplaces = input.marketplaces?.length
      ? input.marketplaces
      : this.DEFAULT_MARKETPLACES;

    const summary: SyncMarketplacePublicationsCatalogSummary = {
      marketplaces: [],
    };

    for (const marketplace of marketplaces) {
      if (marketplace === 'oncity') {
        summary.marketplaces.push(await this.syncOncity());
        continue;
      }

      if (marketplace === 'fravega') {
        summary.marketplaces.push(await this.syncFravega());
      }
    }

    return summary;
  }

  private async syncOncity(): Promise<
    SyncMarketplacePublicationsCatalogSummary['marketplaces'][number]
  > {
    const summary = this.buildMarketplaceSummary('oncity');
    let offset = 0;

    while (true) {
      const page = await this.getOncityProducts.getAllProduct(
        this.PAGE_LIMIT,
        offset,
      );

      summary.pagesProcessed += 1;
      summary.productsFound += page.items.length;

      this.logger.log(
        `[CATALOG-SYNC] OnCity page fetched | offset=${offset} items=${page.items.length} hasNext=${page.hasNext}`,
      );

      for (const product of page.items) {
        try {
          const raw = await this.getOncityRawProduct(product);

          await this.marketplacePublication.upsert(
            'oncity',
            product.sellerSku,
            this.mapOncityPublication(product, raw),
          );

          summary.productsSynced += 1;
        } catch (error) {
          summary.errors.push({
            sku: product.sellerSku,
            message: this.getErrorMessage(error),
          });
        }
      }

      if (!page.hasNext) {
        break;
      }

      offset = page.nextOffset;
    }

    return summary;
  }

  private async syncFravega(): Promise<
    SyncMarketplacePublicationsCatalogSummary['marketplaces'][number]
  > {
    const summary = this.buildMarketplaceSummary('fravega');
    let offset = 0;

    while (true) {
      const page = await this.getFravegaProducts.execute(
        this.PAGE_LIMIT,
        offset,
      );
      const products = this.extractFravegaProducts(page);

      summary.pagesProcessed += 1;
      summary.productsFound += products.length;

      this.logger.log(
        `[CATALOG-SYNC] Fravega page fetched | offset=${offset} items=${products.length} hasNext=${this.hasNextFravegaPage(page, offset, products.length)}`,
      );

      for (const product of products) {
        try {
          const sku = product.refId ?? product.sku;

          await this.marketplacePublication.upsert(
            'fravega',
            sku,
            this.mapFravegaPublication(product),
          );

          summary.productsSynced += 1;
        } catch (error) {
          summary.errors.push({
            sku: product.refId ?? product.sku,
            message: this.getErrorMessage(error),
          });
        }
      }

      if (!this.hasNextFravegaPage(page, offset, products.length)) {
        break;
      }

      offset = this.getNextFravegaOffset(page, offset, products.length);
    }

    return summary;
  }

  private async getOncityRawProduct(
    product: OnCityProducts,
  ): Promise<OnCityRawProduct | null> {
    try {
      return await this.getOncityProducts.getRawBySkuId(product.publicationId);
    } catch (error) {
      this.logger.warn(
        `[CATALOG-SYNC] OnCity raw detail failed | sku=${product.sellerSku} publicationId=${product.publicationId} error=${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private mapOncityPublication(
    product: OnCityProducts,
    raw: OnCityRawProduct | null,
  ): UpsertMarketplacePublicationRequest {
    return {
      source: 'marketplace',
      externalProductId: String(raw?.ProductId ?? product.publicationId),
      externalSku: product.marketSku,
      externalUrl: raw?.DetailUrl ?? null,
      publicationStatus: this.mapOncityStatus(product.status, raw),
      syncStatus: 'synced',
      title: raw?.ProductName ?? raw?.NameComplete ?? product.title,
      description: raw?.ProductDescription ?? null,
      brand: raw?.BrandName ?? null,
      categoryId: raw?.ProductCategoryIds ?? null,
      categoryName: this.getLastOncityCategory(raw),
      categoryPath: raw?.ProductCategories
        ? Object.values(raw.ProductCategories)
        : null,
      listPrice: product.price,
      salePrice: product.price,
      stock: product.stock,
      thumbnail: product.images[0] ?? raw?.Images?.[0]?.ImageUrl ?? null,
      images: raw?.Images ?? product.images,
      attributes: {
        skuSpecifications: raw?.SkuSpecifications ?? [],
        productSpecifications: raw?.ProductSpecifications ?? [],
      },
      payload: raw ?? product,
      lastResponse: raw ?? product,
    };
  }

  private mapFravegaPublication(
    product: FravegaProduct,
  ): UpsertMarketplacePublicationRequest {
    return {
      source: 'marketplace',
      externalProductId: product.id,
      externalSku: product.sku,
      publicationStatus: product.active ? 'published' : 'paused',
      syncStatus: 'synced',
      title: product.title ?? product.subTitle ?? null,
      description: product.description ?? null,
      brand: product.brandId ?? null,
      gtin: product.ean ?? null,
      categoryId: product.primaryCategoryId ?? null,
      listPrice: product.price?.list ?? null,
      salePrice: product.price?.sale ?? null,
      netPrice: product.price?.net ?? null,
      stock: product.stock?.quantity ?? null,
      images: product.images ?? [],
      attributes: product.attributes ?? [],
      payload: product,
      lastResponse: product,
    };
  }

  private extractFravegaProducts(
    page: FravegaProductsPaginatedResponse,
  ): FravegaProduct[] {
    const response = page as FravegaProductsPaginatedResponse & {
      data?: FravegaProduct[];
    };

    if (Array.isArray(response.items)) {
      return response.items;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  private hasNextFravegaPage(
    page: FravegaProductsPaginatedResponse,
    offset: number,
    productsLength: number,
  ): boolean {
    if (typeof page.hasNext === 'boolean') {
      return page.hasNext;
    }

    if (typeof page.total === 'number') {
      return offset + productsLength < page.total;
    }

    return productsLength === this.PAGE_LIMIT;
  }

  private getNextFravegaOffset(
    page: FravegaProductsPaginatedResponse,
    offset: number,
    productsLength: number,
  ): number {
    if (typeof page.nextOffset === 'number') {
      return page.nextOffset;
    }

    return offset + productsLength;
  }

  private mapOncityStatus(
    status: string,
    raw: OnCityRawProduct | null,
  ): PublicationStatus {
    const normalizedStatus = status.trim().toLowerCase();

    if (raw?.IsActive === false || raw?.IsProductActive === false) {
      return 'paused';
    }

    if (['active', 'published'].includes(normalizedStatus)) {
      return 'published';
    }

    if (['inactive', 'paused'].includes(normalizedStatus)) {
      return 'paused';
    }

    return 'out_of_sync';
  }

  private getLastOncityCategory(raw: OnCityRawProduct | null): string | null {
    if (!raw?.ProductCategories) {
      return null;
    }

    const categories = Object.values(raw.ProductCategories);
    return categories[categories.length - 1] ?? null;
  }

  private buildMarketplaceSummary(
    marketplace: SupportedMarketplace,
  ): SyncMarketplacePublicationsCatalogSummary['marketplaces'][number] {
    return {
      marketplace,
      pagesProcessed: 0,
      productsFound: 0,
      productsSynced: 0,
      errors: [],
    };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
