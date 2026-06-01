import { Injectable } from '@nestjs/common';
import type { IGetMeliProductBySkuRepository } from 'src/core/adapters/repositories/interal-soled/meli-products/get-by-sku/IGetMeliProductBySkuRepository';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class GetMeliProductBySkuRepository implements IGetMeliProductBySkuRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async getBySku(sku: string): Promise<InternalMeliProduct> {
    const response = await this.httpClient.get<unknown>(
      `/internal/mercadolibre/products/by-sku/${encodeURIComponent(sku)}`,
    );

    return this.selectPublication(response);
  }

  private selectPublication(response: unknown): InternalMeliProduct {
    const products = this.extractProducts(response);

    if (!products.length) {
      throw new Error('MELI_PRODUCT_NOT_FOUND');
    }

    const goldSpecial = products.find(
      (product) => product.listing_type_id === 'gold_special',
    );

    return goldSpecial ?? products[0];
  }

  private extractProducts(response: unknown): InternalMeliProduct[] {
    if (Array.isArray(response)) {
      return response as InternalMeliProduct[];
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const record = response as Record<string, unknown>;

    for (const key of ['items', 'data', 'products', 'results']) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value as InternalMeliProduct[];
      }
    }

    return [response as InternalMeliProduct];
  }
}
