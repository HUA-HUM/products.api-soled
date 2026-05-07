import { Injectable } from '@nestjs/common';
import { IGetFravegaProductsRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/get/IGetFravegaProductsRepository';
import { FravegaProductsPaginatedResponse } from 'src/core/entitis/marketplace-api/fravega/products/get/FravegaProductsPaginatedResponse';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';

@Injectable()
export class GetFravegaProductsRepository implements IGetFravegaProductsRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async execute(limit: number, offset: number): Promise<FravegaProductsPaginatedResponse> {
    return this.httpClient.get<FravegaProductsPaginatedResponse>('/fravega/products', {
      limit,
      offset
    });
  }
}
