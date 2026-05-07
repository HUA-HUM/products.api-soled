import { Injectable } from '@nestjs/common';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { OnCityUpdateProductRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductRequest';
import { OnCityUpdateProductResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductResponse';

@Injectable()
export class UpdateStatusProductRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async updateStatus(productId: string, payload: OnCityUpdateProductRequest): Promise<OnCityUpdateProductResponse> {
    return this.httpClient.put<OnCityUpdateProductResponse>(`/oncity/products/${productId}`, payload);
  }
}
