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

export interface IMarketplacePublicationRepository {
  getByMarketplaceAndSku(
    marketplace: string,
    sku: string,
  ): Promise<MarketplacePublicationResponse>;

  list(
    params?: ListMarketplacePublicationsParams,
  ): Promise<ListMarketplacePublicationsResponse>;

  upsert(
    marketplace: string,
    sku: string,
    payload: UpsertMarketplacePublicationRequest,
  ): Promise<UpsertMarketplacePublicationResponse>;

  updateStatus(
    marketplace: string,
    sku: string,
    payload: UpdateMarketplacePublicationStatusRequest,
  ): Promise<MarketplacePublicationOkResponse>;

  updatePrice(
    marketplace: string,
    sku: string,
    payload: UpdateMarketplacePublicationPriceRequest,
  ): Promise<MarketplacePublicationOkResponse>;

  updateStock(
    marketplace: string,
    sku: string,
    payload: UpdateMarketplacePublicationStockRequest,
  ): Promise<MarketplacePublicationOkResponse>;
}
