import { Inject, Injectable } from '@nestjs/common';
import type { IProcessMarketplaceImagesRepository } from 'src/core/adapters/repositories/image-market/IProcessMarketplaceImagesRepository';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { ResolveMeliPackageDimensions } from '../../shared/ResolveMeliPackageDimensions';

@Injectable()
export class BuildFravegaPayload {
  constructor(
    private readonly resolvePackageDimensions: ResolveMeliPackageDimensions,
    @Inject('IProcessMarketplaceImagesRepository')
    private readonly imagesRepository: IProcessMarketplaceImagesRepository,
  ) {}

  async execute(params: {
    product: InternalMeliProduct;
    categoryId: string;
    brandId: string | null;
    attributes: { id: string; name: string; value: any }[];
    prices: {
      list: number;
      sale: number;
      net: number;
    };
  }) {
    const { product, categoryId, brandId, attributes, prices } = params;

    const title = this.buildTitle(product.title);
    const packageDimensions = this.resolvePackageDimensions.execute(product);
    const images = await this.buildImages(product);

    return {
      items: [
        {
          /* ======================================
             IDENTIFICACIÓN
          ====================================== */
          ean: this.resolveEan(product.gtin),
          refId: product.sku ?? product.meli_item_id,

          /* ======================================
             TITLE
          ====================================== */
          title,
          subTitle: title,

          description: this.buildDescription(product.description),

          primaryCategoryId: categoryId,

          brandId: brandId,

          /* ======================================
             PRICE
          ====================================== */
          price: {
            list: prices.list,
            sale: prices.sale,
            net: prices.net,
          },

          /* ======================================
             STOCK
          ====================================== */
          stock: {
            quantity: product.available_quantity ?? 1,
          },

          /* ======================================
             DIMENSIONS
          ====================================== */
          dimensions: {
            height: packageDimensions.height,
            length: packageDimensions.length,
            width: packageDimensions.width,
            weight: packageDimensions.weight,
          },

          /* ======================================
             META
          ====================================== */
          origin: 'AR',
          countryId: 'AR',
          active: true,

          /* ======================================
             ATTRIBUTES
          ====================================== */
          attributes: this.buildAttributes(attributes),

          /* ======================================
             IMAGES
          ====================================== */
          images,
        },
      ],
    };
  }

  /* ======================================
     ATTRIBUTES (SIN BRAND)
  ====================================== */
  private buildAttributes(
    attributes: { id: string; name: string; value: any }[],
  ) {
    return attributes.map((attr) => ({
      name: attr.name,
      value: attr.value,
    }));
  }

  private resolveEan(gtin?: string | null): string {
    const normalized = String(gtin ?? '').trim();

    if (!normalized) {
      return '00000000';
    }

    return normalized;
  }

  /* ======================================
     IMAGES (MAX 5)
  ====================================== */
  private async buildImages(product: InternalMeliProduct) {
    const imageUrls = this.extractMeliImageUrls(product.pictures).slice(0, 5);

    if (!imageUrls.length) {
      throw new Error('FRAVEGA_IMAGES_NOT_FOUND');
    }

    const processedImages = await this.imagesRepository.processFravega({
      sku: product.sku ?? product.meli_item_id,
      imageUrls,
    });

    const publicUrls = processedImages
      .map((image) => image.publicUrl)
      .filter((url) => Boolean(url));

    if (!publicUrls.length) {
      throw new Error('FRAVEGA_IMAGE_PROCESSING_EMPTY_RESPONSE');
    }

    return publicUrls.slice(0, 5).map((url) => ({
      type: 'url',
      url,
    }));
  }

  private extractMeliImageUrls(images: any[]): string[] {
    if (!images?.length) {
      return [];
    }

    return images
      .map((image) => image?.secure_url ?? image?.url)
      .filter((url): url is string => Boolean(url));
  }

  /* ======================================
     TITLE (MAX 100)
  ====================================== */
  private buildTitle(title?: string): string {
    if (!title) return '';

    return title.slice(0, 100);
  }

  /* ======================================
     DESCRIPTION
  ====================================== */
  private buildDescription(description?: string): string {
    if (!description) return '';

    const marker = 'DESCRIPCION:';
    const index = description.indexOf(marker);

    if (index === -1) {
      return description.slice(0, 2000);
    }

    let clean = description.slice(index + marker.length).trim();

    clean = clean.replace(/^[:\d\s-]+/, '');

    return clean.slice(0, 2000);
  }
}
