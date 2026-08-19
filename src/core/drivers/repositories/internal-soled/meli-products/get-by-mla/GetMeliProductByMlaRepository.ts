import { Injectable } from '@nestjs/common';
import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';
import { InteranlSoledHttpClient } from '../../http/InteranlSoledHttpClient';

@Injectable()
export class GetMeliProductByMlaRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async getByMla(meliItemId: string): Promise<InternalMeliProduct> {
    return this.httpClient.get<InternalMeliProduct>(
      `/internal/mercadolibre/products/by-mla/${encodeURIComponent(meliItemId)}`,
    );
  }
}
