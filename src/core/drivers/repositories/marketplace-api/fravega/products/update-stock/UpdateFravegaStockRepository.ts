import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { IUpdateFravegaStockRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-stock/IUpdateFravegaStockRepository';
import { UpdateFravegaStockRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRequest';
import { UpdateFravegaStockResponse } from 'src/core/entitis/marketplace-api/fravega/products/update-stock/UpdateFravegaStockResponse';

@Injectable()
export class UpdateFravegaStockRepository implements IUpdateFravegaStockRepository {
  constructor(private readonly http: MarketplaceHttpClient) {}

  async updateByRefId(refId: string, payload: UpdateFravegaStockRequest): Promise<UpdateFravegaStockResponse> {
    if (!refId) throw new BadRequestException('refId is required');

    return this.http.put<UpdateFravegaStockResponse>(
      `/fravega/stock/refId?refId=${encodeURIComponent(refId)}`,
      payload
    );
  }
}
