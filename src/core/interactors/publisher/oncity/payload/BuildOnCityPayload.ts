import { Inject, Injectable } from '@nestjs/common';
import {
  CreateOnCityProductRequest,
  OnCityCreateProductImage,
} from 'src/core/entitis/marketplace-api/oncity/CreateProducts/CreateOnCityProduct';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import type { IProcessMarketplaceImagesRepository } from 'src/core/adapters/repositories/image-market/IProcessMarketplaceImagesRepository';
import { ResolveMeliPackageDimensions } from '../../shared/ResolveMeliPackageDimensions';

const DEFAULT_ONCITY_ACCOUNT = 'solediluminacionyhogar602';

@Injectable()
export class BuildOnCityPayload {
  constructor(
    private readonly resolvePackageDimensions: ResolveMeliPackageDimensions,
    @Inject('IProcessMarketplaceImagesRepository')
    private readonly imagesRepository: IProcessMarketplaceImagesRepository,
  ) {}

  async execute(params: {
    product: InternalMeliProduct;
    brandId: string;
    categoryIds: string[];
  }): Promise<CreateOnCityProductRequest> {
    const { product, brandId, categoryIds } = params;
    const name = this.buildName(product.title);
    const externalId = product.sku ?? product.meli_item_id;
    const images = await this.buildImages(product, externalId);
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
      images,
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
          images: images.map((image) => image.id),
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

  private async buildImages(
    product: InternalMeliProduct,
    sku: string,
  ): Promise<OnCityCreateProductImage[]> {
    const imageUrls = this.extractMeliImageUrls(product.pictures).slice(0, 5);

    if (!imageUrls.length) {
      throw new Error('ONCITY_IMAGES_NOT_FOUND');
    }

    const processedImages = await this.imagesRepository.processOnCity({
      sku,
      imageUrls,
    });

    const uploadedImages: OnCityCreateProductImage[] = [];

    processedImages
      .filter((image) => image.status === 'uploaded')
      .forEach((image, index) => {
        const id =
          image.uploadResponse?.id ?? image.uploadId ?? `${sku}-${index + 1}`;
        const url = image.uploadResponse?.fullUrl;

        if (!url) {
          return;
        }

        uploadedImages.push({
          id,
          url,
          alt: `Imagen ${index + 1}`,
        });
      });

    if (!uploadedImages.length) {
      throw new Error('ONCITY_IMAGE_PROCESSING_EMPTY_RESPONSE');
    }

    return uploadedImages;
  }

  private extractMeliImageUrls(images: any[]): string[] {
    if (!images?.length) {
      return [];
    }

    return images
      .map((image) => image?.secure_url ?? image?.url)
      .filter((url): url is string => Boolean(url));
  }
}
