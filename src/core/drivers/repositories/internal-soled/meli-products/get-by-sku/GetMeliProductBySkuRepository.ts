import { Injectable } from '@nestjs/common';
import type { IGetMeliProductBySkuRepository } from 'src/core/adapters/repositories/interal-soled/meli-products/get-by-sku/IGetMeliProductBySkuRepository';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class GetMeliProductBySkuRepository implements IGetMeliProductBySkuRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async getBySku(sku: string): Promise<InternalMeliProduct> {
    return this.httpClient.get<InternalMeliProduct>(
      `/internal/mercadolibre/products/by-sku/${encodeURIComponent(sku)}`,
    );
  }
}
