import { Inject, Injectable } from '@nestjs/common';
import type {
  IProcessMarketplaceImagesRepository,
  OnCityProcessedImage,
} from 'src/core/adapters/repositories/image-market/IProcessMarketplaceImagesRepository';
import type { ICreateOnCityProductsRepository } from 'src/core/adapters/repositories/marketplace/oncity/CreateProducts/ICreateOnCityProductsRepository';
import type { IUpdatePriceRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-price/IUpdatePriceRepository';
import type { IUpdateStatusProductRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-status/IUpdateStatusProductRepository';
import type { IUpdateStockRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-stock/IUpdateStockRepository';
import type { OnCityUpdateProductRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductRequest';
import type { OnCityUpdateProductResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductResponse';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { ResolveOnCityBrand } from './brand/ResolveOnCityBrand';
import { ResolveOnCityCategory } from './category/ResolveOnCityCategory';
import { BuildOnCityPayload } from './payload/BuildOnCityPayload';
import { ResolveOnCityPrices } from './price/ResolveOnCityPrices';

export type PublishResult = {
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  payload?: any;
  response?: any;
};

@Injectable()
export class PublishOncityProduct {
  constructor(
    @Inject('ICreateOnCityProductsRepository')
    private readonly createRepository: ICreateOnCityProductsRepository,

    @Inject('IUpdateOnCityPriceRepository')
    private readonly updatePriceRepository: IUpdatePriceRepository,

    @Inject('IUpdateOnCityStockRepository')
    private readonly updateStockRepository: IUpdateStockRepository,

    @Inject('IUpdateOnCityStatusProductRepository')
    private readonly updateProductRepository: IUpdateStatusProductRepository,

    @Inject('IProcessMarketplaceImagesRepository')
    private readonly imagesRepository: IProcessMarketplaceImagesRepository,

    private readonly resolveCategory: ResolveOnCityCategory,
    private readonly resolveBrand: ResolveOnCityBrand,
    private readonly resolvePrices: ResolveOnCityPrices,
    private readonly buildPayload: BuildOnCityPayload,
  ) {}

  async execute(product: InternalMeliProduct): Promise<PublishResult> {
    const sku = product.sku ?? product.meli_item_id;

    try {
      if (product.status !== 'active') {
        return this.buildValidationResult(
          'skipped',
          `PRODUCT_STATUS_${product.status?.toUpperCase() || 'UNKNOWN'}`,
          sku,
          'status_validation',
          {
            status: product.status ?? null,
          },
        );
      }

      const price = this.toNumber(product.price);

      if (!price || price <= 0) {
        return this.buildValidationResult(
          'failed',
          'INVALID_PRICE',
          sku,
          'base_validation',
          {
            price: product.price ?? null,
          },
        );
      }

      if (!product.available_quantity || product.available_quantity <= 0) {
        return this.buildValidationResult(
          'skipped',
          'OUT_OF_STOCK',
          sku,
          'base_validation',
          {
            stock: product.available_quantity ?? null,
          },
        );
      }

      if (!product.brand) {
        return this.buildValidationResult(
          'skipped',
          'MISSING_BRAND',
          sku,
          'base_validation',
        );
      }

      if (!product.title || !product.description) {
        return this.buildValidationResult(
          'skipped',
          'MISSING_TITLE_OR_DESCRIPTION',
          sku,
          'base_validation',
          {
            hasTitle: Boolean(product.title),
            hasDescription: Boolean(product.description),
          },
        );
      }

      if (!product.pictures || product.pictures.length === 0) {
        return this.buildValidationResult(
          'skipped',
          'MISSING_IMAGES',
          sku,
          'base_validation',
        );
      }

      const prices = this.resolvePrices.execute(price);

      const categoryCandidates = await this.resolveCategory.executeCandidates(
        product,
        5,
      );
      const categoryId = categoryCandidates[0] ?? null;

      if (!categoryId) {
        return this.buildValidationResult(
          'skipped',
          'CATEGORY_NOT_FOUND',
          sku,
          'category_resolution',
          {
            meliCategoryId: product.category_id ?? null,
            categoryPath: product.category_path ?? null,
          },
        );
      }

      const brandId = await this.resolveBrand.execute(product);

      if (!brandId) {
        return this.buildValidationResult(
          'failed',
          'BRAND_NOT_FOUND',
          sku,
          'brand_resolution',
          {
            brand: product.brand ?? null,
          },
        );
      }

      const payload = this.buildPayload.execute({
        product,
        brandId,
        categoryIds: [categoryId],
      });

      if (!payload) {
        return this.buildValidationResult(
          'failed',
          'PAYLOAD_BUILD_FAILED',
          sku,
          'payload_build',
        );
      }

      const response = await this.createRepository.createProduct(payload);

      if (!response?.success) {
        const errorMessage =
          this.extractErrorMessage(response?.raw) ||
          response?.message ||
          'ONCITY_API_ERROR';

        if (this.isAlreadyExistsResponse(response?.raw, errorMessage)) {
          return {
            status: 'skipped',
            message: 'ALREADY_EXISTS_IN_ONCITY',
            payload: {
              request: payload,
              prices,
            },
            response,
          };
        }

        return {
          status: 'failed',
          message: errorMessage,
          payload: {
            request: payload,
            prices,
          },
          response,
        };
      }

      const createdProduct = this.extractCreatedProduct(response.raw);

      if (!createdProduct) {
        return {
          status: 'failed',
          message: 'ONCITY_CREATED_PRODUCT_NOT_FOUND',
          payload: {
            request: payload,
            prices,
            stock: product.available_quantity,
          },
          response,
        };
      }

      const imageUrls = this.extractMeliImageUrls(product).slice(0, 5);
      const processedImages = await this.imagesRepository.processOnCity({
        sku,
        imageUrls,
      });
      const imageUpdatePayload = this.buildImageUpdatePayload(
        createdProduct,
        processedImages,
      );

      try {
        await this.updateProductRepository.updateStatus(
          createdProduct.id,
          imageUpdatePayload,
        );
      } catch (error: any) {
        return {
          status: 'failed',
          message: error?.message || 'ONCITY_IMAGES_UPDATE_FAILED',
          payload: {
            request: payload,
            imageRequest: imageUpdatePayload,
            prices,
            stock: product.available_quantity,
          },
          response: {
            create: response,
            images: error?.body ?? error?.response?.data ?? error,
          },
        };
      }

      const skuId = this.extractCreatedSkuId(response.raw);

      if (!skuId) {
        return {
          status: 'failed',
          message: 'ONCITY_CREATED_SKU_ID_NOT_FOUND',
          payload: {
            request: payload,
            imageRequest: imageUpdatePayload,
            prices,
            stock: product.available_quantity,
          },
          response,
        };
      }

      const pricePayload = {
        skuId,
        listPrice: prices.salePrice,
        costPrice: prices.salePrice,
        markup: 0,
      };
      const stockPayload = {
        skuId,
        quantity: product.available_quantity,
      };

      try {
        await this.updatePriceRepository.updatePrice(pricePayload);
      } catch (error: any) {
        return {
          status: 'failed',
          message: error?.message || 'ONCITY_PRICE_UPDATE_FAILED',
          payload: {
            request: payload,
            imageRequest: imageUpdatePayload,
            prices,
            priceRequest: pricePayload,
            stockRequest: stockPayload,
          },
          response: {
            create: response,
            images: true,
            price: error?.body ?? error?.response?.data ?? error,
          },
        };
      }

      let stockResponse: unknown;

      try {
        stockResponse =
          await this.updateStockRepository.updateStock(stockPayload);
      } catch (error: any) {
        return {
          status: 'failed',
          message: error?.message || 'ONCITY_STOCK_UPDATE_FAILED',
          payload: {
            request: payload,
            imageRequest: imageUpdatePayload,
            prices,
            priceRequest: pricePayload,
            stockRequest: stockPayload,
          },
          response: {
            create: response,
            images: true,
            price: true,
            stock: error?.body ?? error?.response?.data ?? error,
          },
        };
      }

      return {
        status: 'success',
        payload: {
          request: payload,
          imageRequest: imageUpdatePayload,
          prices,
          priceRequest: pricePayload,
          stockRequest: stockPayload,
        },
        response: {
          create: response,
          images: true,
          price: true,
          stock: stockResponse,
        },
      };
    } catch (error: any) {
      return this.buildValidationResult(
        'failed',
        error?.message || 'UNEXPECTED_ERROR',
        sku,
        'unexpected_error',
      );
    }
  }

  private buildValidationResult(
    status: 'success' | 'failed' | 'skipped',
    message: string,
    sku: string,
    stage: string,
    details?: Record<string, unknown>,
  ): PublishResult {
    const context = {
      marketplace: 'oncity',
      sku,
      stage,
      reason: message,
      details: details ?? null,
    };

    return {
      status,
      message,
      payload: context,
      response: context,
    };
  }

  private extractErrorMessage(raw: unknown): string {
    if (!raw) {
      return '';
    }

    if (typeof raw === 'string') {
      return raw;
    }

    if (typeof raw !== 'object') {
      return '';
    }

    const record = raw as Record<string, unknown>;
    const messages: string[] = [];
    const candidates = ['message', 'Message', 'error', 'Error'];

    for (const key of candidates) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        messages.push(value.trim());
      }
    }

    if (Array.isArray(record.errors)) {
      for (const error of record.errors) {
        if (error && typeof error === 'object') {
          const message = (error as Record<string, unknown>).message;
          if (typeof message === 'string' && message.trim()) {
            messages.push(message.trim());
          }
        }
      }
    }

    return messages.join(' | ');
  }

  private isAlreadyExistsError(message: string): boolean {
    const normalized = message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return (
      normalized.includes('already exists') ||
      normalized.includes('ya existe') ||
      normalized.includes('duplicate')
    );
  }

  private isAlreadyExistsResponse(raw: unknown, message: string): boolean {
    if (this.isAlreadyExistsError(message)) {
      return true;
    }

    if (!raw || typeof raw !== 'object') {
      return false;
    }

    const record = raw as Record<string, unknown>;
    return Number(record.statusCode) === 409;
  }

  private toNumber(value: string | number | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractMeliImageUrls(product: InternalMeliProduct): string[] {
    if (!product.pictures?.length) {
      return [];
    }

    return product.pictures
      .map((image) => image.secure_url ?? image.url)
      .filter((url): url is string => Boolean(url));
  }

  private extractCreatedProduct(
    raw: unknown,
  ): OnCityUpdateProductResponse | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const product = raw as OnCityUpdateProductResponse;

    if (!product.id || !Array.isArray(product.skus)) {
      return null;
    }

    return product;
  }

  private buildImageUpdatePayload(
    product: OnCityUpdateProductResponse,
    processedImages: OnCityProcessedImage[],
  ): OnCityUpdateProductRequest {
    const images = processedImages
      .filter((image) => image.status === 'uploaded')
      .map((image, index) => {
        const id =
          image.uploadResponse?.id ??
          image.uploadId ??
          `${product.externalId}-${index + 1}`;
        const url = image.uploadResponse?.fullUrl;

        if (!url) {
          return null;
        }

        return {
          id,
          url,
          alt: `Imagen ${index + 1}`,
        };
      })
      .filter((image): image is { id: string; url: string; alt: string } =>
        Boolean(image),
      );

    if (!images.length) {
      throw new Error('ONCITY_IMAGE_PROCESSING_EMPTY_RESPONSE');
    }

    return {
      id: product.id,
      externalId: product.externalId,
      status: product.status,
      name: product.name,
      description: product.description,
      brandId: product.brandId,
      categoryIds: product.categoryIds,
      specs: product.specs ?? [],
      attributes: product.attributes ?? [],
      slug: product.slug,
      images,
      skus: product.skus.map((sku) => ({
        id: sku.id,
        externalId: sku.externalId,
        name: sku.name,
        ean: sku.ean,
        isActive: sku.isActive,
        weight: sku.weight,
        dimensions: sku.dimensions,
        specs: sku.specs ?? [],
        images: images.map((image) => image.id),
      })),
      origin: product.origin,
    };
  }

  private extractCreatedSkuId(raw: unknown): number | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const record = raw as Record<string, unknown>;

    if (Array.isArray(record.skus)) {
      const firstSku = record.skus[0];

      if (firstSku && typeof firstSku === 'object') {
        const skuId = Number((firstSku as Record<string, unknown>).id);
        return Number.isFinite(skuId) ? skuId : null;
      }
    }

    const fallbackId = Number(record.id);
    return Number.isFinite(fallbackId) ? fallbackId : null;
  }
}
