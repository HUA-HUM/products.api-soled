import type { PublisherMarketplace } from './PublisherJob';

export type PublicationStatus =
  | 'draft'
  | 'pending_publish'
  | 'published'
  | 'paused'
  | 'rejected'
  | 'error'
  | 'out_of_sync'
  | 'deleted';

export type PublicationSyncStatus =
  | 'synced'
  | 'pending'
  | 'processing'
  | 'failed';

export type MarketplacePublicationResponse = {
  id: number;
  sku: string;
  marketplace: PublisherMarketplace;
  source?: string;
  meliItemId?: string | null;
  meli_item_id?: string | null;
  externalProductId?: string | null;
  external_product_id?: string | null;
  externalSku?: string | null;
  external_sku?: string | null;
  externalUrl?: string | null;
  external_url?: string | null;
  publicationStatus: PublicationStatus;
  publication_status?: PublicationStatus;
  syncStatus: PublicationSyncStatus;
  sync_status?: PublicationSyncStatus;
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  gtin?: string | null;
  categoryId?: string | null;
  category_id?: string | null;
  categoryName?: string | null;
  category_name?: string | null;
  categoryPath?: unknown;
  category_path?: unknown;
  listPrice?: number | null;
  salePrice?: number | null;
  netPrice?: number | null;
  discountPercentage?: number | null;
  stock?: number | null;
  currency?: string;
  thumbnail?: string | null;
  images?: unknown;
  images_json?: unknown;
  attributes?: unknown;
  attributes_json?: unknown;
  variations?: unknown;
  variations_json?: unknown;
  payload?: unknown;
  payload_json?: unknown;
  lastResponse?: unknown;
  last_response_json?: unknown;
};

export type UpsertMarketplacePublicationRequest = Partial<
  Omit<MarketplacePublicationResponse, 'id' | 'sku' | 'marketplace'>
> & {
  source?: string;
  meliItemId?: string | null;
  externalProductId?: string | null;
  externalSku?: string | null;
  externalUrl?: string | null;
  lastJobId?: string | null;
  lastRunId?: string | null;
};

export type UpsertMarketplacePublicationResponse = {
  ok: boolean;
  id: number;
  sku: string;
  marketplace: PublisherMarketplace;
};

export type UpdateMarketplacePublicationStatusRequest = {
  publicationStatus?: PublicationStatus;
  syncStatus?: PublicationSyncStatus;
  lastErrorMessage?: string;
};

export type UpdateMarketplacePublicationPriceRequest = {
  listPrice?: number;
  salePrice?: number;
  netPrice?: number;
  discountPercentage?: number;
  currency?: string;
};

export type UpdateMarketplacePublicationStockRequest = {
  stock: number;
};

export type MarketplacePublicationOkResponse = {
  ok: boolean;
};

export type ListMarketplacePublicationsParams = {
  sku?: string;
  marketplace?: PublisherMarketplace;
  status?: PublicationStatus;
  limit?: number;
  offset?: number;
};

export type ListMarketplacePublicationsResponse = {
  items: MarketplacePublicationResponse[];
};
