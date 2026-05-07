import { Injectable } from '@nestjs/common';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { OnCityUpdateStockRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-stock/UpdateStockRequest';
import { OnCityUpdateStockResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-stock/UpdateStockResponse';
import { IUpdateStockRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-stock/IUpdateStockRepository';

@Injectable()
export class UpdateStockRepository implements IUpdateStockRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async updateStock(payload: OnCityUpdateStockRequest): Promise<OnCityUpdateStockResponse> {
    return this.httpClient.post<OnCityUpdateStockResponse>('/oncity/stock', payload);
  }
}
