import { BadRequestException, Injectable } from '@nestjs/common';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';
import { IUpdateFravegaStatusRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-status/IUpdateFravegaStatusRepository';

@Injectable()
export class UpdateFravegaStatusRepository implements IUpdateFravegaStatusRepository {
  constructor(private readonly http: MarketplaceHttpClient) {}

  async activateByRefId(refId: string): Promise<void> {
    if (!refId) throw new BadRequestException('refId is required');

    await this.http.post<void>(`/fravega/status/activate/refId/${encodeURIComponent(refId)}`, {});
  }

  async deactivateByRefId(refId: string): Promise<void> {
    if (!refId) throw new BadRequestException('refId is required');

    await this.http.post<void>(`/fravega/status/desactivate/refId/${encodeURIComponent(refId)}`, {});
  }
}
