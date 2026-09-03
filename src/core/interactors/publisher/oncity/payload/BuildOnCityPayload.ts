import { Injectable } from '@nestjs/common';
import { CreateOnCityProductRequest } from 'src/core/entitis/marketplace-api/oncity/CreateProducts/CreateOnCityProduct';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { ResolveMeliPackageDimensions } from '../../shared/ResolveMeliPackageDimensions';

export const DEFAULT_ONCITY_ACCOUNT = 'solediluminacionyhogar602';

@Injectable()
export class BuildOnCityPayload {
  constructor(
    private readonly resolvePackageDimensions: ResolveMeliPackageDimensions,
  ) {}

  execute(params: {
    product: InternalMeliProduct;
    brandId: string;
    categoryIds: string[];
  }): CreateOnCityProductRequest {
    const { product, brandId, categoryIds } = params;
    const name = this.buildName(product.title);
    const externalId = product.sku ?? product.meli_item_id;
    const packageDimensions = this.resolvePackageDimensions.execute(product);

    return {
      externalId,
      status: 'active',
      name,
      description: this.buildDescription(product.description),
      brandId,
      categoryIds,
      specs: [],
      attributes: [],
      slug: this.buildSlug(product.title),
      images: [],
      skus: [
        {
          externalId,
          name,
          ean: this.resolveEan(product.gtin ?? externalId),
          isActive: true,
          weight: packageDimensions.weight,
          dimensions: {
            width: packageDimensions.width,
            height: packageDimensions.height,
            length: packageDimensions.length,
          },
          specs: [],
          images: [],
        },
      ],
      origin: process.env.ONCITY_VTEX_ACCOUNT ?? DEFAULT_ONCITY_ACCOUNT,
    };
  }

  private buildName(title?: string): string {
    const normalized = (title ?? '').replace(/\s+/g, ' ').trim();

    if (normalized.length <= 150) {
      return normalized;
    }

    const sliced = normalized.slice(0, 150);
    const lastSpace = sliced.lastIndexOf(' ');

    if (lastSpace < 80) {
      return sliced.trim();
    }

    return sliced.slice(0, lastSpace).trim();
  }

  private buildDescription(description?: string): string {
    if (!description) {
      return '';
    }

    const normalized = description.replace(/\r/g, '').trim();
    const marker = 'DETALLES:';
    const detailsIndex = normalized.indexOf(marker);

    let base = normalized;

    if (detailsIndex >= 0) {
      base = normalized.slice(detailsIndex + marker.length).trim();
    }

    base = base
      .replace(/TABLA DE CARACTERISTICAS:[\s\S]*$/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return base.slice(0, 4000);
  }

  private buildSlug(title?: string): string {
    const base = (title ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return `/${base || 'producto-sin-nombre'}`;
  }

  private resolveEan(sku?: string): string {
    return (sku ?? '').trim();
  }
}
