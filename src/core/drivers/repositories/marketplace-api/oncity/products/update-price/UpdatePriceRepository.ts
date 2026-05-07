import { Injectable } from '@nestjs/common';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { OnCityUpdatePriceRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-price/UpdatePriceRequest';
import { OnCityUpdatePriceResponse } from 'src/core/entitis/marketplace-api/oncity/products/update-price/UpdatePriceResponse';

@Injectable()
export class UpdatePriceRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async updatePrice(payload: OnCityUpdatePriceRequest): Promise<OnCityUpdatePriceResponse> {
    await this.httpClient.post('/oncity/price', payload);
  }
}
