import { Injectable } from '@nestjs/common';
import { ICreateOnCityProductsRepository } from 'src/core/adapters/repositories/marketplace/oncity/CreateProducts/ICreateOnCityProductsRepository';
import {
  CreateOnCityProductRequest,
  CreateOnCityProductResponse
} from 'src/core/entitis/marketplace-api/oncity/CreateProducts/CreateOnCityProduct';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';

@Injectable()
export class CreateOnCityProductsRepository implements ICreateOnCityProductsRepository {
  constructor(private readonly http: MarketplaceHttpClient) {}

  async createProduct(body: CreateOnCityProductRequest): Promise<CreateOnCityProductResponse> {
    try {
      const response = await this.http.post<unknown>('/oncity/products', body);

      return {
        success: true,
        raw: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'ONCITY_CREATE_PRODUCT_ERROR',
        raw: error?.body ?? error?.response?.data ?? error
      };
    }
  }
}
