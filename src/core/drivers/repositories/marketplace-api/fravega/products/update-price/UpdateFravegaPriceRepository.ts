import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { IUpdateFravegaPriceRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-price/IUpdateFravegaPriceRepository';
import { UpdateFravegaPriceRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRequest';
import { UpdateFravegaPriceResponse } from 'src/core/entitis/marketplace-api/fravega/products/update-price/UpdateFravegaPriceResponse';

@Injectable()
export class UpdateFravegaPriceRepository implements IUpdateFravegaPriceRepository {
  constructor(private readonly http: MarketplaceHttpClient) {}

  async updateByRefId(refId: string, payload: UpdateFravegaPriceRequest): Promise<UpdateFravegaPriceResponse> {
    if (!refId) {
      throw new BadRequestException('refId is required');
    }

    return this.http.put<UpdateFravegaPriceResponse>(`/fravega/price/refId/${encodeURIComponent(refId)}`, payload);
  }
}
