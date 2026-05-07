import { OnCityRawProduct } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityRawProduct';

export interface IGetOncityProductRepository {
  getAllProduct(limit: number, offset: number);
  getRawBySkuId(skuId: number): Promise<OnCityRawProduct>;
}
