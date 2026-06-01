import type { InternalMeliProduct } from 'src/core/entitis/internal-soled/meli-products/get/MeliProduct';

export interface IGetMeliProductBySkuRepository {
  getBySku(sku: string): Promise<InternalMeliProduct>;
}
