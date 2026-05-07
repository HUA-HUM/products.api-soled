import { OnCityProductsPaginatedResponse } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityProductsPaginatedResponse';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { IGetOncityProductRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/get/IGetOncityProductRepository';
import { Injectable } from '@nestjs/common';
import { OnCityProductsIdsPaginatedResponse } from 'src/core/entitis/marketplace-api/oncity/products/getIds/OnCityIdsPaginatedResponse';
import { OnCityRawProduct } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityRawProduct';

@Injectable()
export class GetOncityProductRepository implements IGetOncityProductRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async getAllProduct(limit: number, offset: number) {
    const query = `?limit=${limit}&offset=${offset}`;

    return this.httpClient.get<OnCityProductsPaginatedResponse>(`/oncity/products/all${query}`);
  }

  async getAllIds(from: number, to: number) {
    const query = `?_from=${from}&_to=${to}`;

    return this.httpClient.get<OnCityProductsIdsPaginatedResponse>(`/oncity/products/ids${query}`);
  }

  async getRawBySkuId(skuId: number): Promise<OnCityRawProduct> {
    return this.httpClient.get<OnCityRawProduct>(`/oncity/sku/${skuId}/raw`);
  }
}
