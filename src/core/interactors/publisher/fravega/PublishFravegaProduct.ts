import { Inject, Injectable } from '@nestjs/common';
import type { ICreateFravegaProductsRepository } from 'src/core/adapters/repositories/marketplace/fravega/CreateProduct/ICreateFravegaProductsRepository';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';

import { ResolveFravegaCategory } from './category/ResolveFravegaCategory';
import { ResolveFravegaAttributes } from './atributtes/ResolveFravegaAttributes';
import { ResolveFravegaPrices } from './price/ResolveFravegaPrices';
import { BuildFravegaPayload } from './payload/BuildFravegaPayload';
import { ResolveFravegaBrand } from './brand/ResolveFravegaBrand';

export type PublishResult = {
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  payload?: any;
  response?: any;
};

@Injectable()
export class PublishFravegaProduct {
  constructor(
    @Inject('ICreateFravegaProductsRepository')
    private readonly createRepository: ICreateFravegaProductsRepository,

    private readonly resolveCategory: ResolveFravegaCategory,
    private readonly resolveBrand: ResolveFravegaBrand,
    private readonly resolveAttributes: ResolveFravegaAttributes,
    private readonly resolvePrices: ResolveFravegaPrices,
    private readonly buildPayload: BuildFravegaPayload,
  ) {}

  async execute(product: InternalMeliProduct): Promise<PublishResult> {
    const sku = product.sku ?? product.meli_item_id;

    try {
      /* ======================================
       2.5 MELI STATUS
    ====================================== */
      if (product.status !== 'active') {
        return this.buildValidationResult(
          'skipped',
          `MELI_STATUS_${product.status?.toUpperCase() || 'UNKNOWN'}`,
          sku,
          'meli_status_validation',
          {
            meliStatus: product.status ?? null,
          },
        );
      }

      /* ======================================
       2.6 VALIDACIONES BASE
    ====================================== */

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

      /* ======================================
       3. CATEGORY
    ====================================== */
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
        );
      }

      /* ======================================
       4. BRAND
    ====================================== */
      const brandId = await this.resolveBrand.execute(product);

      if (!brandId) {
        return this.buildValidationResult(
          'skipped',
          'BRAND_NOT_FOUND',
          sku,
          'brand_resolution',
          {
            brand: product.brand ?? null,
          },
        );
      }

      /* ======================================
       5. ATTRIBUTES
    ====================================== */
      let resolvedCategoryId = categoryId;
      let attributes = await this.resolveAttributes.execute(
        resolvedCategoryId,
        product,
      );

      if (!attributes && categoryCandidates.length > 1) {
        for (const fallbackCategoryId of categoryCandidates.slice(1)) {
          console.log('[FRAVEGA CATEGORY] Retrying fallback category', {
            sku,
            originalCategoryId: resolvedCategoryId,
            fallbackCategoryId,
          });

          const fallbackAttributes = await this.resolveAttributes.execute(
            fallbackCategoryId,
            product,
          );

          if (fallbackAttributes) {
            resolvedCategoryId = fallbackCategoryId;
            attributes = fallbackAttributes;

            console.log(
              '[FRAVEGA CATEGORY] Fallback category resolved attributes',
              {
                sku,
                categoryId: resolvedCategoryId,
              },
            );
            break;
          }
        }
      }

      if (!attributes) {
        return this.buildValidationResult(
          'failed',
          'MISSING_REQUIRED_ATTRIBUTES',
          sku,
          'attributes_resolution',
          {
            categoryId: resolvedCategoryId,
            attemptedCategoryIds: categoryCandidates,
          },
        );
      }

      /* ======================================
       6. PRICES
    ====================================== */
      const prices = this.resolvePrices.execute(price);

      if (!prices) {
        return this.buildValidationResult(
          'failed',
          'PRICE_MAPPING_FAILED',
          sku,
          'price_resolution',
          {
            price: product.price ?? null,
          },
        );
      }

      /* ======================================
       7. BUILD PAYLOAD
    ====================================== */
      const payload = await this.buildPayload.execute({
        product,
        categoryId: resolvedCategoryId,
        brandId,
        attributes,
        prices,
      });

      if (!payload) {
        return this.buildValidationResult(
          'failed',
          'PAYLOAD_BUILD_FAILED',
          sku,
          'payload_build',
        );
      }

      /* ======================================
       8. PUBLISH
    ====================================== */
      const response = await this.createRepository.create(payload);

      if (!response?.success) {
        return {
          status: 'failed',
          message: response?.message || 'FRAVEGA_API_ERROR',
          payload,
          response,
        };
      }

      const fravegaErrors = this.extractFravegaErrors(response);

      if (fravegaErrors.length > 0) {
        const errorMessage =
          fravegaErrors
            .map((error) => error.message)
            .filter(Boolean)
            .join(' | ') || 'FRAVEGA_API_ERROR';

        if (this.isAlreadyExistsError(errorMessage)) {
          return {
            status: 'skipped',
            message: 'ALREADY_EXISTS_IN_FRAVEGA',
            payload,
            response,
          };
        }

        return {
          status: 'failed',
          message: errorMessage,
          payload,
          response,
        };
      }

      /* ======================================
       SUCCESS
    ====================================== */
      return {
        status: 'success',
        payload,
        response,
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
      marketplace: 'fravega',
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

  private extractFravegaErrors(
    response: any,
  ): Array<{ message?: string; field?: string }> {
    const errors = response?.data?.error;
    return Array.isArray(errors) ? errors : [];
  }

  private isAlreadyExistsError(message: string): boolean {
    const normalized = message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized.includes('ya existe un item con el codigo de referencia');
  }

  private toNumber(value: string | number | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
