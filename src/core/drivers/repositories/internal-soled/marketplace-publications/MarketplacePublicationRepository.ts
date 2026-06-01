import { Injectable } from '@nestjs/common';
import type { IMarketplacePublicationRepository } from 'src/core/adapters/repositories/interal-soled/marketplace-publications/IMarketplacePublicationRepository';
import type {
  ListMarketplacePublicationsParams,
  ListMarketplacePublicationsResponse,
  MarketplacePublicationOkResponse,
  MarketplacePublicationResponse,
  UpdateMarketplacePublicationPriceRequest,
  UpdateMarketplacePublicationStatusRequest,
  UpdateMarketplacePublicationStockRequest,
  UpsertMarketplacePublicationRequest,
  UpsertMarketplacePublicationResponse,
} from 'src/core/entitis/internal-soled/publisher/MarketplacePublication';
import { InteranlSoledHttpClient } from '../http/InteranlSoledHttpClient';

@Injectable()
export class MarketplacePublicationRepository implements IMarketplacePublicationRepository {
  constructor(private readonly httpClient: InteranlSoledHttpClient) {}

  async getByMarketplaceAndSku(
    marketplace: string,
    sku: string,
  ): Promise<MarketplacePublicationResponse> {
    return this.httpClient.get<MarketplacePublicationResponse>(
      this.buildPublicationPath(marketplace, sku),
    );
  }

  async list(
    params?: ListMarketplacePublicationsParams,
  ): Promise<ListMarketplacePublicationsResponse> {
    return this.httpClient.get<ListMarketplacePublicationsResponse>(
      '/internal/marketplace-publications',
      params,
    );
  }

  async upsert(
    marketplace: string,
    sku: string,
    payload: UpsertMarketplacePublicationRequest,
  ): Promise<UpsertMarketplacePublicationResponse> {
    return this.httpClient.put<UpsertMarketplacePublicationResponse>(
      this.buildPublicationPath(marketplace, sku),
      payload,
    );
  }

  async updateStatus(
    marketplace: string,
    sku: string,
    payload: UpdateMarketplacePublicationStatusRequest,
  ): Promise<MarketplacePublicationOkResponse> {
    return this.httpClient.patch<MarketplacePublicationOkResponse>(
      `${this.buildPublicationPath(marketplace, sku)}/status`,
      payload,
    );
  }

  async updatePrice(
    marketplace: string,
    sku: string,
    payload: UpdateMarketplacePublicationPriceRequest,
  ): Promise<MarketplacePublicationOkResponse> {
    return this.httpClient.patch<MarketplacePublicationOkResponse>(
      `${this.buildPublicationPath(marketplace, sku)}/price`,
      payload,
    );
  }

  async updateStock(
    marketplace: string,
    sku: string,
    payload: UpdateMarketplacePublicationStockRequest,
  ): Promise<MarketplacePublicationOkResponse> {
    return this.httpClient.patch<MarketplacePublicationOkResponse>(
      `${this.buildPublicationPath(marketplace, sku)}/stock`,
      payload,
    );
  }

  private buildPublicationPath(marketplace: string, sku: string): string {
    return `/internal/marketplace-publications/${encodeURIComponent(marketplace)}/${encodeURIComponent(sku)}`;
  }
}
