import { Injectable, Logger } from '@nestjs/common';
import { MarketplacePublicationRepository } from 'src/core/drivers/repositories/internal-soled/marketplace-publications/MarketplacePublicationRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';
import { UpdateFravegaPriceRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRepository';
import { UpdateFravegaStatusRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-status/UpdateFravegaStatusRepository';
import { UpdateFravegaStockRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRepository';
import { UpdatePriceRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-price/UpdatePriceRepository';
import { UpdateStatusProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-status/UpdateStatusProductRepository';
import { UpdateStockRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-stock/UpdateStockRepository';
import { ResolveFravegaPrices } from 'src/core/interactors/publisher/fravega/price/ResolveFravegaPrices';
import { ResolveOnCityPrices } from 'src/core/interactors/publisher/oncity/price/ResolveOnCityPrices';
import type { MarketplaceChangeAction } from 'src/core/entitis/internal-soled/marketplace-change-actions/MarketplaceChangeAction';
import type { MarketplacePublicationResponse } from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import type { OnCityRawProduct } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityRawProduct';
import type { OnCityUpdateProductRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductRequest';

export type MarketplaceChangeActionProcessResult = {
  status: 'completed' | 'skipped';
  reason?: string;
  requestSnapshot?: unknown;
  responseSnapshot?: unknown;
};

@Injectable()
export class ProcessMarketplaceChangeAction {
  private readonly logger = new Logger(ProcessMarketplaceChangeAction.name);

  constructor(
    private readonly marketplacePublication: MarketplacePublicationRepository,
    private readonly oncityPrice: UpdatePriceRepository,
    private readonly oncityStock: UpdateStockRepository,
    private readonly oncityStatus: UpdateStatusProductRepository,
    private readonly oncityGetProduct: GetOncityProductRepository,
    private readonly fravegaPrice: UpdateFravegaPriceRepository,
    private readonly fravegaStock: UpdateFravegaStockRepository,
    private readonly fravegaStatus: UpdateFravegaStatusRepository,
    private readonly resolveFravegaPrices: ResolveFravegaPrices,
    private readonly resolveOnCityPrices: ResolveOnCityPrices,
  ) {}

  async execute(
    action: MarketplaceChangeAction,
  ): Promise<MarketplaceChangeActionProcessResult> {
    if (action.marketplace === 'oncity') {
      return this.processOncity(action);
    }

    if (action.marketplace === 'fravega') {
      return this.processFravega(action);
    }

    return {
      status: 'skipped',
      reason: `UNSUPPORTED_MARKETPLACE_${action.marketplace}`,
    };
  }

  private async processOncity(
    action: MarketplaceChangeAction,
  ): Promise<MarketplaceChangeActionProcessResult> {
    const publication = await this.getFreshPublication(action);
    const externalSku =
      this.getPublicationExternalSku(publication) ?? action.externalSku;
    const skuId = Number(externalSku);

    if (action.changeType !== 'status' && !Number.isFinite(skuId)) {
      return {
        status: 'skipped',
        reason: 'ONCITY_SKU_ID_NOT_FOUND',
        responseSnapshot: {
          actionExternalSku: action.externalSku,
          publicationExternalSku: externalSku,
          publicationId: publication.id,
        },
      };
    }

    if (action.changeType === 'price') {
      const price = this.getNumber(action.newValue.price);
      const { salePrice } = this.resolveOnCityPrices.execute(price);
      const payload = {
        skuId,
        listPrice: salePrice,
        costPrice: salePrice,
        markup: 0,
      };

      const response = await this.oncityPrice.updatePrice(payload);
      await this.marketplacePublication.updatePrice('oncity', action.sku, {
        listPrice: salePrice,
        salePrice,
        netPrice: salePrice,
      });

      return {
        status: 'completed',
        requestSnapshot: payload,
        responseSnapshot: response ?? { ok: true },
      };
    }

    if (action.changeType === 'stock') {
      const quantity = this.getNumber(action.newValue.stock);
      const payload = { skuId, quantity };

      const response = await this.oncityStock.updateStock(payload);
      await this.marketplacePublication.updateStock('oncity', action.sku, {
        stock: quantity,
      });

      return {
        status: 'completed',
        requestSnapshot: payload,
        responseSnapshot: response ?? { ok: true },
      };
    }

    const payload = await this.buildOncityStatusPayload(
      publication,
      action,
      skuId,
    );

    if (!payload) {
      return {
        status: 'skipped',
        reason: 'ONCITY_STATUS_PAYLOAD_NOT_AVAILABLE',
        responseSnapshot: {
          publicationId: publication.id,
          externalProductId: publication.externalProductId,
        },
      };
    }

    const response = await this.oncityStatus.updateStatus(payload.id, payload);
    await this.marketplacePublication.updateStatus('oncity', action.sku, {
      publicationStatus: payload.status === 'active' ? 'published' : 'paused',
      syncStatus: 'synced',
    });

    return {
      status: 'completed',
      requestSnapshot: payload,
      responseSnapshot: response,
    };
  }

  private async processFravega(
    action: MarketplaceChangeAction,
  ): Promise<MarketplaceChangeActionProcessResult> {
    const publication = await this.getFreshPublication(action);
    const refId =
      this.getPublicationExternalSku(publication) ??
      action.externalSku ??
      action.sku;

    if (action.changeType === 'price') {
      const price = this.getNumber(action.newValue.price);
      const payload = this.resolveFravegaPrices.execute(price);
      const response = await this.fravegaPrice.updateByRefId(refId, payload);

      await this.marketplacePublication.updatePrice('fravega', action.sku, {
        listPrice: payload.list,
        salePrice: payload.sale,
        netPrice: payload.net,
      });

      return {
        status: 'completed',
        requestSnapshot: payload,
        responseSnapshot: response,
      };
    }

    if (action.changeType === 'stock') {
      const payload = { quantity: this.getNumber(action.newValue.stock) };
      const response = await this.fravegaStock.updateByRefId(refId, payload);

      await this.marketplacePublication.updateStock('fravega', action.sku, {
        stock: payload.quantity,
      });

      return {
        status: 'completed',
        requestSnapshot: payload,
        responseSnapshot: response,
      };
    }

    const active = this.mapActiveStatus(action.newValue.status);
    const response = active
      ? await this.fravegaStatus.activateByRefId(refId)
      : await this.fravegaStatus.deactivateByRefId(refId);

    await this.marketplacePublication.updateStatus('fravega', action.sku, {
      publicationStatus: active ? 'published' : 'paused',
      syncStatus: 'synced',
    });

    return {
      status: 'completed',
      requestSnapshot: { refId, active },
      responseSnapshot: response ?? { ok: true },
    };
  }

  private async buildOncityStatusPayload(
    publication: MarketplacePublicationResponse,
    action: MarketplaceChangeAction,
    skuId: number,
  ): Promise<OnCityUpdateProductRequest | null> {
    if (!Number.isFinite(skuId)) {
      return null;
    }

    let product: OnCityRawProduct | null = null;

    try {
      product = await this.oncityGetProduct.getRawBySkuId(skuId);
    } catch (error) {
      this.logger.warn(
        `[MARKETPLACE-CHANGE] OnCity raw product fetch failed | skuId=${skuId} sku=${action.sku} error=${error instanceof Error ? error.message : String(error)}`,
      );

      return null;
    }

    const productId = this.stringOrNull(
      product?.Id ??
        product?.ProductId ??
        publication.externalProductId ??
        publication.external_product_id,
    );

    if (!product || !productId) {
      return null;
    }

    const active = this.mapActiveStatus(action.newValue.status);

    return {
      id: productId,
      externalId: String(product.AlternateIds?.RefId ?? publication.sku),
      status: active ? 'active' : 'inactive',
      name: String(
        product.ProductName ??
          product.NameComplete ??
          publication.title ??
          publication.sku,
      ),
      description: String(
        product.ProductDescription ?? publication.description ?? '',
      ),
      brandId: String(product.BrandId ?? ''),
      categoryIds: this.resolveOncityCategoryIds(product, publication),
      specs: this.arrayOrEmpty(product.SkuSpecifications),
      attributes: this.arrayOrEmpty(product.ProductSpecifications),
      slug: String(
        product.DetailUrl ??
          publication.externalUrl ??
          publication.external_url ??
          '',
      ),
      images: this.resolveOncityImages(product),
      skus: this.resolveOncitySkus(product, publication, active),
      origin: String(process.env.ONCITY_VTEX_ACCOUNT ?? ''),
    };
  }

  private resolveOncityCategoryIds(
    product: OnCityRawProduct,
    publication: MarketplacePublicationResponse,
  ): string[] {
    const categoryId = this.stringOrNull(
      publication.categoryId ?? publication.category_id,
    );
    const productCategoryIds = this.stringOrNull(product.ProductCategoryIds);
    const categoryPath = productCategoryIds ?? categoryId;

    if (!categoryPath) {
      return [];
    }

    const ids = categoryPath.split('/').filter(Boolean);
    return ids.length ? [ids[ids.length - 1]] : [categoryPath];
  }

  private resolveOncityImages(
    product: OnCityRawProduct,
  ): OnCityUpdateProductRequest['images'] {
    return this.arrayOrEmpty(product.Images)
      .map((image: Record<string, any>, index) => {
        const url = this.stringOrNull(image.ImageUrl);

        if (!url) {
          return null;
        }

        return {
          id: String(image.FileId ?? `image-${index + 1}`),
          url,
          alt: this.stringOrNull(image.ImageName) ?? undefined,
        };
      })
      .filter((image): image is NonNullable<typeof image> => image !== null);
  }

  private resolveOncitySkus(
    product: OnCityRawProduct,
    publication: MarketplacePublicationResponse,
    active: boolean,
  ): OnCityUpdateProductRequest['skus'] {
    const dimension = this.toRecord(product.Dimension) ?? {};
    const skuSellers = this.arrayOrEmpty(product.SkuSellers);
    const skuId =
      this.stringOrNull(product.Id ?? product.StockKeepingUnitId) ??
      this.getPublicationExternalSku(publication) ??
      publication.sku;

    return [
      {
        id: skuId,
        externalId: publication.sku,
        name: String(
          product.SkuName ??
            product.ProductName ??
            product.NameComplete ??
            publication.title ??
            publication.sku,
        ),
        ean: String(publication.gtin ?? ''),
        isActive: active,
        weight: Number(dimension.weight ?? 1),
        dimensions: {
          width: Number(dimension.width ?? 1),
          height: Number(dimension.height ?? 1),
          length: Number(dimension.length ?? 1),
        },
        specs: this.arrayOrEmpty(product.SkuSpecifications),
        images: this.arrayOrEmpty(product.Images)
          .map((image: Record<string, any>) =>
            this.stringOrNull(image.id ?? image.FileId ?? image.ImageName),
          )
          .filter(Boolean) as string[],
      },
      ...skuSellers.slice(1).map((sku: Record<string, any>) => ({
        id: String(sku.StockKeepingUnitId),
        externalId: String(sku.SellerStockKeepingUnitId ?? publication.sku),
        name: String(product.SkuName ?? publication.title ?? publication.sku),
        ean: String(publication.gtin ?? ''),
        isActive: active,
        weight: Number(dimension.weight ?? 1),
        dimensions: {
          width: Number(dimension.width ?? 1),
          height: Number(dimension.height ?? 1),
          length: Number(dimension.length ?? 1),
        },
        specs: this.arrayOrEmpty(product.SkuSpecifications),
        images: [],
      })),
    ];
  }

  private async getFreshPublication(
    action: MarketplaceChangeAction,
  ): Promise<MarketplacePublicationResponse> {
    return this.marketplacePublication.getByMarketplaceAndSku(
      action.marketplace,
      action.sku,
    );
  }

  private getPublicationExternalSku(
    publication: MarketplacePublicationResponse,
  ): string | null {
    return this.stringOrNull(
      publication.externalSku ?? publication.external_sku,
    );
  }

  private getNumber(value: unknown): number {
    const parsed = Math.round(Number(value));

    if (!Number.isFinite(parsed)) {
      throw new Error(`INVALID_NUMERIC_VALUE_${String(value)}`);
    }

    return parsed;
  }

  private mapActiveStatus(value: unknown): boolean {
    const normalized = String(value ?? '')
      .toLowerCase()
      .trim();

    return normalized === 'active' || normalized === 'published';
  }

  private toRecord(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, any>;
    return Object.keys(record).length ? record : null;
  }

  private arrayOrEmpty(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }

  private stringOrNull(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized ? normalized : null;
  }
}
